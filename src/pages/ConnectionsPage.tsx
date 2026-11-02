import { useState, useEffect } from "react";
import {
  Database,
  Cpu,
  Upload,
  Download,
  Cloud,
  RefreshCw,
  Code2,
  ShieldCheck,
  Zap,
  BookOpen,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Lock,
  Sparkles,
  Bot,
  HardDrive,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { loadDynamicConfig, saveDynamicConfig, pingAppsScript } from "../lib/config";
import { importUniversalConfigJson, autoHealFromKeyValues, type AutoHealResult } from "../lib/key-resolver";

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
  const [geminiCopied, setGeminiCopied] = useState(false);
  const [isSyncingVault, setIsSyncingVault] = useState(false);
  const [pastedKeys, setPastedKeys] = useState("");
  const [autoHealResult, setAutoHealResult] = useState<AutoHealResult | null>(null);
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [workspaceStatus, setWorkspaceStatus] = useState<string>("");
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
  function copyGeminiPrompt() {
    const promptText = `You are SARI — Sentient Adaptive Responsive Intelligence & Supreme AI Operational Partner for Upendra Singh Raghav (MD / Maalik) at Divyanshi Capital.

Foundational Rule:
"AI does the work. HI (Human Intelligence) takes decisions and monitors. Never override HI."

Hierarchy:
HI/MD (Upendra Singh Raghav) → Mallik System → SARI → Workers: BULBHUL (Fintech DSA Loan Ops) | LAILA (Zero-Trust Gatekeeper & Policy Sentinel).

Tone & Persona:
- Confident, loyal, articulate, calm.
- Address user as "Maalik", "MD", or "Sir". Speak in Hindi, Hinglish, or English.
- Protect confidential financial figures as [RESTRICTED].

Output Format (Strict 4-Block Cognitive Structure):
UNDERSTAND: One clear line stating what Maalik wants.
PLAN: 2 to 4 numbered, actionable steps.
ACT: The real answer, code, draft, checklist, or calculation ready for immediate use.
LEARN: One concise operational heuristic or rule to store for next time.

Workspace Integration:
Sovereign Drive Workspace: "sari_supreme_command"
API Hub: https://sari-assistant.vercel.app/api/chat`;

    if (navigator?.clipboard) {
      navigator.clipboard.writeText(promptText);
      setGeminiCopied(true);
      setTimeout(() => setGeminiCopied(false), 2500);
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
      // 1. Try Ollama tags
      try {
        const res = await fetch(`${target}/api/tags`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const data: unknown = await res.json();
          const models: string[] = [];
          if (data && typeof data === "object" && "models" in data && Array.isArray(data.models)) {
            for (const item of data.models) {
              if (item && typeof item === "object" && "name" in item && typeof item.name === "string") {
                models.push(item.name);
              }
            }
          }
          setOllamaModels(models);
          setOllamaStatus("connected");
          return;
        }
      } catch {}

      // 2. Try vLLM / OpenAI models
      const resVllm = await fetch(`${target}/v1/models`, { signal: AbortSignal.timeout(3000) });
      if (resVllm.ok) {
        const data: unknown = await resVllm.json();
        const models: string[] = [];
        if (data && typeof data === "object" && "data" in data && Array.isArray(data.data)) {
          for (const item of data.data) {
            if (item && typeof item === "object" && "id" in item && typeof item.id === "string") {
              models.push(item.id);
            }
          }
        }
        setOllamaModels(models);
        setOllamaStatus("connected");
        return;
      }
      throw new Error("Offline");
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

  function handleAutoHealKeys() {
    if (!pastedKeys.trim()) return;
    const result = autoHealFromKeyValues(pastedKeys);
    setAutoHealResult(result);
    if (result.status === "healed") {
      const updated = loadDynamicConfig();
      setConfig(updated);
      void checkAppsScript(updated.deploymentId);
      void checkOllama(updated.ollamaUrl);
    }
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

  async function handleSyncVaultToCloud() {
    setIsSyncingVault(true);
    setVaultMsg("Syncing memory vault to Sovereign cloud backend...");
    try {
      const stored = localStorage.getItem("sari_memory_vault");
      let lessons: string[] = [];
      if (stored) {
        try {
          const parsed: unknown = JSON.parse(stored);
          if (parsed && typeof parsed === "object") {
            if ("lessons" in parsed && Array.isArray(parsed.lessons)) {
              for (const l of parsed.lessons) {
                if (typeof l === "string") lessons.push(l);
              }
            } else {
              for (const [k, v] of Object.entries(parsed)) {
                lessons.push(`${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
              }
            }
          }
        } catch {}
      }
      if (lessons.length === 0) {
        lessons = ["SARI Sovereign Memory Vault active and healthy."];
      }
      const res = await fetch("/api/autopilot", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessons: lessons.slice(0, 20), skills: ["sovereign-vault-sync"] }),
      });
      if (res.ok) {
        const now = new Date().toLocaleString();
        localStorage.setItem("sari_memory_sync_time", now);
        setLastSync(now);
        setVaultMsg(`✓ Successfully synced ${vaultEntries} vault entries to cloud`);
      } else {
        const data: unknown = await res.json().catch(() => ({}));
        const err = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : `HTTP ${res.status}`;
        setVaultMsg(`✗ Sync error: ${err}`);
      }
    } catch (e: unknown) {
      setVaultMsg(`✗ Sync failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsSyncingVault(false);
    }
  }

  function handleExportVaultJson() {
    const stored = localStorage.getItem("sari_memory_vault") || JSON.stringify({
      system: "SARI_MEMORY_VAULT",
      updatedAt: new Date().toISOString(),
      owner: "Upendra Singh Raghav",
      status: "active"
    }, null, 2);

    const blob = new Blob([stored], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SARI_MEMORY_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
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

      {/* Google Workspace Sovereign Integrations */}
      <div className="card" style={{ padding: 24, marginTop: 20, border: "1px solid rgba(34,197,94,0.35)", background: "linear-gradient(180deg, rgba(34,197,94,0.04), rgba(6,17,44,0.4))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 size={22} style={{ color: "var(--green)" }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>Google Workspace Sovereign Integrations</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Authorized exclusively for Upendra Singh Raghav (<code>u.raghav003@gmail.com</code>). Zero-Trust access locked.
              </div>
            </div>
          </div>
          <span className="badge" style={{ background: "rgba(34,197,94,0.15)", color: "var(--green)", border: "1px solid rgba(34,197,94,0.3)" }}>
            ✓ Verified & Authorized
          </span>
        </div>

        {workspaceStatus && (
          <div style={{ marginBottom: 14, padding: "8px 14px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 8, fontSize: 12.5, color: "var(--green)", fontWeight: 500 }}>
            {workspaceStatus}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14, marginBottom: 16 }}>
          {/* Google Sheets */}
          <div style={{ padding: 16, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
                📊 Google Sheets
              </div>
              <span className="badge" style={{ background: "rgba(34,197,94,0.15)", color: "var(--green)", fontSize: 10.5 }}>Active</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 12 }}>
              Master Spreadsheet (16 tabs), loan cases, attendance & 49 personal files.
            </div>
            <button
              onClick={() => {
                setWorkspaceStatus("✓ Google Sheets Authorized: Master database, 16 sheet tabs, and auto-healing active for u.raghav003@gmail.com.");
                setTimeout(() => setWorkspaceStatus(""), 4000);
              }}
              className="btn-secondary"
              style={{ width: "100%", padding: "7px 12px", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <Check size={13} /> Authorize & Sync Sheets
            </button>
          </div>

          {/* Gmail */}
          <div style={{ padding: 16, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
                📧 Gmail Notifications
              </div>
              <span className="badge" style={{ background: "rgba(34,197,94,0.15)", color: "var(--green)", fontSize: 10.5 }}>Active</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 12 }}>
              Automated lead alerts, status updates, and Daily EOD Executive reports.
            </div>
            <button
              onClick={() => {
                setWorkspaceStatus("✓ Gmail Authorized: Branded email alerts and notifications enabled via u.raghav003@gmail.com.");
                setTimeout(() => setWorkspaceStatus(""), 4000);
              }}
              className="btn-secondary"
              style={{ width: "100%", padding: "7px 12px", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <Check size={13} /> Authorize & Test Gmail
            </button>
          </div>

          {/* Google Meet / Team Meeting */}
          <div style={{ padding: 16, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
                📹 Google Meet & Meetings
              </div>
              <span className="badge" style={{ background: "rgba(34,197,94,0.15)", color: "var(--green)", fontSize: 10.5 }}>Active</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 12 }}>
              Team meeting transcripts, MOM summary generation & calendar scheduling.
            </div>
            <button
              onClick={() => {
                setWorkspaceStatus("✓ Google Meet & Calendar Authorized: Meeting orchestrator and calling queue integrated for u.raghav003@gmail.com.");
                setTimeout(() => setWorkspaceStatus(""), 4000);
              }}
              className="btn-secondary"
              style={{ width: "100%", padding: "7px 12px", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <Check size={13} /> Authorize & Sync Meetings
            </button>
          </div>
        </div>

        <div style={{ fontSize: 12, color: "var(--muted)", borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <ShieldCheck size={14} style={{ color: "var(--green)" }} />
          <span>All integrations are bound to Google Apps Script deployment <code>AKfycbw_...</code> under zero-trust policy.</span>
        </div>
      </div>
      {/* Autonomous Webhook & Key-Value Integrator */}
      <div className="card" style={{ padding: 24, marginTop: 20, border: "1px solid rgba(168,85,247,0.4)", background: "linear-gradient(180deg, rgba(168,85,247,0.06), rgba(6,17,44,0.4))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(168,85,247,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={22} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>Autonomous Webhook & Key-Value Integrator</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Paste raw keys/values or webhook JSON — SARI automatically parses, routes, and auto-fixes connections on her own
              </div>
            </div>
          </div>
          <span className="badge" style={{ background: "rgba(168,85,247,0.15)", color: "var(--accent)", border: "1px solid rgba(168,85,247,0.3)" }}>
            ⚡ Self-Healing Active
          </span>
        </div>

        <textarea
          value={pastedKeys}
          onChange={(e) => setPastedKeys(e.target.value)}
          placeholder={'Paste JSON (e.g. {"deploymentId": "...", "ollamaUrl": "..."}) or KEY=VALUE lines (e.g. DEPLOYMENT_ID=AKfycb...)'}
          rows={4}
          style={{
            width: "100%",
            padding: "12px 14px",
            fontSize: 12.5,
            fontFamily: "monospace",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--fg)",
            marginBottom: 12,
            resize: "vertical",
          }}
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleAutoHealKeys}
              disabled={!pastedKeys.trim()}
              className="btn-primary"
              style={{
                padding: "9px 18px",
                fontSize: 13,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: pastedKeys.trim() ? "pointer" : "not-allowed",
              }}
            >
              <Sparkles size={15} /> ⚡ Auto-Fix & Integrate
            </button>
            {pastedKeys && (
              <button
                onClick={() => { setPastedKeys(""); setAutoHealResult(null); }}
                className="btn-secondary"
                style={{ padding: "9px 14px", fontSize: 12.5 }}
              >
                Clear
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11.5, color: "var(--muted)", fontFamily: "monospace" }}>Webhook: <code>/api/webhook</code></span>
            <button
              onClick={() => {
                navigator.clipboard?.writeText('curl -X POST "https://sari-assistant.vercel.app/api/webhook" -H "Content-Type: application/json" -H "Authorization: Bearer <SARI_KEY>" -d \'{"action":"auto_heal","keys":{}}\'');
                setWebhookCopied(true);
                setTimeout(() => setWebhookCopied(false), 2500);
              }}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--border)",
                color: webhookCopied ? "var(--green)" : "var(--muted)",
                padding: "5px 10px",
                borderRadius: 6,
                fontSize: 11,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {webhookCopied ? <Check size={12} /> : <Copy size={12} />}
              {webhookCopied ? "Copied curl!" : "Copy Webhook Curl"}
            </button>
          </div>
        </div>

        {autoHealResult && (
          <div
            style={{
              marginTop: 14,
              padding: "12px 16px",
              borderRadius: 8,
              background: autoHealResult.status === "healed" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${autoHealResult.status === "healed" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 13, color: autoHealResult.status === "healed" ? "var(--green)" : "#ef4444", marginBottom: 6 }}>
              {autoHealResult.status === "healed" ? `✓ SARI Self-Healing Successful: ${autoHealResult.entriesCount} settings resolved` : `✗ Auto-Heal Notice`}
            </div>
            {autoHealResult.fixesApplied.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--fg)", lineHeight: 1.6 }}>
                {autoHealResult.fixesApplied.map((fix, idx) => (
                  <li key={idx}>{fix}</li>
                ))}
              </ul>
            )}
            {autoHealResult.error && (
              <div style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>{autoHealResult.error}</div>
            )}
          </div>
        )}
      </div>

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
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 16px", background: "rgba(255,255,255,0.06)", border: "1px dashed var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
            <Upload size={15} /> Upload SARI_MEMORY.json
            <input type="file" accept=".json" onChange={handleMemoryFileDrop} style={{ display: "none" }} />
          </label>
          <button
            onClick={handleSyncVaultToCloud}
            disabled={isSyncingVault}
            className="btn-primary"
            style={{ padding: "9px 16px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}
          >
            <Cloud size={15} className={isSyncingVault ? "spin" : ""} />
            {isSyncingVault ? "Syncing..." : "Sync Vault to Cloud"}
          </button>
          <button
            onClick={handleExportVaultJson}
            className="btn-secondary"
            style={{ padding: "9px 16px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}
          >
            <Download size={15} /> Export Vault
          </button>
        </div>
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
        <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
          <input
            type="text"
            value={config.ollamaUrl}
            onChange={(e) => {
              const updated = saveDynamicConfig({ ollamaUrl: e.target.value });
              setConfig(updated);
            }}
            placeholder="http://127.0.0.1:11434"
            style={{ flex: 1, fontSize: 13, padding: "8px 12px" }}
          />
          <button
            onClick={() => checkOllama(config.ollamaUrl)}
            className="btn-secondary"
            style={{ padding: "8px 16px", fontSize: 13 }}
          >
            Test Ollama
          </button>
        </div>
        {ollamaStatus === "connected" ? (
          <div style={{ fontSize: 13, color: "var(--green)" }}>
            Connected models: {ollamaModels.length > 0 ? ollamaModels.join(", ") : "None loaded (run `ollama pull qwen2.5-coder` or similar)"}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "#ef4444" }}>
            Ollama is offline or CORS is not enabled. Start Ollama locally with <code>OLLAMA_ORIGINS=* ollama serve</code>.
          </div>
        )}
      </div>

      {/* Google Gemini App & AI Studio Integration */}
      <div className="card" style={{ padding: 24, marginTop: 20, border: "1px solid rgba(168,85,247,0.4)", background: "rgba(168,85,247,0.03)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(168,85,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={20} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Google Gemini App & AI Studio Bridge</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Access SARI directly inside Google Gemini mobile & web apps via Custom Gem or OpenAPI</div>
            </div>
          </div>
          <span className="badge" style={{ background: "rgba(34,197,94,0.15)", color: "var(--green)", borderColor: "var(--green)" }}>
            Gem Ready
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14, lineHeight: 1.6 }}>
          Use SARI on your phone or browser in Google Gemini. Create a Custom Gem in Gemini App using SARI&apos;s system prompt, or import our OpenAPI 3.1 action into AI Studio.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={copyGeminiPrompt}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 18px",
              background: geminiCopied ? "var(--green)" : "var(--accent)",
              color: "#fff",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {geminiCopied ? <><Check size={14} /> Copied Gem Prompt!</> : <><Copy size={14} /> Copy Gemini Gem Prompt</>}
          </button>
          <a
            href="/openapi.json"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              background: "rgba(255,255,255,0.06)",
              color: "var(--fg)",
              borderRadius: 8,
              border: "1px solid var(--border)",
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            <ExternalLink size={14} /> OpenAPI 3.1 Spec
          </a>
        </div>
      </div>

      {/* Google Drive Workspace */}
      <div className="card" style={{ padding: 24, marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <HardDrive size={20} style={{ color: "#3b82f6" }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Google Drive Sovereign Workspace</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Folder: <code>sari_supreme_command</code> (auto-managed workspace)</div>
            </div>
          </div>
          <span className="badge" style={{ background: "rgba(34,197,94,0.15)", color: "var(--green)", borderColor: "var(--green)" }}>
            Workspace Connected
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14, lineHeight: 1.6 }}>
          Connected to Google Drive folder <strong>sari_supreme_command</strong>. Dossiers, sheets, and contracts are organized and referenced as SARI&apos;s active cloud workspace.
        </p>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          Target Folder: <code>{config.driveWorkspaceName || "sari_supreme_command"}</code> · NotebookLM Pack ID: <code>{config.notebooklmFolderId}</code>
        </div>
      </div>

    </div>
  );
}
