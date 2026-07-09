@echo off
set DATA_DIR=%APPDATA%\Madhuvan
set UPLOADS_DIR=%DATA_DIR%\uploads
set STUDENT_UPLOADS=%UPLOADS_DIR%\students
set LOGO_UPLOADS=%UPLOADS_DIR%\logos
echo ========================================
echo   Madhuvan - Backend
echo ========================================
echo.

REM Get the directory where this script is located
cd /d "%~dp0"

echo Current Directory: %CD%
echo.

REM Check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

REM Create necessary directories silently
if not exist "data" mkdir data 2>nul
if not exist "backups" mkdir backups 2>nul
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%" 2>nul
if not exist "%UPLOADS_DIR%" mkdir "%UPLOADS_DIR%" 2>nul
if not exist "%STUDENT_UPLOADS%" mkdir "%STUDENT_UPLOADS%" 2>nul

REM Ensure uploads directory exists (auto-create on install)

REM Check if .env exists, if not copy from .env.example
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul 2>&1
    )
)

REM Force production mode
set NODE_ENV=production

REM ===== CRITICAL SECTION: ENSURE DEPENDENCIES EXIST =====
if not exist "node_modules" (
    echo node_modules not found. Installing production dependencies...
    call npm install --omit=dev
)

echo ========================================
echo Starting backend server...
echo Backend will be available at: http://localhost:5001
echo API endpoints at: http://localhost:5001/api
echo.
echo DO NOT CLOSE THIS WINDOW!
echo ========================================
echo.

REM ===== START BACKEND CORRECTLY =====
cd /d "%~dp0"
node "%~dp0src\app.js"

echo.
echo ========================================
echo Backend server has stopped!
echo.
if %ERRORLEVEL% NEQ 0 (
    echo ERROR CODE: %ERRORLEVEL%
)
pause >nul