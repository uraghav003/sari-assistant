import { Link2, CheckCircle2 } from "lucide-react";

const connections = [
  { provider: "Gmail", account: "arjun@example.com" },
  { provider: "Outlook", account: "arjun@company.com" },
  { provider: "WhatsApp", account: "+91 98765 43210" },
  { provider: "Twilio", account: "+91 90987 65432" },
  { provider: "Microsoft Teams", account: "Teams Workspace" },
  { provider: "Notion", account: "Arjun Workspace" },
  { provider: "Linear", account: "company-workspace" },
];

export default function ConnectionsPage() {
  return (
    <div className="page">
      <h1 className="page-title">Connections</h1>
      <p className="page-sub">All channels sandbox · Live connectors after policy approval</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14, marginTop: 24 }}>
        {connections.map((c) => (
          <div key={c.provider} className="card" style={{ padding: 18, display: "flex", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Link2 size={18} style={{ color: "var(--cyan)" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: 13.5 }}>{c.provider}</span>
                <CheckCircle2 size={15} style={{ color: "var(--green)" }} />
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{c.account}</div>
              <span className="badge badge-sand" style={{ marginTop: 8 }}>sandbox</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
