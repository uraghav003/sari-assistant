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

## 3. Project and deployment

> **Status (2026-10-25):** a dedicated project now exists —
> `15rN7xFT8jSqTNs1Pu-M9h4E4eD5DXaQdtkLm6Z1p-CvLH52TIWKshhI3` — containing
> v4.0.0, deployed as
> `AKfycbw_DlODYECpdfJKag01Jz5QlmoH2Fdj6kFElfKCOTiZfv8aFeYBLorki_4qlSC5tCr3`
> (version 1). It is not yet serving anonymous traffic: the owner has to
> authorize the script once.

The previous URL in this repo (`AKfycbwzdhZF…`) belonged to a **different**
Apps Script project — the Bulbhul Operating System — which is why deploying
SARI code never changed it.

### One-time owner authorization (required)

A freshly created script has no OAuth grant, so `ANYONE_ANONYMOUS` web apps
return *"You need access"* until the owner runs it once:

1. Open <https://script.google.com/d/15rN7xFT8jSqTNs1Pu-M9h4E4eD5DXaQdtkLm6Z1p-CvLH52TIWKshhI3/edit>
2. Select `checkConfiguration` in the function dropdown → **Run**.
3. **Review permissions → choose the account → Allow.**

After that, the deployment starts answering anonymously.

### Re-deploying after changes

```bash
clasp push -f
clasp deploy -i AKfycbw_DlODYECpdfJKag01Jz5QlmoH2Fdj6kFElfKCOTiZfv8aFeYBLorki_4qlSC5tCr3 \
  -d "hardened v4.0.0: HMAC-gated bridge"
```

`clasp deploy -i` keeps the URL stable by updating the existing deployment.

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
