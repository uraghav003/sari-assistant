# ==============================================================================
# SARI — one-shot credential generator
#
# Creates the secrets the hardened build requires, writes them to
# .env.production.local (gitignored), and prints the exact commands to apply
# them in Vercel and Google Apps Script.
#
# The values are never committed. Rotation instructions live in SECURITY.md.
# ==============================================================================
[CmdletBinding()]
param(
    [string]$Email = "md@divyanshicapital.com",
    [string]$Password,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$repoRoot = $PSScriptRoot
if (-not $repoRoot) { $repoRoot = (Get-Location).Path }
$repoRoot = Split-Path -Parent $repoRoot
$outFile = Join-Path $repoRoot ".env.production.local"

function New-Secret([int]$Bytes = 32) {
    $buffer = [byte[]]::new($Bytes)
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($buffer)
    return ($buffer | ForEach-Object { $_.ToString("x2") }) -join ""
}

function New-Password([int]$Length = 24) {
    $alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%^&*-_=+"
    $bytes = [byte[]]::new($Length)
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $chars = for ($i = 0; $i -lt $Length; $i++) {
        $alphabet[$bytes[$i] % $alphabet.Length]
    }
    return -join $chars
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[X] Node.js is required to compute the password hash." -ForegroundColor Red
    exit 1
}

if ((Test-Path $outFile) -and -not $Force) {
    Write-Host "[!] $outFile already exists. Re-run with -Force to rotate (this invalidates sessions)." -ForegroundColor Yellow
    exit 1
}

if ([string]::IsNullOrWhiteSpace($Password)) {
    $Password = New-Password
    $generated = $true
} else {
    $generated = $false
}

$sessionSecret = New-Secret 32
$sharedSecret = New-Secret 32

$hash = & node -e "const c=require('crypto');const s=c.randomBytes(16);const h=c.scryptSync(process.argv[1],s,64);process.stdout.write('scrypt:'+s.toString('hex')+':'+h.toString('hex'))" $Password
if ($LASTEXITCODE -ne 0 -or -not $hash) {
    Write-Host "[X] Could not compute the password hash." -ForegroundColor Red
    exit 1
}

$lines = @(
    "# Generated $(Get-Date -Format o) - do not commit. Rotate via SECURITY.md.",
    "# The server uses SARI_PASSWORD_HASH; SARI_PASSWORD below is the plaintext copy",
    "# for your first login only. Delete that line once it is in your password manager.",
    "SARI_SESSION_SECRET=$sessionSecret",
    "SARI_SHARED_SECRET=$sharedSecret",
    "SARI_LOGIN_EMAIL=$Email",
    "SARI_PASSWORD_HASH=$hash",
    "SARI_PASSWORD=$Password"
)
Set-Content -Path $outFile -Value $lines -Encoding UTF8

Write-Host ""
Write-Host "Wrote $outFile" -ForegroundColor Green
Write-Host ""
if ($generated) {
    Write-Host "  LOGIN PASSWORD: $Password" -ForegroundColor Cyan
    Write-Host "  Store this in your password manager now - it is only shown here." -ForegroundColor Yellow
} else {
    Write-Host "  Login password: the value you supplied." -ForegroundColor Cyan
}
Write-Host "  Login email:    $Email" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps" -ForegroundColor Yellow
Write-Host "1. Vercel -> Project -> Settings -> Environment Variables (Production + Preview):"
Write-Host "     SARI_SESSION_SECRET  = value from $outFile"
Write-Host "     SARI_SHARED_SECRET   = value from $outFile"
Write-Host "     SARI_LOGIN_EMAIL     = $Email"
Write-Host "     SARI_PASSWORD_HASH   = value from $outFile"
Write-Host "     GEMINI_API_KEY       = your AI Studio key (optional)"
Write-Host "2. Apps Script -> Project Settings -> Script Properties:"
Write-Host "     SARI_SHARED_SECRET   = same value as Vercel"
Write-Host "     MALLIK_API_KEY       = your AI Studio key"
Write-Host "3. Apps Script -> Deploy -> Manage deployments -> New version -> Deploy, then archive the old deployment."
Write-Host "4. Vercel -> Deployments -> Redeploy (env changes apply on a new build)."
Write-Host "5. Verify:"
Write-Host "     curl -s https://sari-assistant.vercel.app/api/session"
Write-Host '     expected: {"ok":false,"configured":true}'
Write-Host ""
Write-Host "Until step 4 completes, the app fails closed with 503 by design." -ForegroundColor DarkGray
