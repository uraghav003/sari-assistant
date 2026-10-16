<#
.SYNOPSIS
 SARI Sovereign PowerShell Master Control Plane
.DESCRIPTION
 Manage status, test, build, audit, deploy, and sync across the SARI ecosystem.
.EXAMPLE
 powershell.exe -File .\sari-master.ps1 -Action status
 powershell.exe -File .\sari-master.ps1 -Action audit
#>
[CmdletBinding()]
param(
    [Parameter(Position=0, Mandatory=$false)]
    [ValidateSet("status", "test", "build", "audit", "deploy", "sync")]
    [string]$Action = "status",

    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$RemainingArgs
)

$ErrorActionPreference = "Stop"

# Canonical Paths and Endpoints
$RepoRoot = $PSScriptRoot
if (-not (Test-Path "$RepoRoot\package.json")) {
    $RepoRoot = "C:\Users\aecr\workspace\sari-assistant"
}
Set-Location $RepoRoot

$CanonicalDeploymentId = "AKfycbwzdhZF3cVTT01atwZOSnXq7kBvx6k9NgFCbSvfAIXldCjBnMUqxKIBlLUPTiA7V8tc"
$CanonicalAppsScriptUrl = "https://script.google.com/macros/s/$CanonicalDeploymentId/exec"
$CanonicalVercelUrl = "https://sari-assistant.vercel.app"

function Show-Header {
    param([string]$Title)
    Write-Host "=====================================================" -ForegroundColor Cyan
    Write-Host "  $Title" -ForegroundColor Yellow
    Write-Host "=====================================================" -ForegroundColor Cyan
    Write-Host "Canonical Workspace: $RepoRoot" -ForegroundColor DarkGray
}

function Show-GitStatus {
    $branch = ([string](git rev-parse --abbrev-ref HEAD)).Trim()
    $head = ([string](git log -1 --format="%h - %s (%cr)")).Trim()
    Write-Host "[OK] Git Branch: $branch" -ForegroundColor Green
    Write-Host "[OK] Git HEAD:   $head" -ForegroundColor Green
    
    $status = ([string](git status --porcelain)).Trim()
    if ([string]::IsNullOrWhiteSpace($status)) {
        Write-Host "[OK] Working Tree: Clean (0 uncommitted changes)" -ForegroundColor Green
    } else {
        Write-Host "[!] Working Tree: Has uncommitted changes" -ForegroundColor Yellow
        git status -s
    }
}

function Probe-AppsScript {
    Write-Host "[*] Probing canonical Google Apps Script deployment..." -ForegroundColor Cyan
    $pingBody = @{ action = "ping" } | ConvertTo-Json -Compress
    try {
        $res = Invoke-RestMethod -Uri $CanonicalAppsScriptUrl -Method Post -Body $pingBody -ContentType "application/json" -TimeoutSec 15
        if ($res -and ($res.ok -or $res.message)) {
            Write-Host "[OK] Apps Script Deployment: HEALTHY (Deployment ID: $CanonicalDeploymentId)" -ForegroundColor Green
            return $true
        } else {
            Write-Host "[!] Apps Script Deployment returned: $($res | ConvertTo-Json -Compress)" -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host "[!] Apps Script Deployment probe failed: $_" -ForegroundColor Red
        return $false
    }
}

function Probe-Vercel {
    Write-Host "[*] Probing live Vercel production..." -ForegroundColor Cyan
    try {
        $res = Invoke-WebRequest -Uri $CanonicalVercelUrl -UseBasicParsing -TimeoutSec 15
        if ($res.StatusCode -eq 200) {
            Write-Host "[OK] Live Vercel Status: 200 OK ($CanonicalVercelUrl)" -ForegroundColor Green
            return $true
        } else {
            Write-Host "[!] Live Vercel Status: HTTP $($res.StatusCode)" -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host "[!] Live Vercel probe failed: $_" -ForegroundColor Red
        return $false
    }
}

switch ($Action) {
    "status" {
        Show-Header "SARI MASTER CONTROL PLANE: SYSTEM STATUS"
        Show-GitStatus
        $asOk = Probe-AppsScript
        $vcOk = Probe-Vercel
        Write-Host "-----------------------------------------------------" -ForegroundColor DarkGray
        if ($asOk -and $vcOk) {
            Write-Host "[OK] SARI Sovereign Master Control Plane is 100% HEALTHY." -ForegroundColor Green
            exit 0
        } else {
            Write-Host "[!] System status completed with warnings." -ForegroundColor Yellow
            exit 1
        }
    }

    "test" {
        Show-Header "SARI MASTER CONTROL PLANE: TEST SUITE"
        Write-Host "[*] Executing local API endpoint simulation tests (npm run test:api)..." -ForegroundColor Cyan
        npm run test:api
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[X] Test suite failed with exit code $LASTEXITCODE" -ForegroundColor Red
            exit $LASTEXITCODE
        }
        Write-Host "[OK] Local API endpoint simulation tests passed successfully!" -ForegroundColor Green
        exit 0
    }

    "build" {
        Show-Header "SARI MASTER CONTROL PLANE: VITE BUILD"
        Write-Host "[*] Executing Vite production build (npm run build)..." -ForegroundColor Cyan
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[X] Vite build failed with exit code $LASTEXITCODE" -ForegroundColor Red
            exit $LASTEXITCODE
        }
        Write-Host "[OK] Vite production build completed successfully!" -ForegroundColor Green
        exit 0
    }

    "audit" {
        Show-Header "SARI MASTER CONTROL PLANE: END-TO-END AUDIT"
        
        # 1. Working Tree & Git Status
        Show-GitStatus

        # 2. Remote tracking and sync
        Write-Host "[*] Checking remote sync alignment with origin/main..." -ForegroundColor Cyan
        git fetch origin main --quiet
        $revCounts = ([string](git rev-list --left-right --count HEAD...origin/main)).Trim()
        $parts = ($revCounts -split '\s+')
        $localAhead  = [int]$parts[0]
        $localBehind = [int]$parts[1]
        if ($localBehind -gt 0) {
            Write-Host "[!] Local branch is $localBehind commits behind remote. Syncing..." -ForegroundColor Yellow
            git pull --ff-only origin main
        } elseif ($localAhead -gt 0) {
            Write-Host "[!] Local branch is $localAhead commits ahead of remote." -ForegroundColor Yellow
        } else {
            Write-Host "[OK] Git Remote Sync: 100% synchronized with origin/main (Ahead: 0, Behind: 0)" -ForegroundColor Green
        }

        # 3. Canonical Apps Script Probe
        $asOk = Probe-AppsScript

        # 4. Live Vercel Status Probe
        $vcOk = Probe-Vercel

        # 5. Local endpoint simulation tests
        Write-Host "[*] Running local endpoint simulation tests..." -ForegroundColor Cyan
        npm run test:api
        $testsOk = ($LASTEXITCODE -eq 0)

        # 6. Vite production build
        Write-Host "[*] Running Vite production build check..." -ForegroundColor Cyan
        npm run build
        $buildOk = ($LASTEXITCODE -eq 0)

        Write-Host "-----------------------------------------------------" -ForegroundColor DarkGray
        if ($asOk -and $vcOk -and $testsOk -and $buildOk) {
            Write-Host "[OK] AUDIT VERDICT: 100% PASS - ALL SYSTEMS OPERATIONAL" -ForegroundColor Green
            exit 0
        } else {
            Write-Host "[X] AUDIT VERDICT: FAILED - One or more components failed" -ForegroundColor Red
            exit 1
        }
    }

    "deploy" {
        Show-Header "SARI MASTER CONTROL PLANE: DEPLOYMENT"
        Write-Host "[*] Checking working tree for uncommitted changes..." -ForegroundColor Cyan
        $status = ([string](git status --porcelain)).Trim()
        if (-not [string]::IsNullOrWhiteSpace($status)) {
            Write-Host "[*] Staging and committing changes..." -ForegroundColor Yellow
            git add -A
            git commit -m "deploy: update via SARI master control plane"
        } else {
            Write-Host "[OK] Working tree clean; no uncommitted changes." -ForegroundColor Green
        }
        Write-Host "[*] Pushing to origin/main (triggers auto Vercel deployment)..." -ForegroundColor Cyan
        git push origin main
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[X] Git push failed with exit code $LASTEXITCODE" -ForegroundColor Red
            exit $LASTEXITCODE
        }
        Write-Host "[OK] Pushed to origin/main successfully!" -ForegroundColor Green
        Write-Host "[OK] Vercel auto-deploy initiated at $CanonicalVercelUrl" -ForegroundColor Green
        exit 0
    }

    "sync" {
        Show-Header "SARI MASTER CONTROL PLANE: FAST-FORWARD SYNC"
        Write-Host "[*] Fetching and fast-forward syncing with origin/main..." -ForegroundColor Cyan
        git pull --ff-only origin main
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[X] Git sync failed with exit code $LASTEXITCODE" -ForegroundColor Red
            exit $LASTEXITCODE
        }
        Write-Host "[OK] Repository synchronized with origin/main!" -ForegroundColor Green
        exit 0
    }
}
