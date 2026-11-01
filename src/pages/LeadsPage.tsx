import { useState, useEffect } from "react";
import { Database, Send, Zap, PlusCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { pushAlert } from "../lib/notifications";

type Lead = {
  id: string;
  name: string;
  source: string;
  intent: string;
  routing: string;
  status: "Ingested" | "Routed" | "Dispatched";
  time: string;
};

const DEFAULT_LEADS: Lead[] = [
  { id: "L-101", name: "Enterprise AI Audit Inquiry", source: "Webhook API", intent: "High intent (100k+ scale)", routing: "Telegram #alerts", status: "Dispatched", time: "10 mins ago" },
  { id: "L-102", name: "Sovereign Cloud Deployment", source: "Landing Page", intent: "Medium intent", routing: "WhatsApp Channel", status: "Routed", time: "1 hour ago" },
];

type Status = { telegramConfigured: boolean; supabaseConfigured: boolean } | null;

export default function LeadsPage() {
  const [status, setStatus] = useState<Status>(null);
  const [supabaseMsg, setSupabaseMsg] = useState("Not tested");
  const [dispatchMsg, setDispatchMsg] = useState("Not tested");
  const [busy, setBusy] = useState(false);

  const [leads, setLeads] = useState<Lead[]>(() => {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return DEFAULT_LEADS;
    try {
      const saved = localStorage.getItem("sari_autonomous_leads");
      return saved ? (JSON.parse(saved) as Lead[]) : DEFAULT_LEADS;
    } catch {
      return DEFAULT_LEADS;
    }
  });

  useEffect(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try {
        localStorage.setItem("sari_autonomous_leads", JSON.stringify(leads));
      } catch {}
    }
  }, [leads]);

  useEffect(() => {
    void loadStatus();
  }, []);

  async function callLeads(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await fetch("/api/leads", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data: unknown = await res.json().catch(() => ({}));
    return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  }

  async function loadStatus() {
    try {
      const data = await callLeads({ action: "status" });
      setStatus({
        telegramConfigured: data.telegramConfigured === true,
        supabaseConfigured: data.supabaseConfigured === true,
      });
    } catch {
      setStatus({ telegramConfigured: false, supabaseConfigured: false });
    }
  }

  async function testSupabase() {
    setBusy(true);
    setSupabaseMsg("Probing Supabase from the server…");
    const data = await callLeads({ action: "test_supabase" });
    setSupabaseMsg(`${data.ok ? "✓" : "✗"} ${String(data.detail || "No response")}`);
    setBusy(false);
  }

  async function testDispatch() {
    setBusy(true);
    setDispatchMsg("Sending test alert via the server…");
    const data = await callLeads({ action: "test_telegram" });
    setDispatchMsg(`${data.ok ? "✓" : "✗"} ${String(data.detail || "No response")}`);
    setBusy(false);
  }

  async function simulateNewLead() {
    const newLead: Lead = {
      id: `L-${Math.floor(100 + Math.random() * 900)}`,
      name: `Inbound lead #${Math.floor(1 + Math.random() * 99)}`,
      source: "Manual simulation",
      intent: "High intent (instant dispatch)",
      routing: "Telegram",
      status: "Routed",
      time: "Just now",
    };

    const data = await callLeads({
      action: "dispatch",
      lead: { name: newLead.name, source: newLead.source, intent: newLead.intent },
    });

    const delivered = data.delivered === true;
    setLeads([{ ...newLead, status: delivered ? "Dispatched" : "Routed" }, ...leads]);

    pushAlert({
      title: `Lead: ${newLead.name}`,
      body: `${newLead.source} · ${newLead.intent} · ${
        delivered ? "delivered via Telegram" : "kept in the in-app feed (Telegram not configured)"
      }`,
      channel: delivered ? "telegram" : "in_app",
    });

    setDispatchMsg(
      delivered ? "✓ Delivered via Telegram" : "✓ Saved to Alerts — visible in the app now"
    );
  }

  const badge = (configured: boolean) => (
    <span
      className="badge"
      style={{
        background: "rgba(255,255,255,0.06)",
        color: configured ? "var(--green)" : "var(--muted)",
        borderColor: configured ? "var(--green)" : "var(--border)",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      {configured ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
      {configured ? "Configured" : "Not configured"}
    </span>
  );

  return (
    <div className="page" style={{ maxWidth: 1000, margin: "0 auto" }}>
      <h1 className="page-title">Autonomous Lead Ingestion & Alert Routing</h1>
      <p className="page-sub">
        Alerts land in the in-app <strong>Alerts</strong> feed immediately; Telegram delivery is optional and
        uses server-held credentials
      </p>

      {/* Vault status */}
      <div className="card" style={{ padding: 24, marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Database size={20} style={{ color: "var(--green)" }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Supabase Vault</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Server-held service key (<code>SARI_SUPABASE_URL</code>, <code>SARI_SUPABASE_KEY</code>)
              </div>
            </div>
          </div>
          {badge(status?.supabaseConfigured === true)}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={testSupabase} className="btn-primary" style={{ padding: "8px 16px", borderRadius: 10, fontSize: 13 }} disabled={busy}>
            Test Vault Connection
          </button>
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{supabaseMsg}</span>
        </div>
      </div>

      {/* Dispatch status */}
      <div className="card" style={{ padding: 24, marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Send size={20} style={{ color: "#3b82f6" }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Telegram Alert Dispatch (optional)</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Add <code>SARI_TELEGRAM_BOT_TOKEN</code> + <code>SARI_TELEGRAM_CHAT_ID</code> when available.
                Until then alerts stay in the app.
              </div>
            </div>
          </div>
          {status?.telegramConfigured ? (
            badge(true)
          ) : (
            <span className="badge" style={{ background: "rgba(251,191,36,0.1)", color: "var(--amber)", borderColor: "rgba(251,191,36,0.3)" }}>
              Optional — in-app feed
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={testDispatch} className="btn-primary" style={{ padding: "8px 16px", borderRadius: 10, fontSize: 13 }} disabled={busy}>
            Test Telegram Alert
          </button>
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{dispatchMsg}</span>
        </div>
      </div>

      {/* Leads feed */}
      <div className="card" style={{ padding: 24, marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Zap size={18} style={{ color: "var(--cyan)" }} />
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Local Lead Feed</h2>
          </div>
          <button onClick={simulateNewLead} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, fontSize: 12.5 }}>
            <PlusCircle size={15} /> Simulate & Dispatch
          </button>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 12 }}>
          Demo feed stored in this browser. Dispatch goes through the authenticated server and only succeeds when
          Telegram is configured.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--muted)" }}>
                <th style={{ padding: "10px 12px" }}>ID</th>
                <th style={{ padding: "10px 12px" }}>Lead Name</th>
                <th style={{ padding: "10px 12px" }}>Source</th>
                <th style={{ padding: "10px 12px" }}>Intent</th>
                <th style={{ padding: "10px 12px" }}>Routing</th>
                <th style={{ padding: "10px 12px" }}>Status</th>
                <th style={{ padding: "10px 12px" }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "12px", fontFamily: "monospace", color: "var(--cyan)" }}>{l.id}</td>
                  <td style={{ padding: "12px", fontWeight: 500 }}>{l.name}</td>
                  <td style={{ padding: "12px", color: "var(--muted)" }}>{l.source}</td>
                  <td style={{ padding: "12px" }}>{l.intent}</td>
                  <td style={{ padding: "12px" }}>{l.routing}</td>
                  <td style={{ padding: "12px" }}>
                    <span className="badge" style={{ background: "rgba(34,197,94,0.15)", color: "var(--green)" }}>{l.status}</span>
                  </td>
                  <td style={{ padding: "12px", color: "var(--muted)", fontSize: 12 }}>{l.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
