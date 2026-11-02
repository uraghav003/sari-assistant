import { useEffect, useState, Suspense } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, MessageSquare, Sparkles, Link2,
  Shield, Activity, LogOut, Wand2, Zap, Bell, Terminal
} from "lucide-react";
import { logout } from "../lib/auth";
import { clearLocalData } from "../lib/privacy";
import { subscribeAlerts, unreadCount } from "../lib/notifications";

const nav = [
  { to: "/", icon: LayoutDashboard, label: "Command" },
  { to: "/chat", icon: MessageSquare, label: "Chat" },
  { to: "/sari-supreme.html", icon: Sparkles, label: "Supreme Voice", external: true },
  { to: "/skills", icon: Wand2, label: "Skills" },
  { to: "/connections", icon: Link2, label: "Connect" },
  { to: "/leads", icon: Zap, label: "Leads" },
  { to: "/alerts", icon: Bell, label: "Alerts", badge: true },
  { to: "/policies", icon: Shield, label: "Policies" },
  { to: "/audit", icon: Activity, label: "Log" },
  { to: "/terminal", icon: Terminal, label: "Terminal" },
];

export default function Layout() {
  const navigate = useNavigate();
  const [unread, setUnread] = useState(() => unreadCount());

  useEffect(() => subscribeAlerts(() => setUnread(unreadCount())), []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon"><Sparkles size={20} color="#fff" /></div>
          <div>
            <div className="brand-title">SARI</div>
            <div className="brand-sub">Sovereign AI</div>
          </div>
        </div>
        <div style={{ padding: "10px 12px", margin: "10px 12px 14px 12px", background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.22)", borderRadius: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #a855f7, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#fff", flexShrink: 0 }}>
              UR
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--fg, #fff)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                Upendra S. Raghav
              </div>
              <div style={{ fontSize: 10.5, color: "var(--accent, #a855f7)", display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }}></span>
                Maalik · Sovereign Owner
              </div>
            </div>
          </div>
        </div>
        <nav className="nav">
          {nav.map((item) =>
            item.external ? (
              <a
                key={item.to}
                href={item.to}
                className="nav-item"
                title="SARI Supreme Presence Voice Portal"
              >
                <span className="nav-icon">
                  <item.icon size={17} />
                </span>
                <span className="nav-label">{item.label}</span>
              </a>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              >
                <span className="nav-icon">
                  <item.icon size={17} />
                  {item.badge && unread > 0 && <span className="nav-badge">{unread > 9 ? "9+" : unread}</span>}
                </span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            )
          )}
        </nav>
        <div className="sidebar-foot">
          <button
            className="nav-item"
            style={{ width: "100%" }}
            onClick={() => {
              clearLocalData();
              void logout().then(() => navigate("/login"));
            }}
          >
            <span className="nav-icon"><LogOut size={17} /></span>
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </aside>
      <main className="main">
        <Suspense fallback={<div style={{ padding: "2rem", color: "#94a3b8" }}>Loading…</div>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
