---
name: system-maintenance
description: "A-to-Z system maintenance: fix caches, clean temp files, validate configs, repair npm/clasp/git, audit agents, and health-check MCP servers."
---

# System Maintenance — A-to-Z Fix & Health Check

Run this skill when maintaining, repairing, or health-checking the development environment.

## When to Use

- User says "maintain", "fix cache", "clean up", "health check", "system check"
- After failed builds, broken agents, stale caches, or config drift
- Periodic maintenance runs

## Maintenance Checklist

### A. Cache & Temp Cleanup

```bash
# npm cache
npm cache verify
# Node modules integrity
npm ls --depth=0 2>&1 | grep -i "ERR\|invalid\|missing"
# Remove stale npx cache entries
npx clear-npx-cache 2>/dev/null || true
```

On Windows PowerShell:
```powershell
# Clear npm cache
npm cache verify
# Clear TypeScript build cache
Remove-Item -Recurse -Force ./node_modules/.cache -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ./.tsbuildinfo -ErrorAction SilentlyContinue
# Clear Vite cache
Remove-Item -Recurse -Force ./node_modules/.vite -ErrorAction SilentlyContinue
```

### B. npm Health

```bash
npm doctor                  # Full health check
npm audit --omit=dev        # Security vulnerabilities
npm outdated                # Stale dependencies
npm ls --depth=0            # Broken dep tree
```

Fix: `npm install` then `npm audit fix` if needed.

### C. Clasp (Google Apps Script)

```bash
clasp --version             # Verify installed
clasp status                # Check tracked files
clasp login --status        # Auth still valid?
```

Fix: `clasp login --creds <path>` if auth expired.

### D. Git Health

```bash
git status                  # Working tree clean?
git remote -v               # Remotes configured?
git log --oneline -3        # Recent commits sane?
git fsck --no-dangling      # Object integrity
```

### E. Config Validation

Validate all JSON/YAML configs parse correctly:

```bash
# Project configs
node -e "JSON.parse(require('fs').readFileSync('.mcp.json','utf8'))"
node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8'))"
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"
node -e "JSON.parse(require('fs').readFileSync('tsconfig.json','utf8'))"

# Global OMP configs
node -e "JSON.parse(require('fs').readFileSync(process.env.USERPROFILE+'/.omp/mcp.json','utf8'))"
python -c "import yaml; yaml.safe_load(open(r'%USERPROFILE%/.omp/agent/config.yml'))"
```

### F. Agent Health

1. Check agent fallback chains have no dead models (404s)
2. Verify `~/.omp/agent/config.yml` parses as valid YAML
3. Confirm `agentModelOverrides` point to available models
4. Test a subagent spawn to confirm routing works

### G. MCP Server Health

For each server in `.mcp.json` and `~/.omp/mcp.json`:

1. Verify the command binary exists: `where <command>` or `which <command>`
2. Verify args reference existing files
3. Check env vars are set (not empty `${...}` placeholders without values)

### H. Build & Test

```bash
npm run build 2>&1          # Build passes?
npm test 2>&1               # Tests pass?
```

### I. PowerShell Profile

```powershell
# Verify profile loads without errors
pwsh -NoProfile -Command ". $PROFILE 2>&1"
# Verify Oh My Posh init
oh-my-posh --version
```

### J. Disk & Performance

```powershell
# node_modules size
(Get-ChildItem -Recurse node_modules -ErrorAction SilentlyContinue | Measure-Object -Sum Length).Sum / 1MB
# Large log files in .omp
Get-ChildItem "$env:USERPROFILE\.omp\logs" -Recurse | Sort-Object Length -Descending | Select-Object -First 5 Name, @{N='MB';E={[math]::Round($_.Length/1MB,1)}}
```

## Execution Order

Always run in this order: Cache → npm → clasp → git → configs → agents → MCP → build → profile → disk.

Report each section as ✓ pass, ⚠ warning, or ✗ fail with fix applied.

## Auto-Fix Policy

- **Safe auto-fix**: cache clear, npm install, config format repair
- **Ask first**: dependency upgrades, clasp re-auth, git force operations
- **Never auto-fix**: secret rotation, production deployments, data deletion
