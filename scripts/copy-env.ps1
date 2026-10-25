# ==============================================================================
# SARI — copy one generated secret to the clipboard
#
# Usage:
#   pwsh ./scripts/copy-env.ps1 -Name SARI_SHARED_SECRET
#   pwsh ./scripts/copy-env.ps1 -List
#
# Values are read from .env.production.local (gitignored). Only a masked
# confirmation is printed, so the value does not end up in shell history,
# terminal scrollback, or a chat transcript.
# ==============================================================================
[CmdletBinding()]
param(
    [string]$Name,
    [switch]$List
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

if ($List -or [string]::IsNullOrWhiteSpace($Name)) {
    Write-Host "Available keys in $(Split-Path -Leaf $envFile):" -ForegroundColor Cyan
    foreach ($key in $values.Keys) {
        $value = $values[$key]
        $shown = if ($key -eq "SARI_LOGIN_EMAIL") { $value } else { $value.Substring(0, [Math]::Min(8, $value.Length)) + "…" }
        Write-Host ("  {0,-22} {1}" -f $key, $shown)
    }
    Write-Host ""
    Write-Host "Copy one with: pwsh ./scripts/copy-env.ps1 -Name SARI_SHARED_SECRET" -ForegroundColor DarkGray
    exit 0
}

if (-not $values.ContainsKey($Name)) {
    Write-Host "[X] '$Name' is not in $envFile." -ForegroundColor Red
    exit 1
}

Set-Clipboard -Value $values[$Name]
$masked = $values[$Name].Substring(0, [Math]::Min(8, $values[$Name].Length)) + "…"
Write-Host "[OK] $Name ($masked) copied to the clipboard." -ForegroundColor Green
Write-Host "     Paste it into the target field now, then clear the clipboard." -ForegroundColor DarkGray
