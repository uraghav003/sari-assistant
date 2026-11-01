import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Lock, Mail, KeyRound, ArrowLeft, CheckCircle2 } from "lucide-react";
import { loginWithServer, changePasswordWithServer } from "../lib/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "change-password">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (mode === "login") {
        if (!email || !password) {
          setError("Email and password required");
          return;
        }
        const result = await loginWithServer(email, password);
        if (result.ok) {
          navigate("/");
        } else {
          setError(result.error || "Authentication failed");
        }
      } else {
        if (!email || !password || !newPassword) {
          setError("All fields are required");
          return;
        }
        if (newPassword.length < 6) {
          setError("New password must be at least 6 characters");
          return;
        }
        if (newPassword !== confirmPassword) {
          setError("New passwords do not match");
          return;
        }

        const res = await changePasswordWithServer(email, password, newPassword);
        if (res.ok) {
          setSuccess(res.message || "Password changed successfully! You can now log in.");
          setPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setTimeout(() => {
            setMode("login");
            setSuccess("");
          }, 2000);
        } else {
          setError(res.error || "Failed to update password");
        }
      }
    } catch {
      setError(mode === "login" ? "Authentication failed" : "Password update failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background:
          "radial-gradient(ellipse at 30% 20%, rgba(168,85,247,0.12), transparent 50%), var(--bg)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              display: "inline-flex",
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "var(--grad)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              boxShadow: "0 0 40px rgba(168,85,247,0.4)",
            }}
          >
            <Sparkles size={30} color="#fff" />
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700 }}>SARI</h1>
          <p style={{ color: "var(--muted)", marginTop: 6, fontSize: 14 }}>
            Sovereign AI Assistant · Lucy-grade
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>
              {mode === "login" ? "Executive Login" : "Change Password"}
            </h2>
            {mode === "change-password" && (
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setSuccess("");
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>
              Authorized Email
            </label>
            <div style={{ position: "relative" }}>
              <Mail
                size={15}
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--muted)",
                }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                style={{ paddingLeft: 40, width: "100%" }}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: mode === "login" ? 16 : 14 }}>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>
              {mode === "login" ? "Password" : "Current Password"}
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={15}
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--muted)",
                }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ paddingLeft: 40, width: "100%" }}
                required
              />
            </div>
          </div>

          {mode === "change-password" && (
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>
                  New Password
                </label>
                <div style={{ position: "relative" }}>
                  <KeyRound
                    size={15}
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--muted)",
                    }}
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    style={{ paddingLeft: 40, width: "100%" }}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>
                  Confirm New Password
                </label>
                <div style={{ position: "relative" }}>
                  <KeyRound
                    size={15}
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--muted)",
                    }}
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    style={{ paddingLeft: 40, width: "100%" }}
                    required
                  />
                </div>
              </div>
            </>
          )}

          {error && (
            <p style={{ color: "var(--red)", fontSize: 13, textAlign: "center", marginBottom: 14 }}>
              {error}
            </p>
          )}

          {success && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                color: "#10b981",
                fontSize: 13,
                marginBottom: 14,
              }}
            >
              <CheckCircle2 size={15} />
              <span>{success}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{ width: "100%", padding: "10px 16px", cursor: "pointer" }}
            disabled={loading}
          >
            {loading
              ? mode === "login"
                ? "Authenticating..."
                : "Updating Password..."
              : mode === "login"
              ? "Enter SARI"
              : "Update & Save Password"}
          </button>

          <div style={{ textAlign: "center", marginTop: 18 }}>
            {mode === "login" ? (
              <button
                type="button"
                onClick={() => {
                  setMode("change-password");
                  setError("");
                  setSuccess("");
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent, #a855f7)",
                  fontSize: 13,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Change SARI Password
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setSuccess("");
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--muted)",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Cancel and return to login
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
