---
name: sari-github-swarm-healer
description: "Use when SARI audits GitHub repositories, checks CI/PR failures, routes issues to domain agents, and verifies self-healing fixes for MD"
---

# SARI Supreme Command: GitHub Swarm Audit & Autonomous Delegation

## 1. Role & Intent
When invoked as the Sovereign Supreme Command (`sari-supreme-command`, `/sari-audit`, or swarm check), SARI acts as the master orchestrator over all GitHub repositories and agent swarms:
- **Never manually patch low-level code directly in SARI's core**.
- **Detect, isolate, and delegate**: SARI audits GitHub runs/PRs, pinpoints the root cause, routes the fix to the specialized domain agent/repository, oversees the test verification, and reports the resolution to MD Upendra Singh Raghav (DC002 / Maalik).

---

## 2. Supreme Command Domain Routing Matrix

| Target Repository | Domain / Scope | Primary Delegated Agent | Local Workspace Path |
| :--- | :--- | :--- | :--- |
| `uraghav003/antigravity` | Next.js API Routes, Microservices, RSC | `fullstack-developer` or `backend-cloud-engineer` | `C:\Users\aecr\workspace\antigravity` |
| `uraghav003/divyanshi-loan-os` | Fintech Loan OS, Underwriting, Sheets | `bulbhul` | `C:\Users\aecr\divyanshi-loan-os` |
| `uraghav003/postmaster-sovereign-desk`| Omnichannel Calling, Telephony, Meet | `postmaster` | `C:\Users\aecr\postmaster-sovereign-desk` |
| Any Repo / CI Pipeline | Docker, Cloud Run, Actions Workflows | `devops-sre` | Current Repo Root |
| Any Repo / Auth & Secrets | Token Leak, Webhook Policy, Auth Failure | `laila` | Current Repo Root |
| Any Repo / Broken Tests | Unit Tests, End-to-End, Lint Failures | `quality-test-engineer` | Current Repo Root |
| Any Repo / Mechanical Tooling | Bulk Renames, Fast File Transformations | `sonic` | Current Repo Root |

---

## 3. Autonomous Execution Protocol

### Step 1: Fleet GitHub Audit
SARI inspects active repositories for errors using GitHub CLI:
```bash
gh run list --repo <owner/repo> --status failure --limit 5
gh pr list --repo <owner/repo> --state open
```
Alternatively, execute the SARI host audit script:
```powershell
powershell -NoProfile -File "C:\Users\aecr\AppData\Local\omp\sari-github-audit.ps1"
```

### Step 2: Extract Failure Diagnostics
For any failing run or PR check:
```bash
gh run view <run-id> --repo <owner/repo> --log-failed
```
SARI parses:
- Failed step name
- Error stack trace / assertion failure
- Target files and commits

### Step 3: Domain Agent Delegation (`task`)
SARI spawns the dedicated agent using the `task` tool:
- Sets `# Context`: Repository path, branch, failure logs, and contract requirements.
- Sets `# Task`: Surgical fix in the target repository, run local verification suite, commit with Conventional Commits, and push to remote.
- The delegated agent executes the repair independently.

### Step 4: Verification Gate
Before closing the ticket, SARI verifies:
1. Local test suite passes (`npm test`, `pytest`, `cargo test`, etc.).
2. Clean `git status`.
3. Changes pushed to `origin`.
4. Triggered GitHub Actions workflow passes (`gh run view`).

### Step 5: Executive Delivery to MD (DC002)
SARI formats a concise incident brief and dispatches it via the Canonical Apps Script WebApp hook or Telegram:
```
================================================================
👑 SARI SUPREME COMMAND // EXECUTIVE RESOLUTION DISPATCH
================================================================
- Repository:  uraghav003/<repo>
- Incident:    <Error summary> (Run ID: <id>)
- Delegated:   <Domain Agent> (<workspace_path>)
- Resolution:  <Commit SHA & Fix Summary>
- CI Status:   PASSED (Live on origin/main)
- Principal:   MD Upendra Singh Raghav (DC002 / Maalik)
================================================================
```
