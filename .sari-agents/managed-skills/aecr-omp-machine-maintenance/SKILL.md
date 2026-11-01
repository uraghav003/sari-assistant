---
name: aecr-omp-machine-maintenance
description: "Health pass on aecr's Windows box: detect/remove stuck bot loops and stale locks, activate ollama + LM Studio local models, known Groq rate-limit workaround"
---

# OMP Machine Maintenance — stuck-loop removal + model activation (Windows, user aecr)

Repeatable health pass for the aecr machine's AI runtime. Run when user says machine/PowerShell is slow, agents are stuck, or models are inactive.

## 1. Detect stuck loops
- `Get-CimInstance Win32_Process | ? { $_.Name -match 'powershell' } | select ProcessId, CommandLine`
- Stuck-bot signature: tail `C:\Users\aecr\.omp\bulbhul-remote.log` — repeated `409 Conflict` every ~5s means the TG bot token is double-polled (PowerShell `BULBHUL-TG-Remote.ps1` vs GAS deployment `AKfycbw...`). Fix: kill the powershell PID; move `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\persistent_bot_launcher.bat` to `C:\Users\aecr\.omp\quarantine\` (never delete user files).
- Stale locks: if `C:\Users\aecr\.omp\stats-watchdog.lock` exists but no process matches `stats-watchdog`, delete the lock.

## 2. Activate local models
- Ollama: `& "C:\Users\aecr\AppData\Local\Programs\Ollama\ollama.exe" list` (this also starts the server). Verify: `Invoke-RestMethod http://localhost:11434/api/tags`.
- LM Studio: `& "C:\Users\aecr\.lmstudio\bin\lms.exe" load google/gemma-4-e4b`. Verify via `http://localhost:1234/v1/models` (NOT `/api/v1/models` — that path lies).
- Cloud keys: check `$env:GROQ_API_KEY`, `$env:OPENROUTER_API_KEY`.

## 3. Model routing (reconfigured 2026-10-17)
Primary model roles in `C:\Users\aecr\.omp\agent\config.yml`:

| Role | Model |
|------|-------|
| default | `google-antigravity/gemini-3.8-flash` |
| task | `google-antigravity/gemini-3.8-flash` |
| smol / sonic / scout | `zai/glm-5.3-flash` |
| slow / plan / architect | `openai-codex/gpt-5.6-luna` |
| all other named agents | `google-antigravity/gemini-3.8-flash` |

**Reason:** Kimi weekly quota was exhausted (100% used, resets in ~4d). Gemini (Antigravity) has 31% weekly / 3% 5h used. OpenAI Codex has 24% 30-day used with 1 saved reset.

Fallback chains (all in config.yml) no longer contain `kimi-code/kimi-for-coding` as a primary; it remains in fallback positions only if re-added manually.

To restore Kimi routing when quota resets: `omp config set modelRoles.default kimi-code/kimi-for-coding` etc.

## 4. Known constants
- Profile: `C:\Users\aecr\OneDrive\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1` — already optimized (non-interactive bypass); don't rewrite.
- Groq on-demand tier: 7k input tok/min ITPM — `sonic` (qwen3.8-27b) gets 413s under load; subagent runners using groq will die with "Request too large". Re-route to `zai/glm-5.3-flash` in `C:\Users\aecr\.omp\agent\config.yml` if it blocks work.
- Agent scripts: `C:\Users\aecr\AppData\Local\omp\` (sari.ps1, bulbhul.ps1, Invoke-UnifiedAI.ps1, Invoke-Groq.ps1); agent defs in `C:\Users\aecr\.omp\agent\agents\`.
- Subagent delegation on this box can fail from the Groq limit — do small forensics reads inline instead of spawning scouts.
- Do NOT kill bare `powershell.exe` PIDs with no command line (may be the host session). Don't touch startup apps without explicit user selection.
