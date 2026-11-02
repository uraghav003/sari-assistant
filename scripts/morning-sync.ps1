param(
    [string]$RepoPath = "$PSScriptRoot"
)

$ErrorActionPreference = "Stop"
$logDir = Join-Path $RepoPath "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$logFile = Join-Path $logDir "morning-sync.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

try {
    Add-Content -Path $logFile -Value "[$timestamp] Starting morning sync & self-learn..."
    Push-Location $RepoPath
    
    # 1. Pull latest changes safely
    git pull --ff-only origin main 2>&1 | Add-Content $logFile
    
    # 2. Reinstall deps if package.json changed & rebuild
    npm install --legacy-peer-deps 2>&1 | Add-Content $logFile
    npm run build 2>&1 | Add-Content $logFile
    
    Add-Content -Path $logFile "[$timestamp] Morning sync & build completed successfully."
} catch {
    Add-Content -Path $logFile "[$timestamp] ERROR: $_"
    exit 1
} finally {
    Pop-Location
}
