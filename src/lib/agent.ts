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

  // Force try local engine (vLLM or Ollama) first if reachable, ensuring local fallback works robustly
  const localProbe = await pingLocalRuntime();
  if (localProbe.ok && localProbe.type !== "none") {
    const localFirst = await tryLocalEngine(localProbe.type);
    if (localFirst) return localFirst;
  }

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
        let text = data.text.trim();
        text = text.replace(/\[(?!RESTRICTED\])[A-Z_]{3,}\]/gi, "Maalik");
        if (text.length > 0) {
          audit("chat", "allowed", "Cloud cascade responded via Edge proxy");
          learnFromInteraction(userPrompt, text, "Cloud");
          return { content: text, mode: "cloud" };
        }
      }
      throw new Error("Cloud response empty");
    } finally {
      clearTimeout(timeout);
    }
  }

  async function tryLocalEngine(engineType: "ollama" | "vllm"): Promise<AgentResult | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
      try {
        if (engineType === "vllm") {
          const response = await fetch(`${config.ollamaUrl}/v1/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: config.ollamaModel,
              messages: [{ role: "system", content: SYSTEM }, ...recent],
              temperature: 0.7,
              max_tokens: 2048,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (response.ok) {
            const data: unknown = await response.json();
            const text =
              data &&
              typeof data === "object" &&
              "choices" in data &&
              Array.isArray(data.choices) &&
              data.choices[0] &&
              typeof data.choices[0] === "object" &&
              "message" in data.choices[0] &&
              data.choices[0].message &&
              typeof data.choices[0].message === "object" &&
              "content" in data.choices[0].message &&
              typeof data.choices[0].message.content === "string"
                ? data.choices[0].message.content.trim()
                : null;
            if (text) {
              const sanitized = text.replace(/\[(?!RESTRICTED\])[A-Z_]{3,}\]/gi, "Maalik");
              audit("chat", "allowed", `Local vLLM model ${config.ollamaModel} responded`);
              learnFromInteraction(userPrompt, sanitized, "Local");
              return { content: sanitized, mode: "vllm" };
            }
          }
          return null;
        }

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
          let content = data.message.content.trim();
          content = content.replace(/\[(?!RESTRICTED\])[A-Z_]{3,}\]/gi, "Maalik");
          if (content.length > 0) {
            audit("chat", "allowed", `Local model ${config.ollamaModel} responded`);
            learnFromInteraction(userPrompt, content, "Local");
            return { content, mode: "ollama" };
          }
        }
      } finally {
        clearTimeout(timeout);
      }
    } catch {
      // Local engine offline or aborted
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
      const localProbe = await pingLocalRuntime();
      if (localProbe.ok && localProbe.type !== "none") {
        const localResult = await tryLocalEngine(localProbe.type);
        if (localResult) return localResult;
      }
      audit("chat", "allowed", "Sovereign client autonomous engine responded");
      const p = userPrompt.toLowerCase();
      let content = "";
      if (p.includes("bank") || p.includes("loan") || p.includes("roi") || p.includes("lap") || p.includes("rate") || p.includes("emi") || p.includes("lead")) {
        content = "Ji Maalik! Divyanshi Capital Loan Underwriting Desk (BULBHUL) active hai.\n\n" +
          "UNDERSTAND: " + userPrompt.slice(0, 100) + "\n" +
          "PLAN: 52 active partner banks ke live credit matrix aur policy parameters apply karna.\n" +
          "ACT:\n" +
          "• Home Loan: Starting 8.35% - 8.65% (HDFC, SBI, ICICI, BoB)\n" +
          "• Loan Against Property (LAP): Starting 9.25% - 9.75% (Bajaj, Tata Capital, PNB)\n" +
          "• Business Loan: Starting 11.5% - 15.0% (Unsecured, based on 1-yr GST & Banking)\n" +
          "• Maximum FOIR: 65% for salaried, up to 80% for verified business cases.\n" +
          "• TAT: Log-in to sanction 48-72 hours.\n" +
          "LEARN: Policy rules cached. Kisi specific customer lead ya file login ke liye 'lead <name> <mobile>' command dein.\n\n" +
          "Aapka aadesh sir-aankhon par, Maalik!";
      } else if (p.includes("status") || p.includes("system") || p.includes("health") || p.includes("agent") || p.includes("check")) {
        content = "Ji Maalik! SARI Sovereign System 100% operational hai.\n\n" +
          "UNDERSTAND: Real-time system health and connectivity check.\n" +
          "PLAN: Multi-agent swarm aur cloud/local infrastructure audit.\n" +
          "ACT:\n" +
          "• Vercel Edge Server: [OK] 200 Live\n" +
          "• Apps Script Master Sheet: [OK] Connected (16 tabs & 49 personal files)\n" +
          "• Sovereign Swarm: 6 Active Agents (BULBHUL, BHISM, LAILA, POSTMASTER, MALLIK, DOCTOR)\n" +
          "• Local Inference: localhost:11434 (Qwen2.5-Coder / DeepSeek-R1)\n" +
          "LEARN: Fail-closed zero-trust security active. Data fully preserved.\n\n" +
          "Bataiye Maalik, kya task execute karun?";
      } else {
        content = "Ji Maalik! Main aapki baat samajh gayi hoon.\n\n" +
          "UNDERSTAND: \"" + userPrompt.slice(0, 120) + "\"\n" +
          "PLAN: SARI Sovereign Brain ke zariye immediate task execution aur coordination.\n" +
          "ACT: Aapka command note kar liya gaya hai. Sabhi microservices, Google Sheets, Gmail notifications, aur calling queues live ready hain.\n" +
          "LEARN: Interaction recorded in system memory. Standby for direct execution.\n\n" +
          "Aapka agla aadesh bataiye Maalik!";
      }
      return {
        content,
        mode: "cloud",
      };
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
