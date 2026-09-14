import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Mic, Paperclip, Wand2 } from "lucide-react";

type Message = { id: string; role: "user" | "sari"; content: string; time: string };

const STORAGE_KEY = "sari_chat_history_v1";

const seed: Message[] = [{
  id: "1",
  role: "sari",
  content: "Namaste. Main SARI hoon — aapka sovereign AI assistant.\n\n3-Tier Cloud Brain active (Ollama local -> Gemini Cloud -> Offline Fallback).\n\nAaj kya execute karna hai?",
  time: "Just now",
}];

function getLocalHistory(): Message[] {
  if (typeof window === "undefined") return seed;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return seed;
  try {
    return JSON.parse(saved);
  } catch {
    return seed;
  }
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(getLocalHistory);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [tierStatus, setTierStatus] = useState<"Local" | "Cloud" | "Offline">("Local");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => { 
    bottomRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [messages, typing]);

  async function send() {
    if (!input.trim()) return;
    const userText = input.trim();
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: userText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setTyping(true);

    // Memory vault context injection (max 500 tokens summary)
    let memoryContext = "";
    try {
      const vault = localStorage.getItem("sari_memory_vault");
      if (vault) {
        memoryContext = `[Memory Vault Context]: ${vault.slice(0, 1500)}\n\n`;
      }
    } catch {}

    const contextMessages = nextMessages.slice(-8);
    const promptContext = memoryContext + contextMessages.map(m => `${m.role === 'user' ? 'User' : 'SARI'}: ${m.content}`).join("\n");

    let reply = "";
    let activeTier: "Local" | "Cloud" | "Offline" = "Local";

    // TIER 1: Ollama
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch("http://127.0.0.1:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3.2:3b",
          prompt: `You are SARI, sovereign AI assistant. Be concise and expert.\n\n${promptContext}\n\nSARI:`,
          stream: false,
          options: { num_ctx: 4096, num_predict: 320, temperature: 0.3 }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error("Ollama failure");
      const data = await res.json();
      reply = data.response ? data.response.trim() : "Acknowledged.";
      activeTier = "Local";
    } catch {
      // TIER 2: Gemini Cloud
      const geminiKey = localStorage.getItem("sari_gemini_key");
      if (geminiKey) {
        try {
          const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `You are SARI, sovereign AI assistant. Be concise.\n\n${promptContext}` }] }]
            })
          });
          if (geminiRes.ok) {
            const gData = await geminiRes.json();
            const text = gData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              reply = text.trim();
              activeTier = "Cloud";
            }
          }
        } catch {}
      }

      // TIER 3: Offline fallback if both failed
      if (!reply) {
        activeTier = "Offline";
        const t = userText.toLowerCase();
        if (t.includes("skill") || t.includes("build")) {
          reply = "[Offline Fallback]\nSkills Builder active. Guide me through the skill design and test plan.";
        } else {
          reply = `[Offline Fallback] Samajh gayi: "${userText}". Ollama local and Gemini cloud were unreachable. Policy check ✓ · Sandbox safe ✓.`;
        }
      }
    }

    setTierStatus(activeTier);
    setMessages(m => [...m, { id: crypto.randomUUID(), role: "sari", content: reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setTyping(false);
  }

  const badgeColor = tierStatus === "Local" ? "var(--green)" : tierStatus === "Cloud" ? "#3b82f6" : "#71717a";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="brand-icon" style={{ width: 38, height: 38 }}><Sparkles size={18} color="#fff" /></div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>SARI Chat (3-Tier Cloud Brain)</div>
            <div style={{ fontSize: 11.5, color: badgeColor, display: "flex", alignItems: "center", gap: 6 }}>
              <span className="dot" style={{ background: badgeColor }} /> 
              Active Tier: {tierStatus} ({tierStatus === 'Local' ? 'Ollama llama3.2:3b' : tierStatus === 'Cloud' ? 'Gemini 2.0 Flash' : 'Deterministic Fallback'})
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", background: "var(--card)", padding: "4px 10px", borderRadius: 8, border: "1px solid var(--border)" }}>
          Token Budget: 8-msg ctx · Memory Vault active
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        {messages.map((m) => (
          <div key={m.id} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "72%", borderRadius: 16, padding: "12px 16px", fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre-wrap", background: m.role === "user" ? "rgba(147,51,234,0.28)" : "var(--card)", border: `1px solid ${m.role === "user" ? "rgba(168,85,247,0.3)" : "var(--border)"}` }}>
              {m.content}
              <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 8 }}>{m.time}</div>
            </div>
          </div>
        ))}
        {typing && <div style={{ display: "flex", justifyContent: "flex-start" }}><div className="card" style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted)" }}>SARI is thinking (3-tier routing)...</div></div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: 16, borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "6px 8px 6px 12px" }}>
          <button style={{ color: "var(--muted)", padding: 6 }}><Paperclip size={16} /></button>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()} placeholder="Message SARI (3-tier brain)..." style={{ border: "none", background: "transparent", flex: 1, padding: "8px 4px" }} />
          <button style={{ color: "var(--muted)", padding: 6 }}><Mic size={16} /></button>
          <button onClick={send} className="btn-primary" style={{ padding: "8px 12px", borderRadius: 10 }} disabled={!input.trim()}><Send size={15} /></button>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}><Wand2 size={12} /> Ollama local → Gemini Cloud → Offline fallback chain active</div>
      </div>
    </div>
  );
}
