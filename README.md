# SARI Supreme Command

Frontend: SARI · Brain: Gemini + signed Apps Script bridge + local Ollama
Workers: BULBHUL | LAILA

## Live
https://sari-supreme-command.vercel.app

Git-linked: this repo → Vercel project `sari-supreme-command`.

## Chain
HI/MD → Mallik → SARI → workers

## Security
Read [SECURITY.md](SECURITY.md) before deploying. Short version:

- Login issues an HttpOnly session cookie; no tokens in `localStorage`.
- Every `/api` route except login/session/logout requires a session.
- The Apps Script backend only accepts HMAC-signed requests.
- No provider keys, bot tokens or passwords live in this repository.
- `npm run typecheck` and `npm run test:api` gate the build in CI.

## Local development

```bash
npm ci
cp .env.example .env.local   # then fill in the values (never commit it)
npm run dev                  # SPA only; run `vercel dev` to exercise /api routes
npm run typecheck
npm run test:api
npm run build
```

Generate the required secrets with:

```powershell
pwsh ./scripts/rotate-secrets.ps1 -Email md@divyanshicapital.com
```

It writes `.env.production.local` (gitignored) and prints the exact Vercel and
Apps Script steps, including the generated login password. Backend configuration
and probe commands: [docs/apps-script-setup.md](docs/apps-script-setup.md).

## Mobile

The app installs as a standalone PWA: open the site on a phone and choose
"Add to Home Screen". On small screens the sidebar becomes a bottom navigation bar,
and the Alerts tab carries an unread badge.

Lead and system alerts land in the **Alerts** feed with no configuration.
Telegram delivery is optional — add `SARI_TELEGRAM_BOT_TOKEN` and
`SARI_TELEGRAM_CHAT_ID` when a token is available; nothing else changes.

## Configuration
Routing identifiers (Script ID, Deployment ID, Drive folder) can be set in the
Connections page or imported from a JSON bundle. Secrets are environment variables
only — see [.env.example](.env.example).

Do not commit `sari-plugins.json`, `.env*`, `SARI_CONFIG.json`, or memory exports.
