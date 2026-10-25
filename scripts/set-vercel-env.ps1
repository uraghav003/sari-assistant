# ==============================================================================
# SARI — push the generated environment to Vercel
#
# Vercel environment variables cannot be set without an account token. Create
# one at https://vercel.com/account/tokens, then:
#
#   pwsh ./scripts/set-vercel-env.ps1 -Token <token> -Redeploy
#
# The token is used only for this run. Nothing is written to disk.
# Reads values from .env.production.local (gitignored).
# ==============================================================================
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Token,
    [string]$ProjectName = "sari-supreme-command",
    [string]$TeamId,
    [switch]$Redeploy
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot ".env.production.local"

if (-not (Test-Path $envFile)) {
    Write-Host "[X] $envFile not found. Run scripts/rotate-secrets.ps1 first." -ForegroundColor Red
    exit 1
}

$values = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Z0-9_]+)=(.*)$') { $values[$Matches[1]] = $Matches[2] }
}

$required = @("SARI_SESSION_SECRET", "SARI_SHARED_SECRET", "SARI_LOGIN_EMAIL", "SARI_PASSWORD_HASH")
$missing = $required | Where-Object { -not $values.ContainsKey($_) -or [string]::IsNullOrWhiteSpace($values[$_]) }
if ($missing) {
    Write-Host "[X] Missing in ${envFile}: $($missing -join ', ')" -ForegroundColor Red
    exit 1
}

$headers = @{ Authorization = "Bearer $Token"; "Content-Type" = "application/json" }
$query = if ($TeamId) { "?teamId=$TeamId" } else { "" }

# 1. Validate the token.
try {
    $user = Invoke-RestMethod -Uri "https://api.vercel.com/v2/user" -Headers $headers -TimeoutSec 30
    Write-Host "[OK] Token valid for: $($user.user.username)" -ForegroundColor Green
} catch {
    Write-Host "[X] Token rejected by Vercel: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Locate the project (personal scope first, then each team).
function Find-Project {
    param([string]$Team)
    $q = if ($Team) { "?limit=100&teamId=$Team" } else { "?limit=100" }
    try {
        $list = Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects$q" -Headers $headers -TimeoutSec 30
        return $list.projects | Where-Object { $_.name -eq $ProjectName } | Select-Object -First 1
    } catch {
        return $null
    }
}

$project = Find-Project
$resolvedTeam = $TeamId

if (-not $project -and -not $TeamId) {
    try {
        $teams = (Invoke-RestMethod -Uri "https://api.vercel.com/v2/teams?limit=50" -Headers $headers -TimeoutSec 30).teams
        foreach ($team in $teams) {
            $project = Find-Project -Team $team.id
            if ($project) { $resolvedTeam = $team.id; break }
        }
    } catch {
        # Personal scope only.
    }
}

if (-not $project) {
    Write-Host "[X] Project '$ProjectName' not found on this token." -ForegroundColor Red
    Write-Host "    If it lives in a team, pass -TeamId <id>." -ForegroundColor DarkGray
    exit 1
}

$projectLabel = if ($resolvedTeam) { "$($project.name) (team $resolvedTeam)" } else { $project.name }
Write-Host "[OK] Project: $projectLabel ($($project.id))" -ForegroundColor Green

# 3. Upsert the variables for Production and Preview.
$targets = @("production", "preview")
foreach ($key in $required) {
    $body = @{
        key    = $key
        value  = $values[$key]
        type   = "encrypted"
        target = $targets
    } | ConvertTo-Json -Compress

    $sep = if ($resolvedTeam) { "&" } else { "?" }
    $uri = "https://api.vercel.com/v10/projects/$($project.id)/env${sep}upsert=true"
    if ($resolvedTeam) { $uri += "&teamId=$resolvedTeam" }

    try {
        Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $body -TimeoutSec 30 | Out-Null
        Write-Host "     -> $key set (production + preview)" -ForegroundColor DarkGray
    } catch {
        Write-Host "[X] Failed to set $key : $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

Write-Host "[OK] All four variables written to Vercel." -ForegroundColor Green

# 4. A new deployment is required for the values to take effect.
if ($Redeploy) {
    Push-Location $repoRoot
    try {
        git commit --allow-empty -m "chore(deploy): apply environment variables" | Out-Null
        $remote = git remote get-url origin
        if ($remote -match "x-access-token") {
            # Strip any embedded credential from the URL before pushing.
            git remote set-url origin "https://github.com/uraghav003/sari-assistant.git"
        }
        git push origin main | Out-Null
        Write-Host "[OK] Empty commit pushed — Vercel will rebuild with the new environment." -ForegroundColor Green
    } catch {
        Write-Host "[!] Could not push automatically. Trigger a redeploy from the Vercel dashboard." -ForegroundColor Yellow
    } finally {
        Pop-Location
    }
} else {
    Write-Host ""
    Write-Host "Now trigger a new deployment (env changes apply only to new builds):" -ForegroundColor Yellow
    Write-Host "  Vercel -> Deployments -> ... -> Redeploy" -ForegroundColor Gray
    Write-Host "  or re-run with -Redeploy to push an empty commit." -ForegroundColor Gray
}

Write-Host ""
Write-Host "Verify in ~60s:" -ForegroundColor Cyan
Write-Host "  curl -s https://sari-supreme-command.vercel.app/api/session" -ForegroundColor Gray
Write-Host '  expected: {"ok":false,"configured":true,"checks":{...all true...}}' -ForegroundColor DarkGray
