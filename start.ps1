<#
.SYNOPSIS
    One-command launcher for AutoTray-Router (Backend + Frontend).
.DESCRIPTION
    Checks virtualenv and node_modules, launches FastAPI backend on port 8000
    and Next.js frontend on port 3000, then opens the browser.
#>

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "  AutoTray-Router: Industrial Cable Tray & Riser Sizing Engine" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Backend Verification
Write-Host "[1/3] Checking Backend environment..." -ForegroundColor Yellow
$BackendPython = Join-Path $ScriptDir "backend\.venv\Scripts\python.exe"
if (-not (Test-Path $BackendPython)) {
    Write-Host "      Virtual environment not found. Initializing backend\.venv..." -ForegroundColor Gray
    python -m venv (Join-Path $ScriptDir "backend\.venv")
    & (Join-Path $ScriptDir "backend\.venv\Scripts\python.exe") -m pip install -r (Join-Path $ScriptDir "backend\requirements.txt")
} else {
    & (Join-Path $ScriptDir "backend\.venv\Scripts\python.exe") -m pip install -q -r (Join-Path $ScriptDir "backend\requirements.txt")
    Write-Host "      Backend environment ready." -ForegroundColor Green
}

# 2. Frontend Verification
Write-Host "[2/3] Checking Frontend dependencies..." -ForegroundColor Yellow
$NodeModules = Join-Path $ScriptDir "frontend\node_modules"
if (-not (Test-Path $NodeModules)) {
    Write-Host "      node_modules not found. Running npm install..." -ForegroundColor Gray
    Push-Location (Join-Path $ScriptDir "frontend")
    npm install
    Pop-Location
} else {
    Write-Host "      Frontend dependencies ready." -ForegroundColor Green
}

# 3. Launch Services
Write-Host "[3/3] Starting Backend and Frontend..." -ForegroundColor Yellow

# Launch Backend in new window
$BackendCmd = "Set-Location '$ScriptDir\backend'; & '.\.venv\Scripts\python.exe' -m uvicorn app.main:app --port 8000 --reload"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $BackendCmd

# Launch Frontend in new window
$FrontendCmd = "Set-Location '$ScriptDir\frontend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $FrontendCmd

Write-Host ""
Write-Host "Opening web application at http://localhost:3000..." -ForegroundColor Cyan
Start-Sleep -Seconds 4
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "  AutoTray-Router is up and running!" -ForegroundColor Green
Write-Host "  - Web UI:      http://localhost:3000" -ForegroundColor Green
Write-Host "  - API Swagger: http://localhost:8000/docs" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Green
