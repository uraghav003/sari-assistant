# Raw Memories

## 01a11a81-29bc-7444-a1c8-8b6c85306757
updated_at: 1791446581
Configuration:
- The global config namespace exposes `symbolPreset` with enum values `unicode`, `nerd`, and `ascii`; default is `unicode`.
- Writing `nerd` to `cfg://symbolPreset` switches icons/symbols to the Nerd Font glyph set for the current session.
- The setting was changed successfully for the session. Persistence for future `omp` sessions was offered but is not confirmed as saved.

Windows repair workflow:
- System-file repair requires administrator elevation and triggers a Windows UAC prompt; the assistant cannot bypass or approve UAC.
- The attempted command used PowerShell `Start-Process cmd -Verb RunAs` to open an elevated command window and sequentially run `DISM /Online /Cleanup-Image /RestoreHealth`, then `sfc /scannow`.
- The first elevated launch failed because the operation was canceled by the user after approximately 30 seconds, indicating the UAC prompt was declined or timed out.
- After the user confirmed retry, a second elevated process was launched successfully from the tool's perspective, but it returned no output because the commands run in a separate interactive window. The user still needed to click Yes on the UAC prompt and wait for the scans to finish.
- Do not claim repairs completed or that the system is error-free unless the output from the elevated window is actually observed. DISM/SFC completion and results remained unverified in this thread.

## 01a119c8-0b34-7238-974d-3d15b913d29a
updated_at: 1791445826
Configuration changes:
- Populated missing or empty GEMINI_API_KEY values in:
  - ~/.gemini/antigravity-ide/scratch/divyanshi-capital-cloud-hub-v5/.env
  - ~/OneDrive/divyanshi-capital-hub/.env
  - ~/OneDrive/divyanshi-capital-loan-automation/.env
- Updated ~/.omp/agent/config.yml so modelRoles and fallbackChains use google-antigravity/gemini-3.1-pro instead of outdated model identifiers.

Runtime verification:
- `pm2 status` failed with `command not found: pm2`; PM2 is not installed or not on PATH.
- Native process check found no Node process and two Python processes using C:\Users\aecr\scoop\apps\python\current\python.exe, PIDs 11636 and 22384.
- Docker availability was checked via `docker ps`; the prior resolution concluded there were no active Docker containers or relevant managed Windows services.
- Because no PM2, Docker, or Windows Service deployment was active, restart commands were not necessary. Future launches should load the updated environment variables and model configuration.

## 01a119c4-ff2e-735b-863d-7fbf02e3b213
updated_at: 1791433878
## Update workflow
- Command: `omp update`
- The updater detected current version `18.6.0` and available version `18.8.4`.
- It downloaded `omp-windows-x64.exe` and completed the installation asynchronously.
- The background update job completed successfully.

## Result
- Installed version: `18.8.4`
- Previous version: `18.6.0`
- Required follow-up: restart `omp` so the new version is loaded.

## Operational note
- The update process may run as a background job; do not poll repeatedly while it is running. Wait for completion notification instead.

## 01a10476-7c0b-7079-bc77-930bd9c33b79
updated_at: 1791088607
## Divyanshi Loan OS (Apps Script) - Multi-AI Configuration
- **Script ID**: `1PP7wUFkDAkmgOjgPKeWbZeg3Ajs9N4ZNRPnfih_LMv89KEdSTVPvtipp` (Updated to Version 1177)
- **Supported AI Models**: 
  - Gemini (`gemini-2.0-flash`)
  - Claude (`claude-3-5-haiku-20241022`)
  - OpenAI (`gpt-4o-mini`)
  - Liquid/OpenRouter (`Liquid LFM 2.5`)
- **Removed Models**: DeepSeek (`deepseek-chat`) and Kimi/Moonshot along with their respective API keys.
- **Cascade Order**: Gemini -> Claude -> OpenAI -> Liquid -> Bulbhul Consultative Banker Engine (Deterministic fallback).
- **Runtime Configuration**: Added endpoints to get/set AI configuration via HTTP POST without code changes.
  - Endpoint action `get_ai_config`: Returns current AI model status and primary provider.
  - Endpoint action `set_ai_config`: Hot-swaps the primary provider (e.g., Payload `{"action":"set_ai_config","primaryProvider":"CLAUDE"}`).

## 01a103c4-0926-71c3-bdd9-3e0b908b050f
updated_at: 1791073628
Deployed Divyanshi Loan OS to Google Apps Script using 'clasp push -f'. Validated using 'test-live-battery.cjs' ensuring 7 key endpoints return HTTP 200 (health_check, notion_status, notebooklm_dossier, get_active_employees, get_loan_catalog, get_all_employees_map, avatar_chat). Google Apps Script target ID: 1PP7wUFkDAkmgOjgPKeWbZeg3Ajs9N4ZNRPnfih_LMv89KEdSTVPvtipp. Pushed payload includes Code.gs and standard UI HTML templates (dashboard, calling, card, smart_form, voice).

## 01a1032f-53da-7702-b29a-2aa96a012410
updated_at: 1791063983
Google Apps Script ID: 1PP7wUFkDAkmgOjgPKeWbZeg3Ajs9N4ZNRPnfih_LMv89KEdSTVPvtipp.
Local Directory: /DisabledStartup
Tooling: Managed via `clasp`.
Key Technical Implementations:
1. Model Integration: Uses `liquid/lfm-2.5:free` handled via `UrlFetchApp` logic.
2. State Management: Implements a specific lock contention fix using the flag `let _lkd_=false;`.
3. Caching: Uses `DC_EMP_INDEX_MEM_` for memory caching fixes.
Architecture context: Project includes voice.html, smart_form.html, calling.html, and a backend Code.gs, connected to a 'Bulbhul Self-Heal Consolidation' system.

## 01a1029e-21ab-772c-8422-02a0b1d87ad1
updated_at: 1791049482
Google Apps Script ('divyanshi-loan-os') Deployment details:
- Local path: `C:\Users\aecr\divyanshi-loan-os`
- Script ID: `1PP7wUFkDAkmgOjgPKeWbZeg3Ajs9N4ZNRPnfih_LMv89KEdSTVPvtipp`
- Deployment workflow: `clasp push --force` followed by `clasp create-version "<Description>"`.
- Code.gs context: `DC_SELF_HEAL_ALL_()` acts as SLIM DELEGATOR. Self-heal interval set to 21600000 (6 hours). Uses `LAST_MAALIK_STABILIZE` and `LAST_SELF_HEAL` properties.

OMP CLI context:
- `omp update` downloads updates in the background. Requires a restart of `omp` to apply.

## 01a1019e-da3f-752b-9a18-d2c33fce118a
updated_at: 1791034154
Google Apps Script project ID: `1PP7wUFkDAkmgOjgPKeWbZeg3Ajs9N4ZNRPnfih_LMv89KEdSTVPvtipp`

Circuit Breaker Logic & Cooldown Configuration:
- The script previously used a 6-hour hard lock (`21600` seconds) when API errors occurred (e.g. invalid API key, quota exhaustion, billing issues) to avoid spamming Google Apps Script `UrlFetch` quotas.
- Cooldown was reduced to 60 seconds (`60` seconds) in `Code.js` so fresh keys or transient issues recover quickly without leaving the bot offline for hours.
- Scripts can be managed locally via `clasp clone <scriptId>`, validated with `node -c Code.js`, and deployed via `clasp push`.

## 01a100af-52da-70a6-aa6a-7014a922fe3d
updated_at: 1791013183
When sending WhatsApp messages via Meta Cloud API, HTTP 404 / Error 132001 (`Template name does not exist in the translation`) indicates that the specified template (`lead_acknowledgement`) is either not approved under that exact name in Meta WhatsApp Business Manager or was registered with a specific locale such as `en_US` or `en_GB` rather than generic `en`. The fix requires checking the approved template locale in Meta Business Manager and aligning the payload's `language.code`.

## 01a0fef6-061d-71a7-98ea-56d607815157
updated_at: 1790985372
Bulbhul agent setup:
- The Bulbhul agent is configured as a global Model Context Protocol (MCP) server named `Bulbhul-Direct-Connect`, rather than a PowerShell module or installed script.
- MCP configuration file: `C:/Users/aecr/AppData/Roaming/Claude/claude_desktop_config.json`.
- Source code implementation path: `C:/Users/aecr/.agents/skills/bulbhul-agent/direct-connect.ts`.
- Other registered MCP servers in Claude Desktop: `GitKraken`, `MCP_DOCKER`, `omp-runner`.

## 01a0fe7a-6fe9-7160-bd6e-da6196ef0bf8
updated_at: 1790980945
Project: Divyanshi Loan OS (`$TEMP/divyanshi_loan_os`)
Apps Script ID: `1PP7wUFkDAkmgOjgPKeWbZeg3Ajs9N4ZNRPnfih_LMv89KEdSTVPvtipp`

Key references for Script ID:
1. `Code.js` (line 25): Central configuration `DC_CFG.APPS_SCRIPT_ID`, exposed via `template.scriptId = DC_CFG.APPS_SCRIPT_ID` in `doGet`.
2. `.clasp.json`: Project root clasp configuration linking local development to the Google Apps Script project for `clasp push`.
3. `MEMORY_CAPSULE.md`: Local backup and session context documentation.

## 01a0fe78-0bb1-7731-948f-cb31dc877af8
updated_at: 1790975825
On Windows environments where omp is installed:
- Executable path: `C:\Users\<user>\AppData\Local\omp\omp.exe`
- CLI command to update: `omp update`
- The command downloads the updated binary (`omp-windows-x64.exe`), verifies sha256, and replaces the executable in place. Restarting omp is required to apply the update.

## 01a0fe1a-9e9a-7570-b281-b65457588f13
updated_at: 1790973572
When maintaining or running audit/recovery scripts for Bulbhul messaging integrations (Telegram and WhatsApp Cloud API):
- Telegram Webhook Recovery: Do not blindly call `deleteWebhook?drop_pending_updates=true` unless intentionally purging message backlog; re-register the webhook directly with Google Apps Script URL (`setWebhook?url=...`) preserving pending updates where appropriate.
- WhatsApp Cloud API: Update endpoints to Meta Graph API `v26.0` instead of deprecated versions. Ensure WABA webhook application subscription via `POST /v26.0/<WABA_ID>/subscribed_apps` is maintained.
- Outbound Test Ping: Restrict outbound WhatsApp test messages to designated test recipient numbers (e.g., `917838074351`) to avoid unintended dispatches, and note the 24-hour customer care window requirement for session text vs. template messages.
- Apps Script / Clasp: Align Apps Script script property configuration aliases with the deployment script, and ensure any deployment runs via clasp from an authorized domain account.

## 01a0fd06-49a8-74fd-a4ce-49ffe1b1ff63
updated_at: 1790954519
### Apps Script Project Architecture & Cleanup
- **Project / Script ID**: `1PP7wUFkDAkmgOjgPKeWbZeg3Ajs9N4ZNRPnfih_LMv89KEdSTVPvtipp` (Divyanshi Capital Loan OS).
- **Canonical File Set (8 files)**:
  - `appsscript.json`
  - `Code.js` / `Code.gs` (Core engine & routing)
  - `index.html`
  - `dashboard.html`
  - `calling.html`
  - `smart_form.html`
  - `voice.html`
  - `card.html`
- **Resolution of Function Collisions**:
  - Ghost copies like `CodexProxy.js` and redundant function alias blocks (e.g., `MALLIK_MASTER_ULTRA_FAST_STABLIZER`, `STABLIZER`, `GO_LIVE`) were purged.
  - Only canonical stabilizer functions remain in `Code.js`:
    - `DC_MASTER_ONE_CLICK_STABILIZE_AND_FIX_ALL_()`
    - `stabilizer()`
- **Verification Workflow**:
  - Cloned into a fresh directory with `clasp clone <scriptId>` to verify remote Google Apps Script state.
  - Grepped for duplicate function definitions (`grep -i -E "function.*stabili*z" Code.js`) to confirm duplicate alias eradication.

## 01a0fb57-1f8e-74b8-9cbc-110171e08f63
updated_at: 1790933883
Workflow & Decisions:
- Local Agent Auditing: Evaluated codebase using local inspection agents (Architecture scout, Security auditor, Quality reviewer) under policy requiring explicit activation phrases for paid/token agents.
- AI Fallback Chain: Configured fallback progression across providers: DeepSeek → OpenAI → Kimi/Moonshot → Gemini; updated public health endpoint to report degraded status when AI providers fail.
- Messaging & Security Fixes: Bound Telegram replies strictly to originating chat IDs; updated WhatsApp diagnostics to capture non-2xx bodies and attach native message IDs; stripped hardcoded secrets and master-key fallbacks in favor of environment variables.
- Verification: Ran unit suites (`npm test`) and full verification checks (`npm run verify`, 25/25 passed), along with MCP smoke checks (initialize, tools/list, tool invocations) before pushing 9 updated files to Apps Script `@HEAD`.
- Operational Constraints: Live deployment remains pinned at deployment `@1131` until a new deployment version is manually published; inbound webhook signature validation for WhatsApp/Telegram and restriction on anonymous `WARM_CACHE` routes remain open follow-up items.

## 01a0fa92-c3e4-7265-aad9-3c154cd94f06
updated_at: 1790919180
Target project: dc-mahi located at C:\Users\aecr\.gemini\antigravity\scratch\dc_mahi_audit\dc-mahi.
Patched code archive created locally: dc-mahi-v26-patched.zip.
Constraint: Do not initiate remote connections or directly execute file uploads/logins to external servers (e.g., www.divyanshicapital.com); user must manually upload via SFTP/SSH.
Environment note: Windows SSH Agent service is not running on user machine (causes 'os error 2' / 'early eof' when 'SSH Agent' auth method is selected in SSH clients). Authentication must use private key file (e.g., C:\Users\aecr\.ssh\id_ed25519) or password credentials directly.

## 01a0f9ae-fe5b-74f2-b8fb-a495dd3895ed
updated_at: 1790905837
WordPress Agent Skills & Plugin Deployment Workflow:
- Installed WordPress agent skills globally via `npx skills add WordPress/agent-skills --skill wp-plugin-development wp-project-triage wp-rest-api wp-wpcli-and-ops wp-performance wp-playground --global -y`.
- WordPress vs cPanel deployment note: When direct cPanel or server credentials are not accessible or disabled by the hosting provider, patched plugins packaged as `.zip` (e.g., `dc-mahi-v26-patched.zip`) can be deployed directly through the WordPress admin dashboard via Plugins -> Add New -> Upload Plugin -> 'Replace current with uploaded'.

## 01a0f96d-9999-7490-8376-612999c0d470
updated_at: 1790891696
When resetting settings or user data for Navop installed via Scoop:
- Location: User data resides at `%USERPROFILE%\scoop\persist\navop\data`, which is symlinked from `%USERPROFILE%\scoop\apps\navop\current\data`.
- Pitfall: Renaming or deleting `persist\navop\data` without recreating the directory breaks the Scoop junction/symlink at `current\data`, causing Navop to fail on startup.
- Solution: If backing up or wiping data, ensure an empty directory at `%USERPROFILE%\scoop\persist\navop\data` exists before starting `navop.exe` so the application can recreate default configs (`demo_orders.db`, `settings.json`, master key) cleanly.

## 01a0f8f9-a09c-71f2-b731-58751c2e61dc
updated_at: 1790886545
<!-- user-environment-config -->
- **Custom Skills Directory**: Stored in `~/.cursor/skills/` (including `whatsapp`, `wordpress`, `omniroute`). Built-in Codex skills reside in `~/.cursor/skills-cursor/` and should not be manually modified.
- **Navop Setup**: Configured via SQLite DB and `settings.json` to expose internal tools (SFTP, Database, Redis, Mongo, terminal execution) and LLM providers (`Local Ollama`, `OpenAI Codex`, `OpenRouter`). Linked `OMP Agent DB` as a SQLite resource.
- **OMP Configuration**: Configured in `~/.omp/config.yml` and `AGENTS.md` with Advisor, Autolearn, and Prewalk engines active.
- **Toolchain**: Polyglot toolchain installs included Python, Node.js, Go, Ruby, Zig, OpenJDK, LLVM C/C++, Rust, and OmniRoute gateway.

## 01a0f8d9-dd03-7351-bf69-6602232df170
updated_at: 1790882938
When performing general Windows maintenance:
- App updates: Run `winget upgrade --all --accept-package-agreements --accept-source-agreements`.
- Power plan configuration: High Performance scheme can be set using `powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c` and verified with `powercfg /getactivescheme`.
- DISM and SFC scans take significant time and cannot be artificially expedited; when ambiguous requests like 'fix' or 'fast mode' occur after standard repairs (SFC, DISM, Time sync, startup optimization), prompt the user for specific error codes or broken symptoms before executing arbitrary commands.

## 01a0f891-d683-7700-945c-608a44c605ff
updated_at: 1790881416
Targeted Developer Storage Optimization:
- VS Code Extensions: Outdated extension versions inside `~/.vscode/extensions` can accumulate significantly. Grouping by publisher and pruning old versions freed 3.05 GB across 32 outdated extensions.
- LM Studio: Models reside in `~/.lmstudio` (e.g. `gemma-4-E4B-it` consuming ~6 GB).
- Docker: Large usage in `~/.docker` (e.g. 51 GB) may stem from local builder caches, contexts, or legacy build artifacts rather than the virtual disk itself. `C:\Users\<user>\.docker` can be cleaned/removed, and Docker Desktop recreates necessary configs on launch.

## 01a0e27a-9630-7630-ae56-d2994e5f74e8
updated_at: 1790533049
## Model Configuration Updates
- Gemini 3 Pro is deprecated in Antigravity; calls fail with connection drop / model unavailable errors.
- Updated default model configuration to prioritize Gemini 3.1 Pro while demoting/removing Gemini 3 Pro to fallback position.

## Local AI & Service Infrastructure
- Installed and configured local model execution via Ollama (configured with llama3.2 and qwen2.5-coder models).
- Deployed TabbyML using Docker container alternative method when direct installer encountered limitations.
- Note: PowerShell backup scripts copying wildcard paths (`*`) directly to destination directories can cause `Illegal characters in path` ArgumentException; resolve paths with `Get-Item` or `Get-ChildItem` before invoking `Copy-Item`.

## 01a0dfc3-5dc5-75a9-8b45-0ec78f9be5eb
updated_at: 1790467395
When installing Scoop and related packages in a Windows environment where bash is the default shell:
- Scoop installer commands (`irm get.scoop.sh | iex`) and Scoop commands must be executed through `powershell -Command "..."`.
- Scoop installs shims to `C:\Users\<user>\scoop\shims`. Newly spawned subshells in bash might not immediately reflect the updated PATH unless explicitly added or run directly from PowerShell.
- `navop` (v0.19.2) installed from the `extras` bucket (`scoop bucket add extras; scoop install navop`) is a GUI application located at `C:\Users\<user>\scoop\apps\navop\current\navop.exe`.

## 01a0defe-f255-711c-b33a-840233f74fce
updated_at: 1790450490
Configuration file `C:\Users\aecr\.gemini\config\mcp_config.json` contains an active `posthog` MCP server entry configured via `npx -y mcp-remote@latest https://mcp.posthog.com/mcp`. When hardening the environment or removing telemetry, check this config and remove or disable the `posthog` block.

## 01a0dda0-a4d1-7247-8905-a35bc52b360a
updated_at: 1790425095
Claude Desktop MCP Configuration:
- Config Path: `C:\Users\aecr\AppData\Roaming\Claude\claude_desktop_config.json`
- Added Server: `omp-runner`
  - Command: `npx`
  - Arguments: `-y`, `tsx`, `C:/Users/aecr/.agents/skills/mcpServer.ts`
  - Required Environment Variables: `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `API_GATEWAY_SECRET`
- Note: The bash tool on this Windows environment is Unix-like (supports `rm`, but Windows CMD commands like `del` fail with command not found).

## 01a0dd78-e1cc-76f4-aa27-a8978959fe72
updated_at: 1790424682
Docker environment maintenance on Windows:
- Docker executable path: `C:\Program Files\Docker\Docker\resources\bin\docker.exe`
- Cleared unused containers, images, and build cache via `docker system prune` / build cache cleanup, freeing over 8.4GB of disk space before pulling large models.
- Model pull command used: `"C:\Program Files\Docker\Docker\resources\bin\docker.exe" pull ai/nemotron-3.5-lightning`.

## 01a0dd74-d77a-777f-bd28-62b7f3e344e6
updated_at: 1790422075
The `omp` CLI tool was updated from version 18.3.1 to 18.3.2 via `omp update`.
Executable path: `C:\Users\aecr\AppData\Local\omp\omp.exe`.
Note: `omp` must be restarted to use the updated binary.

## 01a0d849-d03c-75bd-b489-6dacebf73949
updated_at: 1790341817
Deployment Verification:
- SARI Supreme v11.2 was deployed via Google Apps Script.
- Verified live deployment status by sending an HTTP GET request to the deployed Web App URL (`AKfycbx9Hn0bQ0pLgmkBA6erQOB1tT-7EkhOyLAA00pgjtTYw6Ck78ksRN3mgiTF6Rpfnc917g`), confirming HTTP 200 response with title `<title>SARI Supreme v11.2</title>`.
- Note: `clasp run` invocations against test functions like `TEST_SARI_BRAINS` may return empty output if API Executable permissions or explicit execution context outputs are not configured.

## 01a0d7cf-93d2-74dc-8f3e-8c66e6b174f1
updated_at: 1790331092
Google Apps Script backend deployment and verification for divyanshi-loan-os:
- Target Script ID: `1PP7wUFkDAkmgOjgPKeWbZeg3Ajs9N4ZNRPnfih_LMv89KEdSTVPvtipp`
- Project location: `C:\Users\aecr\antigravity\divyanshi-loan-os`
- Key project files: `Code.gs`, `appsscript.json`, `index.html` / `dashboard.html`, `smart_form.html`, `calling.html`, `voice.html`
- Deployment pipeline verifies and synchronizes code with the Google Apps Script project.

## 01a0d67f-ff17-7792-83fb-f064a70e4860
updated_at: 1790326700
Google Apps Script Deployment Constraint:
- When deploying or updating an existing web app deployment via clasp/API, cross-domain deployments can fail with HTTP 403: 'Only users in the same domain as the script owner may deploy this script.'
- Pushing code via `clasp push --force` succeeds and syncs the files to HEAD (`Code.gs`, `appsscript.json`, HTML templates).
- To finalize the live deployment when restricted, an account within the script owner's Google Workspace domain must manually redeploy via the Apps Script UI: Deploy -> Manage deployments -> Edit existing web app -> Select latest version -> Deploy.

## 01a0d549-6ba2-7793-a7f3-9039942cfa64
updated_at: 1790286508
Project: SARI Google Apps Script Deployment
- Deployed Version: SARI v11.2 (Deployment @75).
- Multi-Brain Cascade: Configured fallback chain Gemini -> OpenAI -> Grok -> DeepSeek -> OpenRouter -> Custom -> Local Brain; error responses and invalid API keys are caught and rejected instead of treated as valid responses.
- Security & Access Control:
  - Public UI restricted via `handleSariPublic` entry point; mail, WhatsApp triggers, GitHub learning, and reminders require authenticated API.
  - Anonymous private POST requests are blocked (returns UNAUTHORIZED).
  - Meta / WhatsApp Webhook: Requires query parameter `?key=<META_WEBHOOK_KEY>` (falls back to `MALLIK_API_KEY` if `META_WEBHOOK_KEY` is unset).
  - WhatsApp memory isolated per phone number instead of shared global state; public chats blocked from owner private memory.
- Reminders & Maintenance:
  - Automated background self-healing trigger runs every 6 hours.
  - Reminder discovery, trigger execution, email delivery, and state transitions verified.

## 01a0d545-cb8b-74a5-a779-9f8444d549d6
updated_at: 1790284724
Environment constraint:
- In the Windows execution environment, Node.js (`node`) is present (v24.17.0), but `npm` and `clasp` (`@google/clasp`) are missing from PATH.
- Running `clasp login` or `clasp clone <scriptId>` directly or via `npx` fails due to `npm: command not found` and `clasp: command not found`.

## 01a0c594-7704-7298-bf96-eed626e5c744
updated_at: 1790029209
Configuration for bulbhul MCP server was created in `C:/workspace/divyanshi-secure-backend/.cursor/mcp-settings.json`.
Key parameters involved:
- Execution script endpoint: Google Apps Script Web App (`https://script.google.com/macros/s/AKfycbwzdhZF3cVTT01atwZOSnXq7kBvx6k9NgFCbSvfAIXldCjBnMUqxKIBlLUPTiA7V8tc/exec` via `BULBHUL_EXEC_URL`).
- Integration involves connecting or managing the Google Apps Script project using `@google/clasp`.

## 01a0c486-8084-7510-ab37-171145f20e61
updated_at: 1790004122
When installing or inspecting diegosouzapw/OmniRoute, initial execution failed with HTTP 400 on groq/meta-llama/llama-prompt-guard-2-22m due to lack of tool calling support. Execution automatically recovered by falling back to openai-codex/gpt-5.6-sol, which fetched repo metadata and queued background task bg_3 for installation.

## 01a0c43f-5238-708a-a460-cd009934dd0b
updated_at: 1790003524
Google Apps Script projects hit a hard ceiling of 200 versions (`Cannot create more versions: Script has reached the limit of 200 versions. To create more, delete a version from the project history page.`), preventing `clasp version` from creating new versions until older ones are removed via the project history UI.

Bulbhul configuration conventions in `divyanshi-loan-os`:
- `BULBHUL_SYSTEM_PROMPT`: Authoritative system prompt loaded via `MIGRATE` from `BULBHUL_SYSTEM_PROMPT.md`.
- `BULBHUL_AS_BANKER`: AI Personal Banker guide loaded via `MIGRATE`.
- `BULBHUL_EMPLOYEES_DB`: Optional JSON supplement; `ALL_EMPLOYEES` remains the authoritative database.

## 01a0c2dc-69ca-76c1-b878-07362d7665ba
updated_at: 1789979425
When troubleshooting model invocation errors in Oh My Pi (omp):
- OpenRouter error '404 No allowed providers are available for the selected model' occurs when the account's allowed-providers setting excludes the backends hosting that model (e.g., deepinfra, siliconflow, gmicloud were needed for deepseek/deepseek-chat-v3-0324, but only ai21, groq, nvidia, openai, etc. were allowed). Fix via OpenRouter privacy/provider settings.
- On Windows, omp stores configuration and logs under `C:/Users/<user>/.omp/` (including `agent/config.yml` and `logs/omp.*.log`).
- Updating omp executable on Windows works via `omp update` (upgraded binary at `AppData/Local/omp/omp.exe`, requiring restart).
- Tool call pitfall: The `grep` tool strictly requires a `pattern` argument; passing regex in intent `i` without `pattern` fails schema validation.

## 01a0c1d3-9f7f-735f-bc48-1cdac0e6b338
updated_at: 1789962797
Issue:
- Model requests failed due to unsupported tool calling (`groq/compound`) and removed/exhausted free endpoints (`openrouter/openai/gpt-oss-120b:free` returning 404/429 with retry delays exceeding maximum allowed limits).

Resolution in `C:\Users\aecr\.omp\agent\config.yml`:
- Removed non-working free endpoints (`openrouter/openrouter/free` and `gpt-oss-120b`).
- Configured default model: `openai-codex/gpt-5.6-luna`.
- Configured fallback chain: `openai-codex/gpt-5.6-luna` -> `openai-codex/gpt-5.6-sol` -> `openai-codex/gpt-5.6-terra` -> `openai-codex/gpt-6-astra`.
- Mapped roles: fast roles to Luna, balanced/paid roles to Sol, high-reasoning roles to Astra.
- Note: Restart OMP or start a new session for changes to take effect.

## 01a0c1bb-5ecd-7531-a396-5dd198b45cb7
updated_at: 1789957965
Workflow Constraints & Setup: Due to multiple API failures across Kimi (403), Google (429), and OpenRouter (404 restrictions), the system defaults have been switched to Groq. User-level environment variables are configured and verified via PowerShell: AI_PROVIDER=groq, GROQ_MODEL=openai/gpt-oss-20b, and GROQ_API_KEY is active in the environment.

## 01a0c166-b7c9-77b4-95a7-688e768ff226
updated_at: 1789956656
- MCP CLI Dependency: The MCP CLI tool requires typer. If `mcp --version` fails, install via `pip install mcp[cli]`.
- Codex CLI Configuration Pitfall: Codex CLI scripts (specifically the Python wrapper) will fail to initialize if `openaiapirc` is missing in the `src/` directory. The file must follow the format:
[openai]
organization_id=<organization-id>
secret_key=<your secret key>
engine=<engine-id>

## 01a0c151-1314-778e-9705-232747a96caa
updated_at: 1789950992
Added `DC_TEST_DEEPSEEK_AND_SET_DEFAULT_()` to Google Apps Script. It tests the DeepSeek API (using 'deepseek-chat' or `DEEPSEEK_MODEL`) with a minimal 'Reply with exactly OK' prompt.
If it receives HTTP 200, it sets both `PRIMARY_AI_PROVIDER` and `AI_PRIMARY_PROVIDER` to `DEEPSEEK`. On failure, defaults remain unchanged.
API keys and responses are explicitly excluded from logs.
Constraint: Live requests requiring Script Properties cannot be executed by the AI agent remotely because they require an authenticated Apps Script user session. The function must be executed manually once in the Apps Script editor by the user.

## 01a0c097-8aa6-77bb-a335-1e48e3b292d0
updated_at: 1789942583
When executing user commands containing PowerShell environment variables (like $env:USERPROFILE) via the `bash` tool on Windows, standard sh/cmd commands will fail to expand them (e.g., 'mkdir: The directory name is invalid'). Instead, explicitly use `powershell -Command` to execute these commands (e.g., `powershell -Command "New-Item -ItemType Directory -Force $env:USERPROFILE\directory"`). Context: Project utilizes a Dockerized WordPress setup with containers named `{project}-wp-1` and `{project}-db-1`.

## 01a0bee1-c159-759e-b882-35f9328dccac
updated_at: 1789910577
The Google Apps Script MCP server is configured in the environment. Script ID '1PP7wUFkDAkmgOjgPKeWbZeg3Ajs9N4ZNRPnfih_LMv89KEdSTVPvtipp' is registered. To execute functions like 'DC_CONNECT_TELEGRAM_WEBHOOK', valid Google OAuth 2.0 credentials (GOOGLE_APP_SCRIPT_API_CLIENT_ID / CLIENT_SECRET) are required to access the Apps Script API (scripts.googleapis.com). Common MCP configuration paths evaluated include Claude Desktop appdata and cursor/cline mcp.json files.

## 01a0bea2-ad21-750c-9c15-18edf9c0eb8d
updated_at: 1789908833
When performing batch global npm package updates (e.g., updating multiple @modelcontextprotocol servers), standard synchronous `eval` execution via `Bun.$` is likely to fail with a 30-second timeout. To resolve this, run update commands via terminal processes or configure longer timeouts in the eval wrapper.

## 01a0b975-0f81-7298-8397-cb7fdb9c6922
updated_at: 1789844803
- Universal database located at `C:\Users\aecr\bulbhul_universal_db.json`.
- Spreadsheet tabs tracked in universal DB include `MY_CASES` and `SALES_ACTIVITY`.
- MCP configuration files are present at `C:\Users\aecr\.cursor\mcp.json` and `C:\Users\aecr\AppData\Roaming\Claude\claude_desktop_config.json`.

## 01a0b8c1-f4cd-7764-83c2-1fb77444475b
updated_at: 1789811289
- Project Workspace: Local GAS development environment established at 'C:/Users/aecr/gas-project' on the 'main' branch.
- CI/CD Workflow: Configured GitHub Actions ('.github/workflows/deploy.yml') for zero-touch 'clasp push' deployments on commits to 'main'.
- Architecture (Multi-Agent Suite):
  1. Bulbhul: Central AI Personal Banker & underwriting brain (System prompt includes Multi-Loan Option Rule, TAT SLAs, Command Tags).
  2. Bhism: Infrastructure Stabilizer / Auto-Healer (15-min watchdog via 'MASTER_RUNNER_').
  3. Laila: Telephony Intelligence & Voice Desk.
  4. Sari: Smart Loan Intake OS (Google Forms/Web ingestion, 58-column CRM).
- Bug Fix (Ping Storm / Message Loop): Resolved in 'MASTER_RUNNER_' by implementing strict slot-based deduplication and rate-limiting cache keys (e.g., 'RUN_SLOT_...').
- Key Features: Chat-based self-healing enabled via Telegram/WhatsApp commands ('/heal', '/stabilize', '/eod', '/train') to bypass GAS editor dependency. 'Attendance Engine V2' fully integrated using specific backend signatures ('SETUP_ATTENDANCE_V2_', 'MARK_ATTENDANCE_V2_', etc.).

## 01a0b88f-3eca-75f4-9e28-a9880379a699
updated_at: 1789803545
Divyanshi Loan OS ecosystem utilizes a structured multi-agent pipeline:
- explorer_m1: Codebase discovery, architecture mapping.
- worker_m2_m3: Implementation worker (e.g., wrappers like add_bulbhul_wrapper.py).
- auditor_m4 / auditor_m4_re: Compliance and security audit reporting.
- challenger_m4 / challenger_m4_re: Empirical test generation and adversarial challenge reports.
- reviewer_1_m4 / reviewer_2_m4: Code quality review.
- Remediation pipeline: explorer_remediation, worker_remediation, reviewer_1_m4_re.
- sentinel: Runtime monitoring and security guardrails.

Other related agents include Arktech Digital Marketing Manager (campaigns, CRM integration) and Sari Assistant / Mail Command Center (email/communication automation).

## 01a0b60f-0809-7412-8625-a4a28f8554a2
updated_at: 1789767635
Google Apps Script ID: 1PP7wUFkDAkmgOjgPKeWbZeg3Ajs9N4ZNRPnfih_LMv89KEdSTVPvtipp
Version Descriptor: 'Zero-AI Sovereign Engine with JotForm Webhook & Crash-Free Helpers'
Core file: Code.gs
Tooling: Deployment handled via `npx clasp push`.
Pitfall: Running clasp commands as background jobs can hang indefinitely; required manual cancellation of hanging jobs. Avoid backgrounding clasp sync operations.

## 01a0b437-ea03-7705-8686-8c3c3ae1c04a
updated_at: 1789735450
Using the `read` tool for `attachment://N` URIs can fail with '404... ZDR violation (account settings)' due to OpenRouter guardrail restrictions. Workaround: Bypass the `read` tool and use the active model's native vision capabilities (e.g., Gemini) to inspect the image directly from the user's prompt context.

## 01a0b3df-4408-7375-a10d-4a761d2ddcef
updated_at: 1789729928
Agent skills are managed via TypeScript scripts in C:\Users\aecr\.agents\skills\. Discovered key SARI V3 system properties during audit:
1. DB Vault (testDbVault.ts): SARI initialization logs are stored under the tenantId 'CORE_SOVEREIGN' (action: 'SARI_INITIALIZED', system: 'V3').
2. Brain Dispatch (testBrainDispatch.ts): SARI V3 router rules enforce 'V3_STRICT_ISOLATION', which successfully passes standard integrity checks using the 'fast' model target.

## 01a0b2b6-82e9-73be-b4d0-f901bd67e514
updated_at: 1789705074
Constraint: Google Apps Script limits scripts to a maximum of 20 versioned deployments at a time. Attempting `clasp deploy` beyond this limit returns 'Scripts may only have up to 20 versioned deployments at a time'.
Workflow: If hitting the 20-deployment limit, `clasp push` still successfully updates the remote codebase. To create new versioned deployments, older deployments must be pruned first.
Environment note: `omp` v18.2.5 is present; `omp -c` exits with code 129 without proper arguments.

## 01a0b233-11d4-71be-b7b1-dc879d6df509
updated_at: 1789701860
1. UI/Formatting caching: Use CacheService.getScriptCache() to store formatting state (e.g., 1hr TTL) to bypass expensive and redundant setBackground/setFontColor calls.
2. Error reporting rate-limiting: Use ScriptCache with composite keys (function name + error code) to dedup external API alerts (like Telegram) and prevent spam.
3. Data caching with size limits: Cache frequently accessed maps/dictionaries in ScriptCache to bypass sheet reads. Enforce a stringified JSON size check (<90KB) before calling put() to stay within GAS cache limits (100KB).
4. Bounded Sheet Reads: Replace getDataRange().getValues() with bounded reads for append-only logs by fetching headers + last N rows: sh.getRange(Math.max(2, lastRow - 99), 1, Math.min(lastRow - 1, 100), lastCol).
5. Trigger Cascade Prevention: Implement short-TTL (30s) locks in onEdit triggers using ScriptCache keyed by e.range.getSheet().getName() + e.range.getRow() + e.range.getColumn() to prevent infinite recursive trigger loops.

## 01a0b127-28e7-72d1-b541-486478cd2866
updated_at: 1789685549
- AI Model Upgrade: Replaced 'gemini-1.5-flash' with 'gemini-2.0-flash' in Code.gs.
- WhatsApp Auth Fix: 'WA_IS_AUTHORIZED_' now dynamically verifies incoming numbers against 'WA_ALLOWED_NUMBERS' (configured in DC_CFG.PROPS), specifically matching the last 10 digits, rather than defaulting to false.
- Deployment Audit Workflow: Run 'node scripts/audit-live-deployment.js' to test live Google Apps Script web app endpoint, verifying OAuth via clasp, active deployment version, file parity, and HTTP 200 application markup.

## 01a0b0ab-b4fb-74ea-9532-dfbf61fb1865
updated_at: 1789676591
- Project: Divyanshi Loan OS (Google Apps Script).
- Deployment: Managed locally via Node.js script (`node scripts/deploy-to-apps-script.js`) relying on `~/.clasprc.json` for Clasp authentication.
- Script ID: `1PP7wUFkDAkmgOjgPKeWbZeg3Ajs9N4ZNRPnfih_LMv89KEdSTVPvtipp`
- Architecture Features: Multi-brain AI fallbacks (DeepSeek, OpenAI, Gemini), 5-Layer Autonomous Self-Healing Engine for Spreadsheets (`DC_SELF_HEAL_ALL_`), Notion & NotebookLM grounding connectors, Voice command/FreePBX integration, and a comprehensive MockSheet local testing harness covering SpreadsheetApp, CacheService, PropertiesService, and LockService.

## 01a0b022-f037-715d-869d-5f4a5d53a323
updated_at: 1789670314
Project: divyanshi-loan-os (Google Apps Script deployment).
Issue: 'Run Master 5-Layer Self-Heal' menu item prompted/cancelled unexpectedly due to unhandled network errors or missing authorization scopes.
Resolution: Updated `DC_SELF_HEAL_ALL_()` and `P1_ENSURE_HEADERS_()` to strictly preserve existing table headers and data cells without destructive recreation.
Authentication: Integrated `MALLIK_API_KEY` to handle secure script ID binding and auth validation during self-healing routines.
Deployment Workflow: Uses local `node test/run_tests.js` for execution of 160+ E2E/Apps Script mock tests. Deploys using `node scripts/deploy-to-apps-script.js` reliant on `~/.clasprc.json` for Clasp authentication.

## 01a0afdc-46a5-70f1-866a-415315306c54
updated_at: 1789660513
Project Context: DivyanshiCapital/SariSystem/AppsScript.
- Uses `clasp push` to deploy Apps Script files.
- Developed `BULBHUL_DYNAMIC_MIND_FORMATTER.js` containing `BULBHUL_FORMAT_SMART_MESSAGE` to generate HTML email and Telegram notification templates for the Bulbhul AI Assistant / CRM system.
- The formatter handles lead assignment alerts, multi-bank routing info, AI advice inclusion, and returns an object with `subject`, `htmlBody`, `plainBody`, and `telegramText`.
- `omp` CLI is present in the environment as an AI assistant runner (v18.1.21), with flags like `--model`, `--smol`, `--plan`, but was not strictly needed to push changes via clasp.

## 01a0af64-4f26-7496-be1d-eb7152e7d4da
updated_at: 1789650244
- The `omp` CLI is globally installed on Windows at `C:\Users\aecr\AppData\Local\omp\omp.exe`.
- It supports self-updating natively via the `omp update` command.
- Note: Executing `omp update` downloads a new binary (e.g., `omp-windows-x64.exe`) and may be automatically backgrounded by bash during the download.

## 01a0a11a-961d-7699-8e3b-e68b249e8961
updated_at: 1789409383
- Project: sari-assistant.
- Build Workflow: Vite (v6.4.3), verified via `npm run build`.
- Supabase Schema ('leads' table): Known fields include `client_name`, `contact`, `loan_type`, `status` (e.g., 'AUDITED_BY_LAILA'), `dispatched_by` (e.g., 'BULBUL'), and `created_at`.
- Pitfall: Ad-hoc Node scripts testing Supabase connectivity require explicit `.env` loading; running them bare in bash fails due to missing `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` environment variables.

## 01a0a0db-740d-77ba-857a-2bcc4954a920
updated_at: 1789406436
Project: sari-assistant.
Sub-agents: LAILA (Zero-Trust Audit), BULBUL (Autonomous Dispatch).
Infrastructure: Vercel SPA configured via `vercel.json` (rewrites `/(.*)` to `/index.html`); Dockerized via Nginx for static serving.
Telemetry & Integrations: Model Context Protocol configured via `.mcp.json`. Kepler Energy Telemetry configured via docker-compose on port 9103 with system debug and powercap volume mounts.
Key Scripts/Features: `sari-voice.ps1` for PowerShell voice bridge/TTS. Uses `Mallik_API_KEY` for multi-model fallback stack (Llama 3.3, Gemini 2.5 Flash, Kimi, DeepSeek-R1).
UI/UX: Required replacing mock data (e.g., 'Priya Patel') with system roles (e.g., 'System Auditor (LAILA)').

## 01a09f90-cd9b-7754-b040-20bcc8164ac3
updated_at: 1789397357
- Project: SARI Sovereign AI Assistant (sari-assistant)
- Stack: Vite SPA, Vercel CLI (`npx vercel --prod --yes`), Supabase Vault.
- Production URL: https://sari-assistant.vercel.app
- Core Architecture:
  - Sovereign Agent Hierarchy: SARI, LAILA, BULBUL, VOICE_FLEET.
  - 3-Tier Hybrid AI Runtime: Ollama Local + Gemini Cloud + Fallback.
- Key Features: Web Speech API STT/TTS for hands-free voice commands, Autonomous Lead Ingestion, Telegram/WhatsApp Alert Routing.
- Configuration: SPA routing requires rewrites configured in `vercel.json`.

## 01a09f84-8f0f-739c-8c92-150406ef9684
updated_at: 1789383431
- Command `omp update` successfully updates the omp binary.
- The current session must be manually restarted to use the new version.
- Pitfall: Users typing 'exit' in the chat interface will not close the session. Instruct users to use terminal controls (e.g., `Ctrl+D`) and relaunch with `omp -c` to resume.

## 01a089d0-d798-73b7-b077-94c0dd344829
updated_at: 1789019665
- **Remotion Rendering Workflow (divyanshi-capital-cloud-hub-v5)**: Use the project's `npm run remotion:render` script to generate animations. Rendered outputs are saved to `public/videos/` as MP4 files (e.g., `HeroAnimation.mp4`, `FeatureGrid.mp4`, `FooterWave.mp4`).
- **Tooling Pitfall (`grep`)**: Running broad `grep` searches from the project root or system root will time out after 30 seconds. Always scope paths explicitly or use `glob` first to identify target directories before grepping.

## 01a08094-9092-727b-997a-a45dc57ffc69
updated_at: 1788866695
- Project context: divyanshi-loan-os (Google Apps Script codebase using Code.gs).
- Identified Issue: Direct LLM API calls in UrlFetchApp hitting rate/usage limits.
- Proxy Tool: OmniRoute (specifically the diegosouzapw/OmniRoute open-source gateway). Note: user previously searched for it under 'uraghav003/omni-route' which does not exist.
- Integration path: Redirect UrlFetchApp endpoints in Code.gs from direct Anthropic/OpenAI URLs to the deployed OmniRoute gateway.
- User aborted integration in this session; retain context for future rate limit discussions.
