export type SkillStatus = "live" | "draft" | "building";

export type Skill = {
  id: string;
  name: string;
  description: string;
  status: SkillStatus;
  trigger: string;
  steps: string[];
  instruction: string;
  runs: number;
  lastRun?: string;
};

const SKILLS_KEY = "sari_skills_v1";
const LESSONS_KEY = "sari_lessons_v1";
const AUTO_KEY = "sari_auto_mode";

export const seedSkills: Skill[] = [
  {
    id: "think",
    name: "Think then Act",
    description: "UNDERSTAND → PLAN → ACT → LEARN on every request",
    status: "live",
    trigger: "Every chat",
    steps: ["Parse intent", "Pick skill", "Plan", "Answer", "Store lesson"],
    instruction: "Always reason in four blocks. Do not skip PLAN.",
    runs: 0,
  },
  {
    id: "self-instruct",
    name: "Self-Instruct Skill",
    description: "User describes a job; SARI writes a reusable skill card",
    status: "live",
    trigger: "Build skill / naya skill banao",
    steps: ["Capture goal", "Write instruction", "Approve", "Activate"],
    instruction: "Turn a goal into name, trigger, 4-6 steps, and a reusable instruction.",
    runs: 0,
  },
  {
    id: "lead-brief",
    name: "Lead Brief",
    description: "Draft a DSA lead brief without inventing borrower PII",
    status: "live",
    trigger: "lead / case / briefing",
    steps: ["Ask missing fields", "Structure brief", "Flag gaps", "Next action"],
    instruction: "Never invent EMP_CODE, mobile, or loan amounts. Use placeholders.",
    runs: 0,
  },
  {
    id: "web-reason",
    name: "Real-world Reason",
    description: "Explain a live task and give executable next clicks",
    status: "live",
    trigger: "how / kya karun / enable / fix",
    steps: ["State constraint", "Give clicks", "Give fallback"],
    instruction: "Give concrete UI or CLI steps. No fake API success.",
    runs: 0,
  },
];

export function loadSkills(): Skill[] {
  if (typeof window === "undefined") return seedSkills;
  const raw = localStorage.getItem(SKILLS_KEY);
  if (!raw) {
    localStorage.setItem(SKILLS_KEY, JSON.stringify(seedSkills));
    return seedSkills;
  }
  try {
    const parsed = JSON.parse(raw) as Skill[];
    const ids = new Set(parsed.map((s) => s.id));
    const merged = [...parsed];
    for (const s of seedSkills) if (!ids.has(s.id)) merged.push(s);
    return merged;
  } catch {
    return seedSkills;
  }
}

export function saveSkills(skills: Skill[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SKILLS_KEY, JSON.stringify(skills));
}

export function matchSkill(text: string, skills: Skill[]): Skill | null {
  const t = text.toLowerCase();
  const live = skills.filter((s) => s.status === "live");
  return (
    live.find((s) =>
      s.trigger
        .toLowerCase()
        .split(/[\/,]/)
        .some((part) => part.trim() && t.includes(part.trim()))
    ) || live.find((s) => t.includes(s.name.toLowerCase())) || null
  );
}

export function bumpRun(id: string) {
  const skills = loadSkills();
  const next = skills.map((s) =>
    s.id === id ? { ...s, runs: (s.runs || 0) + 1, lastRun: new Date().toISOString() } : s
  );
  saveSkills(next);
  return next;
}

export function addSkill(partial: Omit<Skill, "id" | "runs" | "status"> & { status?: SkillStatus }) {
  const skills = loadSkills();
  const skill: Skill = {
    ...partial,
    id: crypto.randomUUID(),
    status: partial.status || "live",
    runs: 0,
  };
  const next = [skill, ...skills];
  saveSkills(next);
  return next;
}

export function loadLessons(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LESSONS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function recordLesson(lesson: string) {
  const clean = lesson.replace(/^LEARN:\s*/i, "").trim();
  if (!clean) return;
  const prev = loadLessons();
  const next = [`${new Date().toISOString().slice(0, 16)} ${clean}`, ...prev].slice(0, 40);
  localStorage.setItem(LESSONS_KEY, JSON.stringify(next));
}

export function extractLesson(reply: string) {
  const m = reply.match(/LEARN:\s*(.+)/i);
  if (m) recordLesson(m[1].split("\n")[0]);
}

export function isAutoMode() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(AUTO_KEY) !== "off";
}

export function setAutoMode(on: boolean) {
  localStorage.setItem(AUTO_KEY, on ? "on" : "off");
}

export function contextBlock(userText: string) {
  const skills = loadSkills().filter((s) => s.status === "live");
  const hit = matchSkill(userText, skills);
  const lessons = loadLessons().slice(0, 6).join(" | ");
  const vault = localStorage.getItem("sari_memory_vault")?.slice(0, 800) || "";
  return [
    `AUTO_MODE=${isAutoMode() ? "ON" : "OFF"}`,
    `LIVE_SKILLS=${skills.map((s) => s.name).join(", ")}`,
    hit ? `MATCHED_SKILL=${hit.name}\nSKILL_INSTRUCTION=${hit.instruction}` : "MATCHED_SKILL=none",
    lessons ? `LESSONS=${lessons}` : "LESSONS=none",
    vault ? `VAULT=${vault}` : "",
    `USER=${userText}`,
  ].join("\n");
}
