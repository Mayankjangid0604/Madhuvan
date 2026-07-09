@echo off
echo Starting Madhuvan...
echo.

REM Start backend
cd /d "%~dp0..\..\backend"
start "Backend Server" cmd /k "npm start"

REM Wait for backend
timeout /t 5 /nobreak

REM Start frontend
cd /d "%~dp0.."
npm run electron:dev

pause