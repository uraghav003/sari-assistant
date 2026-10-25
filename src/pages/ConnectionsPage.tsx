import { useState, useEffect } from "react";
import {
  Database,
  Cpu,
  Upload,
  RefreshCw,
  Code2,
  ShieldCheck,
  Zap,
  BookOpen,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Lock,
} from "lucide-react";
import { loadDynamicConfig, saveDynamicConfig, pingAppsScript } from "../lib/config";
import { importUniversalConfigJson } from "../lib/key-resolver";

interface ServerStatus {
  configured: boolean;
  ok: boolean;
}

export default function ConnectionsPage() {
  const [config, setConfig] = useState(loadDynamicConfig());
  const [importStatus, setImportStatus] = useState<string>("");
  const [scriptStatus, setScriptStatus] = useState<"checking" | "connected" | "error">("checking");
  const [scriptMsg, setScriptMsg] = useState("");
  const [testingScript, setTestingScript] = useState(false);
  const [vaultEntries, setVaultEntries] = useState(0);
  const [lastSync, setLastSync] = useState<string>("Never");
  const [vaultMsg, setVaultMsg] = useState("Upload the SARI_MEMORY.json export to stage it locally");
  const [ollamaStatus, setOllamaStatus] = useState<"checking" | "connected" | "offline">("checking");
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [checkingOllama, setCheckingOllama] = useState(false);
  const [server, setServer] = useState<ServerStatus | null>(null);

  useEffect(() => {
    const current = loadDynamicConfig();
    setConfig(current);

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sari_memory_vault");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setVaultEntries(Object.keys(parsed).length);
          setLastSync(localStorage.getItem("sari_memory_sync_time") || "Recently");
        } catch {
          // ignore malformed local export
        }
      }
    }

    void checkServer();
    void checkAppsScript(current.deploymentId);
    void checkOllama(current.ollamaUrl);

    const interval = setInterval(() => {
      void checkOllama(current.ollamaUrl);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  async function checkServer() {
    try {
      const res = await fetch("/api/session", { credentials: "same-origin" });
      const data: unknown = await res.json();
      const obj = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
      setServer({ configured: obj.configured === true, ok: obj.ok === true });
    } catch {
      setServer({ configured: false, ok: false });
    }
  }

  async function checkAppsScript(depId?: string) {
    setTestingScript(true);
    const res = await pingAppsScript(depId || config.deploymentId);
    if (res.ok) {
      setScriptStatus("connected");
      setScriptMsg("✓ Apps Script web app responded");
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
      const data: unknown = await res.json();
      const models = (data && typeof data === "object" && Array.isArray((data as { models?: unknown }).models)
        ? ((data as { models: Array<{ name?: string }> }).models)
        : []
      )
        .map((m) => m.name || "")
        .filter(Boolean);
      setOllamaModels(models);
      setOllamaStatus("connected");
    } catch {
      setOllamaStatus("offline");
      setOllamaModels([]);
    } finally {
      setCheckingOllama(false);
    }
  }

  function handleSaveConfig() {
    setConfig(saveDynamicConfig(config));
    void checkAppsScript(config.deploymentId);
  }

  function handleUniversalJsonDrop(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const result = importUniversalConfigJson(text);
        setConfig(loadDynamicConfig());
        setImportStatus(`✓ Extracted ${result.entriesCount} routing identifiers from ${file.name}`);
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
        const parsed: unknown = JSON.parse(text);
        const count = parsed && typeof parsed === "object" ? Object.keys(parsed).length : 0;
        const now = new Date().toLocaleString();
        localStorage.setItem("sari_memory_vault", text);
        localStorage.setItem("sari_memory_sync_time", now);
        setVaultEntries(count);
        setLastSync(now);
        setVaultMsg(`Staged ${count} entries from ${file.name}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setVaultMsg(`Import failed: ${message}`);
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="page" style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 className="page-title">Connections & Sovereign Mind</h1>
      <p className="page-sub">Routing identifiers, local runtime health and server-managed credentials</p>

      {/* Server-managed credentials */}
      <div className="card" style={{ padding: 24, marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Lock size={20} style={{ color: "var(--green)" }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Server Credentials</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                API keys and tokens are held in deployment environment variables — never in this browser
              </div>
            </div>
          </div>
          <span
            className="badge"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: server?.configured ? "var(--green)" : "#ef4444",
              borderColor: server?.configured ? "var(--green)" : "#ef4444",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {server?.configured ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            {server?.configured ? "Server configured" : "Server incomplete"}
          </span>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.7 }}>
          Required: <code>SARI_SESSION_SECRET</code>, <code>SARI_PASSWORD_HASH</code>.
          Optional: <code>GEMINI_API_KEY</code>, <code>SARI_SHARED_SECRET</code>,{" "}
          <code>SARI_APPS_SCRIPT_URL</code>, <code>SARI_TELEGRAM_BOT_TOKEN</code>,{" "}
          <code>SARI_TELEGRAM_CHAT_ID</code>, <code>SARI_SUPABASE_URL</code>, <code>SARI_SUPABASE_KEY</code>.
          Set these in the Vercel project (and Google Apps Script properties), never in the UI.
        </div>
      </div>

      {/* Universal JSON import */}
      <div className="card" style={{ padding: 24, marginTop: 20, border: "1px dashed rgba(59,130,246,0.5)", background: "rgba(59,130,246,0.03)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileJson size={22} style={{ color: "#3b82f6" }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Universal JSON Configuration Import</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Imports Script ID, Deployment ID and Drive folder only — API keys in the file are ignored
              </div>
            </div>
          </div>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "#3b82f6", color: "#fff", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
            <Upload size={16} /> Choose JSON
            <input type="file" accept=".json" onChange={handleUniversalJsonDrop} style={{ display: "none" }} />
          </label>
        </div>
        {importStatus && (
          <div style={{ fontSize: 12.5, marginTop: 8, color: importStatus.startsWith("✓") ? "var(--green)" : "#ef4444", fontWeight: 500 }}>
            {importStatus}
          </div>
        )}
      </div>

      {/* Dynamic Mind */}
      <div className="card" style={{ padding: 24, marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Code2 size={20} style={{ color: "var(--green)" }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Dynamic Mind (Google Apps Script)</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Health probe only — writes are signature-gated server-side</div>
            </div>
          </div>
          <span className="badge" style={{ background: "rgba(255,255,255,0.06)", color: scriptStatus === "connected" ? "var(--green)" : "#ef4444", borderColor: scriptStatus === "connected" ? "var(--green)" : "#ef4444" }}>
            {scriptStatus === "connected" ? "Reachable" : scriptStatus === "checking" ? "Checking..." : "Unreachable"}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>Script ID (.clasp.json)</label>
            <input
              type="text"
              value={config.scriptId}
              onChange={(e) => setConfig({ ...config, scriptId: e.target.value })}
              style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", color: "inherit", fontSize: 13 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>Deployment ID / Web App</label>
            <input
              type="text"
              value={config.deploymentId}
              onChange={(e) => setConfig({ ...config, deploymentId: e.target.value })}
              style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", color: "inherit", fontSize: 13 }}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleSaveConfig} className="btn-secondary" style={{ padding: "8px 16px", borderRadius: 10, fontWeight: 500 }}>
            Save Properties
          </button>
          <button onClick={() => checkAppsScript()} className="btn-primary" style={{ padding: "8px 16px", borderRadius: 10, fontWeight: 500 }} disabled={testingScript}>
            {testingScript ? "Testing..." : "Test Endpoint"}
          </button>
        </div>
        {scriptMsg && <div style={{ marginTop: 10, fontSize: 12.5, color: scriptStatus === "connected" ? "var(--green)" : "#ef4444" }}>{scriptMsg}</div>}
      </div>

      {/* Drive pack */}
      <div className="card" style={{ padding: 24, marginTop: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(249,115,22,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={18} style={{ color: "#f97316" }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>NotebookLM Drive Pack</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Credit manuals & circulars index</div>
          </div>
        </div>
        <label style={{ fontSize: 11.5, color: "var(--muted)", display: "block", marginBottom: 4 }}>Google Drive Folder ID</label>
        <input
          type="text"
          value={config.notebooklmFolderId || ""}
          onChange={(e) => setConfig({ ...config, notebooklmFolderId: e.target.value })}
          style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "inherit", fontSize: 12, marginBottom: 12 }}
        />
        <button onClick={handleSaveConfig} className="btn-secondary" style={{ width: "100%", padding: 8, borderRadius: 8, fontSize: 12 }}>
          Save Folder
        </button>
      </div>

      {/* Autopilot status */}
      <div className="card" style={{ padding: 24, marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(234,179,8,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={20} style={{ color: "#eab308" }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Self-Healing & Autopilot</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Client-side failover; sync is proxied through the authenticated API</div>
            </div>
          </div>
          <span className="badge" style={{ background: "rgba(34,197,94,0.1)", color: "var(--green)", borderColor: "var(--green)" }}>
            <Zap size={12} style={{ marginRight: 4 }} /> Failover active
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12.5, color: "var(--muted)" }}>
          <div style={{ padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>Self-Healing</div>
            Cloud proxy → local Ollama → explicit offline state. No fabricated answers.
          </div>
          <div style={{ padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>Self-Learning</div>
            Lessons and generated skills are stored locally and synced via <code>/api/autopilot</code>.
          </div>
        </div>
      </div>

      {/* Memory vault staging */}
      <div className="card" style={{ padding: 24, marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(168,85,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Database size={20} style={{ color: "#a855f7" }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Memory Vault (staging)</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Local preview of the Drive export</div>
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
          <Upload size={16} /> Upload SARI_MEMORY.json
          <input type="file" accept=".json" onChange={handleMemoryFileDrop} style={{ display: "none" }} />
        </label>
      </div>

      {/* Ollama */}
      <div className="card" style={{ padding: 24, marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Cpu size={20} style={{ color: "var(--green)" }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Local AI Runtime (Ollama)</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Tier-2 local fallback ({config.ollamaUrl})</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="badge" style={{ background: "rgba(255,255,255,0.06)", color: ollamaStatus === "connected" ? "var(--green)" : "#ef4444", borderColor: ollamaStatus === "connected" ? "var(--green)" : "#ef4444" }}>
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
            Ollama is not reachable on this device — the cloud proxy is the primary brain.
          </div>
        )}
      </div>
    </div>
  );
}
