const path = require("path");
const { spawn } = require('child_process');
const fs = require("fs");
const { rebuild } = require('@electron/rebuild');

module.exports = async function afterPack(context) {
  console.log("🔧 Running afterPack...");
  
  const backendPath = path.join(context.appOutDir, 'resources', 'backend');
  
  console.log("📦 Backend path:", backendPath);
  
  if (!fs.existsSync(backendPath)) {
    console.error("❌ Backend folder not found!");
    return;
  }
  
  // Install dependencies
  console.log("📦 Installing backend dependencies...");
  
  await new Promise((resolve) => {
    const npm = spawn('npm', ['install', '--production', '--omit=optional'], {
      cwd: backendPath,
      stdio: 'inherit',
      shell: true
    });
    
    npm.on('close', (code) => {
      console.log(`npm install finished with code: ${code}`);
      resolve();
    });
    
    npm.on('error', (err) => {
      console.error("npm error:", err);
      resolve();
    });
  });
  
  // Resolve Electron version from package.json since context.electronVersion might be undefined
  const pkg = require(path.join(context.packager.projectDir, 'package.json'));
  const electronVersion = context.electronVersion || pkg.devDependencies.electron.replace(/^[^\d]+/, '');
  
  // Map electron-builder arch (number) to string, or fallback to process.arch
  const archMap = { 0: 'ia32', 1: 'x64', 2: 'armv7l', 3: 'arm64' };
  const archStr = archMap[context.arch] || process.arch;
  
  console.log(`🔧 Rebuilding native modules for Electron ${electronVersion} (${archStr})...`);
  
  try {
    await rebuild({
      buildPath: backendPath,
      electronVersion: electronVersion,
      arch: archStr,
      force: true
    });
    console.log("✅ Rebuild completed successfully using @electron/rebuild");
  } catch (err) {
    console.error("❌ Rebuild failed using @electron/rebuild:", err);
  }
  
  console.log("✅ afterPack completed");
};