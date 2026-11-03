import { useState } from "react";
import { Wand2, Plus, CheckCircle2, Play, Sparkles, ChevronRight, X, FileText, Loader2 } from "lucide-react";
import { addSkill, loadSkills, saveSkills, setAutoMode, isAutoMode, type Skill } from "../lib/skills-engine";
import { infer } from "../lib/brain";

const INPUT_SKILLS: Record<string, true> = {
  "meeting-summarizer": true,
  "doc-review-ai": true,
  "autonomous-web-search": true,
  "github-autonomous-ops": true,
  "google-drive-autonomous": true,
  "autonomous-self-learn": true,
};

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>(() => loadSkills());
  const [auto, setAuto] = useState(() => isAutoMode());
  const [building, setBuilding] = useState(false);
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState("");
  const [trigger, setTrigger] = useState("");
  const [generated, setGenerated] = useState<{ name: string; steps: string[]; description: string; instruction: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [runOut, setRunOut] = useState("");

  // Instruction & Skill Injection Console state
  const [customInstruction, setCustomInstruction] = useState("");
  const [targetAgents, setTargetAgents] = useState({ bulbhul: true, sari: true, bhism: true, laila: true, postmaster: true });
  const [injectionStatus, setInjectionStatus] = useState("");

  async function applyAndPropagate() {
    if (!customInstruction.trim()) return;
    setBusy(true);
    setInjectionStatus("Propagating instructions across sovereign swarm...");
    try {
      const activeList = Object.entries(targetAgents).filter(([, v]) => v).map(([k]) => k);
      const res = await infer(`SOVEREIGN INJECTION:\nTARGETS: ${activeList.join(", ")}\nINSTRUCTION:\n${customInstruction}\n\nExecute policy update and return confirmation.`);
      setInjectionStatus(`Success! Applied to [${activeList.join(", ")}]: ${res.text.slice(0, 100)}...`);
    } catch (err: any) {
      setInjectionStatus(`Propagation error: ${err?.message || "Unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  // Input modal for skills that need pasted text
  const [inputModal, setInputModal] = useState<{ skill: Skill; text: string } | null>(null);

  async function generateSkill() {
    if (!goal.trim()) return;
    setBusy(true);
    const out = await infer(`SELF-INSTRUCT: design one reusable skill.\nGOAL: ${goal}\nTRIGGER HINT: ${trigger || "manual"}\nReturn JSON only: {"name","description","instruction","steps":["..."]}`);
    let parsed: { name: string; description: string; instruction: string; steps: string[] } | null = null;
    try {
      const json = out.text.match(/\{[\s\S]*\}/);
      if (json) parsed = JSON.parse(json[0]);
    } catch {}
    setGenerated(
      parsed && parsed.name
        ? { name: parsed.name, description: parsed.description || goal, instruction: parsed.instruction || goal, steps: parsed.steps?.length ? parsed.steps : ["Detect", "Plan", "Act", "Learn"] }
        : {
            name: goal.slice(0, 48),
            description: `User-guided skill: ${goal}`,
            instruction: goal,
            steps: ["Detect trigger", "Zero Trust check", "Execute", "Write lesson", "Notify MD"],
          }
    );
    setBusy(false);
    setStep(2);
  }

  function activateSkill() {
    if (!generated) return;
    const next = addSkill({
      name: generated.name,
      description: generated.description,
      trigger: trigger || "Manual / chat",
      steps: generated.steps,
      instruction: generated.instruction,
      status: "live",
    });
    setSkills(next);
    setBuilding(false);
    setStep(0);
    setGoal("");
    setTrigger("");
    setGenerated(null);
  }

  async function runSkill(sk: Skill, userInput?: string) {
    setRunOut("Running...");

    let prompt = `RUN SKILL: ${sk.name}\nINSTRUCTION: ${sk.instruction}\n`;

    if (INPUT_SKILLS[sk.id] && userInput) {
      prompt += `\nUSER INPUT:\n${userInput}\n\nProduce the output now.`;
    } else if (sk.id === "daily-briefing") {
      // Pull live system context
      let ctx = "";
      try {
        const [h, l] = await Promise.all([
          fetch("/api/health", { credentials: "same-origin" }).then((r) => r.json()).catch(() => null),
          fetch("/api/leads", { credentials: "same-origin" }).then((r) => r.json()).catch(() => null),
        ]);
        if (h) ctx += `SYSTEM_HEALTH: ${JSON.stringify(h)}\n`;
        let localLeads: Array<{ name?: string; status?: string }> = [];
        try {
          const raw = typeof window !== "undefined" ? localStorage.getItem("sari_autonomous_leads") : null;
          if (raw) localLeads = JSON.parse(raw);
        } catch {}
        const activeLeads: Array<{ name?: string; status?: string }> =
          (l?.leads && Array.isArray(l.leads) && l.leads.length > 0) ? l.leads : localLeads;
        if (activeLeads.length) {
          ctx += `LEADS_COUNT: ${activeLeads.length} leads in pipeline\n`;
          const hot = activeLeads.filter((x) => x.status === "hot" || x.status === "new").slice(0, 5);
          if (hot.length) {
            ctx += `HOT_LEADS: ${hot.map((x) => `${x.name ?? "Unknown"} (${x.status ?? ""})`).join(", ")}\n`;
          }
        }
      } catch {}
      prompt += `\nLIVE CONTEXT:\n${ctx || "No live data available."}\n\nGenerate today's MD briefing now.`;
    } else {
      prompt += `Give a real-world first pass the MD can use now.`;
    }

    const out = await infer(prompt);
    const next = skills.map((s) => (s.id === sk.id ? { ...s, runs: (s.runs || 0) + 1, lastRun: new Date().toISOString() } : s));
    saveSkills(next);
    setSkills(next);
    setRunOut(`${sk.name}\n\n${out.text}`);
    setInputModal(null);
  }

  function handleRunClick(sk: Skill) {
    if (INPUT_SKILLS[sk.id]) {
      setInputModal({ skill: sk, text: "" });
    } else {
      void runSkill(sk);
    }
  }

  function toggleAuto() {
    const n = !auto;
    setAuto(n);
    setAutoMode(n);
  }

  function enableAllSkills() {
    setAuto(true);
    setAutoMode(true);
    const updated = skills.map((s) => ({ ...s, status: "live" as const }));
    saveSkills(updated);
    setSkills(updated);
  }

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Skills Builder</h1>
          <p className="page-sub">Self-instruct · Auto-learn · Think then Act</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn-secondary" onClick={enableAllSkills}>Enable All</button>
          <button className={auto ? "btn-primary" : "btn-ghost"} onClick={toggleAuto}>
            Auto mode: {auto ? "ON" : "OFF"}
          </button>
          {!building && (
            <button className="btn-primary" onClick={() => { setBuilding(true); setStep(0); }} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Plus size={16} /> Build New Skill
            </button>
          )}
        </div>
      </div>
      {/* Instruction & Skill Injection Console */}
      <div className="card" style={{ padding: 24, marginBottom: 24, borderColor: "rgba(59,130,246,0.3)" }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={16} style={{ color: "var(--blue, #3b82f6)" }} /> Instruction & Skill Injection Console
        </h2>
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>
          Paste raw instructions, rules, or operational updates below and select target agents to instantly propagate changes across the swarm.
        </p>
        <textarea
          value={customInstruction}
          onChange={(e) => setCustomInstruction(e.target.value)}
          placeholder="Paste sovereign instruction, bank policy update, or workflow rule here..."
          rows={3}
          style={{ width: "100%", padding: 12, borderRadius: 8, background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", color: "inherit", fontSize: 13, resize: "vertical", marginBottom: 14 }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, alignItems: "center" }}>
            <span style={{ color: "var(--muted)", fontWeight: 500 }}>Target Agents:</span>
            {(Object.keys(targetAgents) as Array<keyof typeof targetAgents>).map((agentKey) => (
              <label key={agentKey} style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", textTransform: "capitalize" }}>
                <input
                  type="checkbox"
                  checked={targetAgents[agentKey]}
                  onChange={(e) => setTargetAgents({ ...targetAgents, [agentKey]: e.target.checked })}
                />
                {agentKey}
              </label>
            ))}
          </div>
          <button
            className="btn-primary"
            disabled={!customInstruction.trim() || busy}
            onClick={() => void applyAndPropagate()}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {busy ? <><Loader2 size={14} className="spin" /> Propagating...</> : <><Wand2 size={14} /> Apply & Propagate</>}
          </button>
        </div>
        {injectionStatus && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 6, background: "rgba(59,130,246,0.1)", fontSize: 12, color: "var(--blue, #3b82f6)" }}>
            {injectionStatus}
          </div>
        )}
      </div>

      {/* Skill builder flow */}
      {building && (
        <div className="card" style={{ padding: 24, marginBottom: 24, borderColor: "rgba(168,85,247,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={16} style={{ color: "var(--purple)" }} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>Self-Instruct Flow</span>
              <span className="badge badge-purple">Step {step + 1} / 3</span>
            </div>
            <button onClick={() => { setBuilding(false); setStep(0); setGenerated(null); }} style={{ color: "var(--muted)" }}><X size={18} /></button>
          </div>
          {step === 0 && (
            <div>
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>Step 1 — Skill kya karegi?</p>
              <textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={3} placeholder="Example: Lead aaye to 5-line brief + next call script" style={{ resize: "vertical", marginBottom: 12 }} />
              <button className="btn-primary" disabled={!goal.trim()} onClick={() => setStep(1)}>Next <ChevronRight size={15} /></button>
            </div>
          )}
          {step === 1 && (
            <div>
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>Step 2 — Trigger words</p>
              <input value={trigger} onChange={(e) => setTrigger(e.target.value)} placeholder="lead, brief, followup" style={{ marginBottom: 12 }} />
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn-ghost" onClick={() => setStep(0)}>Back</button>
                <button className="btn-primary" disabled={busy} onClick={generateSkill}>{busy ? "SARI designing..." : "Generate Skill"}</button>
              </div>
            </div>
          )}
          {step === 2 && generated && (
            <div>
              <div className="card" style={{ padding: 16, marginBottom: 16, background: "var(--card2)" }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{generated.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", margin: "8px 0" }}>{generated.description}</div>
                <div style={{ fontSize: 12, marginBottom: 8 }}>Instruction: {generated.instruction}</div>
                <ol style={{ marginLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
                  {generated.steps.map((s, i) => (<li key={i}>{s}</li>))}
                </ol>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn-ghost" onClick={() => setStep(1)}>Back</button>
                <button className="btn-primary" onClick={activateSkill} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Play size={15} /> Activate</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input modal for meeting-summarizer / doc-review-ai */}
      {inputModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 200, padding: 16,
        }}>
          <div className="card" style={{ width: "100%", maxWidth: 540, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                <FileText size={16} style={{ color: "var(--purple)" }} />
                {inputModal.skill.name}
              </div>
              <button onClick={() => setInputModal(null)} style={{ color: "var(--muted)" }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12 }}>
              {inputModal.skill.id === "meeting-summarizer"
                ? "Meeting notes, transcript, ya discussion paste karo:"
                : inputModal.skill.id === "doc-review-ai"
                ? "Document text, agreement, ya circular paste karo:"
                : inputModal.skill.id === "autonomous-web-search"
                ? "Web search topic, news keyword, ya regulatory query daalo:"
                : inputModal.skill.id === "github-autonomous-ops"
                ? "GitHub repository URL, branch name, ya CI/CD issue objective daalo:"
                : inputModal.skill.id === "google-drive-autonomous"
                ? "Google Drive folder/file context ya loan policy topic daalo:"
                : "Operational rule, borrower policy, ya lesson to record daalo:"}
            </p>
            <textarea
              autoFocus
              rows={8}
              value={inputModal.text}
              onChange={(e) => setInputModal({ ...inputModal, text: e.target.value })}
              placeholder={
                inputModal.skill.id === "meeting-summarizer"
                  ? "Paste meeting notes or call transcript here..."
                  : inputModal.skill.id === "doc-review-ai"
                  ? "Paste document text, loan agreement, or circular here..."
                  : inputModal.skill.id === "autonomous-web-search"
                  ? "Enter search topic (e.g. RBI unsecured lending rules 2026, SBI home loan rates)..."
                  : inputModal.skill.id === "github-autonomous-ops"
                  ? "Enter GitHub repo / branch / PR or CI issue to audit..."
                  : inputModal.skill.id === "google-drive-autonomous"
                  ? "Enter Drive file name, folder ID, or lender policy question..."
                  : "Enter rule or lesson to record in SARI memory vault..."
              }
              style={{ resize: "vertical", marginBottom: 16, fontSize: 13 }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn-ghost" onClick={() => setInputModal(null)}>Cancel</button>
              <button
                className="btn-primary"
                disabled={!inputModal.text.trim() || busy}
                onClick={() => { setBusy(true); void runSkill(inputModal.skill, inputModal.text).finally(() => setBusy(false)); }}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {busy ? <><Loader2 size={14} className="spin" /> Running...</> : <><Play size={14} /> Run Skill</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Output panel */}
      {runOut && (
        <div className="card" style={{ padding: 16, marginBottom: 16, whiteSpace: "pre-wrap", fontSize: 13, maxHeight: 400, overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>Output</span>
            <button onClick={() => setRunOut("")} style={{ fontSize: 11, color: "var(--muted)" }}>Clear</button>
          </div>
          {runOut}
        </div>
      )}

      {/* Skills grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {skills.map((sk) => (
          <div key={sk.id} className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(168,85,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Wand2 size={15} style={{ color: "var(--purple)" }} />
                </div>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{sk.name}</span>
              </div>
              {sk.status === "live" && <span className="badge badge-live"><CheckCircle2 size={11} /> Live</span>}
              {sk.status === "draft" && <span className="badge badge-sand">Draft</span>}
            </div>
            <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5, marginBottom: 12 }}>{sk.description}</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, color: "var(--muted)" }}>
              <span>{sk.trigger.slice(0, 40)} · {sk.runs || 0} runs</span>
              <button
                className="btn-ghost"
                onClick={() => handleRunClick(sk)}
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                {INPUT_SKILLS[sk.id] ? <FileText size={12} /> : <Play size={12} />}
                {INPUT_SKILLS[sk.id] ? "Paste & Run" : sk.id === "daily-briefing" ? "Live Brief" : "Run"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
