import type { VercelRequest, VercelResponse } from "@vercel/node";
import { execSync } from "node:child_process";
import {
  applyApiHeaders,
  clientIp,
  isSameOrigin,
  rateLimit,
  requireSession,
  tooManyRequests,
} from "./_security.js";

const TERMINAL_WINDOW_MS = 60 * 1000;
const TERMINAL_MAX_REQUESTS = 15;
const MAX_OUTPUT = 8000;

/** Whitelisted commands — only these can run from the mobile terminal. */
const COMMANDS: Record<string, { cmd: string; label: string; danger?: boolean }> = {
  status:       { cmd: "git status --short && echo --- && node -v && npm -v", label: "System Status" },
  "git-log":    { cmd: "git log --oneline -10", label: "Recent Commits" },
  test:         { cmd: "npx vitest run 2>&1", label: "Run Tests" },
  build:        { cmd: "npm run build 2>&1", label: "Build Project" },
  audit:        { cmd: "npm audit --omit=dev 2>&1", label: "Security Audit" },
  "clasp-status": { cmd: "clasp status 2>&1", label: "Clasp Status" },
  health:       { cmd: 'node -e "[\'package.json\',\'tsconfig.json\',\'.mcp.json\',\'.claude/settings.json\',\'vercel.json\'].forEach(f=>{try{JSON.parse(require(\'fs\').readFileSync(f,\'utf8\'));console.log(\'✓\',f)}catch(e){console.log(\'✗\',f,e.message)}})"', label: "Config Health" },
  "cache-clean": { cmd: "npm cache verify 2>&1", label: "Cache Verify" },
  "deps":       { cmd: "npm outdated 2>&1 || true", label: "Outdated Deps" },
  "disk":       { cmd: 'node -e "const fs=require(\'fs\'),p=require(\'path\');function sz(d){let t=0;try{for(const f of fs.readdirSync(d)){const fp=p.join(d,f);const s=fs.statSync(fp);t+=s.isDirectory()?sz(fp):s.size}}catch{}return t}console.log(\'node_modules:\',Math.round(sz(\'node_modules\')/1048576)+\'MB\')"', label: "Disk Usage" },
  "env-check":  { cmd: 'node -e "const v=[\'SARI_SESSION_SECRET\',\'SARI_PASSWORD_HASH\',\'SARI_SHARED_SECRET\',\'GEMINI_API_KEY\',\'SARI_LOGIN_EMAIL\'];v.forEach(k=>console.log(k+\': \'+(process.env[k]?\'✓ set\':\'✗ missing\')))"', label: "Env Vars Check" },
};
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyApiHeaders(res);

  if (!isSameOrigin(req)) {
    res.status(403).json({ ok: false, error: "Cross-origin requests are not permitted." });
    return;
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method === "GET") {
    // Return available commands list (no auth needed for menu)
    const menu = Object.entries(COMMANDS).map(([id, c]) => ({ id, label: c.label }));
    res.status(200).json({ ok: true, commands: menu });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Use POST with { command: '<id>' }" });
    return;
  }

  if (!requireSession(req, res)) return;

  const limit = rateLimit(`terminal:${clientIp(req)}`, TERMINAL_MAX_REQUESTS, TERMINAL_WINDOW_MS);
  if (!limit.ok) {
    tooManyRequests(res, limit.retryAfter);
    return;
  }

  const body = typeof req.body === "object" && req.body ? req.body : {};
  const commandId = typeof body.command === "string" ? body.command.trim() : "";

  if (!commandId || !COMMANDS[commandId]) {
    res.status(400).json({
      ok: false,
      error: `Unknown command. Available: ${Object.keys(COMMANDS).join(", ")}`,
    });
    return;
  }

  const entry = COMMANDS[commandId];
  const startMs = Date.now();

  try {
    const output = execSync(entry.cmd, {
      cwd: process.cwd(),
      timeout: 30_000,
      maxBuffer: 512 * 1024,
      encoding: "utf8",
      env: { ...process.env, FORCE_COLOR: "0" },
    });

    const trimmed = output.length > MAX_OUTPUT
      ? output.slice(0, MAX_OUTPUT) + "\n… (truncated)"
      : output;

    res.status(200).json({
      ok: true,
      command: commandId,
      label: entry.label,
      output: trimmed,
      durationMs: Date.now() - startMs,
    });
  } catch (err: unknown) {
    const execErr = err as { stdout?: string; stderr?: string; status?: number };
    const out = (execErr.stdout || "") + (execErr.stderr || "");
    const trimmed = out.length > MAX_OUTPUT ? out.slice(0, MAX_OUTPUT) + "\n… (truncated)" : out;

    res.status(200).json({
      ok: true,
      command: commandId,
      label: entry.label,
      output: trimmed || "Command failed with no output.",
      exitCode: execErr.status ?? 1,
      durationMs: Date.now() - startMs,
    });
  }
}
