# ==============================================================================
# SARI SUPREME AUDIT & PRODUCTION INTEGRITY CHECK
#
# Read-only by default. Commits/pushes only with -AllowPush, and only against
# the repository that contains this script.
# ==============================================================================
[CmdletBinding()]
param(
    [switch]$AllowPush
)

$ErrorActionPreference = "Stop"
$script:failures = 0

function Fail([string]$Message) {
    Write-Host "[FAIL] $Message" -ForegroundColor Red
    $script:failures++
}

function Ok([string]$Message) {
    Write-Host "[OK]   $Message" -ForegroundColor Green
}

# 1. Resolve the repository that owns this script — never a hardcoded path.
$repoRoot = $PSScriptRoot
if (-not $repoRoot) { $repoRoot = (Get-Location).Path }

if (-not (Test-Path (Join-Path $repoRoot ".git"))) {
    Write-Host "CRITICAL: $repoRoot is not a git repository." -ForegroundColor Red
    exit 1
}

Push-Location $repoRoot
try {
    Write-Host "=====================================================" -ForegroundColor Cyan
    Write-Host "   SARI SUPREME AUDIT & PRODUCTION INTEGRITY CHECK   " -ForegroundColor Yellow
    Write-Host "=====================================================" -ForegroundColor Cyan
    Write-Host "Repository: $repoRoot (push mode: $AllowPush)" -ForegroundColor DarkGray

    $remote = git remote get-url origin 2>$null
    if (-not $remote) {
        Fail "No 'origin' remote configured."
    } else {
        Ok "Remote: $remote"
    }

    # 2. Working tree
    $status = git status --porcelain
    if ($status) {
        if ($AllowPush) {
            Write-Host "[!] Staging uncommitted changes (explicit -AllowPush)..." -ForegroundColor Yellow
            git add -A
            git commit -m "chore(maintenance): sanitize working tree" | Out-Null
            if ($LASTEXITCODE -ne 0) { Fail "git commit failed." }
        } else {
            Write-Host "[!] Working tree is dirty. Re-run with -AllowPush to commit." -ForegroundColor Yellow
        }
    } else {
        Ok "Working tree clean."
    }

    # 3. Divergence from origin
    git fetch origin main --quiet
    if ($LASTEXITCODE -ne 0) {
        Fail "git fetch failed."
    } else {
        $counts = git rev-list --left-right --count HEAD...origin/main
        if ($LASTEXITCODE -eq 0 -and $counts) {
            $parts = ($counts.Trim() -split '\s+')
            $ahead = [int]$parts[0]
            $behind = [int]$parts[1]
            if ($behind -gt 0) {
                Write-Host "[!] $behind commit(s) behind origin/main." -ForegroundColor Yellow
                if ($AllowPush) { git pull --ff-only origin main }
            } elseif ($ahead -gt 0) {
                Write-Host "[!] $ahead commit(s) ahead of origin/main." -ForegroundColor Yellow
                if ($AllowPush) {
                    git push origin main
                    if ($LASTEXITCODE -ne 0) { Fail "git push failed." }
                }
            } else {
                Ok "Branch synchronized with origin/main."
            }
        }
    }

    # 4. Secret scan of the tracked tree
    # Fragments are joined at runtime so this scanner does not itself contain the
    # retired literals it looks for.
    $patterns = @(
        ("MALLIK" + "_V3_" + "786"),
        ("sari_sovereign" + "_secure_hmac" + "_secret"),
        ("divyanshi" + "2026"),
        ("admin" + "786"),
        "BEGIN (RSA|EC|OPENSSH) PRIVATE KEY",
        "AIza[0-9A-Za-z_\-]{30,}",
        "ghp_[A-Za-z0-9]{30,}"
    )
    $matches = @()
    foreach ($pattern in $patterns) {
        $found = git grep -nE $pattern -- . 2>$null
        if ($found) { $matches += $found }
    }
    if ($matches.Count -gt 0) {
        Fail "Secret-shaped strings found in tracked files:"
        $matches | ForEach-Object { Write-Host "       $_" -ForegroundColor Red }
    } else {
        Ok "Secret scan: no committed credentials detected."
    }

    # 5. Type check
    if (Test-Path (Join-Path $repoRoot "node_modules")) {
        npx tsc --noEmit | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Fail "TypeScript check failed (run 'npx tsc --noEmit' for details)."
        } else {
            Ok "TypeScript check passed."
        }
    } else {
        Write-Host "[SKIP] node_modules absent; skipping type check." -ForegroundColor DarkGray
    }

    # 6. Apps Script health (public status endpoint only — no auth, no writes)
    $deploymentId = $env:SARI_DEPLOYMENT_ID
    if (-not $deploymentId) {
        $cfgPath = Join-Path $repoRoot "sari-plugins.json"
        if (Test-Path $cfgPath) {
            try {
                $cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
                $deploymentId = $cfg.appsScript.deploymentId
            } catch {
                Write-Host "[WARN] Could not parse sari-plugins.json." -ForegroundColor Yellow
            }
        }
    }

    if (-not $deploymentId) {
        Write-Host "[SKIP] No deployment ID configured; skipping Apps Script probe." -ForegroundColor DarkGray
    } else {
        $url = "https://script.google.com/macros/s/$deploymentId/exec?action=status"
        try {
            $probe = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 15
            if ($probe.status -eq "ok") {
                Ok "Apps Script status endpoint reachable."
            } else {
                Fail "Apps Script responded with an unexpected payload."
            }
        } catch {
            Fail "Apps Script probe failed: $_"
        }
    }

    Write-Host "=====================================================" -ForegroundColor Cyan
    if ($script:failures -eq 0) {
        Write-Host "  AUDIT VERDICT: PASS ($($script:failures) failures)" -ForegroundColor Green
        Write-Host "=====================================================" -ForegroundColor Cyan
    } else {
        Write-Host "  AUDIT VERDICT: FAIL ($($script:failures) failures)" -ForegroundColor Red
        Write-Host "=====================================================" -ForegroundColor Cyan
        exit 1
    }
} finally {
    Pop-Location
}
