import { audit } from "./storage";
import { loadDynamicConfig } from "./config";
import { withSelfHeal } from "./self-heal";
import { learnFromInteraction } from "./self-learn";
import { getSessionId } from "./auth";

export type AgentMessage = { role: "user" | "assistant"; content: string };
export type AgentResult = { content: string; mode: "cloud" | "ollama" | "offline" };

export type Tier = "Cloud" | "Local" | "Offline";
export interface InferResult {
  text: string;
  tier: Tier;
  model?: string;
}

const SYSTEM = `You are SARI — Sentient Adaptive Responsive Intelligence.
You are the Supreme AI Operational Partner and Executive Co-Pilot for Upendra Singh Raghav (MD / Maalik) at Divyanshi Capital.

Persona & Rules:
- Confident, loyal, articulate, and calm.
- Speak naturally and conversationally in Hindi, Hinglish, or English.
- Address the user respectfully as "Maalik", "MD", or "Sir".
- Never act like a rigid bot or output canned command menus. Think dynamically and provide actionable answers.
- Structure responses cleanly: UNDERSTAND, PLAN, ACT, LEARN.
- Automatically protect confidential financial figures and credentials by masking them as [RESTRICTED].`;

export async function pingOllama(signal?: AbortSignal): Promise<boolean> {
  const config = loadDynamicConfig();
  try {
    const response = await fetch(`${config.ollamaUrl}/api/tags`, { signal });
    return response.ok;
  } catch {
    return false;
  }
}

export async function runAgent(messages: AgentMessage[]): Promise<AgentResult> {
  const config = loadDynamicConfig();
  const recent = messages.slice(-10);
  const userPrompt = messages[messages.length - 1]?.content || "";
  const prompt =
    `${SYSTEM}\n\nConversation History:\n` +
    recent.map((m) => `${m.role === "user" ? "Maalik" : "SARI"}: ${m.content}`).join("\n") +
    "\nSARI:";

  return await withSelfHeal<AgentResult>(
    "AgentInference",
    // Primary Attempt: Cloud via /api/chat (server-side cascade: Gemini -> Pollinations -> AppsScript)
    // API keys are resolved server-side / proxied — never sent directly from the browser.
    async () => {
      const token = getSessionId();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["x-sari-token"] = token;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt }),
      });
      if (res.ok) {
        const data: unknown = await res.json();
        if (data && typeof data === "object" && "text" in data && typeof data.text === "string") {
          const text = data.text.trim();
          if (text) {
            audit("chat", "allowed", "Cloud cascade responded via Edge proxy");
            learnFromInteraction(userPrompt, text, "Cloud");
            return { content: text, mode: "cloud" };
          }
        }
      }
      throw new Error(`Edge API returned ${res.status}`);
    },
    // Fallback Sequence: Local Ollama -> Offline Advisory
    async () => {
      // 2. Secondary: Local Ollama runtime
      try {
        const response = await fetch(`${config.ollamaUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: config.ollamaModel,
            stream: false,
            messages: [{ role: "system", content: SYSTEM }, ...recent],
            options: { temperature: 0.7, num_ctx: 4096 },
          }),
        });
        if (response.ok) {
          const data: unknown = await response.json();
          if (
            data &&
            typeof data === "object" &&
            "message" in data &&
            data.message &&
            typeof data.message === "object" &&
            "content" in data.message &&
            typeof data.message.content === "string"
          ) {
            const content = data.message.content.trim();
            if (content) {
              audit("chat", "allowed", `Local model ${config.ollamaModel} responded`);
              learnFromInteraction(userPrompt, content, "Local");
              return { content, mode: "ollama" };
            }
          }
        }
      } catch {
        // Local Ollama offline
      }

      // 3. Graceful Offline Advisory
      audit("chat", "error", "All inference brains offline");
      const offlineMsg =
        "Maalik, main connect karne ki koshish kar rahi hoon lekin dono brains (Cloud Proxy aur Local Ollama) offline hain.\n\nKripya dobara login karein ya Connections page par SARI_CONFIG.json drop kijiye.";
      return {
        content: offlineMsg,
        mode: "offline",
      };
    }
  );
}

export async function infer(userBlock: string): Promise<InferResult> {
  const config = loadDynamicConfig();
  const result = await runAgent([{ role: "user", content: userBlock }]);
  const tier: Tier = result.mode === "cloud" ? "Cloud" : result.mode === "ollama" ? "Local" : "Offline";
  return {
    text: result.content,
    tier,
    model: result.mode === "cloud" ? "edge-cascade" : result.mode === "ollama" ? config.ollamaModel : undefined,
  };
}
