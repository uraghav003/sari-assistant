import { audit } from "./storage";
import { loadDynamicConfig } from "./config";
import { withSelfHeal } from "./self-heal";
import { learnFromInteraction } from "./self-learn";
import { checkSession } from "./auth";

export type AgentMessage = { role: "user" | "assistant"; content: string };
export type AgentResult = { content: string; mode: "cloud" | "ollama" | "offline" };

export type Tier = "Cloud" | "Local" | "Offline";
export interface InferResult {
  text: string;
  tier: Tier;
  model?: string;
}

const CLOUD_TIMEOUT_MS = 20_000;
const OLLAMA_TIMEOUT_MS = 30_000;
const MIN_RESPONSE_CHARS = 30;
const MAX_RETRIES = 1;

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

  async function tryCloud(): Promise<AgentResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CLOUD_TIMEOUT_MS);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });
      if (res.status === 401) {
        void checkSession();
        throw new Error("SESSION_EXPIRED");
      }
      if (!res.ok) throw new Error(`Edge API returned ${res.status}`);
      const data: unknown = await res.json();
      if (data && typeof data === "object" && "text" in data && typeof data.text === "string") {
        const text = data.text.trim();
        if (text.length >= MIN_RESPONSE_CHARS) {
          audit("chat", "allowed", "Cloud cascade responded via Edge proxy");
          learnFromInteraction(userPrompt, text, "Cloud");
          return { content: text, mode: "cloud" };
        }
      }
      throw new Error("Cloud response too short");
    } finally {
      clearTimeout(timeout);
    }
  }

  async function tryOllama(): Promise<AgentResult | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
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
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!response.ok) return null;
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
          if (content.length >= MIN_RESPONSE_CHARS) {
            audit("chat", "allowed", `Local model ${config.ollamaModel} responded`);
            learnFromInteraction(userPrompt, content, "Local");
            return { content, mode: "ollama" };
          }
        }
      } finally {
        clearTimeout(timeout);
      }
    } catch {
      // Local Ollama offline or aborted
    }
    return null;
  }

  return await withSelfHeal<AgentResult>(
    "AgentInference",
    async () => {
      let lastErr: Error | null = null;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          return await tryCloud();
        } catch (e) {
          lastErr = e instanceof Error ? e : new Error(String(e));
          if (lastErr.message === "SESSION_EXPIRED") throw lastErr;
        }
      }
      throw lastErr ?? new Error("Cloud inference failed");
    },
    async () => {
      const ollamaResult = await tryOllama();
      if (ollamaResult) return ollamaResult;

      audit("chat", "error", "All inference brains offline");
      return {
        content:
          "Maalik, main connect karne ki koshish kar rahi hoon lekin dono brains (Cloud Proxy aur Local Ollama) offline hain.\n\nKripya dobara login karein ya Connections page par SARI_CONFIG.json drop kijiye.",
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
