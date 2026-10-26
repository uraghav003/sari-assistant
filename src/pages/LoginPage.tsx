import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Lock, Mail, KeyRound, ArrowLeft, CheckCircle2, Fingerprint, Bell, ShieldCheck } from "lucide-react";
import { loginWithServer, changePasswordWithServer } from "../lib/auth";
import {
  isBiometricAvailable,
  hasStoredCredential,
  registerBiometric,
  authenticateWithBiometric,
  getStoredEmail,
} from "../lib/webauthn";

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
  const [biometricReady, setBiometricReady] = useState(false);
  const [totpRequired, setTotpRequired] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [hasCred, setHasCred] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then((ok) => {
      setBiometricReady(ok);
      setHasCred(hasStoredCredential());
      const storedEmail = getStoredEmail();
      if (storedEmail) setEmail(storedEmail);
    });
    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  async function handleBiometricLogin() {
    setError("");
    setLoading(true);
    try {
      const bioEmail = await authenticateWithBiometric();
      if (!bioEmail) {
        setError("Biometric verification failed. Use password.");
        return;
      }
      // After biometric success, do a session-based login via server
      // Use a special biometric token flow
      const result = await loginWithServer(bioEmail, "__biometric_verified__");
      if (result.ok) {
        navigate("/");
      } else {
        // Biometric verified locally but server needs password — fallback
        setEmail(bioEmail);
        setError("Biometric OK. Enter password to complete server login.");
      }
    } catch {
      setError("Biometric error. Try password login.");
    } finally {
      setLoading(false);
    }
  }

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
        if (totpRequired && !totpCode) {
          setError("Enter 6-digit authenticator code");
          return;
        }
        const result = await loginWithServer(email, password, totpRequired ? totpCode : undefined);
        if (result.totpRequired) {
          setTotpRequired(true);
          setError("");
          return;
        }
        if (result.ok) {
          if (biometricReady && !hasCred) {
            await registerBiometric(email);
          }
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
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              display: "inline-flex",
              padding: "6px 14px",
              background: "rgba(168,85,247,0.15)",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: "var(--accent)",
              marginBottom: 12,
              border: "1px solid rgba(168,85,247,0.3)"
            }}
          >
            🔒 DIVYANSHI CAPITAL · NET BANKING PORTAL
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>SARI Executive Login</h1>
          <p style={{ color: "var(--muted)", marginTop: 4, fontSize: 13 }}>
            Secure Corporate Authentication & Lending Desk
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ padding: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, borderBottom: "1px solid var(--border)", paddingBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>
                {mode === "login" ? "Sign In" : "Change Password"}
              </h2>
              <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Enter your login ID and password below</p>
            </div>
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
            <label htmlFor="sari-email" style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>
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
                id="sari-email"
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="u.raghav003@gmail.com"
                style={{ paddingLeft: 40, width: "100%" }}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: mode === "login" ? 16 : 14 }}>
            <label htmlFor="sari-password" style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>
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
                id="sari-password"
                name="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ paddingLeft: 40, width: "100%" }}
                required
              />
            </div>
          </div>

          {mode === "login" && totpRequired && (
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="sari-totp" style={{ fontSize: 12, color: "var(--cyan)", display: "block", marginBottom: 6 }}>
                🔐 Authenticator Code
              </label>
              <div style={{ position: "relative" }}>
                <ShieldCheck
                  size={15}
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--cyan)",
                  }}
                />
                <input
                  id="sari-totp"
                  name="totp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit code"
                  style={{ paddingLeft: 40, width: "100%", letterSpacing: 4, fontSize: 18, textAlign: "center" }}
                  autoFocus
                  required
                />
              </div>
            </div>
          )}

          {mode === "change-password" && (
            <>
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="sari-new-password" style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>
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
                    id="sari-new-password"
                    name="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    style={{ paddingLeft: 40, width: "100%" }}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label htmlFor="sari-confirm-password" style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>
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
                    id="sari-confirm-password"
                    name="confirm-password"
                    type="password"
                    autoComplete="new-password"
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

          {/* Biometric login */}
          {mode === "login" && biometricReady && hasCred && (
            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={loading}
              style={{
                width: "100%",
                padding: "10px 16px",
                marginTop: 10,
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "transparent",
                color: "var(--accent, #a855f7)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <Fingerprint size={18} />
              Face ID / Fingerprint
            </button>
          )}

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
