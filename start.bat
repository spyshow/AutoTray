@echo off
setlocal enabledelayedexpansion

echo =====================================================================
echo   AutoTray-Router: Industrial Cable Tray & Riser Sizing Engine
echo =====================================================================
echo.

cd /d "%~dp0"

:: 1. Check & setup Backend virtualenv
echo [1/3] Checking Backend environment...
if not exist "backend\.venv\Scripts\python.exe" (
    echo       Virtual environment not found. Creating backend\.venv...
    py -3.11 -m venv backend\.venv 2>nul || python -m venv backend\.venv
    echo       Installing backend requirements...
    backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
) else (
    echo       Backend environment ready.
)

:: 2. Check & setup Frontend dependencies
echo [2/3] Checking Frontend dependencies...
if not exist "frontend\node_modules" (
    echo       node_modules not found. Installing frontend dependencies...
    cd frontend && npm install && cd ..
) else (
    echo       Frontend dependencies ready.
)

:: 3. Launch Backend and Frontend
echo [3/3] Starting Backend (Port 8000) and Frontend (Port 3000)...
start "AutoTray-Router Backend (FastAPI)" cmd /k "cd /d "%~dp0backend" && .\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000 --reload"
start "AutoTray-Router Frontend (Next.js)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Application starting! Opening browser in 4 seconds...
timeout /t 4 /nobreak >nul
start http://localhost:3000

echo.
echo =====================================================================
echo   Services are running!
echo   - Frontend: http://localhost:3000
echo   - Backend Docs: http://localhost:8000/docs
echo =====================================================================
