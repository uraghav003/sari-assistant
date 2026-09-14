import { useState, useEffect } from "react";
import { Key, Database, Cpu, Upload, ExternalLink, RefreshCw } from "lucide-react";

export default function ConnectionsPage() {
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiStatus, setGeminiStatus] = useState<"not_configured" | "connected" | "invalid">("not_configured");
  const [geminiMsg, setGeminiMsg] = useState("");
  const [testingGemini, setTestingGemini] = useState(false);

  const [vaultEntries, setVaultEntries] = useState(0);
  const [lastSync, setLastSync] = useState<string>("Never");
  const [vaultMsg, setVaultMsg] = useState("Manual sync — download SARI_MEMORY.json from Drive and drop here");

  const [ollamaStatus, setOllamaStatus] = useState<"checking" | "connected" | "offline">("checking");
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [checkingOllama, setCheckingOllama] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const k = localStorage.getItem("sari_gemini_key");
      if (k) {
        setGeminiKey(k);
        setGeminiStatus("connected");
      }
      const v = localStorage.getItem("sari_memory_vault");
      if (v) {
        try {
          const parsed = JSON.parse(v);
          setVaultEntries(Object.keys(parsed).length);
          setLastSync(localStorage.getItem("sari_memory_sync_time") || "Recently");
        } catch {}
      }
    }
    checkOllama();
    const interval = setInterval(checkOllama, 30000);
    return () => clearInterval(interval);
  }, []);

  async function checkOllama() {
    setCheckingOllama(true);
    try {
      const res = await fetch("http://127.0.0.1:11434/api/tags", { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error("Offline");
      const data = await res.json();
      const names = (data.models || []).map((m: any) => m.name);
      setOllamaModels(names);
      setOllamaStatus("connected");
    } catch {
      setOllamaStatus("offline");
      setOllamaModels([]);
    } finally {
      setCheckingOllama(false);
    }
  }

  function saveGeminiKey() {
    const trimmed = geminiKey.trim();
    if (!trimmed) {
      localStorage.removeItem("sari_gemini_key");
      setGeminiStatus("not_configured");
      setGeminiMsg("Key removed.");
      return;
    }
    localStorage.setItem("sari_gemini_key", trimmed);
    setGeminiStatus("connected");
    setGeminiMsg("Gemini API key saved locally.");
  }

  async function testGemini() {
    const trimmed = geminiKey.trim();
    if (!trimmed) {
      setGeminiStatus("not_configured");
      setGeminiMsg("Please enter an API key first.");
      return;
    }
    setTestingGemini(true);
    setGeminiMsg("Testing connection...");
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${trimmed}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] })
      });
      if (!res.ok) {
        setGeminiStatus("invalid");
        setGeminiMsg(`API Error (${res.status}): Invalid key or quota exceeded.`);
      } else {
        setGeminiStatus("connected");
        setGeminiMsg("✓ Gemini 2.0 Flash connected successfully!");
      }
    } catch (e: any) {
      setGeminiStatus("invalid");
      setGeminiMsg(`✗ Request failed: ${e.message}`);
    } finally {
      setTestingGemini(false);
    }
  }

  function handleFileDrop(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const count = Object.keys(parsed).length;
        const now = new Date().toLocaleString();
        localStorage.setItem("sari_memory_vault", text);
        localStorage.setItem("sari_memory_sync_time", now);
        setVaultEntries(count);
        setLastSync(now);
        setVaultMsg(`Successfully imported ${count} entries from SARI_MEMORY.json`);
      } catch (err: any) {
        setVaultMsg(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }

  const geminiBadgeColor = geminiStatus === "connected" ? "var(--green)" : geminiStatus === "invalid" ? "#ef4444" : "var(--muted)";
  const ollamaBadgeColor = ollamaStatus === "connected" ? "var(--green)" : "#ef4444";

  return (
    <div className="page" style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 className="page-title">Connections & Integrations</h1>
      <p className="page-sub">Manage Cloud Brain, Memory Vault, and Local AI runtimes</p>

      <div className="card" style={{ padding: 24, marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Key size={20} style={{ color: "#3b82f6" }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Cloud Brain (Gemini 2.0 Flash)</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Tier-2 inference — required for live chat on Vercel</div>
            </div>
          </div>
          <span className="badge" style={{ background: "rgba(255,255,255,0.06)", color: geminiBadgeColor, borderColor: geminiBadgeColor }}>
            {geminiStatus === "connected" ? "Connected" : geminiStatus === "invalid" ? "Invalid Key" : "Not Configured"}
          </span>
        </div>
        <div style={{ fontSize: 13, marginBottom: 12, color: "var(--muted)" }}>
          Get a free API key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: "var(--cyan)", display: "inline-flex", alignItems: "center", gap: 4 }}>Google AI Studio <ExternalLink size={12} /></a>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder="AIzaSy..."
            style={{ flex: 1, minWidth: 260, background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", color: "inherit", fontSize: 13 }}
          />
          <button onClick={saveGeminiKey} className="btn-secondary" style={{ padding: "10px 18px", borderRadius: 10, fontWeight: 500 }}>Save</button>
          <button onClick={testGemini} className="btn-primary" style={{ padding: "10px 18px", borderRadius: 10, fontWeight: 500 }} disabled={testingGemini}>
            {testingGemini ? "Testing..." : "Test Connection"}
          </button>
        </div>
        {geminiMsg && <div style={{ marginTop: 12, fontSize: 12.5, color: geminiStatus === "connected" ? "var(--green)" : geminiStatus === "invalid" ? "#ef4444" : "var(--muted)" }}>{geminiMsg}</div>}
      </div>

      <div className="card" style={{ padding: 24, marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(168,85,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Database size={20} style={{ color: "#a855f7" }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Memory Vault (Google Drive)</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>SARI_SUPREME_COMMAND sync state</div>
            </div>
          </div>
          <span className="badge" style={{ background: "rgba(255,255,255,0.06)", color: vaultEntries > 0 ? "var(--green)" : "var(--muted)" }}>
            {vaultEntries > 0 ? `${vaultEntries} entries` : "Empty"}
          </span>
        </div>
        <div style={{ fontSize: 13, marginBottom: 14, color: "var(--muted)" }}>
          {vaultMsg} · Last sync: {lastSync}
        </div>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "rgba(255,255,255,0.06)", border: "1px dashed var(--border)", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
          <Upload size={16} /> Drop or Upload SARI_MEMORY.json
          <input type="file" accept=".json" onChange={handleFileDrop} style={{ display: "none" }} />
        </label>
      </div>

      <div className="card" style={{ padding: 24, marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Cpu size={20} style={{ color: "var(--green)" }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Local AI (Ollama)</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Tier-1 local runtime (127.0.0.1:11434) — laptop only</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="badge" style={{ background: "rgba(255,255,255,0.06)", color: ollamaBadgeColor, borderColor: ollamaBadgeColor }}>
              {ollamaStatus === "connected" ? "Online" : "Offline"}
            </span>
            <button onClick={checkOllama} style={{ background: "transparent", color: "var(--muted)", padding: 4 }} title="Refresh Ollama status">
              <RefreshCw size={14} className={checkingOllama ? "spin" : ""} />
            </button>
          </div>
        </div>
        {ollamaStatus === "connected" ? (
          <div style={{ fontSize: 13, color: "var(--green)" }}>
            Connected models: {ollamaModels.length > 0 ? ollamaModels.join(", ") : "None loaded"}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "#ef4444" }}>
            Ollama offline on this device — Vercel chat uses Gemini key from this page
          </div>
        )}
      </div>
    </div>
  );
}
