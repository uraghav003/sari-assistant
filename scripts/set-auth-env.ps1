<# .SYNOPSIS
  Sets SARI auth environment variables on Vercel (Production + Preview).
  Run: pwsh scripts/set-auth-env.ps1
#>
param(
    [string]$Email = "u.raghav003@gmail.com",
    [string]$Password
)

$ErrorActionPreference = 'Stop'

# Check Vercel login
$who = npx vercel whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Not logged in to Vercel. Run: npx vercel login" -ForegroundColor Red
    exit 1
}
Write-Host "[✓] Vercel account: $who" -ForegroundColor Green

# Generate secrets
$sessionSecret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
$sharedSecret  = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

if (-not $Password) {
    $Password = Read-Host -Prompt "Enter new SARI password"
}

$hashLine = node -e "const c=require('crypto');const s=c.randomBytes(16);const h=c.scryptSync(process.argv[1],s,64);console.log('scrypt:'+s.toString('hex')+':'+h.toString('hex'))" $Password

Write-Host "`n[1/4] Setting SARI_SESSION_SECRET..." -ForegroundColor Cyan
echo $sessionSecret | npx vercel env add SARI_SESSION_SECRET production preview 2>&1 | Out-Null

Write-Host "[2/4] Setting SARI_PASSWORD_HASH..." -ForegroundColor Cyan
echo $hashLine | npx vercel env add SARI_PASSWORD_HASH production preview 2>&1 | Out-Null

Write-Host "[3/4] Setting SARI_LOGIN_EMAIL..." -ForegroundColor Cyan
echo $Email | npx vercel env add SARI_LOGIN_EMAIL production preview 2>&1 | Out-Null

Write-Host "[4/4] Setting SARI_SHARED_SECRET..." -ForegroundColor Cyan
echo $sharedSecret | npx vercel env add SARI_SHARED_SECRET production preview 2>&1 | Out-Null

Write-Host "`n[✓] All auth env vars set. Redeploy to activate:" -ForegroundColor Green
Write-Host "     npx vercel --prod" -ForegroundColor Yellow
Write-Host "`n  Login email: $Email"
Write-Host "  Password:    $Password"
Write-Host "  (Save password in your password manager, then delete this terminal)"
