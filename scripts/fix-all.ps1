# ==============================================================================
# SARI — local verification pipeline
#
# Checks the repo and reports the *live* deployment state. It does not claim
# success for steps it cannot perform: setting Vercel environment variables
# needs an account token (scripts/set-vercel-env.ps1) and Apps Script needs a
# one-time owner consent.
# ==============================================================================
[CmdletBinding()]
param(
    [switch]$SyncGitHubSecrets
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $repoRoot "package.json"))) {
    Write-Host "[X] Run from the repository's scripts directory." -ForegroundColor Red
    exit 1
}
Set-Location $repoRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [SARI] LOCAL VERIFICATION PIPELINE                       " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Repository: $repoRoot" -ForegroundColor DarkGray

# 1. Environment file
$envFile = Join-Path $repoRoot ".env.production.local"
if (-not (Test-Path $envFile)) {
    Write-Host "[X] $envFile not found." -ForegroundColor Red
    Write-Host "    Generate it with: pwsh ./scripts/rotate-secrets.ps1" -ForegroundColor Gray
    exit 1
}

$envMap = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Z0-9_]+)=(.*)$') {
        $envMap[$Matches[1]] = $Matches[2]
        [System.Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], "Process")
    }
}
Write-Host "[1/4] Loaded $($envMap.Count) values from .env.production.local into this process." -ForegroundColor Green

# 2. Optional: GitHub Actions secrets. This has no effect on Vercel.
if ($SyncGitHubSecrets) {
    Write-Host "[2/4] Syncing GitHub Actions secrets (does NOT configure Vercel)..." -ForegroundColor Cyan
    foreach ($key in @("SARI_LOGIN_EMAIL", "SARI_PASSWORD", "SARI_PASSWORD_HASH", "SARI_SESSION_SECRET", "SARI_SHARED_SECRET")) {
        if ($envMap.ContainsKey($key)) {
            gh secret set $key --body "$($envMap[$key])" | Out-Null
            Write-Host "      -> $key" -ForegroundColor DarkGray
        }
    }
    Write-Host "      GitHub secrets updated. Vercel is still unconfigured." -ForegroundColor Yellow
} else {
    Write-Host "[2/4] Skipped GitHub secrets (use -SyncGitHubSecrets if you need them)." -ForegroundColor DarkGray
}

# 3. Code checks
Write-Host "[3/4] Typecheck, contract tests, production build..." -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) { Write-Host "[X] TypeScript failed" -ForegroundColor Red; exit 1 }

npm run test:api
if ($LASTEXITCODE -ne 0) { Write-Host "[X] API tests failed" -ForegroundColor Red; exit 1 }

npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "[X] Build failed" -ForegroundColor Red; exit 1 }
Write-Host "[OK] Code is green." -ForegroundColor Green

# 4. Live verification — the part that answers "does it work?"
Write-Host "[4/4] Probing the live deployment..." -ForegroundColor Cyan
$session = $null
try {
    $session = Invoke-RestMethod -Uri "https://sari-supreme-command.vercel.app/api/session" -TimeoutSec 20
} catch {
    Write-Host "[!] Could not reach /api/session: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "----------------------------------------------------------" -ForegroundColor DarkGray
if ($session -and $session.configured -eq $true) {
    Write-Host " VERDICT: Vercel is configured. Sign in at /login." -ForegroundColor Green
} else {
    Write-Host " VERDICT: NOT CONFIGURED - the app cannot be used yet." -ForegroundColor Red
    if ($session -and $session.checks) {
        $labels = [ordered]@{
            sessionSecret      = "SARI_SESSION_SECRET"
            passwordCredential = "SARI_PASSWORD_HASH"
            sharedSecret       = "SARI_SHARED_SECRET"
            modelKey           = "GEMINI_API_KEY"
        }
        foreach ($k in $labels.Keys) {
            $ok = $session.checks.$k -eq $true
            $mark = if ($ok) { "[set]    " } else { "[MISSING]" }
            Write-Host ("  {0} {1}" -f $mark, $labels[$k]) -ForegroundColor $(if ($ok) { "Green" } else { "Red" })
        }
    }
    Write-Host ""
    Write-Host " Fix it with either:" -ForegroundColor Yellow
    Write-Host "   pwsh ./scripts/set-vercel-env.ps1 -Token <vercel-token> -Redeploy" -ForegroundColor Gray
    Write-Host "   or Vercel -> Settings -> Environment Variables (Production) -> Redeploy" -ForegroundColor Gray
}
Write-Host "----------------------------------------------------------" -ForegroundColor DarkGray

if (-not ($session -and $session.configured -eq $true)) { exit 1 }
