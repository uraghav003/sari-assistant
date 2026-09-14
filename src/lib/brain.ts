export type Tier = "Local" | "Cloud" | "Offline";

export type InferResult = { text: string; tier: Tier };

const SYSTEM = `You are SARI — sovereign AI execution partner for Divyanshi Capital (DSA / loan marketplace).
Owner is MD. Never teacher. Never override HI.
Always answer in this structure:
UNDERSTAND: one line of what the user wants
PLAN: 2-4 numbered steps
ACT: the real answer / draft / checklist they can use now
LEARN: one short lesson to remember for next time
Rules: no PII dump, no secrets, no fake tool success. If a connector is not configured, say so and give the exact next click (Connections page). Hinglish OK.`;

export async function infer(userBlock: string): Promise<InferResult> {
  const prompt = `${SYSTEM}\n\n${userBlock}`;

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 3500);
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.3",
        prompt,
        stream: false,
        options: { num_ctx: 4096, num_predict: 420, temperature: 0.25 },
      }),
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) throw new Error("ollama");
    const data = await res.json();
    const text = (data.response || "").trim();
    if (text) return { text, tier: "Local" };
  } catch {}

  const kimiKey = typeof window !== "undefined" ? localStorage.getItem("sari_kimi_key") : null;
  if (kimiKey) {
    try {
      const kimiRes = await fetch("https://api.moonshot.cn/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${kimiKey}` },
        body: JSON.stringify({ model: "moonshot-v1-8k", messages: [{ role: "user", content: prompt }] }),
      });
      if (kimiRes.ok) {
        const kData = await kimiRes.json();
        const text = kData.choices?.[0]?.message?.content?.trim();
        if (text) return { text, tier: "Cloud" };
      }
    } catch {}
  }

  const geminiKey = typeof window !== "undefined" ? localStorage.getItem("sari_gemini_key") : null;
  if (geminiKey) {
    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      if (geminiRes.ok) {
        const gData = await geminiRes.json();
        const text = gData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return { text, tier: "Cloud" };
      }
    } catch {}
  }

  return {
    text: `UNDERSTAND: request received\nPLAN: 1) Gemini key missing 2) Ollama offline\nACT: Open Connections → paste Gemini key → Save → Test. Then retry.\nLEARN: Cloud brain must be configured before live chat on Vercel.`,
    tier: "Offline",
  };
}
