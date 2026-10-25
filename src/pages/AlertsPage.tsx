import { useEffect, useState } from "react";
import { Bell, CheckCheck, Trash2, Send, Smartphone } from "lucide-react";
import {
  clearAlerts,
  getAlerts,
  markAllRead,
  relativeTime,
  subscribeAlerts,
  type AppNotification,
} from "../lib/notifications";

const channelLabel: Record<string, string> = {
  in_app: "In-app",
  telegram: "Telegram",
  system: "System",
};

export default function AlertsPage() {
  const [items, setItems] = useState<AppNotification[]>(() => getAlerts());

  useEffect(() => subscribeAlerts(setItems), []);

  const unread = items.filter((item) => !item.read).length;

  return (
    <div className="page" style={{ maxWidth: 820, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="page-title">Alerts</h1>
          <p className="page-sub">
            In-app feed · {unread} unread · alerts are kept on this device until Telegram is configured
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={markAllRead} className="btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8 }}>
            <CheckCheck size={14} /> Mark all read
          </button>
          <button onClick={clearAlerts} className="btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8 }}>
            <Trash2 size={14} /> Clear
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
          <Bell size={16} style={{ color: "var(--cyan)" }} /> Alert feed ({items.length})
        </div>

        {items.length === 0 ? (
          <div style={{ padding: "28px 20px", fontSize: 13, color: "var(--muted)", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Smartphone size={18} style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ color: "var(--text)", fontWeight: 600, marginBottom: 4 }}>No alerts yet</div>
              Lead dispatches and system events will appear here. Add this page to your home screen for a
              one-tap mobile view — Telegram delivery is optional and can be enabled later.
            </div>
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              style={{
                padding: "14px 20px",
                display: "flex",
                gap: 14,
                borderBottom: index < items.length - 1 ? "1px solid var(--border)" : "none",
                background: item.read ? "transparent" : "rgba(34,211,238,0.04)",
              }}
            >
              <Send size={16} style={{ color: item.read ? "var(--muted)" : "var(--cyan)", marginTop: 2, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: item.read ? 500 : 700 }}>{item.title}</span>
                  <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {relativeTime(item.createdAt)}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3, lineHeight: 1.5 }}>{item.body}</div>
                <span className="badge" style={{ marginTop: 8, background: "rgba(255,255,255,0.04)", color: "var(--muted)", fontSize: 10.5 }}>
                  {channelLabel[item.channel] || item.channel}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
