@echo off
echo Installing Backend Dependencies...
echo.

cd /d "%~dp0"

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js first from https://nodejs.org/
    pause
    exit /b 1
)

echo Installing npm packages...
call npm install

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Dependencies installed successfully!
) else (
    echo.
    echo ✗ Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo Creating required directories...
if not exist "data" mkdir data
if not exist "backups" mkdir backups
if not exist "uploads\students" mkdir uploads\students

echo.
echo ✓ Setup complete!
pause