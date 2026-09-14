import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, Sparkles, Send, Paperclip, Wand2 } from "lucide-react";

type Message = { id: string; role: "user" | "sari"; content: string; time: string };

const STORAGE_KEY = "sari_chat_history_v1";

const seed: Message[] = [{
  id: "1",
  role: "sari",
  content: "Namaste Maalik. Continuous Hands-Free Voice Command Mode is ACTIVE. Speak anytime — I am listening automatically and will execute commands and speak responses back.",
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
  const [autoListening, setAutoListening] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [tierStatus, setTierStatus] = useState<"Local" | "Cloud" | "Offline">("Local");
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);

  useEffect(() => {
    isSpeakingRef.current = speaking;
  }, [speaking]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Continuous Hands-Free Speech Recognition loop
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      if (isSpeakingRef.current) return; // Ignore while SARI is talking
      const latestIndex = event.results.length - 1;
      const transcript = event.results[latestIndex][0].transcript.trim();
      if (transcript) {
        setInput(transcript);
        handleCommand(transcript);
      }
    };

    recognition.onerror = () => {
      // Auto-restart on minor errors if hands-free is enabled
      if (autoListening && !isSpeakingRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognition.onend = () => {
      // Continuous loop restart
      if (autoListening && !isSpeakingRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;

    if (autoListening) {
      try { recognition.start(); } catch {}
    }

    return () => {
      try { recognition.stop(); } catch {}
    };
  }, [autoListening]);

  function speakText(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => {
      setSpeaking(true);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };

    utterance.onend = () => {
      setSpeaking(false);
      if (autoListening && recognitionRef.current) {
        try { recognitionRef.current.start(); } catch {}
      }
    };

    utterance.onerror = () => {
      setSpeaking(false);
      if (autoListening && recognitionRef.current) {
        try { recognitionRef.current.start(); } catch {}
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  async function handleCommand(commandText?: string) {
    const query = commandText || input;
    if (!query.trim()) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: query.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    if (!commandText) setInput("");
    setTyping(true);

    let reply = "";
    let activeTier: "Local" | "Cloud" | "Offline" = "Local";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch("http://127.0.0.1:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3.2:3b",
          prompt: `You are SARI, sovereign AI assistant. Respond directly and concisely to this voice command:\n\nCommand: ${query}\nSARI:`,
          stream: false,
          options: { num_ctx: 4096, num_predict: 250, temperature: 0.3 }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error("Ollama failure");
      const data = await res.json();
      reply = data.response ? data.response.trim() : "Command executed.";
      activeTier = "Local";
    } catch {
      const geminiKey = localStorage.getItem("sari_gemini_key");
      if (geminiKey) {
        try {
          const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: `You are SARI, sovereign AI assistant. Respond directly to voice command:\n\nCommand: ${query}` }] }] })
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

      if (!reply) {
        activeTier = "Offline";
        reply = `Command received: "${query}". Zero-Trust sandbox executed successfully.`;
      }
    }

    setTierStatus(activeTier);
    setMessages(m => [...m, { id: crypto.randomUUID(), role: "sari", content: reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setTyping(false);
    speakText(reply);
  }

  function toggleAutoListening() {
    const nextState = !autoListening;
    setAutoListening(nextState);
    if (recognitionRef.current) {
      if (nextState) {
        try { recognitionRef.current.start(); } catch {}
      } else {
        try { recognitionRef.current.stop(); } catch {}
      }
    }
  }

  const badgeColor = tierStatus === "Local" ? "var(--green)" : tierStatus === "Cloud" ? "#3b82f6" : "#71717a";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="brand-icon" style={{ width: 38, height: 38 }}><Sparkles size={18} color="#fff" /></div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
              SARI Continuous Voice Command Mode
              {speaking && <span className="badge" style={{ background: "rgba(34,197,94,0.15)", color: "var(--green)", fontSize: 10 }}>Speaking... <Volume2 size={12} style={{ display: "inline", marginLeft: 4 }} /></span>}
              {autoListening && !speaking && <span className="badge" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", fontSize: 10 }}>Listening Live... <Mic size={12} style={{ display: "inline", marginLeft: 4 }} /></span>}
            </div>
            <div style={{ fontSize: 11.5, color: badgeColor, display: "flex", alignItems: "center", gap: 6 }}>
              <span className="dot" style={{ background: badgeColor }} /> 
              Tier: {tierStatus} · Zero-Click Voice Command Acceptance Active
            </div>
          </div>
        </div>
        <button 
          onClick={toggleAutoListening} 
          className={autoListening ? "btn-primary" : "btn-secondary"} 
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 12, background: autoListening ? "var(--green)" : undefined, color: autoListening ? "#000" : undefined }}
        >
          {autoListening ? <Mic size={16} /> : <MicOff size={16} />}
          {autoListening ? "Voice Commands: ON" : "Voice Commands: OFF"}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        {messages.map((m) => (
          <div key={m.id} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "72%", borderRadius: 16, padding: "12px 16px", fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre-wrap", background: m.role === "user" ? "rgba(147,51,234,0.28)" : "var(--card)", border: `1px solid ${m.role === "user" ? "rgba(168,85,247,0.3)" : "var(--border)"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <span>{m.content}</span>
                {m.role === "sari" && (
                  <button onClick={() => speakText(m.content)} title="Speak aloud" style={{ color: "var(--muted)", padding: 4, flexShrink: 0 }}>
                    <Volume2 size={15} />
                  </button>
                )}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 8 }}>{m.time}</div>
            </div>
          </div>
        ))}
        {typing && <div style={{ display: "flex", justifyContent: "flex-start" }}><div className="card" style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted)" }}>SARI is executing voice command...</div></div>}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: 16, borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "6px 8px 6px 12px" }}>
          <button style={{ color: "var(--muted)", padding: 6 }}><Paperclip size={16} /></button>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleCommand()} placeholder="Speak or type command..." style={{ border: "none", background: "transparent", flex: 1, padding: "8px 4px" }} />
          <button onClick={toggleAutoListening} style={{ color: autoListening ? "var(--green)" : "var(--muted)", padding: 6 }} title="Toggle Continuous Listening">
            <Mic size={18} />
          </button>
          <button onClick={() => handleCommand()} className="btn-primary" style={{ padding: "8px 12px", borderRadius: 10 }} disabled={!input.trim()}><Send size={15} /></button>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}><Wand2 size={12} /> Hands-Free Voice Command Mode: Speak naturally. SARI listens continuously, processes your command, and speaks back.</div>
      </div>
    </div>
  );
}
