# SARI_SUPER_COMMAND - read-only status (latest production deployment + recent commits only).
# Never deploys, pushes, rolls back, or writes env vars. Prints no secrets.
$ErrorActionPreference = 'Continue'
$cfgPath = Join-Path (Split-Path -Parent $PSScriptRoot) 'sari-config.json'
$sc = (Get-Content -Raw $cfgPath | ConvertFrom-Json).superCommand
if (-not $sc) { throw "superCommand missing in $cfgPath" }
$n = [int]$sc.recentCommits

function Fail($m) { [Console]::Error.WriteLine("super-command-status: $m"); exit 1 }
function JsonFrom($text) {
    $s = ($text | Out-String)
    $i = $s.IndexOf('{')
    if ($i -lt 0) { return $null }
    return ($s.Substring($i) | ConvertFrom-Json)
}

# Latest production deployment
$ls = & vercel ls $sc.vercelProject --environment production 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) { Fail "vercel ls failed: $ls" }
$m = [regex]::Match($ls, 'https://\S+\.vercel\.app')
if (-not $m.Success) { Fail 'no production deployment found' }
$raw = & vercel inspect $m.Value --format=json 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) { Fail "vercel inspect failed: $raw" }
$d = JsonFrom $raw
if (-not $d) { Fail 'vercel inspect returned no JSON' }
$sha = $null
if ($d.meta -and $d.meta.githubCommitSha) { $sha = [string]$d.meta.githubCommitSha }
elseif ($d.gitSource -and $d.gitSource.sha) { $sha = [string]$d.gitSource.sha }
$created = $null
if ($d.createdAt) { $created = [DateTimeOffset]::FromUnixTimeMilliseconds([int64]$d.createdAt).UtcDateTime.ToString('o') }

# Recent commits
$cr = & gh api "repos/$($sc.githubRepo)/commits?sha=$($sc.branch)&per_page=$n" 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) { Fail "gh api commits failed: $cr" }
$commits = @(($cr | ConvertFrom-Json) | ForEach-Object {
    [ordered]@{ sha7 = $_.sha.Substring(0,7); message = ($_.commit.message -split "`n")[0]; date = $_.commit.author.date }
})

# Latest CI run
$rr = & gh run list -R $sc.githubRepo --limit 1 --json status,conclusion,headSha 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) { Fail "gh run list failed: $rr" }
$run = $null
foreach ($r in ($rr | ConvertFrom-Json)) { if (-not $run) { $run = $r } }

$newest = ($cr | ConvertFrom-Json)[0].sha
$inSync = $null
if ($sha) { $inSync = ($sha -eq $newest) }

[ordered]@{
    name = $sc.name
    vercelProject = $sc.vercelProject
    githubRepo = $sc.githubRepo
    branch = $sc.branch
    mode = $sc.mode
    latestProductionDeployment = [ordered]@{ url = "https://$($d.url)"; state = $d.readyState; created = $created; commitSha = $sha }
    recentCommits = $commits
    latestCiRun = $run
    inSync = $inSync
} | ConvertTo-Json -Depth 6
