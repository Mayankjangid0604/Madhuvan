@echo off
echo ========================================
echo  Building Madhuvan
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Step 1: Cleaning previous builds...
if exist "dist" rmdir /s /q dist
if exist "dist-electron" rmdir /s /q dist-electron
if exist "resources\backend" rmdir /s /q resources\backend
echo.

echo Step 2: Installing frontend dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install frontend dependencies!
    pause
    exit /b 1
)
echo.

echo Step 3: Building React app...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to build React app!
    pause
    exit /b 1
)
echo.

echo Step 4: Building backend runtime (CRITICAL)...
cd /d "%~dp0.."
call node backend\build.js
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Backend runtime build failed!
    pause
    exit /b 1
)
cd frontend
echo.

echo Step 5: Building Electron installer...
call npm run electron:build:win
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to build Electron app!
    pause
    exit /b 1
)
echo.

echo ========================================
echo ✓ Build Complete!
echo ========================================
echo.
echo Installer location:
echo %CD%\dist-electron\
echo.
echo The installer file is:
echo   Madhuvan Setup 1.0.0.exe
echo.
pause
