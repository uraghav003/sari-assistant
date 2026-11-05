import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail, Phone, Zap, Activity, ShieldCheck, Bot,
  Wand2, ArrowRight, Shield, Cpu, Terminal, Sparkles, Play,
  BookOpen, BarChart2, CheckCircle, AlertCircle,
} from "lucide-react";

/* ─── API response interfaces ─────────────────────────────────────────── */

interface SariStatusResponse {
  sari: {
    active: boolean;
    mode: string;
    monteCarloSimulationsCount: number;
    totalBanks: number;
  };
  uptime: number;
}

interface HubStatusResponse {
  status: string;
  sari: {
    active: boolean;
    mode: string;
    monteCarloSimulationsCount: number;
  };
  swarm: {
    maxAgents: number;
  };
  uptime: number;
}

interface AuditLog {
  t: string;
  a: string;
  d: string;
}

interface AuditResponse {
  ok: boolean;
  logs: AuditLog[];
}

interface LeadsResponse {
  ok: boolean;
  total: number;
}

interface ActivateResponse {
  message: string;
  status: string;
  mode: string;
  active: boolean;
  swarm: { activeAgents: number };
}

interface SimulateResponse {
  defaultProbabilityPct: number;
  stressTestVerdict: string;
}

interface LearnResponse {
  status: string;
  matrixLearned: boolean;
  banksCount: number;
  algorithmsTrained: number;
}

/* ─── Static data (unchanged) ─────────────────────────────────────────── */

const agentsHierarchy = [
  { name: "SARI", role: "Master Personal AI & Swarm Orchestrator", status: "ACTIVE", icon: Bot, color: "var(--cyan)", desc: "Executive Control, Workflow Builder, Multi-Agent Swarm Coordinator" },
  { name: "BULBHUL", role: "Fintech Personal Banker & Underwriting Core", status: "ACTIVE", icon: Cpu, color: "var(--green)", desc: "52+ Bank Fitment Matrix, EMI Split, Underwriting Risk Assessment" },
  { name: "LAILA", role: "Zero-Trust Gatekeeper & Policy Sentinel", status: "ACTIVE", icon: Shield, color: "var(--purple)", desc: "Policy Auditing, ALL_EMPLOYEES Access Control, Webhook HMAC Verification" },
  { name: "BHISM", role: "Outbound Telephony Calling Desk", status: "ACTIVE", icon: Phone, color: "var(--amber)", desc: "Dialer Queue Management, Hinglish Voice Scripts, Live Call Dispositions" },
  { name: "POSTMASTER", role: "Omnichannel Messaging & Meetings Hub", status: "ACTIVE", icon: Mail, color: "#60a5fa", desc: "WhatsApp Automation, Telegram Alerts, Gmail & Google Meet Sync" },
  { name: "MALLIK", role: "Sovereign Build Engine & AI Product Factory", status: "ACTIVE", icon: Wand2, color: "#ec4899", desc: "Autonomous Code Generation, AST Transforms, Vercel & Cloudflare Deployments" },
];

/* ─── Component ───────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const navigate = useNavigate();

  /* Sync All Agents state */
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  /* Live stats state */
  const [activeCases, setActiveCases] = useState<number | null>(null);
  const [banksLearned, setBanksLearned] = useState<number>(52);
  const [simulationsRun, setSimulationsRun] = useState<number | null>(null);
  const [swarmAgents, setSwarmAgents] = useState<number | null>(null);
  const [hubActive, setHubActive] = useState<boolean>(false);

  /* Recent activity state */
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);

  /* Quick-action feedback state */
  interface Toast { type: "success" | "error" | "info"; message: string }
  const [toast, setToast] = useState<Toast | null>(null);
  const [simResult, setSimResult] = useState<SimulateResponse | null>(null);
  const [learnResult, setLearnResult] = useState<LearnResponse | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  function showToast(type: Toast["type"], message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }

  /* ── Bootstrap fetch on mount ───────────────────────────────────────── */
  useEffect(() => {
    // SARI status + leads count in parallel
    void (async () => {
      try {
        const [statusRes, leadsRes, hubRes] = await Promise.all([
          fetch("/api/sari/status", { credentials: "same-origin" }),
          fetch("/api/leads", { credentials: "same-origin" }),
          fetch("/hub/status", { credentials: "same-origin" }),
        ]);

        if (statusRes.ok) {
          const s = (await statusRes.json()) as SariStatusResponse;
          setBanksLearned(s.sari.totalBanks ?? 52);
          setSimulationsRun(s.sari.monteCarloSimulationsCount ?? 0);
        }
        if (leadsRes.ok) {
          const l = (await leadsRes.json()) as LeadsResponse;
          setActiveCases(l.total ?? 0);
        }
        if (hubRes.ok) {
          const h = (await hubRes.json()) as HubStatusResponse;
          setSwarmAgents(h.swarm?.maxAgents ?? 0);
          setHubActive(h.status === "ok" || h.sari?.active === true);
        }
      } catch {
        // network failures: leave nulls, show placeholder dashes
      }
    })();

    // Audit logs
    void (async () => {
      try {
        const res = await fetch("/api/audit", { credentials: "same-origin" });
        if (res.ok) {
          const data = (await res.json()) as AuditResponse;
          setAuditLogs((data.logs ?? []).slice(-5).reverse());
        }
      } catch {
        // leave empty
      } finally {
        setAuditLoading(false);
      }
    })();
  }, []);

  /* ── Live stats config ──────────────────────────────────────────────── */
  const liveStats = [
    { label: "Active Cases", value: activeCases !== null ? String(activeCases) : "—", icon: Zap, color: "var(--cyan)" },
    { label: "Banks Learned", value: String(banksLearned), icon: BookOpen, color: "var(--green)" },
    { label: "Simulations Run", value: simulationsRun !== null ? String(simulationsRun) : "—", icon: BarChart2, color: "var(--purple)" },
    { label: "Swarm Agents", value: swarmAgents !== null ? String(swarmAgents) : "—", icon: Bot, color: "var(--amber)" },
  ];

  /* ── Quick action handlers ──────────────────────────────────────────── */
  async function handleActivate() {
    setActionLoading("activate");
    try {
      const res = await fetch("/api/sari/activate", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "autonomous" }),
      });
      const data = (await res.json()) as ActivateResponse;
      if (res.ok) {
        showToast("success", `✓ SARI ${data.status} · Mode: ${data.mode} · ${data.message}`);
      } else {
        showToast("error", "Activation returned an error response.");
      }
    } catch {
      showToast("error", "Failed to reach /api/sari/activate.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSimulate() {
    setSimResult(null);
    setActionLoading("simulate");
    try {
      const res = await fetch("/api/sari/simulate", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanAmount: 500000, customerProfile: { cibil: 720 } }),
      });
      const data = (await res.json()) as SimulateResponse;
      if (res.ok) {
        setSimResult(data);
        setSimulationsRun((prev) => (prev !== null ? prev + 1 : 1));
      } else {
        showToast("error", "Simulation returned an error response.");
      }
    } catch {
      showToast("error", "Failed to reach /api/sari/simulate.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleLearn() {
    setLearnResult(null);
    setActionLoading("learn");
    try {
      const res = await fetch("/api/sari/learn", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "dashboard-trigger" }),
      });
      const data = (await res.json()) as LearnResponse;
      if (res.ok) {
        setLearnResult(data);
        if (data.banksCount) setBanksLearned(data.banksCount);
        showToast("success", `✓ Learned ${data.banksCount} banks · Matrix ${data.matrixLearned ? "updated" : "unchanged"}`);
      } else {
        showToast("error", "Learn endpoint returned an error response.");
      }
    } catch {
      showToast("error", "Failed to reach /api/sari/learn.");
    } finally {
      setActionLoading(null);
    }
  }

  /* ── Sync All Agents ────────────────────────────────────────────────── */
  async function triggerSwarmSync() {
    setSyncing(true);
    setSyncMsg("Refreshing SARI Supreme Command (Apps Script heartbeat)...");
    try {
      // Lesson sync first (previous behaviour), then the Supreme Command heartbeat whose result is displayed.
      await fetch("/api/autopilot", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessons: ["Swarm telemetry heartbeat synced from Dashboard"], skills: ["swarm-orchestration"] }),
        signal: AbortSignal.timeout(20000),
      }).catch(() => undefined);
      const res = await fetch("/api/autopilot", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: true }),
        signal: AbortSignal.timeout(20000),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; result?: { message?: string } | null };
      setSyncMsg(
        res.ok && data.ok && data.result?.message
          ? `✓ Supreme Command: ${data.result.message}`
          : `✗ Supreme Command refresh failed${res.status === 401 ? " (sign in first)" : data.error ? `: ${data.error}` : ` (HTTP ${res.status})`}`,
      );
    } catch {
      setSyncMsg("✗ Supreme Command unreachable.");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(""), 4000);
    }
  }

  /* ─── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="page">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Command Center &amp; Swarm Hub</h1>
          <p className="page-sub">Welcome, Maalik (Upendra Singh Raghav) · SARI Sovereign Personal AI Active · sari_supreme_command</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => { void triggerSwarmSync(); }}
            disabled={syncing}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 14px", background: "rgba(168,85,247,0.15)",
              border: "1px solid var(--accent)", color: "var(--accent)",
              borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 500,
            }}
          >
            <Sparkles size={14} className={syncing ? "spin" : ""} />
            {syncing ? "Syncing Swarm..." : "Sync All Agents"}
          </button>
          <span className="badge badge-live"><span className="dot" /> Live</span>
        </div>
      </div>

      {/* ── Maalik info card ───────────────────────────────────────────── */}
      <div style={{ marginTop: 14, padding: "12px 18px", background: "linear-gradient(90deg, rgba(168,85,247,0.12), rgba(6,182,212,0.08))", border: "1px solid rgba(168,85,247,0.3)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #a855f7, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>
            UR
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
              Upendra Singh Raghav · Sovereign Owner (Maalik)
            </div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}>
              <span>Primary: <code style={{ color: "var(--accent)" }}>u.raghav003@gmail.com</code></span>
              <span>•</span>
              <span style={{ color: "#22c55e", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }}></span>
                Exclusive Master Access Locked
              </span>
            </div>
          </div>
        </div>
        <Link
          to="/chat"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "linear-gradient(135deg, #a855f7, #7c3aed)", color: "#fff", borderRadius: 8, fontSize: 12.5, fontWeight: 600, textDecoration: "none" }}
        >
          🎙️ Speak Voice Command
        </Link>
      </div>

      {/* ── Toast notification ─────────────────────────────────────────── */}
      {toast && (
        <div style={{
          marginTop: 12, padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500,
          display: "flex", alignItems: "center", gap: 8,
          background: toast.type === "success" ? "rgba(34,197,94,0.12)" : toast.type === "error" ? "rgba(239,68,68,0.12)" : "rgba(34,211,238,0.10)",
          border: `1px solid ${toast.type === "success" ? "rgba(34,197,94,0.4)" : toast.type === "error" ? "rgba(239,68,68,0.4)" : "rgba(34,211,238,0.3)"}`,
          color: toast.type === "success" ? "var(--green)" : toast.type === "error" ? "#f87171" : "var(--cyan)",
        }}>
          {toast.type === "success" ? <CheckCircle size={15} /> : toast.type === "error" ? <AlertCircle size={15} /> : <Activity size={15} />}
          {toast.message}
        </div>
      )}

      {syncMsg && (
        <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--green)", fontWeight: 500 }}>
          {syncMsg}
        </div>
      )}

      {/* ── Live Stats Bar ──────────────────────────────────────────────── */}
      <div className="stat-grid" style={{ marginTop: 16 }}>
        {liveStats.map((s) => (
          <div key={s.label} className="stat">
            <s.icon size={18} style={{ color: s.color }} />
            <div className="stat-val">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Quick Action Cards (2×2 grid) ──────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginTop: 16 }}>

        {/* Activate SARI */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(34,211,238,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={18} style={{ color: "var(--cyan)" }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>Activate SARI</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Set autonomous mode</div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 12 }}>
            Boot the sovereign brain into full autonomous mode and activate all swarm subagents.
          </p>
          <button
            onClick={() => { void handleActivate(); }}
            disabled={actionLoading === "activate"}
            style={{
              width: "100%", padding: "8px 0", background: "rgba(34,211,238,0.15)",
              border: "1px solid rgba(34,211,238,0.4)", color: "var(--cyan)",
              borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <Play size={13} />
            {actionLoading === "activate" ? "Activating…" : "Activate Now"}
          </button>
        </div>

        {/* Run Monte Carlo */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(168,85,247,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BarChart2 size={18} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>Run Monte Carlo</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Simulate risk distribution</div>
            </div>
          </div>
          {simResult ? (
            <div style={{ marginBottom: 12 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px",
                background: simResult.stressTestVerdict === "PASS" ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)",
                border: `1px solid ${simResult.stressTestVerdict === "PASS" ? "rgba(34,197,94,0.4)" : "rgba(245,158,11,0.4)"}`,
                borderRadius: 6, fontSize: 12, fontWeight: 700,
                color: simResult.stressTestVerdict === "PASS" ? "var(--green)" : "var(--amber)",
              }}>
                {simResult.stressTestVerdict === "PASS" ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                {simResult.stressTestVerdict} · Default Risk: {simResult.defaultProbabilityPct.toFixed(1)}%
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 12 }}>
              Run probabilistic Monte Carlo simulation across 52-bank matrix for default risk scoring.
            </p>
          )}
          <button
            onClick={() => { void handleSimulate(); }}
            disabled={actionLoading === "simulate"}
            style={{
              width: "100%", padding: "8px 0", background: "rgba(168,85,247,0.15)",
              border: "1px solid rgba(168,85,247,0.4)", color: "var(--accent)",
              borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <BarChart2 size={13} />
            {actionLoading === "simulate" ? "Running…" : "Run Simulation"}
          </button>
        </div>

        {/* Learn 52 Banks */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(34,197,94,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={18} style={{ color: "var(--green)" }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>Learn 52 Banks</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Refresh bank matrix</div>
            </div>
          </div>
          {learnResult ? (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                <CheckCircle size={13} />
                {learnResult.banksCount} banks · Matrix {learnResult.matrixLearned ? "updated" : "unchanged"} · {learnResult.algorithmsTrained} algorithms
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 12 }}>
              Pull the latest ROI rates, TATs, and eligibility rules for all 52 partner banks into memory.
            </p>
          )}
          <button
            onClick={() => { void handleLearn(); }}
            disabled={actionLoading === "learn"}
            style={{
              width: "100%", padding: "8px 0", background: "rgba(34,197,94,0.15)",
              border: "1px solid rgba(34,197,94,0.4)", color: "var(--green)",
              borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <BookOpen size={13} />
            {actionLoading === "learn" ? "Learning…" : "Learn Banks"}
          </button>
        </div>

        {/* Open Terminal */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Terminal size={18} style={{ color: "var(--amber)" }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>Open Terminal</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Sovereign command shell</div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 12 }}>
            Open the SARI sovereign terminal to run commands, inspect logs, and manage the swarm interactively.
          </p>
          <button
            onClick={() => navigate("/terminal")}
            style={{
              width: "100%", padding: "8px 0", background: "rgba(245,158,11,0.15)",
              border: "1px solid rgba(245,158,11,0.4)", color: "var(--amber)",
              borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <Terminal size={13} />
            Open Terminal
          </button>
        </div>
      </div>

      {/* ── Recent Activity + Swarm Health (2-col) ─────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginTop: 16 }}>

        {/* Recent Activity Feed */}
        <div className="card">
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={15} style={{ color: "var(--accent)" }} />
            <span style={{ fontWeight: 600, fontSize: 13 }}>Recent Activity</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>Last 5 audit events</span>
          </div>
          {auditLoading ? (
            /* Loading skeleton */
            [1, 2, 3].map((n) => (
              <div key={n} style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.04)", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 12, borderRadius: 4, background: "rgba(255,255,255,0.06)", width: "60%", marginBottom: 6 }} />
                  <div style={{ height: 10, borderRadius: 4, background: "rgba(255,255,255,0.04)", width: "40%" }} />
                </div>
              </div>
            ))
          ) : auditLogs.length === 0 ? (
            <div style={{ padding: "28px 18px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              No audit events yet.
            </div>
          ) : (
            auditLogs.map((log, i) => (
              <div key={i} style={{ padding: "12px 18px", display: "flex", alignItems: "flex-start", gap: 12, borderBottom: i < auditLogs.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(168,85,247,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Activity size={14} style={{ color: "var(--accent)" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#fff", marginBottom: 2 }}>{log.a}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.d}</div>
                  <div style={{ fontSize: 10.5, color: "var(--muted)", opacity: 0.7 }}>{log.t}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Swarm Health Indicator */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
            <Bot size={15} style={{ color: "var(--cyan)" }} />
            <span style={{ fontWeight: 600, fontSize: 13 }}>Swarm Health</span>
            <span style={{
              marginLeft: "auto", fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
              background: hubActive ? "rgba(34,197,94,0.15)" : "rgba(100,116,139,0.15)",
              color: hubActive ? "var(--green)" : "var(--muted)",
              border: `1px solid ${hubActive ? "rgba(34,197,94,0.3)" : "rgba(100,116,139,0.3)"}`,
            }}>
              {hubActive ? "Hub OK" : "Offline"}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {agentsHierarchy.map((agent) => (
              <div key={agent.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: hubActive ? "var(--green)" : "var(--amber)",
                  boxShadow: hubActive ? "0 0 6px rgba(34,197,94,0.6)" : "0 0 6px rgba(245,158,11,0.6)",
                }} />
                <agent.icon size={13} style={{ color: agent.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", flex: 1 }}>{agent.name}</span>
                <span style={{ fontSize: 10.5, color: hubActive ? "var(--green)" : "var(--amber)", fontWeight: 600 }}>
                  {hubActive ? agent.status : "STANDBY"}
                </span>
              </div>
            ))}
          </div>
          {swarmAgents !== null && (
            <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--border)", fontSize: 11.5, color: "var(--muted)", display: "flex", justifyContent: "space-between" }}>
              <span>Max Agents</span>
              <span style={{ color: "var(--cyan)", fontWeight: 700 }}>{swarmAgents}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Agent Hierarchy Grid ────────────────────────────────────────── */}
      <div className="card" style={{ padding: 20, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
          <Bot size={16} style={{ color: "var(--cyan)" }} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>Active Sovereign Agent Hierarchy (Divyanshi Capital)</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {agentsHierarchy.map((agent) => (
            <div key={agent.name} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 12, padding: 14, display: "flex", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <agent.icon size={18} style={{ color: agent.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: agent.color }}>{agent.name}</span>
                  <span className="badge" style={{ background: "rgba(34,197,94,0.15)", color: "var(--green)", fontSize: 10.5 }}>{agent.status}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", marginTop: 2 }}>{agent.role}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, lineHeight: 1.4 }}>{agent.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom row: Skills Builder + Zero Trust ─────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
        <Link to="/skills" className="card" style={{ padding: 18, display: "block", background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(34,211,238,0.08))", borderColor: "rgba(168,85,247,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Wand2 size={15} style={{ color: "#e9d5ff" }} />
            <span style={{ fontWeight: 600, fontSize: 13, color: "#e9d5ff" }}>Self-Build Skills</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 12 }}>Guide SARI to create new skills. Describe what you need — she builds it.</p>
          <span style={{ fontSize: 12, color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 4 }}>
            Open Skills Builder <ArrowRight size={13} />
          </span>
        </Link>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <ShieldCheck size={15} style={{ color: "var(--accent)" }} />
            <span style={{ fontWeight: 600, fontSize: 13 }}>Zero Trust</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>HttpOnly session cookie. All provider keys and integration tokens are held server-side; the browser stores none.</p>
        </div>
      </div>

    </div>
  );
}
