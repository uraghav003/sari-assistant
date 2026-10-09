import { audit } from "./storage";

export type AgentMessage = { role: "user" | "assistant"; content: string };
export type AgentResult = { content: string; mode: "cloud" | "ollama" | "offline" };

export type Tier = "Cloud" | "Local" | "Offline";
export interface InferResult {
  text: string;
  tier: Tier;
  model?: string;
}

export const OLLAMA_URL = (import.meta.env.VITE_OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
export const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || "llama3.2:latest";

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
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, { signal });
    return response.ok;
  } catch {
    return false;
  }
}

export async function runAgent(messages: AgentMessage[]): Promise<AgentResult> {
  const recent = messages.slice(-10);
  const prompt =
    `${SYSTEM}\n\nConversation History:\n` +
    recent.map((m) => `${m.role === "user" ? "Maalik" : "SARI"}: ${m.content}`).join("\n") +
    "\nSARI:";

  // 1. Primary: Cloud Gemini 2.0 Flash via /api/chat (works on Vercel and mobile)
  try {
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
          audit("chat", "allowed", "Cloud Gemini 2.0 Flash responded");
          return { content: text, mode: "cloud" };
        }
      }
    }
  } catch {
    // Edge API unavailable, fall through
  }

  // 1b. Direct client key fallback if configured
  const storedGeminiKey =
    typeof window !== "undefined"
      ? localStorage.getItem("sari_gemini_key") || localStorage.getItem("Mallik_API_KEY")
      : null;

  if (storedGeminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${storedGeminiKey}`,
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
            return { content: text, mode: "cloud" };
          }
        }
      }
    } catch {
      // Direct client key failed, proceed to local Ollama
    }
  }

  // 2. Secondary: Local Ollama (if running on desktop)
  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
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
          audit("chat", "allowed", `Local model ${OLLAMA_MODEL} responded`);
          return { content, mode: "ollama" };
        }
      }
    }
  } catch {
    // Local Ollama offline
  }

  // 3. Fallback
  audit("chat", "error", "All inference brains offline");
  return {
    content:
      "Maalik, main connect karne ki koshish kar rahi hoon lekin dono brains (Cloud Gemini Proxy aur Local Ollama) offline hain.\n\nKripya Vercel dashboard mein GEMINI_API_KEY verify kijiye aur redeploy karein.",
    mode: "offline",
  };
}

export async function infer(userBlock: string): Promise<InferResult> {
  const result = await runAgent([{ role: "user", content: userBlock }]);
  const tier: Tier = result.mode === "cloud" ? "Cloud" : result.mode === "ollama" ? "Local" : "Offline";
  return {
    text: result.content,
    tier,
    model: result.mode === "cloud" ? "gemini-2.0-flash" : result.mode === "ollama" ? OLLAMA_MODEL : undefined,
  };
}
