# Security model

## Authentication

- **One login, one session.** `POST /api/login` verifies email + password and issues an
  `HttpOnly; Secure; SameSite=Strict` cookie (`sari_session`), valid for 8 hours.
- **No credentials in the client.** The browser never receives the token, the password
  hash, or the signing secret. `GET /api/session` is the only source of truth for
  whether the session is valid.
- **Fail closed.** If `SARI_SESSION_SECRET` or a password credential is missing, every
  protected endpoint returns `503` rather than falling back to a default.
- **Rate limited.** Login: 5 attempts / 10 min / IP. Chat: 30 requests / min / IP.
  Lead actions: 20 / min / IP.

## Authorization

Every protected route calls `requireSession()` before doing work:

| Route | Auth | Notes |
|---|---|---|
| `POST /api/login` | public | rate limited, same-origin |
| `GET /api/session` | public | returns only `{ ok, configured }` |
| `POST /api/logout` | public | clears the cookie |
| `POST /api/chat` | session | Gemini → signed Apps Script → explicit 503 |
| `POST /api/autopilot` | session | signs memory sync requests |
| `POST /api/leads` | session | Telegram / Supabase probes, server-held keys |

`isSameOrigin()` rejects state-changing requests whose `Origin` does not match the
serving host. There is no `Access-Control-Allow-Origin: *` anywhere.

## Secrets

Nothing secret is stored in the repository, and nothing secret is stored in
`localStorage`:

- Provider keys, bot tokens, Supabase keys and the Apps Script shared secret live in
  deployment environment variables (see [.env.example](.env.example)).
- The Apps Script backend requires an HMAC over `<action>.<timestamp>` with a 5-minute
  window. Unsigned or stale requests get `UNAUTHORIZED`.
- `sari-plugins.json` is gitignored; `sari-plugins.example.json` is the template.

## Rotation checklist

Run this once after deploying the hardened build. Anything that was ever in the
repository must be treated as public.

1. **Session secret** — `openssl rand -hex 32` → set `SARI_SESSION_SECRET` in Vercel.
   Every existing session is invalidated by the change.
2. **Login password** — choose a new password, generate a scrypt hash
   (`SECURITY.md` → `.env.example`), set `SARI_PASSWORD_HASH`, delete any
   `SARI_PASSWORD` variable.
3. **Apps Script shared secret** — `openssl rand -hex 32` → set `SARI_SHARED_SECRET`
   both in Vercel and in Apps Script → Script Properties.
4. **Apps Script deployment** — deploy a new version, then *archive the old
   deployment* so the previous URL stops working.
5. **Gemini key** — issue a new key in AI Studio if the old one was ever pasted into
   the UI or a JSON bundle; delete the old one.
6. **Telegram bot token** — `/revoke` with @BotFather, then re-set
   `SARI_TELEGRAM_BOT_TOKEN`.
7. **Supabase key** — rotate the service-role key if it was ever entered in the Leads
   page; check the Supabase logs for unexpected use.
8. **Notion token** — revoke the integration token if it was passed to
   `sari-master.ps1 -Token` (that token was written to a tracked file before this fix).
9. **Git history** — the retired strings (`MALLIK_V3_786`, the old HMAC secret) remain
   in history. They are now useless once rotated; do not rewrite history on a shared
   remote without coordinating.

## Alerts and notifications

Telegram is **optional**. The dispatch path works with no bot token:

- `POST /api/leads` with `action: "dispatch"` returns `{ ok: true, delivered: false,
  channel: "in_app" }` when Telegram is unconfigured, and the client records the alert
  in the local `Alerts` feed.
- The feed is per-device (`localStorage`, capped at 100 entries). It is not a server
  record; enable Telegram or a server-side store if alerts must survive device loss.
- The app is an installable PWA (`/manifest.webmanifest` + `sw.js`). The service worker
  caches only the static shell — never `/api/*`, which is explicitly excluded.

## Residual risks

- `appsscript.json` keeps `ANYONE_ANONYMOUS` because the Vercel server (not the Google
  account) must reach it. The control is the HMAC gate, not the deployment visibility.
  The stronger setting is `access: "MYSELF"` — do that once you retire the cloud bridge
  and rely on Gemini + Ollama only.
- Rate limiting is per serverless instance and in-memory. Add Vercel WAF / Upstash for
  global enforcement.
- The Audit page is a **local browser log**, not a tamper-evident trail. Compliance
  evidence must come from Vercel logs or a server-side store.
- `sari-master.ps1` and `audit-integrity.ps1` are operator tools. `audit-integrity.ps1`
  is read-only unless you pass `-AllowPush`.

## Reporting

Owner: MD. For anything user-data related, treat it as an incident: rotate, then
review Vercel + Apps Script execution logs.
