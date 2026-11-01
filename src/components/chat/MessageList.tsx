import { useEffect, useRef } from "react";

export interface Message {
  id: string;
  role: "user" | "sari";
  content: string;
  time: string;
}

interface Props {
  messages: Message[];
  typing: boolean;
}

export default function MessageList({ messages, typing }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  return (
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
  );
}
