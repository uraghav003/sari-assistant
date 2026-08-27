import { Activity } from "lucide-react";

const rows = [
  { t: "2026-08-28 01:05 IST", a: "Vercel build", d: "vite missing Layout/Policies — patched" },
  { t: "2026-08-28 01:03 IST", a: "Drive copy", d: "SARI cores → SARI_SUPREME (no Sheets)" },
  { t: "2026-08-28 01:01 IST", a: "MCP ping", d: "GitHub + Drive + Vercel live" },
];

export default function AuditPage() {
  return (
    <div className="page">
      <h1 className="page-title">Audit Trail</h1>
      <p className="page-sub">Local log · No PII</p>
      <div className="card" style={{ marginTop: 24 }}>
        {rows.map((r, i) => (
          <div key={r.t} style={{ padding: "14px 18px", display: "flex", gap: 14, borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}>
            <Activity size={16} style={{ color: "var(--cyan)", marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{r.a}</div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{r.d}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{r.t}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
