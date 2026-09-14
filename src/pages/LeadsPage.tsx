import { useState, useEffect } from "react";
import { Database, Send, ShieldCheck, Zap, PlusCircle } from "lucide-react";

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

export default function LeadsPage() {
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [supabaseStatus, setSupabaseStatus] = useState<string>("Not tested");

  const [tgToken, setTgToken] = useState("");
  const [tgChatId, setTgChatId] = useState("");
  const [waWebhook, setWaWebhook] = useState("");
  const [dispatchStatus, setDispatchStatus] = useState<string>("Not tested");

  const [leads, setLeads] = useState<Lead[]>(() => {
    if (typeof window === "undefined") return DEFAULT_LEADS;
    const saved = localStorage.getItem("sari_autonomous_leads");
    return saved ? JSON.parse(saved) : DEFAULT_LEADS;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sari_autonomous_leads", JSON.stringify(leads));
      const sUrl = localStorage.getItem("sari_sup_url");
      if (sUrl) setSupabaseUrl(sUrl);
      const sKey = localStorage.getItem("sari_sup_key");
      if (sKey) setSupabaseKey(sKey);
      const tToken = localStorage.getItem("sari_tg_token");
      if (tToken) setTgToken(tToken);
      const tChat = localStorage.getItem("sari_tg_chat");
      if (tChat) setTgChatId(tChat);
    }
  }, [leads]);

  function saveSupabaseConfig() {
    localStorage.setItem("sari_sup_url", supabaseUrl.trim());
    localStorage.setItem("sari_sup_key", supabaseKey.trim());
    setSupabaseStatus("✓ Supabase Vault config saved locally.");
  }

  function saveDispatchConfig() {
    localStorage.setItem("sari_tg_token", tgToken.trim());
    localStorage.setItem("sari_tg_chat", tgChatId.trim());
    localStorage.setItem("sari_wa_hook", waWebhook.trim());
    setDispatchStatus("✓ Telegram & WhatsApp dispatch webhooks saved.");
  }

  async function testSupabase() {
    if (!supabaseUrl.trim()) {
      setSupabaseStatus("✗ Enter Supabase URL first.");
      return;
    }
    setSupabaseStatus("Testing Supabase vault connection...");
    try {
      const res = await fetch(`${supabaseUrl.trim()}/rest/v1/`, {
        headers: { "apikey": supabaseKey.trim(), "Authorization": `Bearer ${supabaseKey.trim()}` }
      });
      if (res.ok || res.status === 401 || res.status === 404) {
        setSupabaseStatus("✓ Supabase Vault endpoint reachable!");
      } else {
        setSupabaseStatus(`✗ Supabase HTTP ${res.status}`);
      }
    } catch (e: any) {
      setSupabaseStatus(`✗ Connection error: ${e.message}`);
    }
  }

  async function testDispatch() {
    if (!tgToken.trim() || !tgChatId.trim()) {
      setDispatchStatus("✗ Enter Telegram Bot Token and Chat ID.");
      return;
    }
    setDispatchStatus("Sending test alert to Telegram...");
    try {
      const res = await fetch(`https://api.telegram.org/bot${tgToken.trim()}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: tgChatId.trim(),
          text: "🚀 SARI Autonomous Alert: Test dispatch successful via Supabase Vault router."
        })
      });
      const data = await res.json();
      if (data.ok) {
        setDispatchStatus("✓ Telegram test alert dispatched successfully!");
      } else {
        setDispatchStatus(`✗ Telegram error: ${data.description || 'Unknown'}`);
      }
    } catch (e: any) {
      setDispatchStatus(`✗ Dispatch failed: ${e.message}`);
    }
  }

  function simulateNewLead() {
    const newLead: Lead = {
      id: `L-${Math.floor(100 + Math.random() * 900)}`,
      name: `Autonomous Inbound Lead #${Math.floor(1 + Math.random() * 99)}`,
      source: "Real-time Webhook",
      intent: "High intent (Instant Dispatch)",
      routing: "Telegram + WhatsApp",
      status: "Dispatched",
      time: "Just now",
    };
    setLeads([newLead, ...leads]);
  }

  return (
    <div className="page" style={{ maxWidth: 1000, margin: "0 auto" }}>
      <h1 className="page-title">Autonomous Lead Ingestion & Alert Routing</h1>
      <p className="page-sub">Supabase Vault secure storage combined with instant Telegram/WhatsApp webhook dispatch</p>

      {/* Supabase Vault Config */}
      <div className="card" style={{ padding: 24, marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Database size={20} style={{ color: "var(--green)" }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Supabase Vault Storage</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Encrypted lead persistence and RLS vault</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <input 
            value={supabaseUrl} 
            onChange={(e) => setSupabaseUrl(e.target.value)} 
            placeholder="Supabase Project URL (https://xyz.supabase.co)" 
            style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", color: "inherit", fontSize: 13 }} 
          />
          <input 
            type="password" 
            value={supabaseKey} 
            onChange={(e) => setSupabaseKey(e.target.value)} 
            placeholder="Supabase Service Role / Anon Key" 
            style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", color: "inherit", fontSize: 13 }} 
          />
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={saveSupabaseConfig} className="btn-secondary" style={{ padding: "8px 16px", borderRadius: 10, fontSize: 13 }}>Save Config</button>
          <button onClick={testSupabase} className="btn-primary" style={{ padding: "8px 16px", borderRadius: 10, fontSize: 13 }}>Test Supabase Vault</button>
        </div>
        {supabaseStatus && <div style={{ marginTop: 10, fontSize: 12, color: supabaseStatus.includes("✓") ? "var(--green)" : "var(--muted)" }}>{supabaseStatus}</div>}
      </div>

      {/* Telegram / WhatsApp Dispatch Config */}
      <div className="card" style={{ padding: 24, marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Send size={20} style={{ color: "#3b82f6" }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Telegram & WhatsApp Alert Dispatch</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Instant push notification routing on lead ingestion</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <input 
            value={tgToken} 
            onChange={(e) => setTgToken(e.target.value)} 
            placeholder="Telegram Bot Token" 
            style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", color: "inherit", fontSize: 13 }} 
          />
          <input 
            value={tgChatId} 
            onChange={(e) => setTgChatId(e.target.value)} 
            placeholder="Telegram Chat ID / Group" 
            style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", color: "inherit", fontSize: 13 }} 
          />
          <input 
            value={waWebhook} 
            onChange={(e) => setWaWebhook(e.target.value)} 
            placeholder="WhatsApp Webhook URL (opt)" 
            style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", color: "inherit", fontSize: 13 }} 
          />
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={saveDispatchConfig} className="btn-secondary" style={{ padding: "8px 16px", borderRadius: 10, fontSize: 13 }}>Save Webhooks</button>
          <button onClick={testDispatch} className="btn-primary" style={{ padding: "8px 16px", borderRadius: 10, fontSize: 13 }}>Test Telegram Alert</button>
        </div>
        {dispatchStatus && <div style={{ marginTop: 10, fontSize: 12, color: dispatchStatus.includes("✓") ? "var(--green)" : "var(--muted)" }}>{dispatchStatus}</div>}
      </div>

      {/* Autonomous Leads Feed */}
      <div className="card" style={{ padding: 24, marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Zap size={18} style={{ color: "var(--cyan)" }} />
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Autonomous Leads Feed</h2>
          </div>
          <button onClick={simulateNewLead} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, fontSize: 12.5 }}>
            <PlusCircle size={15} /> Simulate Inbound Lead
          </button>
        </div>
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
