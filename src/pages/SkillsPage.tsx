import { useState } from "react";
import { Wand2, Plus, CheckCircle2, Play, Sparkles, ChevronRight, X } from "lucide-react";
import { addSkill, loadSkills, saveSkills, setAutoMode, isAutoMode, type Skill } from "../lib/skills-engine";
import { infer } from "../lib/brain";

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

  async function runSkill(sk: Skill) {
    setRunOut("Running...");
    const out = await infer(`RUN SKILL ${sk.name}\nINSTRUCTION: ${sk.instruction}\nGive a real-world first pass the MD can use now.`);
    const next = skills.map((s) => (s.id === sk.id ? { ...s, runs: (s.runs || 0) + 1, lastRun: new Date().toISOString() } : s));
    saveSkills(next);
    setSkills(next);
    setRunOut(`${sk.name}\n\n${out.text}`);
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
          <button className="btn-secondary" onClick={enableAllSkills}>
            Enable All
          </button>
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

      {building && (
        <div className="card" style={{ padding: 24, marginBottom: 24, borderColor: "rgba(168,85,247,0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
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

      {runOut && (
        <div className="card" style={{ padding: 16, marginBottom: 16, whiteSpace: "pre-wrap", fontSize: 13 }}>{runOut}</div>
      )}

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
              <span>{sk.trigger} · {sk.runs || 0} runs</span>
              <button className="btn-ghost" onClick={() => runSkill(sk)} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Play size={12} /> Run</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
