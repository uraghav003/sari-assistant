import { Mic, MicOff, Send } from "lucide-react";

interface Props {
  input: string;
  setInput: (v: string) => void;
  typing: boolean;
  autoListening: boolean;
  onToggleListening: () => void;
  onSend: () => void;
}

export default function ChatInputBar({ input, setInput, typing, autoListening, onToggleListening, onSend }: Props) {
  return (
    <div style={{ padding: "14px 24px", borderTop: "1px solid rgba(0,255,213,0.15)", background: "rgba(6,17,44,0.95)" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button
          onClick={onToggleListening}
          aria-label={autoListening ? "Mute microphone" : "Enable voice input"}
          aria-pressed={autoListening}
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
          aria-label="Message SARI"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
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
          onClick={onSend}
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
  );
}
