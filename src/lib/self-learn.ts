import { addSkill, recordLesson, loadLessons, loadSkills, type Skill } from "./skills-engine";
import { audit } from "./storage";
import { triggerAutopilotSync } from "./config";

export function learnFromInteraction(userPrompt: string, assistantReply: string, tier: string): void {
  let learned = false;

  const match = assistantReply.match(/LEARN:\s*(.+)/i);
  if (match && match[1]) {
    const rawLesson = match[1].split("\n")[0].trim();
    if (rawLesson) {
      recordLesson(rawLesson);
      audit("self_learn", "lesson_recorded", `[${tier}] ${rawLesson}`);
      learned = true;
    }
  }

  // Detect user preferences or explicit rules
  const ruleMatch = userPrompt.match(/(always|never|remember|rules?|prefer)\s+(.+)/i);
  if (ruleMatch && ruleMatch[2]) {
    const preference = `MD Rule: ${ruleMatch[0].trim()}`;
    recordLesson(preference);
    audit("self_learn", "rule_captured", preference);
    learned = true;
  }

  // Autonomous background sync to Apps Script Memory Vault
  if (learned) {
    try {
      const lessons = loadLessons();
      const skills = loadSkills();
      const vaultRaw = typeof window !== "undefined" ? localStorage.getItem("sari_memory_vault") : null;
      const vault = vaultRaw ? JSON.parse(vaultRaw) : {};
      triggerAutopilotSync({ vault, lessons, skills }).catch(() => {});
    } catch {}
  }
}

export function synthesizeDynamicSkill(name: string, triggerPhrase: string, goalDescription: string): Skill {
  const skillId = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const steps = [
    `Analyze objective: ${goalDescription.slice(0, 80)}`,
    "Validate input parameters and enforce zero PII leakage",
    "Formulate 4-block solution (UNDERSTAND / PLAN / ACT / LEARN)",
    "Execute deterministic next action",
    "Record outcome to self-learning vault",
  ];

  const instruction = `Autonomous execution for "${name}". Follow user parameters strictly, enforce sovereign MD control, and provide concrete actionable outputs.`;

  const newSkills = addSkill({
    name,
    description: goalDescription,
    trigger: triggerPhrase,
    steps,
    instruction,
    status: "live",
  });

  const created = newSkills.find((s) => s.name === name) || {
    id: skillId,
    name,
    description: goalDescription,
    trigger: triggerPhrase,
    steps,
    instruction,
    status: "live",
    runs: 0,
  };

  audit("self_learn", "skill_synthesized", `New dynamic skill created: ${name}`);
  recordLesson(`Synthesized dynamic skill: ${name} (Trigger: ${triggerPhrase})`);

  // Sync to backend autopilot
  try {
    const lessons = loadLessons();
    triggerAutopilotSync({ lessons, skills: newSkills }).catch(() => {});
  } catch {}

  return created;
}
