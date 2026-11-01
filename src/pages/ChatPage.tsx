import { useState, useEffect, useRef } from "react";
import { Compass, Mail, Trash2, RefreshCw, Volume2 } from "lucide-react";
import { infer, type Tier } from "../lib/brain";
import { bumpRun, contextBlock, extractLesson, matchSkill, loadSkills } from "../lib/skills-engine";
import AvatarCanvas from "../components/chat/AvatarCanvas";
import MessageList, { type Message } from "../components/chat/MessageList";
import ChatInputBar from "../components/chat/ChatInputBar";

interface SpeechRecognitionEvent {
  results: {
    [index: number]: { [index: number]: { transcript: string } };
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
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as Message[]) : seedMessages;
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

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isSpeakingRef = useRef(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

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

  useEffect(() => { isSpeakingRef.current = speaking; }, [speaking]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch {
        // Quota or private mode — conversation works in memory.
      }
    }
  }, [messages]);

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
      try { recognitionRef.current?.stop(); } catch {}
    };
    const resume = () => {
      setSpeaking(false);
      if (autoListening) {
        try { recognitionRef.current?.start(); } catch {}
      }
    };
    utterance.onend = resume;
    utterance.onerror = resume;
    window.speechSynthesis.speak(utterance);
  }

  async function handleCommand(commandText?: string) {
    const query = (commandText || input).trim();
    if (!query) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: query, time: timeStr };

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
      try { nextState ? recognitionRef.current.start() : recognitionRef.current.stop(); } catch {}
    }
  }

  function clearChat() {
    const reset: Message[] = [
      { id: "cleared-1", role: "sari", content: "Conversation cleared. Ready for your next command, Malik.", time: "Ready" },
    ];
    setMessages(reset);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "84vh", background: "#06112C" }}>
      {/* Top Navigation Bar */}
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
          <span aria-live="polite" style={{ fontSize: 11, color: speaking ? "#00ffd5" : typing ? "#ffcf77" : "#10b981", display: "flex", alignItems: "center", gap: 6, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
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
        {/* Left Pane: Avatar */}
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
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "10px 0" }}>
              <AvatarCanvas speaking={speaking} typing={typing} />
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

        {/* Right Pane: Conversation */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Welcome Banner & Quick Actions */}
          <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid rgba(0,255,213,0.15)", background: "rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                The Conversation
              </div>
              <button onClick={clearChat} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                <Trash2 size={12} /> Clear conversation
              </button>
            </div>
            <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 3, letterSpacing: "-0.01em", color: "#ffffff" }}>
              A little less noise. A little more clarity.
            </h2>
            <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
              Your private session is ready. SARI can use relevant saved context from your existing memory.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button type="button" onClick={() => handleCommand("Find my focus: optimize loan pipeline")} style={{ padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,255,213,0.18)", borderRadius: 8, cursor: "pointer", textAlign: "left", width: "100%" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#00ffd5" }}>
                  <Compass size={14} /> Find my focus
                </span>
                <span style={{ display: "block", fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Make room for what matters</span>
              </button>
              <button type="button" onClick={() => handleCommand("Read my inbox and summarize pending approvals")} style={{ padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,255,213,0.18)", borderRadius: 8, cursor: "pointer", textAlign: "left", width: "100%" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#a855f7" }}>
                  <Mail size={14} /> Read my inbox
                </span>
                <span style={{ display: "block", fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Authorized account only</span>
              </button>
            </div>
          </div>

          <MessageList messages={messages} typing={typing} />

          <ChatInputBar
            input={input}
            setInput={setInput}
            typing={typing}
            autoListening={autoListening}
            onToggleListening={toggleAutoListening}
            onSend={handleCommand}
          />
        </div>
      </div>
    </div>
  );
}
