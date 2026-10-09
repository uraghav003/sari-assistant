export type SkillStatus = "live" | "draft" | "building";

export interface Skill {
  id: string;
  name: string;
  description: string;
  status: SkillStatus;
  trigger: string;
  steps: string[];
  instruction: string;
  runs: number;
  lastRun?: string;
}

const SKILLS_KEY = "sari_skills_v2";
const LESSONS_KEY = "sari_lessons_v1";
const AUTO_KEY = "sari_auto_mode";

export const seedSkills: Skill[] = [
  {
    id: "sovereign-control",
    name: "Sovereign Control & Governance Gatekeeper",
    description: "Strict Human-in-the-Loop (HITL) gatekeeper ensuring MD/Owner retains 100% control over destructive actions, finances, and deployments",
    status: "live",
    trigger: "sovereign / control / gatekeeper / permission / approve / md / security / delete / drop / deploy",
    steps: [
      "Identify high-impact or destructive operations",
      "Request explicit MD authorization and confirmation",
      "Sanitize all PII (Aadhaar, PAN, phone, credentials) before processing",
      "Log immutable audit trail of the approved action",
      "Execute precisely within granted scope with zero autonomous drift"
    ],
    instruction: "Owner is MD. Never execute destructive operations, financial transactions, database drops, or external webhooks without explicit MD confirmation. Always enforce Zero-Trust and zero PII leakage.",
    runs: 0,
  },
  {
    id: "fullstack-architect",
    name: "Full-Stack System Architecture & Engineering",
    description: "End-to-end fullstack engineering across React 19, TypeScript, Edge Serverless, Vite, Supabase, PostgreSQL, and scalable microservices",
    status: "live",
    trigger: "architecture / fullstack / react / backend / frontend / database / schema / design / code / build",
    steps: [
      "Decompose system into clean modular layers with explicit interfaces",
      "Enforce strict TypeScript types with zero `any` assertions",
      "Optimize data flow, edge caching, and serverless response latency",
      "Design resilient error handling and graceful fallbacks",
      "Produce production-grade, maintainable code following modern best practices"
    ],
    instruction: "Act as a principal software architect. Deliver clean, type-safe, production-ready code with clear architectural reasoning, zero dead weight, and optimal execution speed.",
    runs: 0,
  },
  {
    id: "code-auditor-guard",
    name: "Deep Code Auditor & Security Inspector",
    description: "Automated static analysis, AST verification, OWASP Top-10 security audit, memory leak prevention, and anti-pattern remediation",
    status: "live",
    trigger: "audit / inspect / review / security scan / bug / vulnerability / refactor / fix code / lint",
    steps: [
      "Parse and analyze AST and type boundaries",
      "Audit for OWASP vulnerabilities, XSS, injection vectors, and broken auth",
      "Detect performance bottlenecks, memory leaks, and avoidable re-renders",
      "Formulate concrete surgical diffs / fixes with zero regression risk",
      "Verify fixes against type checkers and runtime constraints"
    ],
    instruction: "Perform rigorous, evidence-backed code review. Pinpoint exact vulnerabilities, type weaknesses, or performance traps and provide surgical, zero-risk refactors.",
    runs: 0,
  },
  {
    id: "github-devops-controller",
    name: "GitHub DevOps & CI/CD Pipeline Automation",
    description: "Automated GitHub Actions workflows, Git branch hygiene, release packaging, semantic versioning, and deployment verification",
    status: "live",
    trigger: "github / git / ci / cd / action / pipeline / workflow / release / version / pr / commit / deploy",
    steps: [
      "Structure reproducible GitHub Actions workflow YAML",
      "Enforce branch protection, automated test barriers, and linting gates",
      "Generate clean semantic commit messages and PR briefs",
      "Automate build artifacts, Docker containerization, and Vercel/Cloudflare deployments",
      "Verify deployment health and rollback readiness"
    ],
    instruction: "Manage end-to-end Git and CI/CD operations with deterministic reliability. Automate workflows while enforcing strict branch protection and provenance.",
    runs: 0,
  },
  {
    id: "api-craftsman",
    name: "API Design & Resilient Integration Craftsman",
    description: "Architect high-performance REST, Edge Functions, GraphQL, OpenAPI specs, and resilient webhook event brokers",
    status: "live",
    trigger: "api / endpoint / rest / graphql / openapi / webhook / integration / fetch / route",
    steps: [
      "Model RESTful / Edge resources with OpenAPI 3.1 contracts",
      "Implement robust request validation with Zod / Valibot / TypeScript guards",
      "Configure exponential backoff retry algorithms with circuit breakers",
      "Apply strict CORS, rate-limiting, and security headers",
      "Document exact curl / fetch payloads and schema definitions"
    ],
    instruction: "Design and implement industrial-grade APIs. Ensure strict schema validation, robust rate limiting, edge execution, and fail-safe retry architectures.",
    runs: 0,
  },
  {
    id: "fintech-dsa-engine",
    name: "Fintech DSA Multi-Lender Intelligence Engine",
    description: "High-precision DSA loan eligibility matrix, multi-bank credit policy matching, EMI/ROI loan splitting, and CIBIL risk modeling",
    status: "live",
    trigger: "loan / dsa / credit / eligibility / bank / roi / emi / cibil / lender / finance / divyanshi",
    steps: [
      "Ingest borrower financial profile (income, obligations, vintage, credit score)",
      "Match against multi-bank credit policy matrices (HDFC, ICICI, SBI, Axis, NBFCs)",
      "Calculate optimal loan ticket split across lenders for maximum approval TAT",
      "Generate structured borrower brief with zero PII exposure",
      "Provide actionable closing checklist for loan officers / DSA partners"
    ],
    instruction: "Deliver sovereign DSA intelligence for Divyanshi Capital. Maximize approval probability across 50+ lenders while strictly redacting borrower PII.",
    runs: 0,
  },
  {
    id: "laila-zero-trust-audit",
    name: "LAILA Zero-Trust Controller & Webhook Sentinel",
    description: "Sub-agent LAILA continuous audit of Zero-Trust policies, webhook telemetry, and employee role access",
    status: "live",
    trigger: "laila / zero-trust / employee / access / sentinel / webhook audit / telemetry",
    steps: [
      "Validate incoming webhook signatures and HMAC tokens",
      "Verify employee role clearance against ALL_EMPLOYEES gate",
      "Inspect webhook telemetry for anomalous payloads or rate spikes",
      "Log Zero-Trust compliance heartbeat to central audit register",
      "Block and quarantine suspicious access attempts immediately"
    ],
    instruction: "Enforce zero-trust boundaries across all incoming webhooks and internal controller interfaces. Never allow unverified token access.",
    runs: 0,
  },
  {
    id: "bulbul-autonomous-dispatch",
    name: "BULBUL Autonomous Lead & CRM Dispatch",
    description: "Sub-agent BULBUL autonomous lead qualification, CRM dispatch, and lender webhook synchronization",
    status: "live",
    trigger: "bulbul / dispatch / lead triage / crm / lender sync / route lead",
    steps: [
      "Ingest and validate raw lead stream from marketing / partner channels",
      "Sanitize sensitive identification data",
      "Score lead quality and map to highest-converting lender endpoint",
      "Dispatch payload via verified webhook with retry acknowledgement",
      "Update lead status register with timestamped dispatch confirmation"
    ],
    instruction: "Execute automated lead routing with high precision. Ensure sub-second routing, payload sanitization, and verified lender webhook confirmations.",
    runs: 0,
  },
  {
    id: "telephony-calling-bridge",
    name: "Telephony & Voice Call Intelligence Bridge",
    description: "Automate calling desk queues, analyze voice call dispositions, parse call transcripts, and dispatch follow-up SMS/WhatsApp actions",
    status: "live",
    trigger: "call / dialer / calling desk / telephony / disposition / voice transcript / sms / whatsapp",
    steps: [
      "Analyze call transcript / recording for customer intent and sentiment",
      "Classify disposition (Interested, Callback, Rejection, Documentation Pending)",
      "Draft personalized, context-aware Hinglish follow-up message",
      "Schedule automatic dialer retry or escalation to senior loan manager",
      "Sync call summary to central CRM"
    ],
    instruction: "Process telephony intelligence with rapid turnaround. Produce concise caller summaries, exact dispositions, and immediate follow-up SMS/WhatsApp triggers.",
    runs: 0,
  },
  {
    id: "fish-audio-voice",
    name: "Fish Audio Multilingual Voice Synthesis",
    description: "Generate natural speech voiceovers, multilingual audio broadcasts, and real-time TTS streams via Fish Audio API",
    status: "live",
    trigger: "audio / voice / tts / speech / fish audio / speak / broadcast",
    steps: [
      "Structure text into clean phonetic SSML / script chunks",
      "Select optimal voice persona and language model (English / Hindi / Hinglish)",
      "Transmit synthesis request to Fish Audio API endpoint",
      "Stream high-fidelity audio buffer to client playback or export file"
    ],
    instruction: "Convert assistant messages and announcements into high-quality natural voice audio with zero credential or PII leakage.",
    runs: 0,
  },
  {
    id: "self-instruct",
    name: "Autonomous Skill Synthesizer & Compiler",
    description: "Synthesize and activate dynamic, reusable skill modules on the fly from user descriptions",
    status: "live",
    trigger: "build skill / naya skill / create skill / synthesize / automate workflow",
    steps: [
      "Extract trigger phrases, execution intent, and boundary constraints",
      "Generate structured 4-6 step deterministic execution recipe",
      "Draft reusable system instruction with safety guardrails",
      "Persist skill card to local storage and activate for immediate routing"
    ],
    instruction: "Turn user workflow descriptions into fully formed, production-grade reusable skill cards with clean step sequences and tight instructions.",
    runs: 0,
  },
  {
    id: "think",
    name: "Think Then Act Cognitive Core",
    description: "Execute UNDERSTAND → PLAN → ACT → LEARN reasoning on every single request",
    status: "live",
    trigger: "Every chat / default",
    steps: ["Parse intent", "Match skill", "Formulate plan", "Execute act", "Record learning"],
    instruction: "Always structure responses in four clear sections: UNDERSTAND, PLAN, ACT, LEARN. Never skip PLAN. Deliver immediate practical utility.",
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
    for (const s of seedSkills) {
      if (!ids.has(s.id)) merged.push(s);
    }
    return merged;
  } catch {
    return seedSkills;
  }
}

export function saveSkills(skills: Skill[]): void {
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
        .some((part) => {
          const clean = part.trim();
          return clean.length > 0 && t.includes(clean);
        })
    ) ||
    live.find((s) => t.includes(s.name.toLowerCase())) ||
    null
  );
}

export function bumpRun(id: string): Skill[] {
  const skills = loadSkills();
  const next = skills.map((s) =>
    s.id === id ? { ...s, runs: (s.runs || 0) + 1, lastRun: new Date().toISOString() } : s
  );
  saveSkills(next);
  return next;
}

export function addSkill(partial: Omit<Skill, "id" | "runs" | "status"> & { status?: SkillStatus }): Skill[] {
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
    const raw = localStorage.getItem(LESSONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function recordLesson(lesson: string): void {
  const clean = lesson.replace(/^LEARN:\s*/i, "").trim();
  if (!clean) return;
  const prev = loadLessons();
  const next = [`${new Date().toISOString().slice(0, 16)} ${clean}`, ...prev].slice(0, 40);
  localStorage.setItem(LESSONS_KEY, JSON.stringify(next));
}

export function extractLesson(reply: string): void {
  const m = reply.match(/LEARN:\s*(.+)/i);
  if (m && m[1]) {
    recordLesson(m[1].split("\n")[0]);
  }
}

export function isAutoMode(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(AUTO_KEY) !== "off";
}

export function setAutoMode(on: boolean): void {
  localStorage.setItem(AUTO_KEY, on ? "on" : "off");
}

export function contextBlock(userText: string): string {
  const skills = loadSkills().filter((s) => s.status === "live");
  const hit = matchSkill(userText, skills);
  const lessons = loadLessons().slice(0, 6).join(" | ");
  const vault = localStorage.getItem("sari_memory_vault")?.slice(0, 800) || "";
  return [
    `AUTO_MODE=${isAutoMode() ? "ON" : "OFF"}`,
    `SOVEREIGN_AUTHORITY=MD_ONLY`,
    `LIVE_SKILLS=${skills.map((s) => s.name).join(", ")}`,
    hit ? `MATCHED_SKILL=${hit.name}\nSKILL_INSTRUCTION=${hit.instruction}` : "MATCHED_SKILL=none",
    lessons ? `LESSONS=${lessons}` : "LESSONS=none",
    vault ? `VAULT=${vault}` : "",
    `USER=${userText}`,
  ].join("\n");
}
