import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Lock, Mail } from "lucide-react";
import { setSessionId } from "../lib/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!email || !password) { setError("Email and password required"); return; }
      await new Promise((r) => setTimeout(r, 500));
      setSessionId(crypto.randomUUID());
      navigate("/");
    } catch {
      setError("Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "radial-gradient(ellipse at 30% 20%, rgba(168,85,247,0.12), transparent 50%), var(--bg)" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", width: 64, height: 64, borderRadius: 18, background: "var(--grad)", alignItems: "center", justifyContent: "center", marginBottom: 16, boxShadow: "0 0 40px rgba(168,85,247,0.4)" }}>
            <Sparkles size={30} color="#fff" />
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700 }}>SARI</h1>
          <p style={{ color: "var(--muted)", marginTop: 6, fontSize: 14 }}>Sovereign AI Assistant · Lucy-grade</p>
        </div>
        <form onSubmit={handleSubmit} className="card" style={{ padding: 28 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>Email</label>
            <div style={{ position: "relative" }}>
              <Mail size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="md@divyanshicapital.com" style={{ paddingLeft: 40 }} />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>Password</label>
            <div style={{ position: "relative" }}>
              <Lock size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ paddingLeft: 40 }} />
            </div>
          </div>
          {error && <p style={{ color: "var(--red)", fontSize: 13, textAlign: "center", marginBottom: 12 }}>{error}</p>}
          <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={loading}>
            {loading ? "Authenticating..." : "Enter SARI"}
          </button>
        </form>
      </div>
    </div>
  );
}
