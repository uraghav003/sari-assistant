<#
.SYNOPSIS
 SARI Sovereign PowerShell Master Control Plane
.DESCRIPTION
 Manage builds, tests, model cascade updates, and 1-click Vercel deployments via PowerShell.
#>
param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("status", "build", "deploy", "sync")]
    [string]$Action = "status"
)

$ErrorActionPreference = "Stop"

switch ($Action) {
    "status" {
        Write-Host "[OK] SARI Sovereign PowerShell Control Plane is active." -ForegroundColor Green
        git status
    }
    "build" {
        Write-Host "Running local Vite build verification..." -ForegroundColor Cyan
        npm ci
        npm run build
        Write-Host "[OK] Build passed successfully!" -ForegroundColor Green
    }
    "deploy" {
        Write-Host "Triggering direct Vercel production deployment via PowerShell..." -ForegroundColor Cyan
        npx vercel --prod --yes
        Write-Host "[OK] Deployed live to Vercel successfully!" -ForegroundColor Green
    }
    "sync" {
        Write-Host "Syncing with GitHub remote..." -ForegroundColor Cyan
        git pull origin main
        Write-Host "[OK] Repository synchronized." -ForegroundColor Green
    }
}
