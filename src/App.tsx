import { useEffect, useState, type ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { checkSession, subscribeAuth } from "./lib/auth";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ChatPage from "./pages/ChatPage";
import SkillsPage from "./pages/SkillsPage";
import ConnectionsPage from "./pages/ConnectionsPage";
import PoliciesPage from "./pages/PoliciesPage";
import AuditPage from "./pages/AuditPage";
import LeadsPage from "./pages/LeadsPage";
import AlertsPage from "./pages/AlertsPage";
import TerminalPage from "./pages/TerminalPage";

function ProtectedRoute({ authenticated, children }: { authenticated: boolean; children: ReactNode }) {
  if (!authenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeAuth(setAuthenticated);
    void checkSession();
    return unsubscribe;
  }, []);

  if (authenticated === null) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
          color: "var(--muted)",
          fontSize: 14,
        }}
      >
        Establishing secure session…
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute authenticated={authenticated}>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="skills" element={<SkillsPage />} />
          <Route path="connections" element={<ConnectionsPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="policies" element={<PoliciesPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="terminal" element={<TerminalPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <SpeedInsights />
    </>
  );
}
