#!/usr/bin/env node
// Validates every location against sari-config.json (the single source of truth in this repo).
// Usage: node scripts/validate-config.cjs     Exit 0 = all OK, 1 = mismatches found. Never prints secret values.
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");
const cfg = JSON.parse(fs.readFileSync(path.join(root, "sari-config.json"), "utf8"));
const SCRIPT = cfg.scriptId;
const DEPLOY = cfg.deploymentId;
const FORBIDDEN = cfg.forbiddenIds || [];
const ENV_ALLOWED = cfg.environment?.allowed || [];
const results = [];
const add = (ok, where, msg) => results.push({ ok, where, msg });

function check(file, { needScript = false, needDeploy = false, optional = false } = {}) {
  const p = file.startsWith("~") ? path.join(os.homedir(), file.slice(2)) : path.join(root, file);
  if (!fs.existsSync(p)) {
    if (!optional) add(false, file, "missing");
    return;
  }
  const s = fs.readFileSync(p, "utf8");
  const bad = FORBIDDEN.filter((id) => s.includes(id));
  if (bad.length) add(false, file, `contains forbidden ID ${bad.map((b) => b.slice(0, 10) + "…").join(", ")}`);
  if (needScript && !s.includes(SCRIPT)) add(false, file, "scriptId does not match sari-config.json");
  if (needDeploy && !s.includes(DEPLOY)) add(false, file, "deploymentId does not match sari-config.json");
  if (!bad.length && (!needScript || s.includes(SCRIPT)) && (!needDeploy || s.includes(DEPLOY))) add(true, file, "ok");
}

// Repo files (tracked)
check(".clasp.json", { needScript: true });
check(".mcp.json", { needScript: true, needDeploy: true });
check("src/lib/config.ts", { needScript: true, needDeploy: true });
check("dynamic-mind.cjs", { needScript: true, needDeploy: true });
for (const f of ["api/_security.ts", "api/chat.ts", "api/webhook.ts", "api/probe-script.ts", "api/terminal.ts"]) check(f, { needDeploy: true });
check("sari-daemon.js", { needDeploy: true });

// Local machine files (checked only if present). In mcp.json only the SARI server entry is checked:
// other servers (e.g. bulbhul) legitimately use their own IDs.
function checkMcpSari(file) {
  const p = path.join(os.homedir(), file.slice(2));
  if (!fs.existsSync(p)) return;
  const servers = JSON.parse(fs.readFileSync(p, "utf8")).mcpServers || {};
  const sari = servers["sari-sovereign-11-2"] || servers.sari;
  if (!sari) return add(false, file, "no SARI server entry");
  const env = sari.env || {};
  const ok = env.SARI_SCRIPT_ID === SCRIPT && env.SARI_DEPLOYMENT_ID === DEPLOY;
  add(ok, `${file} (sari entry)`, ok ? "ok" : "SARI IDs do not match sari-config.json");
}
checkMcpSari("~/.omp/mcp.json");
checkMcpSari("~/.omp/agent/mcp.json");
check("~/.omp/agent/sari-keys.json", { needScript: true, needDeploy: true, optional: true });

function userEnv(name) {
  if (process.env[name]) return process.env[name];
  if (process.platform !== "win32" || !/^[A-Z0-9_]+$/.test(name)) return "";
  try {
    return require("child_process")
      .execFileSync("powershell.exe", ["-NoProfile", "-Command", `[Environment]::GetEnvironmentVariable('${name}','User')`], { encoding: "utf8" })
      .trim();
  } catch {
    return "";
  }
}

// Environment: only the allowed variable names may hold secrets; report presence only.
if (ENV_ALLOWED.length) {
  for (const k of ENV_ALLOWED) add(Boolean(userEnv(k)), `env:${k}`, userEnv(k) ? "set" : "not set");
  if (ENV_ALLOWED.length > 3) add(false, "sari-config.json", `environment.allowed lists ${ENV_ALLOWED.length} variables (max 3)`);
}

(async () => {
  try {
    const r = await fetch(`https://script.google.com/macros/s/${DEPLOY}/exec?action=status`, { redirect: "follow", signal: AbortSignal.timeout(20000) });
    const j = await r.json();
    add(j.status === "ok", "apps-script:status", j.status === "ok" ? `${j.system} v${j.version}` : `unexpected reply (HTTP ${r.status})`);
  } catch (e) {
    add(false, "apps-script:status", `unreachable (${e.message})`);
  }
  for (const r of results) console.log(`${r.ok ? "OK  " : "FAIL"} ${r.where}: ${r.msg}`);
  const fails = results.filter((r) => !r.ok).length;
  console.log(fails ? `\n${fails} problem(s)` : "\nALL OK");
  process.exitCode = fails ? 1 : 0;
})();
