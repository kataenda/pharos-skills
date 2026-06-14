# run-test.ps1 — one command: build, start server, wait, test all skills, stop server.
# Usage:  .\run-test.ps1

$ErrorActionPreference = "Stop"
$BaseUrl = "http://localhost:3000"

Write-Host "`n[1/4] Building..." -ForegroundColor Cyan
npm run build | Out-Null

Write-Host "[2/4] Stopping any old server on this machine..." -ForegroundColor Cyan
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host "[3/4] Starting server..." -ForegroundColor Cyan
$server = Start-Process node -ArgumentList "dist/api/server.js" -PassThru -WindowStyle Hidden

# Wait up to ~20s for the server to answer /health
$ready = $false
for ($i = 0; $i -lt 20; $i++) {
    try {
        Invoke-WebRequest -Uri "$BaseUrl/health" -UseBasicParsing -TimeoutSec 2 | Out-Null
        $ready = $true
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}

if (-not $ready) {
    Write-Host "Server did not start in time." -ForegroundColor Red
    if ($server) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
    exit 1
}

Write-Host "[4/4] Server is up. Running tests...`n" -ForegroundColor Cyan
try {
    & "$PSScriptRoot\test-all-skills.ps1"
} finally {
    Write-Host "`nStopping server..." -ForegroundColor Cyan
    if ($server) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
    Stop-Process -Name node -Force -ErrorAction SilentlyContinue
}
