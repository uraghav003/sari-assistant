# SARI Supreme Command

Frontend: SARI · Brain: Gemini + signed Apps Script bridge + local Ollama
Workers: BULBHUL | LAILA

## Live
https://sari-assistant.vercel.app

Git-linked: this repo → Vercel project `sari-assistant` (the one in daily use).

## Project topology

One repository → **one** Vercel project: `sari-assistant`.

A second project, `sari-supreme-command`, deploys the same repo on every push and
is redundant; delete it (or disconnect its Git integration) so there is no
ambiguity about production. `scripts/merge-vercel.ps1` performs that merge with
an API token, including a 308 redirect from the retired domain.

One local checkout as well. A second clone under `C:\Users\aecr\workspace` was
retired to `sari-assistant.DUPLICATE-20261025`; two clones with two
`.env.production.local` files is how the secrets drifted apart once already.

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
pwsh ./scripts/rotate-secrets.ps1 -Email u.raghav003@gmail.com
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

## npm warnings

**`install-scripts … not yet covered by allowScripts`** — npm ≥ 11.6 blocks
dependency lifecycle scripts unless the project opts in. `package.json` approves
`esbuild` (needed by Vite/tsx) with an unpinned entry so it keeps working across
version bumps:

```json
"allowScripts": { "esbuild": true }
```

Check the current state with `npm install-scripts ls` (expected:
"No packages with unreviewed install scripts"). npm 10 on CI ignores the field.

**`Unknown env config "cache-dir"`** — this comes from an environment variable,
not from this repository. `npm_config_cache_dir` is not a valid npm key; the
supported one is `cache`. Find and remove the stray variable with:

```powershell
pwsh ./scripts/npm-doctor.ps1        # report
pwsh ./scripts/npm-doctor.ps1 -Fix   # remove user-scope npm_config_* entries
```

If the doctor finds nothing, the variable is injected by whichever tool launches
npm (an IDE agent, a task runner, another Node install); update that launcher to
use `npm_config_cache` or drop the variable.
