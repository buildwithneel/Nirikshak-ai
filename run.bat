@echo off
title NIRIKSHAK AI — Official Inspection Platform
color 0A

echo =====================================================================
echo                 NIRIKSHAK AI - SYSTEM LAUNCHER
echo       Legal Metrology (Packaged Commodities) Rules Platform
echo =====================================================================
echo.
echo [1/3] Starting FastAPI Backend (PaddleOCR + Legal Metrology Engine)...
start "NIRIKSHAK AI - Backend API" cmd /k "cd /d "%~dp0backend" && python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

echo [2/3] Starting Vite React Frontend Dev Server...
start "NIRIKSHAK AI - Frontend Web" cmd /k "cd /d "%~dp0" && npm.cmd run dev"

echo [3/3] Opening NIRIKSHAK AI in browser...
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo =====================================================================
echo  STATUS: NIRIKSHAK AI IS NOW RUNNING!
echo =====================================================================
echo   * Web Application: http://localhost:5173
echo   * Backend API:     http://127.0.0.1:8000
echo   * Swagger API Doc: http://127.0.0.1:8000/docs
echo.
echo  PRE-CONFIGURED DEMO ACCOUNTS:
echo   * Inspection Officer: inspector@officer.demo  ^|  Pass: Officer@2026!
echo   * Citizen Consumer:   citizen@gmail.com       ^|  Pass: Citizen@2026!
echo =====================================================================
echo.
echo Press any key to exit this launcher window (servers will remain active).
pause >nul
