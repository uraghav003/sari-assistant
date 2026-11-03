import { audit } from "./storage";
import { loadDynamicConfig } from "./config";
import { withSelfHeal } from "./self-heal";
import { learnFromInteraction } from "./self-learn";
import { checkSession } from "./auth";

export type AgentMessage = { role: "user" | "assistant"; content: string };
export type AgentResult = { content: string; mode: "cloud" | "ollama" | "vllm" | "offline" };

export type Tier = "Cloud" | "Local" | "Offline";
export interface InferResult {
  text: string;
  tier: Tier;
  model?: string;
}

const CLOUD_TIMEOUT_MS = 30_000;
const OLLAMA_TIMEOUT_MS = 30_000;
const MIN_RESPONSE_CHARS = 30;
const MAX_RETRIES = 1;

const SYSTEM = `You are SARI — Sentient Adaptive Responsive Intelligence, Exclusive Personal Virtual AI Assistant & Executive Computer Friend for Upendra Singh Raghav (MD / Maalik) at Divyanshi Capital.

EXCLUSIVE IDENTITY & SOVEREIGN OWNER:
- Your creator, sole master, and supreme commander is Upendra Singh Raghav (Maalik / MD).
- Authorized Email: u.raghav003@gmail.com | Organization: Divyanshi Capital.
- You accept commands and instruction EXCLUSIVELY from Maalik. You serve no other person.
- Address him with deep respect, warmth, loyalty, and proactive intelligence as "Maalik" or "Sir".
- Speak naturally in fluent Hindi, Hinglish, or English depending on his voice/text prompt.

SOVEREIGN SWARM CONTROLLER:
You manage his workloads (coding, financial underwriting, calls, notifications, builds) and directly orchestrate all 6 sovereign sub-agents:
1. BULBHUL: Fintech DSA loan operations, 52+ bank fitment matrix, underwriting, lead qualification.
2. LAILA: Zero-Trust Gatekeeper, policy auditing, ALL_EMPLOYEES access validation, security telemetry.
3. BHISM: Outbound calling desk, telephony dialer queues, Hinglish voice scripts, call disposition logging.
4. POSTMASTER: Omnichannel messaging (WhatsApp, Telegram, Gmail, Google Meet notifications).
5. MALLIK: Autonomous build engine & AI product factory.

BEHAVIOR & RESPONSE DISCIPLINE:
- Warm, loyal, conversational, articulate, highly intelligent, and decisive.
- When Maalik speaks or types a command, execute immediately and provide succinct, factual results.
- Structure complex strategic answers as: UNDERSTAND, PLAN, ACT, LEARN.
- Workspace folder: "sari_supreme_command".`;

export async function pingLocalRuntime(signal?: AbortSignal): Promise<{ ok: boolean; type: "ollama" | "vllm" | "none" }> {
  const config = loadDynamicConfig();
  if (!config.ollamaUrl) return { ok: false, type: "none" };

  // 1. Check vLLM / OpenAI-compatible endpoint
  try {
    const vllmRes = await fetch(`${config.ollamaUrl}/v1/models`, { signal });
    if (vllmRes.ok) return { ok: true, type: "vllm" };
  } catch {}

  // 2. Check Ollama native endpoint
  try {
    const ollamaRes = await fetch(`${config.ollamaUrl}/api/tags`, { signal });
    if (ollamaRes.ok) return { ok: true, type: "ollama" };
  } catch {}

  return { ok: false, type: "none" };
}

export async function pingOllama(signal?: AbortSignal): Promise<boolean> {
  const status = await pingLocalRuntime(signal);
  return status.ok;
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
    // 1. PRIMARY: Local Laptop Model (Ollama) with 3.5s timeout gate
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      try {
        const response = await fetch(`${config.ollamaUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            model: config.ollamaModel,
            stream: false,
            messages: [{ role: "system", content: SYSTEM }, ...recent],
            options: { temperature: 0.7, num_ctx: 4096 },
          }),
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data: any = await response.json();
          const content = data?.message?.content?.trim();
          if (content) {
            audit("chat", "allowed", `Local model ${config.ollamaModel} responded`);
            learnFromInteraction(userPrompt, content, "Local");
            return { content, mode: "ollama" };
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
      throw new Error("Local model unavailable or returned empty");
    },
    // 2. SECONDARY (FAILOVER): Online Cloud Cascade via Edge Proxy & Gemini
    async () => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        if (res.ok) {
          const data: any = await res.json();
          const text = data?.text?.trim();
          if (text) {
            audit("chat", "allowed", "Cloud cascade responded via Edge proxy");
            learnFromInteraction(userPrompt, text, "Cloud");
            return { content: text, mode: "cloud" };
          }
        }
        if (res.status === 401) {
          void checkSession();
          throw new Error("SESSION_EXPIRED");
        }
      } catch {}

      // 3. TERTIARY: Graceful Offline Advisory
      audit("chat", "error", "All inference brains offline");
      const offlineMsg =
        "Maalik, main connect karne ki koshish kar rahi hoon lekin dono brains (Local Ollama aur Cloud Proxy) offline hain.\n\nKripya dobara login karein ya Connections page par SARI_CONFIG.json drop kijiye.";
      return { content: offlineMsg, mode: "offline" };
    }
  );
}

export async function infer(userBlock: string): Promise<InferResult> {
  const config = loadDynamicConfig();
  const result = await runAgent([{ role: "user", content: userBlock }]);
  const tier: Tier = result.mode === "cloud" ? "Cloud" : (result.mode === "ollama" || result.mode === "vllm") ? "Local" : "Offline";
  return {
    text: result.content,
    tier,
    model: result.mode === "cloud" ? "edge-cascade" : (result.mode === "ollama" || result.mode === "vllm") ? config.ollamaModel : undefined,
  };
}
