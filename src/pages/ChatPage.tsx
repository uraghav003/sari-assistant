import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Mic, Paperclip, Wand2 } from "lucide-react";

type Message = { id: string; role: "user" | "sari"; content: string; time: string };

const seed: Message[] = [{
  id: "1",
  role: "sari",
  content: "Namaste. Main SARI hoon — aapka sovereign AI assistant.\n\nMain channels manage kar sakti hoon, skills bana sakti hoon, aur aapke guidance se naya capability build kar sakti hoon.\n\nAaj kya execute karna hai?",
  time: "Just now",
}];

function replyFor(input: string): string {
  const t = input.toLowerCase();
  if (t.includes("skill") || t.includes("build") || t.includes("bana"))
    return "Skills Builder open karo (left menu). Wahan aap guide karoge — main skill design, steps aur test plan generate karungi.";
  if (t.includes("email") || t.includes("gmail") || t.includes("inbox"))
    return "Email channel sandbox mode mein connected hai. Real Gmail connector lagane ke baad main triage, draft aur send kar sakti hoon.";
  if (t.includes("status") || t.includes("help"))
    return "Main abhi yeh kar sakti hoon:\n• Command Center\n• Chat + guidance\n• Self-Build Skills\n• Connections / Policies / Audit";
  return `Samajh gayi: "${input}"\n\nPolicy check ✓ · Sandbox safe ✓\n\nConfirm karo ya Skills Builder mein detailed capability design karte hain.`;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(seed);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);

  async function send() {
    if (!input.trim()) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: input.trim(), time: "Just now" };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);
    await new Promise((r) => setTimeout(r, 700));
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "sari", content: replyFor(userMsg.content), time: "Just now" }]);
    setTyping(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
        <div className="brand-icon" style={{ width: 38, height: 38 }}><Sparkles size={18} color="#fff" /></div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>SARI Chat</div>
          <div style={{ fontSize: 11.5, color: "var(--green)", display: "flex", alignItems: "center", gap: 6 }}><span className="dot" /> Online · Lucy-grade · Skills-aware</div>
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
        {typing && <div style={{ display: "flex", justifyContent: "flex-start" }}><div className="card" style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted)" }}>SARI is thinking...</div></div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: 16, borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "6px 8px 6px 12px" }}>
          <button style={{ color: "var(--muted)", padding: 6 }}><Paperclip size={16} /></button>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()} placeholder="Command SARI... (try: build a skill)" style={{ border: "none", background: "transparent", flex: 1, padding: "8px 4px" }} />
          <button style={{ color: "var(--muted)", padding: 6 }}><Mic size={16} /></button>
          <button onClick={send} className="btn-primary" style={{ padding: "8px 12px", borderRadius: 10 }} disabled={!input.trim()}><Send size={15} /></button>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}><Wand2 size={12} /> Tip: Skills Builder se naya capability guide karke banao</div>
      </div>
    </div>
  );
}
