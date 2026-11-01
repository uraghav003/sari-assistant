import { useState, useEffect, useRef } from "react";
import { Terminal as TermIcon, Play, Loader2, Trash2, RefreshCw } from "lucide-react";

interface CommandDef {
  id: string;
  label: string;
}

interface LogEntry {
  id: string;
  command: string;
  label: string;
  output: string;
  durationMs: number;
  exitCode?: number;
  time: string;
}

export default function TerminalPage() {
  const [commands, setCommands] = useState<CommandDef[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/terminal")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setCommands(d.commands);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  async function runCommand(id: string) {
    if (running) return;
    setRunning(id);
    const label = commands.find((c) => c.id === id)?.label ?? id;

    try {
      const res = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ command: id }),
      });
      const data = await res.json();
      setLogs((prev) => [
        ...prev,
        {
          id: `${id}-${Date.now()}`,
          command: id,
          label: data.label ?? label,
          output: data.output ?? data.error ?? "No output",
          durationMs: data.durationMs ?? 0,
          exitCode: data.exitCode,
          time: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        {
          id: `${id}-${Date.now()}`,
          command: id,
          label,
          output: `Network error: ${err instanceof Error ? err.message : "unknown"}`,
          durationMs: 0,
          exitCode: 1,
          time: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setRunning(null);
    }
  }

  function reloadCommands() {
    fetch("/api/terminal")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setCommands(d.commands); })
      .catch(() => {});
  }

  return (
    <div style={{ padding: "1.2rem", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
        <TermIcon size={20} />
        <h2 style={{ margin: 0, fontSize: 18 }}>SARI Terminal</h2>
        <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: "auto" }}>
          {commands.length} commands
        </span>
        <button
          onClick={reloadCommands}
          title="Refresh command list"
          style={{
            padding: "4px 8px",
            border: "1px solid var(--border)",
            borderRadius: 6,
            background: "transparent",
            color: "var(--muted)",
            cursor: "pointer",
          }}
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Command palette — mobile grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 8,
          marginBottom: "1.2rem",
        }}
      >
        {commands.map((cmd) => (
          <button
            key={cmd.id}
            onClick={() => runCommand(cmd.id)}
            disabled={running !== null}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 12px",
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: running === cmd.id ? "var(--accent)" : "var(--surface)",
              color: running === cmd.id ? "#fff" : "inherit",
              cursor: running ? "wait" : "pointer",
              fontSize: 13,
              fontWeight: 500,
              transition: "all 0.15s",
              textAlign: "left",
            }}
          >
            {running === cmd.id ? <Loader2 size={14} className="spin" /> : <Play size={14} />}
            {cmd.label}
          </button>
        ))}
      </div>

      {/* Output log */}
      <div
        style={{
          background: "#0d1117",
          borderRadius: 10,
          padding: "0.8rem",
          minHeight: 200,
          maxHeight: "60vh",
          overflowY: "auto",
          fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace",
          fontSize: 12.5,
          lineHeight: 1.5,
          color: "#c9d1d9",
        }}
      >
        {logs.length === 0 && (
          <div style={{ color: "#484f58", textAlign: "center", padding: "2rem 0" }}>
            Tap a command above to run it ↑
          </div>
        )}
        {logs.map((entry) => (
          <div key={entry.id} style={{ marginBottom: 12 }}>
            <div style={{ color: "#58a6ff", fontWeight: 600 }}>
              $ {entry.label}{" "}
              <span style={{ color: "#484f58", fontWeight: 400 }}>
                {entry.time} • {entry.durationMs}ms
                {entry.exitCode !== undefined && entry.exitCode !== 0 && (
                  <span style={{ color: "#f85149" }}> • exit {entry.exitCode}</span>
                )}
              </span>
            </div>
            <pre
              style={{
                margin: "4px 0 0",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: entry.exitCode ? "#f0883e" : "#adbac7",
              }}
            >
              {entry.output}
            </pre>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {logs.length > 0 && (
        <button
          onClick={() => setLogs([])}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 10,
            padding: "6px 14px",
            border: "1px solid var(--border)",
            borderRadius: 6,
            background: "transparent",
            color: "var(--muted)",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          <Trash2 size={13} /> Clear log
        </button>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
