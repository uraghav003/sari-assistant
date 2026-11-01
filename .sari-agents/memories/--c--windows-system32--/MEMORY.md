# Divyanshi Loan OS Architecture & Environment

## Google Apps Script Context
- **Project/Script ID**: `1PP7wUFkDAkmgOjgPKeWbZeg3Ajs9N4ZNRPnfih_LMv89KEdSTVPvtipp`
- **Deployment**: Managed via `@google/clasp` (`clasp push --force`). GAS has a strict limit of 20 active versioned deployments and a hard history limit of 200 versions. Older versions must be pruned in the UI to deploy new ones.
- **Authentication**: Requires `~/.clasprc.json`. Secure execution endpoints verified using `MALLIK_API_KEY`.
- **Performance/Resilience**: Circuit breaker cooldown reduced from 6 hours to 60 seconds to avoid long downtimes during transient errors. Caching extensively uses `CacheService.getScriptCache()` (e.g., UI formatting, error deduping) with short TTL locks to prevent infinite recursive triggers.

## AI Multi-Model Cascade
- **Progression**: Gemini (`gemini-2.0-flash`) -> Claude (`claude-3-5-haiku-20241022`) -> OpenAI (`gpt-4o-mini`) -> Liquid (`Liquid LFM 2.5`) -> Bulbhul Consultative Engine (Deterministic fallback).
- **Configuration**: Hot-swappable via HTTP POST (`{"action":"set_ai_config","primaryProvider":"CLAUDE"}`). DeepSeek and Kimi have been removed.

## Multi-Agent Ecosystem
- **Agents**: 
  - **Bulbhul**: Central AI Personal Banker & underwriting brain. Configured globally as an MCP server (`Bulbhul-Direct-Connect`).
  - **Sari**: Smart Loan Intake OS / Mail Command Center.
  - **Laila**: Telephony Intelligence & Voice Desk.
  - **Bhism**: Infrastructure Stabilizer (15-min watchdog).
- **MCP Servers**: Configured in `C:/Users/aecr/.cursor/mcp.json` and `C:/Users/aecr/AppData/Roaming/Claude/claude_desktop_config.json`.

## Environment & Tooling (Windows)
- **OMP CLI**: Located at `C:\Users\aecr\AppData\Local\omp\omp.exe`. Update via `omp update` (downloads new binary, requires manual terminal restart).
- **Shell Nuances**: Use `powershell -Command "..."` inside Windows Bash to evaluate environment variables properly.
- **Navop**: Installed via Scoop. User data symlinked at `scoop\persist\navop\data`.
- **Docker**: Periodic `docker system prune` needed as `~/.docker` easily inflates.

## Webhooks & Integrations
- **Meta WhatsApp (v26.0)**: Error `132001` (Template name does not exist) usually indicates a language locale mismatch (`en_US` vs `en`). Isolate memory per phone number to secure private queues.
- **Telegram**: Avoid `deleteWebhook?drop_pending_updates=true` unless explicitly purging backlog. Re-register via `setWebhook` directly.
