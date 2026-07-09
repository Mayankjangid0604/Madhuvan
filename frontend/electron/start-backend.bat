@echo off
echo Starting Madhuvan Backend...
cd /d "%~dp0..\resources\backend\src"
echo Backend directory: %CD%
node app.js
pause