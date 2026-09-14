import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, MessageSquare, Sparkles, Link2,
  Shield, Activity, LogOut, Wand2, Zap
} from "lucide-react";
import { clearSession } from "../lib/auth";

const nav = [
  { to: "/", icon: LayoutDashboard, label: "Command Center" },
  { to: "/chat", icon: MessageSquare, label: "SARI Chat" },
  { to: "/skills", icon: Wand2, label: "Skills Builder" },
  { to: "/connections", icon: Link2, label: "Connections" },
  { to: "/leads", icon: Zap, label: "Leads & Alerts" },
  { to: "/policies", icon: Shield, label: "Policies" },
  { to: "/audit", icon: Activity, label: "Audit Trail" },
];

export default function Layout() {
  const navigate = useNavigate();
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
        <nav className="nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            >
              <item.icon size={17} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button
            className="nav-item"
            style={{ width: "100%" }}
            onClick={() => { clearSession(); navigate("/login"); }}
          >
            <LogOut size={17} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  );
}
