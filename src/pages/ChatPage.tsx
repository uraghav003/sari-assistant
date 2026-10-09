import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, Sparkles, Send, Paperclip, Wand2, Compass, Mail, ShieldAlert, Cpu } from "lucide-react";
import { infer, type Tier } from "../lib/brain";
import { bumpRun, contextBlock, extractLesson, matchSkill, loadSkills } from "../lib/skills-engine";

interface Message {
  id: string;
  role: "user" | "sari";
  content: string;
  time: string;
}

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
    length: number;
  };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

const STORAGE_KEY = "sari_chat_history_v1";

const seedMessages: Message[] = [
  {
    id: "welcome-1",
    role: "sari",
    content:
      "UNDERSTAND: Session initialized\nPLAN: 1) Verified Cloud Gemini 2.0 & Local Ollama 2) Connected Apps Script 3) Loaded sovereign memory\nACT: Pranam Maalik! SARI Personal Intelligence 11.2 is active. How may I serve Divyanshi Capital today?\nLEARN: Multi-tier sovereign bridge ready.",
    time: "04:48 AM",
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return seedMessages;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : seedMessages;
    } catch {
      return seedMessages;
    }
  });

  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [autoListening, setAutoListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [tierStatus, setTierStatus] = useState<Tier>("Cloud");
  const [showHologram, setShowHologram] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isSpeakingRef = useRef(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

    if (!SpeechRec) return;
    const recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-IN";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (isSpeakingRef.current) return;
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      if (transcript) handleCommand(transcript);
    };

    recognition.onend = () => {
      if (autoListening && !isSpeakingRef.current) {
        try {
          recognition.start();
        } catch {}
      }
    };

    recognitionRef.current = recognition;
    if (autoListening) {
      try {
        recognition.start();
      } catch {}
    }
    return () => {
      try {
        recognition.stop();
      } catch {}
    };
  }, [autoListening]);

  function speakText(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/(UNDERSTAND:|PLAN:|ACT:|LEARN:|\*)/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.onstart = () => {
      setSpeaking(true);
      try {
        recognitionRef.current?.stop();
      } catch {}
    };
    const resume = () => {
      setSpeaking(false);
      if (autoListening) {
        try {
          recognitionRef.current?.start();
        } catch {}
      }
    };
    utterance.onend = resume;
    utterance.onerror = resume;
    window.speechSynthesis.speak(utterance);
  }

  async function handleCommand(commandText?: string) {
    const query = (commandText || input).trim();
    if (!query) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: query,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const nextMessages = [...messagesRef.current, userMsg];
    setMessages(nextMessages);
    if (!commandText) setInput("");
    setTyping(true);

    const hit = matchSkill(query, loadSkills());
    if (hit) bumpRun(hit.id);

    const history = nextMessages
      .slice(-8)
      .map((m) => `${m.role === "user" ? "Maalik" : "SARI"}: ${m.content}`)
      .join("\n");

    const out = await infer(`${contextBlock(query)}\nRECENT:\n${history}`);
    extractLesson(out.text);

    setTierStatus(out.tier);
    setMessages((m) => [
      ...m,
      {
        id: crypto.randomUUID(),
        role: "sari",
        content: out.text,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setTyping(false);
    speakText(out.text);
  }

  function toggleAutoListening() {
    const nextState = !autoListening;
    setAutoListening(nextState);
    if (recognitionRef.current) {
      try {
        nextState ? recognitionRef.current.start() : recognitionRef.current.stop();
      } catch {}
    }
  }

  const badgeColor = tierStatus === "Local" ? "var(--green)" : tierStatus === "Cloud" ? "#3b82f6" : "#71717a";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "82vh", background: "radial-gradient(circle at 10% 20%, rgba(13,30,58,0.6) 0%, transparent 60%)" }}>
      {/* Top Holographic Navigation Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "rgba(6,17,44,0.7)", backdropFilter: "blur(10px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--cyan)" }}>
            S
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            SARI <span style={{ color: "var(--muted)", fontWeight: 400, marginLeft: 6 }}>| PERSONAL INTELLIGENCE / 11.2</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 11, color: "var(--green)", display: "flex", alignItems: "center", gap: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 8px var(--green)" }} />
            Private Session Connected
          </span>
          <button onClick={() => setShowHologram(!showHologram)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "inherit", padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
            {showHologram ? "Compact Chat" : "Hologram Persona"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
        {/* Left Pane: SARI Wireframe Hologram Persona (Image #1 Design) */}
        {showHologram && (
          <div style={{ width: "38%", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 24, position: "relative", overflow: "hidden" }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "var(--muted)", textTransform: "uppercase" }}>
                A Presence, Beyond the Screen.
              </div>
              <div style={{ fontSize: 11, color: "var(--cyan)", marginTop: 4, letterSpacing: "0.1em" }}>
                01 / SARI
              </div>
            </div>

            {/* Wireframe Hologram Face SVG Animation */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "20px 0", position: "relative" }}>
              <svg width="220" height="220" viewBox="0 0 200 200" style={{ filter: "drop-shadow(0 0 16px rgba(56,189,248,0.25))" }}>
                {/* Orbit Rings */}
                <ellipse cx="100" cy="100" rx="90" ry="35" fill="none" stroke="rgba(56,189,248,0.2)" strokeWidth="1" strokeDasharray="4 2" transform="rotate(-25 100 100)">
                  <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="20s" repeatCount="indefinite" />
                </ellipse>
                <ellipse cx="100" cy="100" rx="90" ry="35" fill="none" stroke="rgba(56,189,248,0.3)" strokeWidth="1" transform="rotate(35 100 100)">
                  <animateTransform attributeName="transform" type="rotate" from="360 100 100" to="0 100 100" dur="25s" repeatCount="indefinite" />
                </ellipse>

                {/* SARI Wireframe Head Silhouette */}
                <path d="M 60,60 C 60,30 140,30 140,60 C 140,110 130,140 100,160 C 70,140 60,110 60,60 Z" fill="none" stroke="rgba(56,189,248,0.4)" strokeWidth="1.2" />
                <path d="M 70,55 C 85,45 115,45 130,55" fill="none" stroke="rgba(56,189,248,0.3)" strokeWidth="1" />
                
                {/* Eyes & Neural Nodes */}
                <ellipse cx="82" cy="78" rx="6" ry="3" fill="none" stroke="var(--cyan)" strokeWidth="1.2" />
                <circle cx="82" cy="78" r="1.5" fill="var(--cyan)" />
                <ellipse cx="118" cy="78" rx="6" ry="3" fill="none" stroke="var(--cyan)" strokeWidth="1.2" />
                <circle cx="118" cy="78" r="1.5" fill="var(--cyan)" />

                {/* Mind Node Core (Pulsing Center) */}
                <circle cx="100" cy="62" r="2.5" fill="#f59e0b">
                  <animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite" />
                </circle>

                {/* Facial Grid Lines */}
                <path d="M 100,68 L 100,105 L 94,115 L 106,115" fill="none" stroke="rgba(56,189,248,0.5)" strokeWidth="1" />
                <path d="M 90,132 Q 100,136 110,132" fill="none" stroke="rgba(56,189,248,0.6)" strokeWidth="1.2" />
                
                {/* Cheek Matrix */}
                <path d="M 72,95 L 85,115 L 75,125" fill="none" stroke="rgba(56,189,248,0.25)" strokeWidth="1" />
                <path d="M 128,95 L 115,115 L 125,125" fill="none" stroke="rgba(56,189,248,0.25)" strokeWidth="1" />

                {/* Neck & Torso Grid */}
                <path d="M 85,155 L 70,185 L 130,185 L 115,155" fill="none" stroke="rgba(56,189,248,0.3)" strokeWidth="1" />
              </svg>
            </div>

            <div>
              <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                YOUR SPACE. YOUR PACE.
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "0.05em", color: "var(--fg)" }}>
                Intelligence
              </div>
            </div>
          </div>
        )}

        {/* Right Pane: Conversation & Dynamic Focus Actions */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Welcome Banner & Focus Quick Action Cards (Image #1 Design) */}
          <div style={{ padding: "20px 24px 12px", borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.15)" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
              The Conversation
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4, letterSpacing: "-0.01em" }}>
              A little less noise. A little more clarity.
            </h2>
            <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14 }}>
              Your private session is ready. SARI can use relevant saved context from your existing memory vault.
            </p>

            {/* Quick Focus Action Chips */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div
                onClick={() => handleCommand("Find my focus: optimize loan pipeline")}
                style={{ padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", transition: "all 0.2s" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600 }}>
                  <Compass size={14} style={{ color: "var(--cyan)" }} /> Find my focus
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Make room for what matters</div>
              </div>

              <div
                onClick={() => handleCommand("Read my inbox and summarize pending approvals")}
                style={{ padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", transition: "all 0.2s" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600 }}>
                  <Mail size={14} style={{ color: "var(--purple)" }} /> Read my inbox
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Authorized account only</div>
              </div>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, fontSize: 11, color: "var(--muted)" }}>
                    <span>{isUser ? "Maalik" : "SARI"}</span>
                    <span>·</span>
                    <span>{m.time}</span>
                  </div>
                  <div
                    style={{
                      maxWidth: "85%",
                      padding: "12px 16px",
                      borderRadius: isUser ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                      background: isUser ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.04)",
                      border: isUser ? "1px solid rgba(59,130,246,0.3)" : "1px solid var(--border)",
                      fontSize: 13.5,
                      lineHeight: "1.55",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}
            {typing && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 12, padding: "8px 0" }}>
                <Sparkles size={14} className="spin" style={{ color: "var(--cyan)" }} />
                SARI is reasoning...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input Dialogue Bar (Image #1 Style: "Tell me, Malik...") */}
          <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", background: "rgba(6,17,44,0.85)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                onClick={toggleAutoListening}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: autoListening ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.05)",
                  border: autoListening ? "1px solid #ef4444" : "1px solid var(--border)",
                  color: autoListening ? "#ef4444" : "var(--muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                title={autoListening ? "Mute Microphone" : "Enable Voice Listening"}
              >
                {autoListening ? <Mic size={18} /> : <MicOff size={18} />}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleCommand();
                  }
                }}
                placeholder="Tell me, Malik..."
                style={{
                  flex: 1,
                  background: "rgba(0,0,0,0.25)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "11px 16px",
                  color: "inherit",
                  fontSize: 13.5,
                  outline: "none",
                }}
              />

              <button
                onClick={() => handleCommand()}
                disabled={typing || !input.trim()}
                style={{
                  padding: "11px 20px",
                  background: "var(--cyan)",
                  color: "#06112C",
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  opacity: typing || !input.trim() ? 0.5 : 1,
                }}
              >
                <Send size={15} /> Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
