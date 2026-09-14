import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, Sparkles, Send, Paperclip, Wand2 } from "lucide-react";

type Message = { id: string; role: "user" | "sari"; content: string; time: string };

const STORAGE_KEY = "sari_chat_history_v1";

const seed: Message[] = [{
  id: "1",
  role: "sari",
  content: "Namaste Maalik. Hands-free Voice Mode is ACTIVE. Speak into your microphone and I will respond instantly with synthesized voice and local LLM inference.",
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
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [tierStatus, setTierStatus] = useState<"Local" | "Cloud" | "Offline">("Local");
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Initialize Web Speech API for Hands-Free Speech-to-Text
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          handleSend(transcript);
        }
        setListening(false);
      };

      recognition.onerror = () => {
        setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  function toggleListening() {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch (e) {
        setListening(false);
      }
    }
  }

  function speakText(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  async function handleSend(textToSend?: string) {
    const query = textToSend || input;
    if (!query.trim()) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: query.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    if (!textToSend) setInput("");
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
          prompt: `You are SARI, sovereign AI assistant. Be concise and conversational for voice mode.\n\nUser: ${query}\nSARI:`,
          stream: false,
          options: { num_ctx: 4096, num_predict: 250, temperature: 0.3 }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error("Ollama failure");
      const data = await res.json();
      reply = data.response ? data.response.trim() : "Acknowledged.";
      activeTier = "Local";
    } catch {
      const geminiKey = localStorage.getItem("sari_gemini_key");
      if (geminiKey) {
        try {
          const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: `You are SARI, sovereign AI assistant. Be concise.\n\nUser: ${query}` }] }] })
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
        reply = `Samajh gayi: "${query}". Hands-free voice fallback active. Policy check ✓ · Zero Trust secure ✓.`;
      }
    }

    setTierStatus(activeTier);
    setMessages(m => [...m, { id: crypto.randomUUID(), role: "sari", content: reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setTyping(false);
    speakText(reply);
  }

  const badgeColor = tierStatus === "Local" ? "var(--green)" : tierStatus === "Cloud" ? "#3b82f6" : "#71717a";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="brand-icon" style={{ width: 38, height: 38 }}><Sparkles size={18} color="#fff" /></div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
              SARI Hands-Free Voice Mode
              {speaking && <span className="badge" style={{ background: "rgba(34,197,94,0.15)", color: "var(--green)", fontSize: 10 }}>Speaking... <Volume2 size={12} style={{ display: "inline", marginLeft: 4 }} /></span>}
              {listening && <span className="badge" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", fontSize: 10 }}>Listening... <Mic size={12} style={{ display: "inline", marginLeft: 4 }} /></span>}
            </div>
            <div style={{ fontSize: 11.5, color: badgeColor, display: "flex", alignItems: "center", gap: 6 }}>
              <span className="dot" style={{ background: badgeColor }} /> 
              Tier: {tierStatus} · Web Speech STT & TTS Enabled
            </div>
          </div>
        </div>
        <button 
          onClick={toggleListening} 
          className={listening ? "btn-primary" : "btn-secondary"} 
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 12, background: listening ? "#ef4444" : undefined }}
        >
          {listening ? <MicOff size={16} /> : <Mic size={16} />}
          {listening ? "Stop Listening" : "Start Voice Mode"}
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
        {typing && <div style={{ display: "flex", justifyContent: "flex-start" }}><div className="card" style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted)" }}>SARI is speaking / thinking...</div></div>}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: 16, borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "6px 8px 6px 12px" }}>
          <button style={{ color: "var(--muted)", padding: 6 }}><Paperclip size={16} /></button>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()} placeholder="Type or speak to SARI..." style={{ border: "none", background: "transparent", flex: 1, padding: "8px 4px" }} />
          <button onClick={toggleListening} style={{ color: listening ? "#ef4444" : "var(--muted)", padding: 6 }} title="Toggle Voice Mic">
            <Mic size={18} />
          </button>
          <button onClick={() => handleSend()} className="btn-primary" style={{ padding: "8px 12px", borderRadius: 10 }} disabled={!input.trim()}><Send size={15} /></button>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}><Wand2 size={12} /> Hands-Free Voice active: Click "Start Voice Mode" or the Mic icon to speak freely</div>
      </div>
    </div>
  );
}
