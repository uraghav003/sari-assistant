import { useState } from "react";
import { Wand2, Plus, CheckCircle2, Play, Sparkles, ChevronRight, X } from "lucide-react";

type Skill = {
  id: string;
  name: string;
  description: string;
  status: "live" | "draft" | "building";
  trigger: string;
  steps: number;
};

const initial: Skill[] = [
  { id: "1", name: "Daily Inbox Brief", description: "Morning summary of unread emails + priority flags", status: "live", trigger: "Daily 8:00 AM IST", steps: 4 },
  { id: "2", name: "WhatsApp Auto-Ack", description: "Acknowledge messages outside business hours", status: "live", trigger: "Inbound WA after 7pm", steps: 3 },
  { id: "3", name: "Meeting Notes to Linear", description: "After Teams meeting, create Linear issues from action items", status: "live", trigger: "Meeting completed", steps: 5 },
  { id: "4", name: "Follow-up Call Scheduler", description: "After outbound call, draft follow-up email + reminder", status: "draft", trigger: "Call ended", steps: 3 },
  { id: "5", name: "Notion Spec to Issues", description: "When Notion page tagged Ready, create Linear issues", status: "draft", trigger: "Notion tag: Ready", steps: 4 },
  { id: "6", name: "Policy Boundary Guard", description: "Block actions outside allowed domains / quiet hours", status: "live", trigger: "Every action", steps: 2 },
];

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>(initial);
  const [building, setBuilding] = useState(false);
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState("");
  const [trigger, setTrigger] = useState("");
  const [generated, setGenerated] = useState<{ name: string; steps: string[]; description: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function generateSkill() {
    if (!goal.trim()) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 900));
    const name = goal.length > 40 ? goal.slice(0, 40) + "..." : goal;
    setGenerated({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      description: `User-guided skill: ${goal}`,
      steps: [
        "Detect trigger condition",
        "Run policy + Zero Trust checks",
        "Execute core action with audit log",
        "Notify owner / update dashboard",
        "Mark skill run complete",
      ],
    });
    setBusy(false);
    setStep(2);
  }

  function activateSkill() {
    if (!generated) return;
    setSkills((s) => [{
      id: crypto.randomUUID(),
      name: generated.name,
      description: generated.description,
      status: "live",
      trigger: trigger || "Manual / guided",
      steps: generated.steps.length,
    }, ...s]);
    setBuilding(false);
    setStep(0);
    setGoal("");
    setTrigger("");
    setGenerated(null);
  }

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Skills Builder</h1>
          <p className="page-sub">Guide SARI · She designs · You approve · Skill goes live</p>
        </div>
        {!building && (
          <button className="btn-primary" onClick={() => { setBuilding(true); setStep(0); }} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Plus size={16} /> Build New Skill
          </button>
        )}
      </div>

      {building && (
        <div className="card" style={{ padding: 24, marginBottom: 24, borderColor: "rgba(168,85,247,0.3)", background: "linear-gradient(180deg, rgba(168,85,247,0.06), transparent)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={16} style={{ color: "var(--purple)" }} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>Self-Build Flow</span>
              <span className="badge badge-purple">Step {step + 1} / 3</span>
            </div>
            <button onClick={() => { setBuilding(false); setStep(0); setGenerated(null); }} style={{ color: "var(--muted)" }}><X size={18} /></button>
          </div>

          {step === 0 && (
            <div>
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>Step 1 — Describe the skill (Hinglish OK)</p>
              <textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={3} placeholder="Example: Har subah 9 baje unread emails ka brief bhejo" style={{ resize: "vertical", marginBottom: 12 }} />
              <button className="btn-primary" disabled={!goal.trim()} onClick={() => setStep(1)}>Next <ChevronRight size={15} style={{ display: "inline", verticalAlign: "middle" }} /></button>
            </div>
          )}

          {step === 1 && (
            <div>
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>Step 2 — When should it trigger? (optional)</p>
              <input value={trigger} onChange={(e) => setTrigger(e.target.value)} placeholder="Example: Daily 9:00 AM IST" style={{ marginBottom: 12 }} />
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn-ghost" onClick={() => setStep(0)}>Back</button>
                <button className="btn-primary" disabled={busy} onClick={generateSkill}>{busy ? "SARI designing..." : "Generate Skill Design"}</button>
              </div>
            </div>
          )}

          {step === 2 && generated && (
            <div>
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>Step 3 — Review and Activate</p>
              <div className="card" style={{ padding: 16, marginBottom: 16, background: "var(--card2)" }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{generated.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12 }}>{generated.description}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Trigger: {trigger || "Manual / guided"}</div>
                <ol style={{ marginLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
                  {generated.steps.map((s, i) => (<li key={i}>{s}</li>))}
                </ol>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn-ghost" onClick={() => setStep(1)}>Back</button>
                <button className="btn-primary" onClick={activateSkill} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Play size={15} /> Activate Skill</button>
              </div>
            </div>
          )}
        </div>
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
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--muted)" }}>
              <span>{sk.trigger}</span>
              <span>{sk.steps} steps</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
