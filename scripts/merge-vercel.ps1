# ==============================================================================
# SARI — collapse two Vercel projects into one
#
# Both `sari-assistant` and `sari-supreme-command` deploy the same repository on
# every push. This script:
#
#   1. writes the four environment variables to the surviving project
#   2. optionally deletes the redundant project
#   3. re-points the redundant *.vercel.app domain at the survivor (308)
#   4. triggers a fresh deployment
#
# Usage:
#   pwsh ./scripts/merge-vercel.ps1 -Token <token>                          # env only
#   pwsh ./scripts/merge-vercel.ps1 -Token <token> -ConfirmDelete -Redeploy # full merge
#
# Token: https://vercel.com/account/tokens (revoke afterwards). Never stored.
# ==============================================================================
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Token,
    [string]$Survivor = "sari-assistant",
    [string]$Redundant = "sari-supreme-command",
    [string]$TeamId,
    [switch]$ConfirmDelete,
    [switch]$Redeploy
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot ".env.production.local"

if ($Survivor -eq $Redundant) {
    Write-Host "[X] Survivor and redundant project are the same." -ForegroundColor Red
    exit 1
}

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

try {
    $user = Invoke-RestMethod -Uri "https://api.vercel.com/v2/user" -Headers $headers -TimeoutSec 30
    Write-Host "[OK] Token valid for: $($user.user.username)" -ForegroundColor Green
} catch {
    Write-Host "[X] Token rejected: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

function Get-Projects {
    param([string]$Team)
    $q = if ($Team) { "?limit=100&teamId=$Team" } else { "?limit=100" }
    try {
        return (Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects$q" -Headers $headers -TimeoutSec 30).projects
    } catch {
        return @()
    }
}

$scope = @{ Team = $TeamId }
$projects = Get-Projects -Team $TeamId

if (-not ($projects | Where-Object { $_.name -eq $Survivor }) -and -not $TeamId) {
    $teams = (Invoke-RestMethod -Uri "https://api.vercel.com/v2/teams?limit=50" -Headers $headers -TimeoutSec 30).teams
    foreach ($team in $teams) {
        $candidate = Get-Projects -Team $team.id
        if ($candidate | Where-Object { $_.name -eq $Survivor }) {
            $projects = $candidate
            $scope.Team = $team.id
            break
        }
    }
}

$survivorProject = $projects | Where-Object { $_.name -eq $Survivor } | Select-Object -First 1
$redundantProject = $projects | Where-Object { $_.name -eq $Redundant } | Select-Object -First 1

if (-not $survivorProject) {
    Write-Host "[X] Surviving project '$Survivor' not found." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Survivor: $Survivor ($($survivorProject.id))" -ForegroundColor Green
if ($redundantProject) {
    Write-Host "[OK] Redundant: $Redundant ($($redundantProject.id))" -ForegroundColor Yellow
} else {
    Write-Host "[i] Redundant project '$Redundant' not found (already removed?)." -ForegroundColor DarkGray
}

$teamQuery = if ($scope.Team) { "?teamId=$($scope.Team)" } else { "" }

# 1. Environment variables on the survivor.
foreach ($key in $required) {
    $body = @{ key = $key; value = $values[$key]; type = "encrypted"; target = @("production", "preview") } | ConvertTo-Json -Compress
    $uri = "https://api.vercel.com/v10/projects/$($survivorProject.id)/env?upsert=true"
    if ($scope.Team) { $uri += "&teamId=$($scope.Team)" }
    try {
        Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $body -TimeoutSec 30 | Out-Null
        Write-Host "     -> $key set" -ForegroundColor DarkGray
    } catch {
        Write-Host "[X] Failed setting $key : $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}
Write-Host "[OK] Environment written to $Survivor." -ForegroundColor Green

# 2. Remove the duplicate project.
if ($redundantProject -and $ConfirmDelete) {
    try {
        Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/$($redundantProject.id)$teamQuery" -Method Delete -Headers $headers -TimeoutSec 30 | Out-Null
        Write-Host "[OK] Deleted project '$Redundant'." -ForegroundColor Green
    } catch {
        Write-Host "[!] Could not delete '$Redundant': $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "    Disconnect its Git integration instead: Settings -> Git -> Disconnect." -ForegroundColor DarkGray
    }
} elseif ($redundantProject) {
    Write-Host "[i] '$Redundant' left in place. Re-run with -ConfirmDelete to remove it." -ForegroundColor DarkGray
}

# 3. Point the old domain at the survivor.
if ($redundantProject -and $ConfirmDelete) {
    $oldDomain = "$Redundant.vercel.app"
    $newDomain = "$Survivor.vercel.app"
    $domainBody = @{ name = $oldDomain; redirect = $newDomain; redirectStatusCode = 308 } | ConvertTo-Json -Compress
    $domainUri = "https://api.vercel.com/v10/projects/$($survivorProject.id)/domains"
    if ($scope.Team) { $domainUri += "?teamId=$($scope.Team)" }
    try {
        Invoke-RestMethod -Uri $domainUri -Method Post -Headers $headers -Body $domainBody -TimeoutSec 30 | Out-Null
        Write-Host "[OK] $oldDomain now redirects to $newDomain (308)." -ForegroundColor Green
    } catch {
        Write-Host "[i] Could not add the redirect domain automatically: $($_.Exception.Message)" -ForegroundColor DarkGray
        Write-Host "    Add it manually: Project -> Domains -> $oldDomain -> Redirect to $newDomain." -ForegroundColor Gray
    }
}

# 4. Redeploy.
if ($Redeploy) {
    Push-Location $repoRoot
    try {
        git commit --allow-empty -m "chore(deploy): single Vercel project" | Out-Null
        git push origin main | Out-Null
        Write-Host "[OK] Empty commit pushed — Vercel rebuilds the survivor only." -ForegroundColor Green
    } catch {
        Write-Host "[!] Push failed; trigger Redeploy from the dashboard." -ForegroundColor Yellow
    } finally {
        Pop-Location
    }
}

Write-Host ""
Write-Host "Verify in ~60s:" -ForegroundColor Cyan
Write-Host "  curl -s https://$Survivor.vercel.app/api/session" -ForegroundColor Gray
