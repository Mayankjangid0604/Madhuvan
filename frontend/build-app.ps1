# build-app.ps1 - Complete Build Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Madhuvan Hostel - Build Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Step 1: Kill any running processes
Write-Host "`n[1/6] Cleaning up processes..." -ForegroundColor Yellow
taskkill /F /IM Madhuvan.exe 2>$null
taskkill /F /IM electron.exe 2>$null
taskkill /F /IM node.exe 2>$null
npx kill-port 5001 2>$null
Start-Sleep -Seconds 2

# Step 2: Clean old builds
Write-Host "[2/6] Cleaning old builds..." -ForegroundColor Yellow
if (Test-Path "dist-electron") {
    Remove-Item -Recurse -Force "dist-electron" -ErrorAction SilentlyContinue
}
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue
}

# Step 3: Install backend dependencies
Write-Host "[3/6] Installing backend dependencies..." -ForegroundColor Yellow
Push-Location ../backend
npm install --production
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install backend dependencies!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "  ✅ Backend dependencies installed" -ForegroundColor Green

# Step 4: Verify backend node_modules
Write-Host "[4/6] Verifying backend node_modules..." -ForegroundColor Yellow
if (-not (Test-Path "../backend/node_modules")) {
    Write-Host "ERROR: Backend node_modules not found!" -ForegroundColor Red
    exit 1
}
$moduleCount = (Get-ChildItem "../backend/node_modules" -Directory).Count
Write-Host "  ✅ Found $moduleCount modules in backend" -ForegroundColor Green

# Step 5: Build frontend
Write-Host "[5/6] Building frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Frontend build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Frontend built" -ForegroundColor Green

# Step 6: Package with Electron
Write-Host "[6/6] Packaging Electron app..." -ForegroundColor Yellow
npx electron-builder --win
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Electron build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  BUILD SUCCESSFUL!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Output: dist-electron\" -ForegroundColor Cyan
Write-Host "Installer: dist-electron\Madhuvan Setup*.exe" -ForegroundColor Cyan