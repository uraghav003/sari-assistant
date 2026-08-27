import { Shield } from "lucide-react";

const rules = [
  { k: "Identity", v: "ALL_EMPLOYEES is SSOT. Inactive / false / no → full stop." },
  { k: "PII", v: "No EMP_CODE, loan data, or secrets to untrusted bots." },
  { k: "Chain", v: "HI/MD → Mallik → SARI → BULBHUL / LAILA workers." },
  { k: "Sheets", v: "Never copy Google Sheets into packs or GitHub." },
];

export default function PoliciesPage() {
  return (
    <div className="page">
      <h1 className="page-title">Policies</h1>
      <p className="page-sub">Zero Trust · Defense in Depth · Mallik Universal Truth</p>
      <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
        {rules.map((r) => (
          <div key={r.k} className="card" style={{ padding: 18, display: "flex", gap: 14 }}>
            <Shield size={18} style={{ color: "var(--green)", flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{r.k}</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{r.v}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
