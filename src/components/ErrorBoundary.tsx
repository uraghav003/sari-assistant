import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || "Unknown error" };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          background: "var(--bg)",
          color: "var(--fg)",
          textAlign: "center",
          gap: 16,
        }}
      >
        <AlertTriangle size={48} color="var(--red, #ef4444)" />
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>SARI encountered an error</h2>
        <p style={{ color: "var(--muted)", fontSize: 14, maxWidth: 400 }}>
          {this.state.message}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 24px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--accent, #a855f7)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={16} /> Reload SARI
        </button>
      </div>
    );
  }
}
