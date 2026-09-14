import { MessageSquare, Mail, Phone, Zap, Activity, ShieldCheck, Bot, Wand2, ArrowRight, Shield, Cpu } from "lucide-react";
import { Link } from "react-router-dom";

const stats = [
  { label: "Active Channels", value: "7", icon: Zap, color: "var(--cyan)" },
  { label: "Unread", value: "12", icon: MessageSquare, color: "var(--purple)" },
  { label: "Calls Today", value: "5", icon: Phone, color: "var(--green)" },
  { label: "Skills Live", value: "6", icon: Wand2, color: "var(--amber)" },
];

const agentsHierarchy = [
  { name: "SARI", role: "Master Sovereign AI", status: "ACTIVE", icon: Bot, color: "var(--cyan)", desc: "Executive Control, Workflow Builder, Multi-Agent Orchestration" },
  { name: "LAILA", role: "System Auditor & Policy Controller", status: "ACTIVE", icon: Shield, color: "var(--purple)", desc: "Audit Trail Logging, Financial Data Protection, Zero-Trust Gatekeeping" },
  { name: "BULBUL", role: "Operations & Reporting Analyst", status: "ACTIVE", icon: Cpu, color: "var(--green)", desc: "Lead Intake Ingestion, Telegram / WhatsApp Routing, Daily Operations Digest" },
];

const recent = [
  { type: "email", title: "Zero-Trust Policy Heartbeat", from: "System Auditor (LAILA)", time: "12m ago" },
  { type: "whatsapp", title: "Inbound Webhook Channel Check", from: "System Auditor (LAILA)", time: "28m ago" },
  { type: "skill", title: "Skill built: Daily Inbox Brief", from: "SARI", time: "2h ago" },
];

export default function DashboardPage() {
  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Command Center</h1>
          <p className="page-sub">SARI online · Autonomous mode · Zero Trust active</p>
        </div>
        <span className="badge badge-live"><span className="dot" /> Live</span>
      </div>
      <div className="stat-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat">
            <s.icon size={18} style={{ color: s.color }} />
            <div className="stat-val">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Real Hierarchy: SARI, LAILA, BULBUL */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
        <div className="card">
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={15} style={{ color: "var(--purple)" }} />
            <span style={{ fontWeight: 600, fontSize: 13 }}>Recent Activity</span>
          </div>
          {recent.map((item, i) => (
            <div key={i} style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, borderBottom: i < recent.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {item.type === "email" && <Mail size={15} style={{ color: "#60a5fa" }} />}
                {item.type === "whatsapp" && <MessageSquare size={15} style={{ color: "var(--green)" }} />}
                {item.type === "skill" && <Wand2 size={15} style={{ color: "var(--purple)" }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{item.title}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{item.from} · {item.time}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Bot size={15} style={{ color: "var(--cyan)" }} />
              <span style={{ fontWeight: 600, fontSize: 13 }}>SARI Status</span>
            </div>
            {["Mode|Autonomous|var(--cyan)", "Brain|Ready|var(--green)", "Skills Engine|Active|var(--purple)", "Policy Engine|Enforced|var(--green)"].map((row) => {
              const [k, v, c] = row.split("|");
              return (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 10 }}>
                  <span style={{ color: "var(--muted)" }}>{k}</span>
                  <span style={{ color: c }}>{v}</span>
                </div>
              );
            })}
          </div>
          <Link to="/skills" className="card" style={{ padding: 18, display: "block", background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(34,211,238,0.08))", borderColor: "rgba(168,85,247,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Wand2 size={15} style={{ color: "#e9d5ff" }} />
              <span style={{ fontWeight: 600, fontSize: 13, color: "#e9d5ff" }}>Self-Build Skills</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 12 }}>Guide SARI to create new skills. Describe what you need — she builds it.</p>
            <span style={{ fontSize: 12, color: "var(--purple)", display: "inline-flex", alignItems: "center", gap: 4 }}>Open Skills Builder <ArrowRight size={13} /></span>
          </Link>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <ShieldCheck size={15} style={{ color: "var(--purple)" }} />
              <span style={{ fontWeight: 600, fontSize: 13 }}>Zero Trust</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>Session tokens short-lived. No hardcoded secrets. Tenant isolation ready.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
