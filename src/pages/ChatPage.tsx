import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Send, Compass, Mail, RefreshCw, Trash2, Volume2 } from "lucide-react";
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
      "Good morning, Malik! 🌟 SARI Supreme Intelligence v11.2 fully active.\n\nAll keyword traps have been eliminated, and Gemini 2.0 Flash is live with multi-model cascade. Tell me your objective, and I will execute.",
    time: "Just now",
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
  const [clockTime, setClockTime] = useState("");
  const [showHologram, setShowHologram] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isSpeakingRef = useRef(false);
  const isThinkingRef = useRef(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // 1. Dynamic System Clock
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      let hrs = now.getHours();
      const mins = String(now.getMinutes()).padStart(2, "0");
      const ampm = hrs >= 12 ? "PM" : "AM";
      hrs = hrs % 12 || 12;
      setClockTime(`${String(hrs).padStart(2, "0")}:${mins} ${ampm}`);
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    isSpeakingRef.current = speaking;
  }, [speaking]);

  useEffect(() => {
    isThinkingRef.current = typing;
  }, [typing]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // 2. Fully Animated Cybernetic Avatar Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let eyeBlink = 0;
    let blinkSpeed = 0.08;
    let nextBlinkTime = Date.now() + 2500;
    let mouthOpenness = 0;

    const particles = Array.from({ length: 18 }, (_, i) => ({
      angle: (i / 18) * Math.PI * 2,
      speed: 0.008 + (i % 3) * 0.004,
      radius: 130 + (i % 4) * 20,
      size: 1.5 + (i % 3),
    }));

    function animateAvatar(timestamp: number) {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      const isThinking = isThinkingRef.current;
      const isSpeaking = isSpeakingRef.current;

      // Organic Breathing Motion
      const breathe = Math.sin(timestamp * 0.0018) * 4;
      const headY = cy + breathe;

      // Natural Blinking Logic
      if (Date.now() > nextBlinkTime) {
        eyeBlink += blinkSpeed;
        if (eyeBlink >= 1) {
          blinkSpeed = -0.12;
        } else if (eyeBlink <= 0) {
          eyeBlink = 0;
          blinkSpeed = 0.08;
          nextBlinkTime = Date.now() + 2500 + Math.random() * 3000;
        }
      }

      // Lip-Sync Mouth Motion
      if (isSpeaking) {
        mouthOpenness = Math.abs(Math.sin(timestamp * 0.016)) * 6;
      } else {
        mouthOpenness = 0;
      }

      // 1. Holographic Aura
      const auraGrad = ctx.createRadialGradient(cx, headY, 20, cx, headY, 170);
      auraGrad.addColorStop(0, isThinking ? "rgba(0, 255, 213, 0.18)" : "rgba(0, 255, 213, 0.05)");
      auraGrad.addColorStop(1, "transparent");
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(cx, headY, 170, 0, Math.PI * 2);
      ctx.fill();

      // 2. 3D Orbital Rings
      ctx.save();
      ctx.translate(cx, headY);

      ctx.save();
      ctx.rotate(0.35 + Math.sin(timestamp * 0.0006) * 0.05);
      ctx.beginPath();
      ctx.ellipse(0, 0, 160, 58, 0, 0, Math.PI * 2);
      ctx.strokeStyle = isThinking ? "rgba(0, 255, 213, 0.6)" : "rgba(0, 255, 213, 0.2)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      ctx.save();
      ctx.rotate(-0.45 - Math.sin(timestamp * 0.0008) * 0.05);
      ctx.beginPath();
      ctx.ellipse(0, 0, 170, 48, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 255, 213, 0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // 3. Orbiting Energy Particles
      particles.forEach((p) => {
        p.angle += p.speed * (isThinking ? 2.5 : 1);
        const px = Math.cos(p.angle) * p.radius;
        const py = Math.sin(p.angle) * (p.radius * 0.35);
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = isThinking ? "#ffffff" : "#00ffd5";
        ctx.shadowColor = "#00ffd5";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      ctx.restore();

      // 4. Cybernetic Face Contours
      ctx.save();
      ctx.translate(cx, headY);

      // Outer Head Contour
      ctx.beginPath();
      ctx.ellipse(0, -10, 75, 100, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 255, 213, 0.35)";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Jawline
      ctx.beginPath();
      ctx.moveTo(-45, -18);
      ctx.quadraticCurveTo(-42, 42, -22, 68);
      ctx.quadraticCurveTo(0, 80, 22, 68);
      ctx.quadraticCurveTo(42, 42, 45, -18);
      ctx.strokeStyle = "rgba(0, 255, 213, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Crown Node
      ctx.beginPath();
      ctx.arc(0, -38, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#ffcf77";
      ctx.shadowColor = "#ffcf77";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Eyebrows
      ctx.strokeStyle = "rgba(0, 255, 213, 0.55)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-36, -18);
      ctx.quadraticCurveTo(-22, -24, -8, -18);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(8, -18);
      ctx.quadraticCurveTo(22, -24, 36, -18);
      ctx.stroke();

      // Eyes
      const eyeHeight = Math.max(1, 6 * (1 - eyeBlink));
      ctx.strokeStyle = "#00ffd5";
      ctx.lineWidth = 1.8;

      ctx.beginPath();
      ctx.ellipse(-22, -8, 10, eyeHeight, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (eyeBlink < 0.6) {
        ctx.beginPath();
        ctx.arc(-22, -8, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#00ffd5";
        ctx.fill();
      }

      ctx.beginPath();
      ctx.ellipse(22, -8, 10, eyeHeight, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (eyeBlink < 0.6) {
        ctx.beginPath();
        ctx.arc(22, -8, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#00ffd5";
        ctx.fill();
      }

      // Nose Bridge
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(-2, 18);
      ctx.lineTo(3, 22);
      ctx.lineTo(0, 23);
      ctx.strokeStyle = "rgba(0, 255, 213, 0.35)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Animated Mouth (Lip-Sync)
      ctx.beginPath();
      if (mouthOpenness > 0.5) {
        ctx.ellipse(0, 46, 10, mouthOpenness, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "#00ffd5";
        ctx.fillStyle = "rgba(0, 255, 213, 0.25)";
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.moveTo(-12, 46);
        ctx.quadraticCurveTo(0, 50, 12, 46);
        ctx.strokeStyle = "rgba(0, 255, 213, 0.7)";
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }

      // Neural Temple Nodes
      [-40, 40].forEach((x) => {
        ctx.beginPath();
        ctx.arc(x, -6, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 255, 213, 0.8)";
        ctx.fill();
      });

      ctx.restore();

      animId = requestAnimationFrame(animateAvatar);
    }

    animId = requestAnimationFrame(animateAvatar);
    return () => cancelAnimationFrame(animId);
  }, []);

  // 3. Speech Recognition (Microphone)
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

  function speakSari(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const clean = text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[#*_`]/g, "")
      .replace(/(UNDERSTAND:|PLAN:|ACT:|LEARN:)/g, "")
      .trim();
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.05;
    utterance.pitch = 1.1;

    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find(
        (v) =>
          (v.lang.includes("IN") || v.name.includes("Zira") || v.name.includes("Google") || v.name.includes("Natural")) &&
          v.name.includes("Female")
      ) || voices.find((v) => v.lang.includes("en") || v.lang.includes("hi"));

    if (preferred) utterance.voice = preferred;

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

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: query,
      time: timeStr,
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
    speakSari(out.text);
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

  function clearChat() {
    const reset = [
      {
        id: "cleared-1",
        role: "sari" as const,
        content: "Conversation cleared. Ready for your next command, Malik.",
        time: "Ready",
      },
    ];
    setMessages(reset);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "84vh", background: "#06112C" }}>
      {/* Top Holographic Navigation Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", borderBottom: "1px solid rgba(0,255,213,0.15)", background: "rgba(6,17,44,0.9)", backdropFilter: "blur(12px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid #00ffd5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#00ffd5", boxShadow: "0 0 10px rgba(0,255,213,0.3)" }}>
            S
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ffffff" }}>
            SARI <span style={{ color: "#94a3b8", fontWeight: 400, marginLeft: 6 }}>| PERSONAL INTELLIGENCE / 11.2</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 11, color: speaking ? "#00ffd5" : typing ? "#ffcf77" : "#10b981", display: "flex", alignItems: "center", gap: 6, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: speaking ? "#00ffd5" : typing ? "#ffcf77" : "#10b981", boxShadow: `0 0 10px ${speaking ? "#00ffd5" : typing ? "#ffcf77" : "#10b981"}` }} />
            {speaking ? "SARI IS SPEAKING..." : typing ? "SARI IS THINKING..." : "PRIVATE SESSION CONNECTED"}
          </span>
          <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{clockTime}</span>
          <button onClick={() => setShowHologram(!showHologram)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(0,255,213,0.2)", color: "#00ffd5", padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
            {showHologram ? "Compact Chat" : "Hologram Persona"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
        {/* Left Pane: SARI Cybernetic Avatar (Canvas) */}
        {showHologram && (
          <div style={{ width: "40%", borderRight: "1px solid rgba(0,255,213,0.15)", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "20px 24px", position: "relative", background: "radial-gradient(circle at 50% 50%, rgba(0,255,213,0.04) 0%, transparent 70%)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "#94a3b8", textTransform: "uppercase" }}>
                  A Presence, Beyond the Screen.
                </div>
                <div style={{ fontSize: 11, color: "#00ffd5", marginTop: 2, letterSpacing: "0.1em", fontWeight: 600 }}>
                  01 / SARI
                </div>
              </div>
              <span className="badge" style={{ background: "rgba(0,255,213,0.08)", color: "#00ffd5", border: "1px solid rgba(0,255,213,0.3)", fontSize: 10.5 }}>
                {tierStatus}
              </span>
            </div>

            {/* Cybernetic Animated Canvas Avatar */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "10px 0" }}>
              <canvas ref={canvasRef} width={380} height={340} style={{ width: "100%", maxWidth: 360, height: "auto" }} />
            </div>

            <div>
              <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                YOUR SPACE. YOUR PACE.
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.06em", color: "#ffffff" }}>
                Intelligence
              </div>
            </div>
          </div>
        )}

        {/* Right Pane: Conversation & Dynamic Focus Actions */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Welcome Banner & Focus Quick Action Cards */}
          <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid rgba(0,255,213,0.15)", background: "rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                The Conversation
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={clearChat} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  <Trash2 size={12} /> Clear conversation
                </button>
              </div>
            </div>
            <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 3, letterSpacing: "-0.01em", color: "#ffffff" }}>
              A little less noise. A little more clarity.
            </h2>
            <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
              Your private session is ready. SARI can use relevant saved context from your existing memory.
            </p>

            {/* Quick Focus Action Chips */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div
                onClick={() => handleCommand("Find my focus: optimize loan pipeline")}
                style={{ padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,255,213,0.18)", borderRadius: 8, cursor: "pointer", transition: "all 0.2s" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#00ffd5" }}>
                  <Compass size={14} /> Find my focus
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Make room for what matters</div>
              </div>

              <div
                onClick={() => handleCommand("Read my inbox and summarize pending approvals")}
                style={{ padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,255,213,0.18)", borderRadius: 8, cursor: "pointer", transition: "all 0.2s" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#a855f7" }}>
                  <Mail size={14} /> Read my inbox
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Authorized account only</div>
              </div>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, fontSize: 11, color: "#94a3b8" }}>
                    <span>{isUser ? "YOU" : "SARI"}</span>
                    <span>·</span>
                    <span>{m.time}</span>
                  </div>
                  <div
                    style={{
                      maxWidth: "85%",
                      padding: "12px 16px",
                      borderRadius: isUser ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                      background: isUser ? "rgba(0,255,213,0.12)" : "rgba(255,255,255,0.04)",
                      border: isUser ? "1px solid rgba(0,255,213,0.3)" : "1px solid rgba(255,255,255,0.08)",
                      fontSize: 13.5,
                      lineHeight: "1.55",
                      whiteSpace: "pre-wrap",
                      color: "#ffffff",
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}
            {typing && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#00ffd5", fontSize: 12, padding: "8px 0" }}>
                <span className="dot" style={{ background: "#00ffd5" }} />
                SARI is reasoning with Dynamic Mind...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input Dialogue Bar: "Tell me, Malik..." */}
          <div style={{ padding: "14px 24px", borderTop: "1px solid rgba(0,255,213,0.15)", background: "rgba(6,17,44,0.95)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                onClick={toggleAutoListening}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: autoListening ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.05)",
                  border: autoListening ? "1px solid #ef4444" : "1px solid rgba(0,255,213,0.2)",
                  color: autoListening ? "#ef4444" : "#00ffd5",
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
                  background: "rgba(0,0,0,0.35)",
                  border: "1px solid rgba(0,255,213,0.25)",
                  borderRadius: 10,
                  padding: "11px 16px",
                  color: "#ffffff",
                  fontSize: 13.5,
                  outline: "none",
                }}
              />

              <button
                onClick={() => handleCommand()}
                disabled={typing || !input.trim()}
                style={{
                  padding: "11px 22px",
                  background: "#00ffd5",
                  color: "#06112C",
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  opacity: typing || !input.trim() ? 0.5 : 1,
                  boxShadow: "0 0 12px rgba(0,255,213,0.25)",
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
