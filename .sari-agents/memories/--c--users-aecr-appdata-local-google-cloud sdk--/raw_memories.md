# Raw Memories

## 01a13bdd-0eb9-768b-ae77-9322e30fd9f1
updated_at: 1792009356
### Project Locations & Apps Script Deployments
- `sari-assistant` is located at `C:\Users\aecr\workspace\sari-assistant`.
- `divyanshi-loan-os` is located at `C:\Users\aecr\divyanshi-loan-os`.
- Apps Script Project ID for `divyanshi-loan-os`: `1PP7wUFkDAkmgOjgPKeWbZeg3Ajs9N4ZNRPnfih_LMv89KEdSTVPvtipp`.
- Live Web App Deployment ID: `AKfycbwzdhZF3cVTT01atwZOSnXq7kBvx6k9NgFCbSvfAIXldCjBnMUqxKIBlLUPTiA7V8tc`.
- Deployment Script: Running `node scripts/deploy-to-apps-script.js` uploads files via clasp authentication (`~/.clasprc.json`) and generates a new version number (e.g., Version 1205).
- Deployment Update API: Target deployment can be updated/bound to the newly created version by issuing a PUT request to `https://script.googleapis.com/v1/projects/<scriptId>/deployments/<deploymentId>` with `{ deploymentConfig: { scriptId, versionNumber, manifestFileName: 'appsscript', description } }` using an access token refreshed via `scripts/deploy-to-apps-script.js`.

## 01a13bdc-021e-72cb-9fc4-515af71b4f82
updated_at: 1792006017
Repository `bulbhul-banking` previously had split checks `doctor:auth` and `doctor:models`.
Added unified healthcheck script `scripts/doctor.mjs` (`pnpm doctor`) validating:
1. Runtimes: Node.js (>=20) and pnpm.
2. Local config files: `.dev.vars`, `wrangler.jsonc`.
3. Better-auth & Workers binding verification via `scripts/doctor-auth.mjs`.
4. Cloudflare Workers AI model catalogue currency via `scripts/doctor-models.mjs`.
5. Core workspace file paths (`src/server/index.ts`, `src/client/main.tsx`, `drizzle.config.ts`, `wrangler.jsonc`).

## 01a13bd4-b4a6-76bb-b3b4-0f7d502adcf0
updated_at: 1792005700
When troubleshooting OMP CLI errors reporting undefined models referenced in fallback chains (e.g., for 'default' or 'smol' roles) and MCP failures:
- Configuration locations: Local configs reside in `~/.omp/` (including `~/.omp/agent/mcp.json`, `~/.omp/agent/models.json`, and `~/.omp/config.json`).
- Model and role definitions must be checked against registered models using `omp models` (executable often at `C:/Users/<user>/AppData/Local/omp/omp.exe` on Windows).
- Ensure fallback chain entries reference valid model identifiers recognized by OMP to prevent startup warnings and execution failures.

## 01a10387-7c3c-73bd-9b74-1a4d966348bc
updated_at: 1791063955
- Tooling (OMP CLI): Uses `omp models find <name>` to search models, `omp config list` to view settings.
- Model Installation: Installed Liquid LFM 2.5 (ONNX engine: lfm2.5-230m and lfm2.5-350m) for offline inference.
- System Integration: Created `C:\Users\aecr\liquid.bat` enabling a global `liquid <prompt>` command for instant local execution (~1s latency).
- Configurations: Updated OMP setting `memory.backend` to `local` to enable offline memory and context extraction.
- Environment Configuration: Added `OPENROUTER_API_KEY` to Windows User Environment variables.

## 01a10391-977d-763a-890c-46b50a5c521a
updated_at: 1791061245
- Google Antigravity: Gemini 3 Pro is deprecated; must switch to Gemini 3.1 Pro in the latest version.
- OpenRouter Provider Restrictions: To use Liquid LFM models (e.g., liquid/lfm-2.5-2.6b:free), the 'liquid' provider must be explicitly whitelisted in OpenRouter privacy settings.
- OpenRouter Credit Limits: Requests with large max_tokens (e.g., 131072) will fail with 402 Insufficient Credits if the account balance cannot cover the maximum possible generation (currently limited to ~8.6k tokens).
- Kimi (k3): Monthly usage quota limit reached (403 Permission Error).

## 01a0ff05-5764-75db-bd4a-369e1f58a314
updated_at: 1790988602
When auditing or refactoring Google Apps Script web apps (like the Divyanshi Capital CRM deployment):
- Avoid hardcoded dependencies on PropertiesService (`DC_CFG.PROPS.getProperty(...)`) for core identity/database lookups, as missing properties can cause fatal execution errors during `doGet`.
- Transitioning to a zero-configuration pattern where the script natively resolves its own Script ID and binds directly to the master database sheet (e.g. `ALL_EMPLOYEES`) stabilizes web app rendering.
- Testing web app endpoints via curl POST often encounters HTTP 411 Length Required due to Google Apps Script's redirect handling on POST without explicit headers.

## 01a0fd81-930a-704b-85fc-192fec88f422
updated_at: 1790968944
When heavy automation engines like n8n cause excessive resource consumption on Windows hosts, a lightweight Node.js polling script (`instant-telegram-bot.js`) can serve as an immediate replacement for Telegram-to-AI routing:
- Script location: `C:/Users/aecr/.omp/instant-telegram-bot.js`
- Architecture: Long-polling `https://api.telegram.org/bot<TOKEN>/getUpdates?offset=...&timeout=30`, filtering by managing director chat ID (e.g., `8262519779`), forwarding payload via POST to Google Apps Script endpoint (`https://script.google.com/macros/s/AKfycbwzdhZF3cVTT01atwZOSnXq7kBvx6k9NgFCbSvfAIXldCjBnMUqxKIBlLUPTiA7V8tc/exec`) with payload `{ action: 'chat', empCode: 'DC002', message, TG_CHAT_ID, BULBHUL_CHAT_ID }`, and responding via `sendMessage`.
- Execution command on Windows: `cmd /c "start cmd /k node C:\Users\aecr\.omp\instant-telegram-bot.js"`.
