import { useEffect, useState, lazy, type ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { SpeedInsights } from "@vercel/speed-insights/react";
import ErrorBoundary from "./components/ErrorBoundary";
import { checkSession, subscribeAuth } from "./lib/auth";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

const ChatPage = lazy(() => import("./pages/ChatPage"));
const SkillsPage = lazy(() => import("./pages/SkillsPage"));
const ConnectionsPage = lazy(() => import("./pages/ConnectionsPage"));
const PoliciesPage = lazy(() => import("./pages/PoliciesPage"));
const AuditPage = lazy(() => import("./pages/AuditPage"));
const LeadsPage = lazy(() => import("./pages/LeadsPage"));
const AlertsPage = lazy(() => import("./pages/AlertsPage"));
const TerminalPage = lazy(() => import("./pages/TerminalPage"));

function ProtectedRoute({ authenticated, children }: { authenticated: boolean; children: ReactNode }) {
  if (!authenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeAuth(setAuthenticated);
    void checkSession();
    // Initialize autonomous background skills scheduler and deep audit fix
    import("./lib/scheduler").then(({ initScheduler }) => {
      initScheduler();
    }).catch(() => {});
    import("./lib/deep-audit").then(({ runDeepAuditAndFix }) => {
      void runDeepAuditAndFix();
    }).catch(() => {});
    import("./lib/deep-audit-learn").then(({ runDeepAuditAndLearnFromGemini }) => {
      void runDeepAuditAndLearnFromGemini();
    }).catch(() => {});
    import("./lib/swarm-healer").then(({ activateAllSubagentsAndFixMCP }) => {
      void activateAllSubagentsAndFixMCP();
    }).catch(() => {});
    import("./lib/sari-app-hub").then(({ activateSariAppHub }) => {
      void activateSariAppHub();
    }).catch(() => {});
    import("./lib/ruflo-hub").then(({ activateRufloHub }) => {
      void activateRufloHub();
    }).catch(() => {});
    import("./lib/sovereign-models").then(({ updateSovereignModels }) => {
      void updateSovereignModels();
    }).catch(() => {});
    import("./lib/fish-voice").then(({ playSariVoice }) => {
      (window as any).playSariVoice = playSariVoice;
    }).catch(() => {});
    import("./lib/self-diagnostic").then(({ runSelfDiagnosticAndRepair }) => {
      void runSelfDiagnosticAndRepair();
    }).catch(() => {});
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
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
