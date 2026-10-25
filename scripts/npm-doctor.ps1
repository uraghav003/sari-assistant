# ==============================================================================
# SARI — npm environment doctor
#
# Explains and (with -Fix) removes stray `npm_config_*` environment variables
# that npm reports as "Unknown env config", e.g.:
#
#   npm warn Unknown env config "cache-dir". This will stop working in the next
#   major version of npm.
#
# npm reads any `npm_config_<key>` variable. `cache-dir` is not a valid key —
# the supported one is `cache` — so the variable is ignored and warned about.
# ==============================================================================
[CmdletBinding()]
param(
    [switch]$Fix
)

$ErrorActionPreference = "Stop"

Write-Host "npm $(npm --version) · node $(node --version)" -ForegroundColor DarkGray

# Keys npm actually understands.
$knownKeys = @{}
npm config ls -l 2>$null | ForEach-Object {
    if ($_ -match '^([a-z0-9][a-z0-9._-]*)\s*=') { $knownKeys[$Matches[1]] = $true }
}

$findings = @()

# 1. Variables visible to this process.
Get-ChildItem Env: | Where-Object { $_.Name -match '^npm_config_' } | ForEach-Object {
    $key = $_.Name -replace '^npm_config_', '' -replace '_', '-'
    if (-not $knownKeys.ContainsKey($key)) {
        $findings += [pscustomobject]@{
            Scope = "process"
            Name  = $_.Name
            Key   = $key
            Value = $_.Value
        }
    }
}

# 2. Variables persisted for the user / machine.
$persisted = @(
    @{ Scope = "user";    Path = "HKCU:\Environment" },
    @{ Scope = "machine"; Path = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" }
)
foreach ($store in $persisted) {
    try {
        $props = Get-ItemProperty -Path $store.Path -ErrorAction Stop
    } catch {
        continue
    }
    $props.PSObject.Properties | Where-Object { $_.Name -match '^npm_config_' } | ForEach-Object {
        $key = $_.Name -replace '^npm_config_', '' -replace '_', '-'
        if (-not $knownKeys.ContainsKey($key)) {
            $findings += [pscustomobject]@{
                Scope = $store.Scope
                Name  = $_.Name
                Key   = $key
                Value = $_.Value
            }
        }
    }
}

# 3. Profile scripts that set them.
foreach ($profilePath in @($PROFILE.CurrentUserAllHosts, $PROFILE.CurrentUserCurrentHost)) {
    if ($profilePath -and (Test-Path $profilePath)) {
        Select-String -Path $profilePath -Pattern 'npm_config_' -SimpleMatch | ForEach-Object {
            Write-Host "[profile] $($_.Path):$($_.LineNumber)  $($_.Line.Trim())" -ForegroundColor Yellow
        }
    }
}

if ($findings.Count -eq 0) {
    Write-Host "[OK] No unknown npm_config_* variables found in this shell or in persisted env." -ForegroundColor Green
    Write-Host "     If npm still warns, it is being launched by another tool with its own environment." -ForegroundColor DarkGray
    exit 0
}

Write-Host ""
Write-Host "Unknown npm config variables:" -ForegroundColor Yellow
$findings | Format-Table Scope, Name, Key, Value -AutoSize

if (-not $Fix) {
    Write-Host ""
    Write-Host "Re-run with -Fix to remove the user-scope entries (machine scope needs admin)." -ForegroundColor Cyan
    Write-Host "For the specific 'cache-dir' warning, the supported variable is npm_config_cache." -ForegroundColor DarkGray
    exit 1
}

$removed = 0
foreach ($finding in $findings) {
    if ($finding.Scope -eq "user") {
        [Environment]::SetEnvironmentVariable($finding.Name, $null, "User")
        Remove-Item -Path "Env:$($finding.Name)" -ErrorAction SilentlyContinue
        Write-Host "[FIXED] removed user variable $($finding.Name)" -ForegroundColor Green
        $removed++
    } elseif ($finding.Scope -eq "machine") {
        Write-Host "[SKIP] $($finding.Name) is machine-scoped; remove it from an elevated prompt." -ForegroundColor Yellow
    }
}

Write-Host ""
if ($removed -gt 0) {
    Write-Host "Open a new terminal for the change to take effect." -ForegroundColor Cyan
}
