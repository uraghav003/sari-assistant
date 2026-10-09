import { useState, useEffect } from "react";
import { Key, Database, Cpu, Upload, ExternalLink, RefreshCw, Code2, ShieldCheck, Zap, BookOpen, Layers, FileJson, CheckCircle2, AlertCircle } from "lucide-react";
import { loadDynamicConfig, saveDynamicConfig, pingAppsScript } from "../lib/config";
import { importUniversalConfigJson, resolveActiveGeminiKey, validateGeminiKey } from "../lib/key-resolver";

export default function ConnectionsPage() {
  const [config, setConfig] = useState(loadDynamicConfig());

  // Key Validation & Status
  const [keyHealth, setKeyHealth] = useState<{ valid: boolean; message: string; source: string }>({
    valid: false,
    message: "Validating active keys...",
    source: "init",
  });
  const [testingGemini, setTestingGemini] = useState(false);

  // JSON Import Status
  const [importStatus, setImportStatus] = useState<string>("");

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

  // Notion & NotebookLM State
  const [notionSaved, setNotionSaved] = useState(false);
  const [notebookSaved, setNotebookSaved] = useState(false);

  useEffect(() => {
    const current = loadDynamicConfig();
    setConfig(current);
    if (current.notionToken) setNotionSaved(true);
    if (current.notebooklmFolderId) setNotebookSaved(true);

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

    checkKeyHealth();
    checkAppsScript(current.deploymentId);
    checkOllama(current.ollamaUrl);
    const interval = setInterval(() => {
      checkOllama(config.ollamaUrl);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  async function checkKeyHealth() {
    setTestingGemini(true);
    const res = await resolveActiveGeminiKey();
    setKeyHealth({
      valid: res.valid,
      message: res.message,
      source: res.source,
    });
    setTestingGemini(false);
  }

  async function checkAppsScript(depId?: string) {
    setTestingScript(true);
    const res = await pingAppsScript(depId || config.deploymentId);
    if (res.ok) {
      setScriptStatus("connected");
      setScriptMsg("✓ Google Apps Script Autopilot Core live and responding");
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
    if (saved.notionToken) setNotionSaved(true);
    if (saved.notebooklmFolderId) setNotebookSaved(true);
    checkKeyHealth();
    checkAppsScript(saved.deploymentId);
  }

  function handleUniversalJsonDrop(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const result = importUniversalConfigJson(text);
        const updated = loadDynamicConfig();
        setConfig(updated);
        setImportStatus(`✓ Successfully extracted ${result.entriesCount} parameters from ${file.name}!`);
        await checkKeyHealth();
        await checkAppsScript(updated.deploymentId);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setImportStatus(`✗ Import failed: ${message}`);
      }
    };
    reader.readAsText(file);
  }

  function handleMemoryFileDrop(e: React.ChangeEvent<HTMLInputElement>) {
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

  const scriptBadgeColor = scriptStatus === "connected" ? "var(--green)" : "#ef4444";
  const ollamaBadgeColor = ollamaStatus === "connected" ? "var(--green)" : "#ef4444";

  return (
    <div className="page" style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 className="page-title">Connections & Sovereign Mind</h1>
      <p className="page-sub">Auto-resolve keys via JSON import, Script ID, Deployment ID, and Cloud/Local Runtimes</p>

      {/* 1-Click Universal JSON Import Card */}
      <div className="card" style={{ padding: 24, marginTop: 24, border: "1px dashed rgba(59,130,246,0.5)", background: "rgba(59,130,246,0.03)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileJson size={22} style={{ color: "#3b82f6" }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Universal 1-Click JSON Configuration Import</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Drop any JSON file (apps-script-properties.json, SARI_CONFIG.json, .mcp.json)</div>
            </div>
          </div>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "#3b82f6", color: "#fff", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
            <Upload size={16} /> Choose or Drop JSON
            <input type="file" accept=".json" onChange={handleUniversalJsonDrop} style={{ display: "none" }} />
          </label>
        </div>
        {importStatus && (
          <div style={{ fontSize: 12.5, marginTop: 8, color: importStatus.startsWith("✓") ? "var(--green)" : "#ef4444", fontWeight: 500 }}>
            {importStatus}
          </div>
        )}
      </div>

      {/* Pre-Validated Cloud Brain (Gemini 2.0 / MALLIK_API_KEY) Card */}
      <div className="card" style={{ padding: 24, marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Key size={20} style={{ color: "#3b82f6" }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Cloud Brain (Gemini 2.0 Flash / MALLIK_API_KEY)</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Pre-flight validated key resolver with automatic failover</div>
            </div>
          </div>
          <span className="badge" style={{ background: "rgba(255,255,255,0.06)", color: keyHealth.valid ? "var(--green)" : "#ef4444", borderColor: keyHealth.valid ? "var(--green)" : "#ef4444", display: "flex", alignItems: "center", gap: 4 }}>
            {keyHealth.valid ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            {keyHealth.valid ? "Validated Active" : "No Valid Key"}
          </span>
        </div>
        <div style={{ fontSize: 13, marginBottom: 12, color: "var(--muted)" }}>
          API key auto-resolves from <code>MALLIK_API_KEY</code>, <code>GEMINI_API_KEY</code>, or manual input below:
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            type="password"
            value={config.geminiKey}
            onChange={(e) => setConfig({ ...config, geminiKey: e.target.value })}
            placeholder="AIzaSy... or MALLIK_API_KEY"
            style={{ flex: 1, minWidth: 260, background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", color: "inherit", fontSize: 13 }}
          />
          <button onClick={handleSaveConfig} className="btn-secondary" style={{ padding: "10px 18px", borderRadius: 10, fontWeight: 500 }}>Save</button>
          <button onClick={checkKeyHealth} className="btn-primary" style={{ padding: "10px 18px", borderRadius: 10, fontWeight: 500 }} disabled={testingGemini}>
            {testingGemini ? "Probing..." : "Test Key Health"}
          </button>
        </div>
        <div style={{ marginTop: 12, fontSize: 12.5, color: keyHealth.valid ? "var(--green)" : "#ef4444" }}>
          {keyHealth.message}
        </div>
      </div>

      {/* Dynamic Mind / Google Apps Script Autopilot Card */}
      <div className="card" style={{ padding: 24, marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Code2 size={20} style={{ color: "var(--green)" }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Dynamic Mind (Google Apps Script Autopilot)</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Zero-touch background sync via Script ID & Deployment ID</div>
            </div>
          </div>
          <span className="badge" style={{ background: "rgba(255,255,255,0.06)", color: scriptBadgeColor, borderColor: scriptBadgeColor }}>
            {scriptStatus === "connected" ? "Autopilot Live" : scriptStatus === "checking" ? "Checking..." : "Offline / Unreachable"}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>Script ID (.clasp.json)</label>
            <input
              type="text"
              value={config.scriptId}
              onChange={(e) => setConfig({ ...config, scriptId: e.target.value })}
              placeholder="1ru_EBflLmasLfZ7..."
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

      {/* Notion & NotebookLM Dual Integrations */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
        {/* Notion Connector */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(236,72,153,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Layers size={18} style={{ color: "#ec4899" }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Notion Database</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Tasks, policies & lead records</div>
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11.5, color: "var(--muted)", display: "block", marginBottom: 2 }}>Notion API Token</label>
            <input
              type="password"
              value={config.notionToken || ""}
              onChange={(e) => setConfig({ ...config, notionToken: e.target.value })}
              placeholder="secret_..."
              style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "inherit", fontSize: 12 }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11.5, color: "var(--muted)", display: "block", marginBottom: 2 }}>Database ID</label>
            <input
              type="text"
              value={config.notionDatabaseId || ""}
              onChange={(e) => setConfig({ ...config, notionDatabaseId: e.target.value })}
              placeholder="32-character ID..."
              style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "inherit", fontSize: 12 }}
            />
          </div>
          <button onClick={handleSaveConfig} className="btn-secondary" style={{ width: "100%", padding: "8px", borderRadius: 8, fontSize: 12 }}>
            {notionSaved ? "✓ Notion Linked" : "Save Notion"}
          </button>
        </div>

        {/* NotebookLM Drive Pack */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(249,115,22,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={18} style={{ color: "#f97316" }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>NotebookLM Drive Pack</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Credit manuals & circulars index</div>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11.5, color: "var(--muted)", display: "block", marginBottom: 2 }}>Google Drive Folder ID / Pack</label>
            <input
              type="text"
              value={config.notebooklmFolderId || ""}
              onChange={(e) => setConfig({ ...config, notebooklmFolderId: e.target.value })}
              placeholder="SARI_SUPREME Drive Folder ID..."
              style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "inherit", fontSize: 12 }}
            />
          </div>
          <button onClick={handleSaveConfig} className="btn-secondary" style={{ width: "100%", padding: "8px", borderRadius: 8, fontSize: 12, marginTop: 28 }}>
            {notebookSaved ? "✓ NotebookLM Linked" : "Save NotebookLM"}
          </button>
        </div>
      </div>

      {/* Self-Healing & Self-Learning Sentinel Status */}
      <div className="card" style={{ padding: 24, marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(234,179,8,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={20} style={{ color: "#eab308" }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Self-Healing & Zero-Touch Autopilot</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Continuous background sync with zero Apps Script maintenance required</div>
            </div>
          </div>
          <span className="badge" style={{ background: "rgba(34,197,94,0.1)", color: "var(--green)", borderColor: "var(--green)" }}>
            <Zap size={12} style={{ marginRight: 4 }} /> Autopilot Active
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12.5, color: "var(--muted)" }}>
          <div style={{ padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>Self-Healing Safeguards</div>
            Auto-detects 401 (Auth Expiry), 429 (Rate Limits), and 503 (Outages) with sub-second failover to local runtime.
          </div>
          <div style={{ padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>Continuous Self-Learning</div>
            Automatically syncs interaction lessons and dynamic skill cards to Apps Script Memory Vault.
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
          <input type="file" accept=".json" onChange={handleMemoryFileDrop} style={{ display: "none" }} />
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
