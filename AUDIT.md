# SARI Assistant — Pre-Fix Audit

**Repo:** `uraghav003/sari-assistant` (private) · `main` @ `156b0bc`
**Audited:** 2026-10-25 · full history (73 commits), working tree, live config
**Scope:** architecture, auth, secrets, data flow, runtime correctness, CI/CD, Docker
**Method:** static review of all 58 tracked files + `tsc --noEmit` + secret-pattern scan across every commit

---

## 1. Verdict

The product surface is coherent and the UI is genuinely good. The **security model is not implemented** — it is described in the UI and the docs, but the code does not enforce it.

Three findings are independently sufficient for full compromise:

1. `/api/chat` has **no authorization check at all** (the check is computed and thrown away).
2. The Google Apps Script backend is **`ANYONE_ANONYMOUS` + `executeAs: USER_DEPLOYING`** with no auth in `doPost` — anonymous internet callers execute as the owner, overwrite the memory vault, and burn the Gemini key.
3. The login **session-signing secret and four fallback passwords are committed to the repo**, so a valid 8-hour token can be minted offline by anyone who can read the source.

Plus one operational landmine: `audit-integrity.ps1` will `git add -A`, commit and push an **unrelated repository** without review.

| Area | Grade | One-line reason |
|---|---|---|
| UI / product design | B+ | Polished, consistent; some fabricated status claims |
| Frontend code quality | B− | Clean TS style, good error narrowing; dead code + 1 type error |
| API auth | **F** | Authorization computed then never enforced; forgeable tokens |
| Secrets handling | **F** | Password, HMAC secret, service-role key pattern in repo/localStorage |
| Backend (Apps Script) | **F** | World-writable, world-readable, privileged execution |
| Data privacy | **D** | Prompts + PII flow to `text.pollinations.ai` unannounced |
| CI/CD & infra | D | CI does not typecheck/test; Docker runs root; privileged sidecar |
| Docs vs reality | **F** | "No hardcoded secrets", "cryptographic audit trail", "Zero-Trust" are all false |

**Do not treat this repo as production-safe until §9 items 1–6 are done.**

---

## 2. What the system actually is

```
Browser (React 19 / Vite / Vercel)
  ├── localStorage: session token, Gemini key, Notion token,
  │                 Supabase service-role key, Telegram bot token, audit log
  ├── POST /api/login ──► HMAC(expiry) token, 8 h
  ├── POST /api/chat  ──► tier cascade:
  │      1. Gemini (env key)          ← server-side
  │      2. text.pollinations.ai       ← third party, free, no DPA
  │      3. Apps Script ?exec          ← public endpoint
  │      4. hardcoded "heuristic" text ← presented as a real answer
  └── Ollama 127.0.0.1:11434           ← local fallback

Google Apps Script (doGet/doPost, ANYONE_ANONYMOUS, execute-as-owner)
  ├── Script Properties: SARI_MEMORY_VAULT, MALLIK_API_KEY, folder IDs
  ├── ai_infer  → Gemini with the owner's key (or caller-supplied key)
  └── sync_memory → overwrite vault from request body

MCP layer (stdio): mcp-server.cjs → dynamic-mind.cjs → same Apps Script
PowerShell ops: sari-master.ps1, audit-integrity.ps1, sari-voice.ps1
```

There are **four** independent auth boundaries and only the weakest one (the login page) is even attempted.

---

## 3. Critical

### C1 — `/api/chat` enforces nothing
`api/chat.ts:92-96`

```ts
const isAuthorized =
  verifyToken(token) ||
  mallikKey === "[REDACTED]" ||
  Boolean(headers["x-gemini-key"]) ||
  (typeof body.apiKey === "string" && body.apiKey.trim().length > 0);
```

`isAuthorized` is **never referenced again** — no `401` path exists in the file (verified: zero occurrences of `401`/`403`; `isAuthorized` appears once). The endpoint is fully anonymous: anyone can POST `/api/chat` and spend the project's Gemini quota, or use the server as a relay. Even if it *were* enforced, `Boolean(headers["x-gemini-key"])` means "any non-empty header = authorized".

**Fix:** delete the expression; `if (!verifyToken(token)) return res.status(401)...` before any work; delete both key-based branches; per-IP rate limit + daily token budget.

### C2 — Apps Script is a world-writable, owner-privileged backend
`appsscript.json:9-12`, `Code.js:39-141`

```json
"webapp": { "executeAs": "USER_DEPLOYING", "access": "ANYONE_ANONYMOUS" }
```

`doPost` dispatches on `payload.action` with **no token, HMAC, or origin check**, and runs as the deploying account. Anonymous consequences:

| Action | Effect | Line |
|---|---|---|
| `sync_memory` / `autopilot_learn` | overwrite `SARI_MEMORY_VAULT` with attacker JSON | `Code.js:112-115` |
| `get_memory` (GET) | read the entire vault back | `Code.js:25-27` |
| `get_config` (GET) | leak owner email + sync state | `Code.js:28-33` |
| `ai_infer` | free LLM inference on the owner's Gemini key | `Code.js:64-111` |
| `notebooklm_sync` | overwrite `NOTEBOOKLM_FOLDER_ID` | `Code.js:118-121` |

The deployment ID is public in `public/sari-supreme.html:530`, `src/lib/config.ts:20`, `.mcp.json:8`, `mcp-server.cjs:7`, `dynamic-mind.cjs:9` and five docs — so "who knows the URL" is not a control.

**Fix (in this order):** set `"access": "MYSELF"`; add a shared-secret header verified with constant-time compare inside `doPost`/`doGet` (Script Properties); allowlist `action`; remove the `payload.apiKey` fallback at `Code.js:66-68`; delete the GET memory/config debug paths; **redeploy under a new deployment ID** and rotate the old one.

### C3 — Session tokens are forgeable; four passwords are public
`api/_auth.ts:4`, `api/login.ts:5`, `api/chat.ts:4`, `api/login.ts:39`

```ts
const DEFAULT_SESSION_SECRET = "[REDACTED]";
const allowedPasswords = ["[REDACTED]", "sari2026", "divyanshi2026", "admin786"];
```

Token = `${expiry}.HMAC_SHA256(secret, expiry)`. Secret is in the repo, so `node -e` mints a valid token for any future expiry — no login needed. The fallback password list also means the app is **permanently** accessible with known credentials even after `SARI_PASSWORD` is set (the env branch is skipped only when it exists; the fallbacks are the else-branch).

Compounding: the token is in `localStorage` (`src/lib/auth.ts:52`), not an HttpOnly/SameSite cookie, so any XSS or shared-machine user gets an 8-hour session. `authConfigured()` (`_auth.ts:14-18`) is a no-op (`env || DEFAULT` is always truthy) and is imported nowhere.

**Fix:** remove the default secret — fail closed if `SARI_SESSION_SECRET` is unset; delete the password array; hash with `scrypt`/`argon2` + per-user salt, not SHA-256; add `sub`, `iat`, `jti` to the signed payload; move the session to an HttpOnly cookie. **Rotate the current secret.**

### C4 — `audit-integrity.ps1` commits and pushes the wrong repo
`audit-integrity.ps1:7-11`, `:39-44`

```powershell
$canonicalPaths = @("C:\Users\aecr\divyanshi-loan-os", "$HOME\workspace\sari-assistant", ...)
...
git add -A; git commit -m "fix(maintenance): sanitize working tree..."; git push origin main
```

The **first existing path wins**, and `divyanshi-loan-os` is checked *before* the SARI repo. Any dirty tree gets swept into a generic commit and pushed to `origin/main` with no diff review. On the SARI repo this is how `sari-plugins.json` secrets would reach GitHub.

**Fix:** resolve `$PSScriptRoot` only; make commit/push opt-in via `-AllowPush`; abort if `git remote get-url` doesn't match the expected repo.

### C5 — Notion token is written into a git-tracked file
`sari-master.ps1:451-473`, `:284`

`sari-plugins.json` is tracked (`git ls-files` confirms) and not in `.gitignore`. `sari notion -Token <secret>` writes the token into it, and `deploy` runs `git add -A` then `git push`. The usage example at `:9` also puts the token in shell history.

**Fix:** Credential Manager / env only; `git rm --cached sari-plugins.json`; ship `sari-plugins.example.json`; add to `.gitignore`; rotate any token ever passed this way.

---

## 4. High

**H1 — Prompt and business data go to `text.pollinations.ai`.** `api/chat.ts:147-172` POSTs the full system prompt and the user message to a free public router (`model: "openai"`) whenever Gemini fails. For a lender, that is unannounced third-party processing of borrower data — a DPDP Act 2023 problem, not just a hygiene problem. No consent, no redaction, no disclosure in UI. **Remove Tier 2** or gate it behind an explicit admin flag with the same redaction the system prompt claims to apply.

**H2 — Wide-open CORS on credential endpoints.** `vercel.json:29` `Access-Control-Allow-Origin: *` on `/api/(.*)`, duplicated in `login.ts:49` and `chat.ts:48`. Combined with no rate limiting on `/api/login` (`login.ts:86`), any site can drive a login brute force from visitors' browsers, and (with C1) spend the API budget from any origin.

**H3 — Secrets in the browser.** `LeadsPage.tsx:49-60, 89` persist a **Supabase service-role key** (placeholder text literally says "Service Role"), a **Telegram bot token**, and a WhatsApp webhook URL in `localStorage`, then call `api.telegram.org` directly from the browser. Service-role keys bypass RLS — one XSS or one borrowed laptop and the entire database is open. `src/lib/config.ts:87` does the same for the Gemini key and the Notion token.

**Fix:** these calls belong server-side; the browser should hold an opaque handle, never the credential.

**H4 — API keys in URL query strings.** `Code.js:87,96`, `api/chat.ts:117`, `dynamic-mind.cjs:102`. `?key=` lands in Google's access logs, proxy logs, and any error string that echoes the URL. Use `x-goog-api-key`.

**H5 — Memory-vault poisoning → persistent prompt injection.** `dynamic-mind.cjs:52` merges arbitrary remote JSON into `memoryCache`, and `:93` injects it as `DYNAMIC_MIND_CONTEXT` ahead of every prompt. Because of C2, an attacker writes that JSON. Result: durable instructions that survive restarts and precede every answer. **Allowlist keys, sign the payload, and delimit as untrusted data.**

**H6 — MCP tool surface is an unauthenticated proxy.** `mcp-server.cjs:160-175` forwards `{action, ...args.payload}` to the Apps Script URL with no allowlist and returns the raw body. `sari_zero_trust_audit` (`:177-184`) ignores `args.authToken` entirely and always returns `Status: VERIFIED & ISOLATED / Zero-PII Compliance: 100%` — the security tool is theatre, and it will be cited as evidence in an audit.

**H7 — Fabricated operational data presented as fact.** `mcp-server.cjs:123/130/143` returns invented case IDs (`#DC-9021`), a fake sanction letter, and "HDFC Commission credit verified". `dynamic-mind.cjs:164-168` returns canned prose as a successful inference when both tiers fail. `api/chat.ts:204-208` does the same, labelled `SovereignHeuristic`. A user cannot distinguish these from real output. **Return an explicit degraded/error state.**

**H8 — "No hardcoded secrets" is false.** `DashboardPage.tsx:117` claims it while `[REDACTED]` sits in three server files and `public/sari-supreme.html:531`. Combined with C3 this is the exact opposite of the stated posture. Remove the claim or make it true.

---

## 5. Medium

**M1 — Type error ships, CI can't catch it.** `npx tsc --noEmit` → `src/lib/config.ts(106,10): error TS2304: Cannot find name 'next'.` `validateConfig` has a stray `return next;` after an unconditional `return` (`config.ts:101-107`). `npm run build` is `vite build` only — it does not typecheck, so `.github/workflows/webpack.yml` is green with a broken file. **Delete lines 106-107 and add `tsc --noEmit` to CI.**

**M2 — Apps Script logic bugs.** `Code.js:95-98` and `:176-179` retry `gemini-2.0-flash` immediately after the loop already tried and rejected it; when that retry throws, the outer `catch` (`:103`) discards the specific failure and returns generic prose, so a quota error is indistinguishable from a bad key. `Code.js:125-126` echoes the entire request payload back in `result.received` for any unknown action — an open reflection of whatever the caller sent. `Code.js:138` returns `err.toString()` — leaks internals. `Code.js:66-68` trusts a caller-supplied key as a credential.

**M3 — Docker image runs as root, no healthcheck, no `.dockerignore`.** `Dockerfile:8-12`. `COPY . .` (`:5`) pulls `.git`, `.env`, `node_modules` into the build context. `vercel.json` is copied into the web root (`:10`) where it is inert and publicly served — SPA deep links 404 under nginx because its rewrites are never translated. **Add `USER nginx`, `HEALTHCHECK`, `.dockerignore`, and a real nginx `try_files` config.**

**M4 — Privileged telemetry sidecar.** `docker-compose.yml:13-24`: `privileged: true`, `pid: host`, `/sys/kernel/debug`, `/lib/modules`, unpinned `:latest`, published port `9103`. This is a container escape waiting to happen for a dashboard nobody asked for. **Remove it, or drop privileged and use the documented eBPF-only mounts.**

**M5 — Side-effecting scripts run on import with `SERVICE_ROLE_KEY`.** `deploy-hierarchy.js`, `workflow-notifications.js`, `apply-v5-architecture.js` all execute at module load (guarded by `if (true)`) and upsert through the service role. Placeholder fallbacks (`'https://placeholder.supabase.co'`) mean they silently no-op or log raw errors. **Guard with a CLI entry check; throw on missing env.**

**M6 — Notification config is aspirational.** `workflow-notifications.js:11` sets `notification_email: 'arjun@example.com'` and nothing in the file ever sends email or a webhook. The "Daily digest" and "Immediate security alert" exist only as JSON strings. Also imports `@supabase/supabase-js` while `workflow-notifications.js` is not in `package.json`'s dependency set (works transitively).

**M7 — Success is hardcoded.**
- `sari-master.ps1:360-374` — `$syncSuccess` assigned, never read; prints `SYNCHRONIZED` regardless.
- `sari-master.ps1:274` — `dual-audit` always `ALL SYSTEMS READY`, `exit 0`.
- `audit-integrity.ps1:71-81` — probe failure is a warning; verdict hardcoded, exit always 0.
- `SARI-Supreme-AI-Upgrade.ps1:43-45` — "Build Verified (0 errors)" without checking `$LASTEXITCODE`.

Every one of these is a monitoring lie that will outlive the bug it hides.

**M8 — `sari-master.ps1` portability and safety.** `:36` hardcodes `C:\Users\aecr\workspace\sari-assistant`; `:250-260` `Push-Location` without `try/finally` (an exception under `$ErrorActionPreference = "Stop"` strands the shell in another repo); `:419-420` compute snippets that `:421` discards for a hardcoded literal; `$RemainingArgs` (`:27-28`) unused. `sari-voice.ps1:67` `SpeakAsync` returns immediately while the process exits — audio is truncated.

**M9 — Misleading status in the UI.** `public/sari-supreme.html`: `:471` hardcoded `ONLINE`; `:502` "Groq LPU engine connected" (no Groq anywhere); `:477` "22 official bhashaon" vs 10 language options at `:505-514`; `:502` "Private session" while the prompt leaves for a third party. `dynamic-mind.cjs:97` tries `gemini-3.8-flash`, a model that does not exist, on **every** inference before falling through.

**M10 — Test suite encodes the backdoor.** `test-endpoints.ts:96,114-123` asserts all four fallback passwords return `200`. No test covers the actual bypass (anonymous `/api/chat`, anonymous `doPost`) or asserts `401`. The brace nesting at `:89-145` puts TEST 3B/3C inside TEST 3. These tests protect the vulnerability.

**M11 — Audit trail is not an audit trail.** `src/lib/storage.ts` writes up to 100 entries to `localStorage`; `AuditPage.tsx:38` calls it a "Live cryptographic event stream" and offers a "Clear" button. It is client-side, mutable, and wipeable — useless for compliance and actively misrepresenting.

---

## 6. Low / cleanliness

- `vercel.json:3` — `/api/(.*)` → `/api/$1` is a no-op; the catch-all at `:4` masks genuine 404s.
- `vercel.json` — no CSP, no HSTS, no `Permissions-Policy`; `X-XSS-Protection` is deprecated; headers duplicated across `:9-14` and `:36-40`.
- `index.html:5` references `/vite.svg`, which does not exist in `public/`.
- `src/lib/config.ts:96-107` — `validateConfig` always returns `{valid:true}`; validation is a stub.
- `src/lib/supabase.ts` — three different env lookups plus a placeholder project; a misconfigured deploy fails silently at runtime instead of at build.
- `.mcp.json:15` hardcodes `C:\Users\aecr\.gemini\config\plugins\bulbhul-mcp\server.js` — executes a file outside the repo, non-portable.
- `sari-supreme.html:5` `user-scalable=no`; infinite animations (`:92-103`) ignore `prefers-reduced-motion`; `src/index.css` has no `:focus-visible`; `.dot` (`:124`) is an unscoped global.
- `package.json` name is `sari-pages` while the README/UI say SARI v11.2 — version drift across `2.0.0`, `11.2`, `11.3`.
- `.github/workflows/webpack.yml` is named webpack but runs Vite; no `permissions:`, `timeout-minutes`, `concurrency`; actions pinned to mutable tags.

---

## 7. What is actually good

Worth preserving during remediation:

- **No live provider key is committed.** Pattern scan across all 73 commits for `AIza…`, `ghp_…`, `sk-…`, `xoxb-…`, private keys and `service_account` returned **zero** hits. The leak is credentials-as-config (password, HMAC secret) and identifiers, not API keys — fixing that is tractable without a full key-rotation sweep.
- **Consistent error narrowing.** `unknown` → `instanceof Error` → message is used correctly throughout `src/lib` and `api/*`; no `catch (e: any)` in the API layer.
- **Robust per-request parsing in the API.** `api/chat.ts:63-75` and `login.ts:64-76` handle object, string, and unparseable bodies without throwing.
- **Constant-time comparison is used correctly** for the comparisons that exist (`safeEqual`, length check before `timingSafeEqual`).
- **Generic login error message** (`login.ts:91-92`) — no user enumeration.
- **Tiered failover is a genuinely good idea**, badly bounded. The architecture (cloud → local → explicit degraded state) is right; the "silent fabrication" and the third-party hop are what need removing.
- **UI craft.** The canvas avatar, layout system, and dark theme are cohesive and better than most internal dashboards.
- No `Invoke-Expression`, `iex`, `Remove-Item`, `Start-Process`, `eval`, or `Function()` anywhere. Remote input in the PowerShell reaches only `ConvertTo-Json` and `Write-Host` — **no command-injection sink found.**

---

## 8. Threat model in one paragraph

An unauthenticated attacker who reads this public-to-the-internet source (or simply guesses `md@divyanshicapital.com` + `admin786`) gets: a session token they can also mint offline; an owner-privileged Apps Script endpoint they can write to; a memory vault they can poison so their instructions precede every future prompt; a Gemini bill; and read access to any Supabase service-role key or Telegram bot token that a logged-in user typed into the Leads page on a shared machine. None of these require the password, and two of them require no request to this app at all.

---

## 9. Remediation plan

**Now (before the next deploy) — 1 session**
1. Rotate: `[REDACTED]` (and the other three fallbacks), `SARI_SESSION_SECRET`, the Apps Script deployment (redeploy under a new ID, revoke old), any Notion token ever passed to `sari-master.ps1`, any Telegram bot token typed into the UI.
2. `api/chat.ts` — delete `isAuthorized` and all key branches; hard `401` without a valid token; own-origin CORS.
3. `appsscript.json` → `"access": "MYSELF"`; add the shared-secret header check in `doPost`/`doGet`; action allowlist; drop `payload.apiKey`.
4. `_auth.ts`/`login.ts` — remove `DEFAULT_SESSION_SECRET` and `allowedPasswords`; fail closed with no env.
5. `audit-integrity.ps1` — `$PSScriptRoot` + `-AllowPush`.
6. `git rm --cached sari-plugins.json`; `.gitignore` it; ship an example file.

**This week**
7. Remove the Pollinations tier (or make it explicit opt-in + redacted).
8. Move Supabase/Telegram/Notion/Gemini credentials server-side; stop writing them to `localStorage`.
9. CSP + HSTS + `Permissions-Policy`; remove the no-op rewrite; delete duplicated headers.
10. Fix `config.ts:106`, add `tsc --noEmit` + `npm run test:api` + `npm audit` to CI; delete the password assertions in `test-endpoints.ts`; add negative auth tests.
11. Replace fabricated MCP/heuristic outputs with explicit `isError` / `degraded` responses; delete or implement `sari_zero_trust_audit`.
12. Make every PowerShell verdict depend on its actual result; `exit 1` on failure.

**Next**
13. Dockerfile: non-root, healthcheck, `.dockerignore`, real nginx SPA config; remove or de-privilege the Kepler sidecar.
14. Persist the audit log server-side (or drop the "cryptographic" claim); add rate limiting and login lockout.
15. Fix the UI truthfulness pass (`ONLINE`, "Groq", language count, "Private session").
16. Add `prefers-reduced-motion`, `:focus-visible`, and re-enable pinch zoom.

---

## 10. How to verify the fixes

```powershell
# Auth must now fail closed
curl -s -o NUL -w "%{http_code}`n" -X POST https://<host>/api/chat -H "Content-Type: application/json" -d '{\"prompt\":\"hi\"}'
# expected: 401 (currently: 200)

# The committed secret must no longer mint a token
# (this must now fail)
node -e "const c=require('crypto');console.log((Date.now()+3600e3)+'.'+c.createHmac('sha256','[REDACTED]').update(String(Date.now()+3600e3)).digest('hex'))"

# Anonymous backend write must fail
curl -s -X POST "https://script.google.com/macros/s/<NEW_ID>/exec" -d '{"action":"get_memory"}'
# expected: unauthorized / no memory payload

npx tsc --noEmit   # expected: 0 errors
git grep -nE "[REDACTED]|sari_sovereign_secure_hmac_secret|divyanshi2026|admin786"   # expected: nothing
```

---

*Static audit only. The live deployment (`sari-supreme-command.vercel.app`) was not reachable from this environment (TLS blocked), so C1/C2 were proven by code path, not by request. The proofs are unconditional: `isAuthorized` is unused, and `doPost` has no guard.*

---

# Remediation status — 2026-10-25

All Critical and High findings below were fixed in the working tree. Verified with
`npx tsc --noEmit` (0 errors), `npm run test:api` (24 assertions), `npm run build`
(success), `node --check` on the Apps Script and MCP entry points, and a
credential-pattern scan over the tracked tree.

| ID | Finding | Status | Where |
|---|---|---|---|
| C1 | `/api/chat` enforced nothing | **Fixed** | `api/chat.ts` — `requireSession()` + 401, no key branches |
| C2 | Apps Script world-writable | **Fixed** | `Code.js` — HMAC over `<action>.<ts>`, 5-min window, action allowlist, no caller key |
| C3 | Forgeable tokens + fallback passwords | **Fixed** | `api/_security.ts` — no defaults, fail closed; cookie-based sessions |
| C4 | Audit script pushes the wrong repo | **Fixed** | `audit-integrity.ps1` — `$PSScriptRoot`, `-AllowPush`, real exit codes |
| C5 | Notion token written to a tracked file | **Fixed** | `sari-master.ps1` — env only; file untracked + gitignored |
| H1 | Pollinations exfiltration | **Fixed** | Tier removed from `api/chat.ts` |
| H2 | Wildcard CORS, no login limit | **Fixed** | `vercel.json` headers removed; same-origin guard; rate limits |
| H3 | Secrets in the browser | **Fixed** | `api/leads.ts`; Leads/Connections pages hold no credentials |
| H4 | Keys in query strings | **Fixed** | `x-goog-api-key` in `api/chat.ts`, `Code.js`, `dynamic-mind.cjs` |
| H5 | Memory-vault poisoning | **Fixed** | `Code.js` sanitises and caps the vault; `dynamic-mind.cjs` allowlists keys |
| H6 | MCP proxy + fake zero-trust tool | **Fixed** | `mcp-server.cjs` — signed allowlist bridge, real `sari_verify_token` |
| H7 | Fabricated answers/data | **Fixed** | Explicit 503 / `isError` / "no data source" paths |
| H8 | "No hardcoded secrets" claim | **Fixed** | Dashboard copy now matches reality |
| M1 | TS error, CI didn't typecheck | **Fixed** | `config.ts`, `ci.yml` runs `tsc`, tests, build, audit |
| M2 | Apps Script logic bugs | **Fixed** | Single-pass model cascade, no payload echo, no `err.toString()` |
| M3 | Docker root / no healthcheck | **Fixed** | Non-root nginx, healthcheck, `.dockerignore`, `nginx.conf` |
| M4 | Privileged telemetry sidecar | **Fixed** | Removed from `docker-compose.yml` |
| M5 | Import-time service-role scripts | **Fixed** | Direct-invocation guards, fail on missing env |
| M6 | Fake notification config | **Fixed** | `SARI_ALERT_EMAIL`, no false delivery claims |
| M7 | Hardcoded success verdicts | **Fixed** | `sari-master.ps1`, `audit-integrity.ps1` exit on real results |
| M8 | Script portability | **Fixed** | Paths from `$PSScriptRoot` / env, `try/finally`, blocking TTS |
| M9 | Misleading UI claims | **Fixed** | `sari-supreme.html`, Dashboard, Audit page |
| M10 | Tests encoded the backdoor | **Fixed** | Rewritten suite asserts rejection of all four retired passwords |
| M11 | Fake "cryptographic" audit trail | **Fixed** | Page relabelled as a local log |
| Lows | No-op rewrite, dead favicon, CSP/HSTS, a11y | **Fixed** | `vercel.json`, `index.html`, `index.css`, static page |

## Still requires human action

1. **Rotate secrets** — follow `SECURITY.md` → Rotation checklist. The old values are
   still in git history; they are only harmless once rotated.
2. **Configure the deployment** — set the variables in `.env.example` in Vercel and in
   Apps Script Script Properties (`SARI_SHARED_SECRET` must match). Until then the app
   fails closed with 503 by design. Note: a model key in Script Properties is **not**
   the bridge secret.
3. **Apps Script** — a dedicated project
   (`15rN7xFT8jSqTNs1Pu-M9h4E4eD5DXaQdtkLm6Z1p-CvLH52TIWKshhI3`) now holds v4.0.0 and
   is deployed as
   `AKfycbw_DlODYECpdfJKag01Jz5QlmoH2Fdj6kFElfKCOTiZfv8aFeYBLorki_4qlSC5tCr3` (v1).
   Two owner actions remain: authorize the script once (Run → Allow) and add
   `SARI_SHARED_SECRET` + `MALLIK_API_KEY` in Script Properties. The old deployment ID
   in earlier revisions belonged to the Bulbhul Operating System, not to SARI.

4. ~~Commit and push~~ — done in `d8aed4a`. Device-side cleanup of credentials left by
   older builds is automatic (`src/lib/privacy.ts`); server-side values still need
   rotating.
