import { audit } from "./storage";
import { loadDynamicConfig } from "./config";
import { withSelfHeal } from "./self-heal";
import { learnFromInteraction } from "./self-learn";

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
    // 1. Primary Attempt: Cloud Gemini 2.0 Flash via /api/chat
    async () => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (res.ok) {
        const data: unknown = await res.json();
        if (data && typeof data === "object" && "text" in data && typeof data.text === "string") {
          const text = data.text.trim();
          if (text) {
            audit("chat", "allowed", "Cloud Gemini 2.0 Flash responded via Edge");
            learnFromInteraction(userPrompt, text, "Cloud");
            return { content: text, mode: "cloud" };
          }
        }
      }
      throw new Error(`Edge API returned ${res.status}`);
    },
    // Fallback Sequence: Direct Client Key -> Local Ollama -> Offline
    async () => {
      // 1b. Direct Gemini API Key
      if (config.geminiKey) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
              }),
            }
          );
          if (res.ok) {
            const data: unknown = await res.json();
            if (
              data &&
              typeof data === "object" &&
              "candidates" in data &&
              Array.isArray(data.candidates) &&
              data.candidates[0]?.content?.parts?.[0]?.text
            ) {
              const text = String(data.candidates[0].content.parts[0].text).trim();
              if (text) {
                audit("chat", "allowed", "Direct Gemini 2.0 Flash responded");
                learnFromInteraction(userPrompt, text, "Cloud");
                return { content: text, mode: "cloud" };
              }
            }
          }
        } catch {
          // Direct key failed, proceed to local Ollama
        }
      }

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
        "Maalik, main connect karne ki koshish kar rahi hoon lekin dono brains (Cloud Gemini Proxy aur Local Ollama) offline hain.\n\nKripya Connections page par Script ID / Gemini Key verify kijiye ya local Ollama start karein.";
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
    model: result.mode === "cloud" ? "gemini-2.0-flash" : result.mode === "ollama" ? config.ollamaModel : undefined,
  };
}
