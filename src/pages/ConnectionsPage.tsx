import { useState, useEffect } from "react";
import { Key, Database, Cpu, Upload, ExternalLink, RefreshCw, Code2, ShieldCheck, Zap } from "lucide-react";
import { loadDynamicConfig, saveDynamicConfig, pingAppsScript } from "../lib/config";

export default function ConnectionsPage() {
  const [config, setConfig] = useState(loadDynamicConfig());

  // Gemini State
  const [geminiStatus, setGeminiStatus] = useState<"not_configured" | "connected" | "invalid">("not_configured");
  const [geminiMsg, setGeminiMsg] = useState("");
  const [testingGemini, setTestingGemini] = useState(false);

  // Apps Script Dynamic Mind State
  const [scriptStatus, setScriptStatus] = useState<"checking" | "connected" | "error">("checking");
  const [scriptMsg, setScriptMsg] = useState("");
  const [testingScript, setTestingScript] = useState(false);

  // Memory Vault State
  const [vaultEntries, setVaultEntries] = useState(0);
  const [lastSync, setLastSync] = useState<string>("Never");
  const [vaultMsg, setVaultMsg] = useState("Manual sync — download SARI_MEMORY.json from Drive and drop here");

  // Ollama State
  const [ollamaStatus, setOllamaStatus] = useState<"checking" | "connected" | "offline">("checking");
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [checkingOllama, setCheckingOllama] = useState(false);

  useEffect(() => {
    const current = loadDynamicConfig();
    setConfig(current);
    if (current.geminiKey) {
      setGeminiStatus("connected");
    }

    if (typeof window !== "undefined") {
      const v = localStorage.getItem("sari_memory_vault");
      if (v) {
        try {
          const parsed = JSON.parse(v);
          setVaultEntries(Object.keys(parsed).length);
          setLastSync(localStorage.getItem("sari_memory_sync_time") || "Recently");
        } catch {}
      }
    }

    checkAppsScript(current.deploymentId);
    checkOllama(current.ollamaUrl);
    const interval = setInterval(() => {
      checkOllama(config.ollamaUrl);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  async function checkAppsScript(depId?: string) {
    setTestingScript(true);
    const res = await pingAppsScript(depId || config.deploymentId);
    if (res.ok) {
      setScriptStatus("connected");
      setScriptMsg("✓ Google Apps Script Web App live and responding");
    } else {
      setScriptStatus("error");
      setScriptMsg(`✗ ${res.message}`);
    }
    setTestingScript(false);
  }

  async function checkOllama(url?: string) {
    const target = url || config.ollamaUrl;
    setCheckingOllama(true);
    try {
      const res = await fetch(`${target}/api/tags`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error("Offline");
      const data = await res.json();
      const names = (data.models || []).map((m: { name?: string }) => m.name || "").filter(Boolean);
      setOllamaModels(names);
      setOllamaStatus("connected");
    } catch {
      setOllamaStatus("offline");
      setOllamaModels([]);
    } finally {
      setCheckingOllama(false);
    }
  }

  function handleSaveConfig() {
    const saved = saveDynamicConfig(config);
    setConfig(saved);
    if (saved.geminiKey) {
      setGeminiStatus("connected");
      setGeminiMsg("Gemini API key saved.");
    } else {
      setGeminiStatus("not_configured");
      setGeminiMsg("Key removed.");
    }
    checkAppsScript(saved.deploymentId);
  }

  async function testGemini() {
    const trimmed = config.geminiKey.trim();
    if (!trimmed) {
      setGeminiStatus("not_configured");
      setGeminiMsg("Please enter an API key first.");
      return;
    }
    setTestingGemini(true);
    setGeminiMsg("Testing connection...");
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${trimmed}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] }),
        }
      );
      if (!res.ok) {
        setGeminiStatus("invalid");
        setGeminiMsg(`API Error (${res.status}): Invalid key or quota exceeded.`);
      } else {
        setGeminiStatus("connected");
        setGeminiMsg("✓ Gemini 2.0 Flash connected successfully!");
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setGeminiStatus("invalid");
      setGeminiMsg(`✗ Request failed: ${message}`);
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
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setVaultMsg(`Import failed: ${message}`);
      }
    };
    reader.readAsText(file);
  }

  const geminiBadgeColor = geminiStatus === "connected" ? "var(--green)" : geminiStatus === "invalid" ? "#ef4444" : "var(--muted)";
  const scriptBadgeColor = scriptStatus === "connected" ? "var(--green)" : "#ef4444";
  const ollamaBadgeColor = ollamaStatus === "connected" ? "var(--green)" : "#ef4444";

  return (
    <div className="page" style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 className="page-title">Connections & Dynamic Mind</h1>
      <p className="page-sub">Configure Script ID, Deployment ID, Cloud Brain, Self-Healing, and Local Runtimes</p>

      {/* Dynamic Mind / Google Apps Script Card */}
      <div className="card" style={{ padding: 24, marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Code2 size={20} style={{ color: "var(--green)" }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Dynamic Mind (Google Apps Script / Divyanshi OS)</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Direct binding via Script ID & Deployment ID (.clasp.json)</div>
            </div>
          </div>
          <span className="badge" style={{ background: "rgba(255,255,255,0.06)", color: scriptBadgeColor, borderColor: scriptBadgeColor }}>
            {scriptStatus === "connected" ? "Live Connected" : scriptStatus === "checking" ? "Checking..." : "Offline / Unreachable"}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>Script ID</label>
            <input
              type="text"
              value={config.scriptId}
              onChange={(e) => setConfig({ ...config, scriptId: e.target.value })}
              placeholder="1PP7wUFkDAkmg..."
              style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", color: "inherit", fontSize: 13 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>Deployment ID / Web App</label>
            <input
              type="text"
              value={config.deploymentId}
              onChange={(e) => setConfig({ ...config, deploymentId: e.target.value })}
              placeholder="AKfycbwzdhZF3..."
              style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", color: "inherit", fontSize: 13 }}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleSaveConfig} className="btn-secondary" style={{ padding: "8px 16px", borderRadius: 10, fontWeight: 500 }}>
            Save Properties
          </button>
          <button onClick={() => checkAppsScript()} className="btn-primary" style={{ padding: "8px 16px", borderRadius: 10, fontWeight: 500 }} disabled={testingScript}>
            {testingScript ? "Testing..." : "Test Mind Endpoint"}
          </button>
        </div>
        {scriptMsg && <div style={{ marginTop: 10, fontSize: 12.5, color: scriptStatus === "connected" ? "var(--green)" : "#ef4444" }}>{scriptMsg}</div>}
      </div>

      {/* Cloud Brain (Gemini 2.0 Flash) Card */}
      <div className="card" style={{ padding: 24, marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Key size={20} style={{ color: "#3b82f6" }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Cloud Brain (Gemini 2.0 Flash)</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Tier-1 Serverless Proxy / Client API Key</div>
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
            value={config.geminiKey}
            onChange={(e) => setConfig({ ...config, geminiKey: e.target.value })}
            placeholder="AIzaSy..."
            style={{ flex: 1, minWidth: 260, background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", color: "inherit", fontSize: 13 }}
          />
          <button onClick={handleSaveConfig} className="btn-secondary" style={{ padding: "10px 18px", borderRadius: 10, fontWeight: 500 }}>Save</button>
          <button onClick={testGemini} className="btn-primary" style={{ padding: "10px 18px", borderRadius: 10, fontWeight: 500 }} disabled={testingGemini}>
            {testingGemini ? "Testing..." : "Test Connection"}
          </button>
        </div>
        {geminiMsg && <div style={{ marginTop: 12, fontSize: 12.5, color: geminiStatus === "connected" ? "var(--green)" : geminiStatus === "invalid" ? "#ef4444" : "var(--muted)" }}>{geminiMsg}</div>}
      </div>

      {/* Self-Healing & Self-Learning Sentinel Status */}
      <div className="card" style={{ padding: 24, marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(234,179,8,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={20} style={{ color: "#eab308" }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Self-Healing & Continuous Self-Learning</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Automated failover, heuristic extraction, and skill synthesis</div>
            </div>
          </div>
          <span className="badge" style={{ background: "rgba(34,197,94,0.1)", color: "var(--green)", borderColor: "var(--green)" }}>
            <Zap size={12} style={{ marginRight: 4 }} /> Active & Guarded
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12.5, color: "var(--muted)" }}>
          <div style={{ padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>Self-Healing Safeguards</div>
            Auto-detects 401 (Auth Expiry), 429 (Rate Limits), and 503 (Outages) with sub-second failover to local runtime.
          </div>
          <div style={{ padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>Self-Learning Engine</div>
            Extracts actionable heuristics on every interaction and consolidates insights into your sovereign memory vault.
          </div>
        </div>
      </div>

      {/* Memory Vault (Google Drive) */}
      <div className="card" style={{ padding: 24, marginTop: 20 }}>
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

      {/* Local AI (Ollama) */}
      <div className="card" style={{ padding: 24, marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Cpu size={20} style={{ color: "var(--green)" }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Local AI Runtime (Ollama)</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Tier-2 air-gapped local fallback ({config.ollamaUrl})</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="badge" style={{ background: "rgba(255,255,255,0.06)", color: ollamaBadgeColor, borderColor: ollamaBadgeColor }}>
              {ollamaStatus === "connected" ? "Online" : "Offline"}
            </span>
            <button onClick={() => checkOllama()} style={{ background: "transparent", color: "var(--muted)", padding: 4 }} title="Refresh Ollama status">
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
            Ollama offline on this device — Vercel chat uses Gemini Cloud Brain automatically
          </div>
        )}
      </div>
    </div>
  );
}
