# Apps Script setup

The backend (`Code.js`) rejects every request that is not HMAC-signed with
`SARI_SHARED_SECRET`. Configure it once, then redeploy.

## 1. Script Properties

> The **model key** (`MALLIK_API_KEY`) and the **bridge secret**
> (`SARI_SHARED_SECRET`) are different things. The model key lets Apps Script
> call Gemini. The bridge secret proves that a request came from your server.
> The backend will refuse to run without the bridge secret, even if the model
> key is already present.

Apps Script editor → **Project Settings** → **Script properties** → add:

| Property | Value |
|---|---|
| `SARI_SHARED_SECRET` | The **same** 64-hex value as `SARI_SHARED_SECRET` in Vercel. |
| `MALLIK_API_KEY` | Your AI Studio / Gemini key. |

Generate the value once and copy it to both places:

```powershell
pwsh ./scripts/rotate-secrets.ps1 -Force
```

(reads/writes `.env.production.local`; nothing is committed)

## 2. Verify configuration

In the editor, select `checkConfiguration` → **Run**. The execution log prints
presence flags only:

```json
{
  "sharedSecretConfigured": true,
  "sharedSecretLength": 64,
  "modelKeyConfigured": true,
  "vaultBytes": 0,
  "lastAutopilotSync": "never",
  "webAppAccess": "ANYONE_ANONYMOUS (requests must carry a valid HMAC signature)"
}
```

## 3. Deploy

> **Status (checked 2026-10-25):** the project *files* already contain v4.0.0 —
> `clasp push` was run from this repo. What is still live at `/exec` is the old
> **v3.2.0** deployment. A new version has to be created for the fix to take effect.

**Deploy → Manage deployments → edit (pencil) → Version: New version → Deploy.**
Then archive the previous deployment so its URL stops working.

Equivalent CLI (updates the existing deployment URL):

```bash
clasp deploy -i AKfycbwzdhZF3cVTT01atwZOSnXq7kBvx6k9NgFCbSvfAIXldCjBnMUqxKIBlLUPTiA7V8tc \
  -d "hardened v4.0.0: HMAC-gated bridge"
```

Do this **after** setting `SARI_SHARED_SECRET` in Script Properties. Deploying
first would make every request fail closed (`UNAUTHORIZED`) — correct, but the
app would look broken.

The existing deployment ID can stay if you only add a version, but the audit
recommendation is a **new deployment** plus archiving the old one — the old ID
appeared in five documents and a public page.

## 4. Probe

```bash
# Public health probe — must be the only anonymous surface
curl -s "https://script.google.com/macros/s/<ID>/exec?action=status"
# => {"status":"ok","system":"SARI_SUPREME_COMMAND_AUTOPILOT","version":"4.0.0",...}

# Unsigned memory read — must be rejected
curl -s "https://script.google.com/macros/s/<ID>/exec?action=get_memory"
# => {"ok":false,"error":"UNAUTHORIZED"}

# Unsigned write — must be rejected
curl -s -X POST "https://script.google.com/macros/s/<ID>/exec" \
  -H "Content-Type: application/json" \
  -d '{"action":"sync_memory","vault":{"x":"y"}}'
# => {"ok":false,"error":"UNAUTHORIZED"}
```

## 5. Vercel side

Set the matching `SARI_SHARED_SECRET` (plus `SARI_SESSION_SECRET`,
`SARI_PASSWORD_HASH`, `SARI_LOGIN_EMAIL`) in the project environment, then
**Redeploy**. Until then `/api/session` returns:

```json
{"ok":false,"configured":false}
```

That is the intended fail-closed state, not a bug.

## Signing format

```
message = "<action>.<unix-ms-timestamp>"
sig     = hex(HMAC-SHA256(SARI_SHARED_SECRET, message))
```

Valid for ±5 minutes. Sent as `auth: { ts, sig }` in the POST body, or as
`?ts=&sig=` on the signed GET (`get_memory`).
