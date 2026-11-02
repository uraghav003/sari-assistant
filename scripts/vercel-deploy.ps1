<#
.SYNOPSIS
  Deploy sari-assistant to Vercel production with one command.

.USAGE
  .\scripts\vercel-deploy.ps1 -Token <your-vercel-token>

  Get token: https://vercel.com/account/tokens -> Create -> copy

.EXAMPLE
  .\scripts\vercel-deploy.ps1 -Token "abc123xyz..."
#>
param(
  [Parameter(Mandatory=$true)][string]$Token
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "=== SARI Vercel Deploy ===" -ForegroundColor Cyan
Write-Host "[1/4] Linking project to Vercel..." -ForegroundColor Yellow

Set-Location $root

# Link project (non-interactive using token + project name)
vercel link --yes --project sari-assistant --token $Token 2>&1 | Out-Null
if(-not (Test-Path ".vercel/project.json")){
  Write-Host "[!] Link failed. Trying with team scope..." -ForegroundColor Yellow
  vercel link --yes --token $Token 2>&1 | Write-Host
}

Write-Host "[2/4] Pulling environment variables..." -ForegroundColor Yellow
vercel env pull --yes --environment=production --token $Token | Out-Null

Write-Host "[3/4] Building project artifacts..." -ForegroundColor Yellow
$env:VERCEL_TOKEN = $Token
if(Test-Path ".vercel/project.json"){
  $proj = Get-Content ".vercel/project.json" | ConvertFrom-Json
  $env:VERCEL_PROJECT_ID = $proj.projectId
  $env:VERCEL_ORG_ID     = $proj.orgId
}
vercel build --prod --token $Token

Write-Host "[4/4] Deploying to production..." -ForegroundColor Yellow
$deployUrl = vercel deploy --prebuilt --prod --token $Token
Write-Host ""
Write-Host "=== DEPLOYED ===" -ForegroundColor Green
Write-Host "URL: $deployUrl" -ForegroundColor Cyan

# Save project.json for future CI use
if(Test-Path ".vercel/project.json"){
  $proj = Get-Content ".vercel/project.json" | ConvertFrom-Json
  Write-Host ""
  Write-Host "Add these as GitHub repository secrets to enable auto-deploy on every push:" -ForegroundColor Yellow
  Write-Host "  VERCEL_TOKEN      = <your-token>" -ForegroundColor Gray
  Write-Host "  VERCEL_PROJECT_ID = $($proj.projectId)" -ForegroundColor Gray
  Write-Host "  VERCEL_ORG_ID     = $($proj.orgId)" -ForegroundColor Gray
  Write-Host ""
  Write-Host "GitHub Secrets: https://github.com/uraghav003/sari-assistant/settings/secrets/actions" -ForegroundColor Cyan
}
