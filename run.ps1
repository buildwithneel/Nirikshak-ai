# NIRIKSHAK AI — PowerShell Launcher
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "                 NIRIKSHAK AI - SYSTEM LAUNCHER                      " -ForegroundColor White
Write-Host "       Legal Metrology (Packaged Commodities) Rules Platform         " -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host "[1/3] Starting FastAPI Backend (Port 8000)..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$ScriptDir\backend`" && python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

Write-Host "[2/3] Starting Vite Frontend (Port 5173)..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$ScriptDir`" && npm.cmd run dev"

Write-Host "[3/3] Opening browser at http://localhost:5173..." -ForegroundColor Cyan
Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "  STATUS: NIRIKSHAK AI SERVERS LAUNCHED SUCCESSFULLY" -ForegroundColor White
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "  * Web Application: http://localhost:5173" -ForegroundColor Yellow
Write-Host "  * Backend API:     http://127.0.0.1:8000" -ForegroundColor Yellow
Write-Host "  * Swagger Docs:    http://127.0.0.1:8000/docs" -ForegroundColor Yellow
Write-Host ""
Write-Host "  DEMO CREDENTIALS:" -ForegroundColor White
Write-Host "  - Officer: inspector@officer.demo  | Password: Officer@2026!" -ForegroundColor Gray
Write-Host "  - Citizen: citizen@gmail.com       | Password: Citizen@2026!" -ForegroundColor Gray
Write-Host "=====================================================================" -ForegroundColor Green
