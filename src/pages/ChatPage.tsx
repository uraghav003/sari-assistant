import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, Sparkles, Send, Paperclip, Wand2 } from "lucide-react";
import { infer, type Tier } from "../lib/brain";
import { bumpRun, contextBlock, extractLesson, matchSkill, loadSkills } from "../lib/skills-engine";

type Message = { id: string; role: "user" | "sari"; content: string; time: string };

const STORAGE_KEY = "sari_chat_history_v1";

const seed: Message[] = [{
  id: "1",
  role: "sari",
  content: "Namaste. SARI think-loop ON.\nSkills + auto-learn active.\nGemini key Connections pe save karo — phir real answers aayenge.",
  time: "Just now",
}];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return seed;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : seed;
  });
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [autoListening, setAutoListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [tierStatus, setTierStatus] = useState<Tier>("Cloud");
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => { isSpeakingRef.current = speaking; }, [speaking]);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-IN";
    recognition.onresult = (event: any) => {
      if (isSpeakingRef.current) return;
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      if (transcript) handleCommand(transcript);
    };
    recognition.onend = () => {
      if (autoListening && !isSpeakingRef.current) {
        try { recognition.start(); } catch {}
      }
    };
    recognitionRef.current = recognition;
    if (autoListening) {
      try { recognition.start(); } catch {}
    }
    return () => { try { recognition.stop(); } catch {} };
  }, [autoListening]);

  function speakText(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/UNDERSTAND:|PLAN:|ACT:|LEARN:/g, ""));
    utterance.rate = 1.05;
    utterance.onstart = () => {
      setSpeaking(true);
      try { recognitionRef.current?.stop(); } catch {}
    };
    const resume = () => {
      setSpeaking(false);
      if (autoListening) { try { recognitionRef.current?.start(); } catch {} }
    };
    utterance.onend = resume;
    utterance.onerror = resume;
    window.speechSynthesis.speak(utterance);
  }

  async function handleCommand(commandText?: string) {
    const query = (commandText || input).trim();
    if (!query) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: query, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    const nextMessages = [...messagesRef.current, userMsg];
    setMessages(nextMessages);
    if (!commandText) setInput("");
    setTyping(true);

    const hit = matchSkill(query, loadSkills());
    if (hit) bumpRun(hit.id);

    const history = nextMessages.slice(-8).map((m) => `${m.role}: ${m.content}`).join("\n");
    const out = await infer(`${contextBlock(query)}\nRECENT:\n${history}`);
    extractLesson(out.text);

    setTierStatus(out.tier);
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "sari", content: out.text, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    setTyping(false);
    speakText(out.text);
  }

  function toggleAutoListening() {
    const nextState = !autoListening;
    setAutoListening(nextState);
    if (recognitionRef.current) {
      try { nextState ? recognitionRef.current.start() : recognitionRef.current.stop(); } catch {}
    }
  }

  const badgeColor = tierStatus === "Local" ? "var(--green)" : tierStatus === "Cloud" ? "#3b82f6" : "#71717a";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="brand-icon" style={{ width: 38, height: 38 }}><Sparkles size={18} color="#fff" /></div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>SARI Think + Skills</div>
            <div style={{ fontSize: 11.5, color: badgeColor, display: "flex", alignItems: "center", gap: 6 }}>
              <span className="dot" style={{ background: badgeColor }} />
              {tierStatus} · UNDERSTAND / PLAN / ACT / LEARN
            </div>
          </div>
        </div>
        <button onClick={toggleAutoListening} className={autoListening ? "btn-primary" : "btn-secondary"} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 12 }}>
          {autoListening ? <Mic size={16} /> : <MicOff size={16} />}
          Voice {autoListening ? "ON" : "OFF"}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        {messages.map((m) => (
          <div key={m.id} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "72%", borderRadius: 16, padding: "12px 16px", fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre-wrap", background: m.role === "user" ? "rgba(147,51,234,0.28)" : "var(--card)", border: `1px solid ${m.role === "user" ? "rgba(168,85,247,0.3)" : "var(--border)"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <span>{m.content}</span>
                {m.role === "sari" && (
                  <button onClick={() => speakText(m.content)} style={{ color: "var(--muted)", padding: 4 }}><Volume2 size={15} /></button>
                )}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 8 }}>{m.time}</div>
            </div>
          </div>
        ))}
        {typing && <div className="card" style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted)", width: "fit-content" }}>Thinking...</div>}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: 16, borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "6px 8px 6px 12px" }}>
          <button style={{ color: "var(--muted)", padding: 6 }}><Paperclip size={16} /></button>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleCommand()} placeholder="Skill run / socho / lead brief..." style={{ border: "none", background: "transparent", flex: 1, padding: "8px 4px" }} />
          <button onClick={toggleAutoListening} style={{ color: autoListening ? "var(--green)" : "var(--muted)", padding: 6 }}><Mic size={18} /></button>
          <button onClick={() => handleCommand()} className="btn-primary" style={{ padding: "8px 12px", borderRadius: 10 }} disabled={!input.trim()}><Send size={15} /></button>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}><Wand2 size={12} /> Skills persist in browser. Gemini key = real-world answers.</div>
      </div>
    </div>
  );
}
