const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const { spawn, exec, execSync } = require("child_process");
const fs = require("fs");

let backendProcess;
let mainWindow;
let isQuitting = false;
let backendReady = false;

ipcMain.handle("backend:get-status", async () => {
  return {
    ready: backendReady,
    pid: backendProcess?.pid ?? null
  };
});

ipcMain.handle("backend:wait-for-ready", async (_event, timeoutMs = 20000) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (backendReady) {
      return {
        ready: true,
        pid: backendProcess?.pid ?? null
      };
    }

    const healthy = await checkBackendHealth();
    if (healthy) {
      backendReady = true;
      return {
        ready: true,
        pid: backendProcess?.pid ?? null
      };
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return {
    ready: false,
    error: "Backend did not become ready in time"
  };
});

// Find Node.js executable
function findNodePath() {
  const possiblePaths = [
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs', 'node.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'nodejs', 'node.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'nodejs', 'node.exe'),
    path.join(process.env.APPDATA || '', 'npm', 'node.exe'),
    'C:\\Program Files\\nodejs\\node.exe',
    'C:\\nodejs\\node.exe',
    'C:\\Program Files\\nodejs\\node.exe',
    'C:\\Program Files (x86)\\nodejs\\node.exe',
  ];

  // Check fixed paths first
  for (const nodePath of possiblePaths) {
    if (nodePath && fs.existsSync(nodePath)) {
      console.log("✅ Found Node.js at:", nodePath);
      return nodePath;
    }
  }

  // Search each directory in PATH
  try {
    const pathDirs = (process.env.PATH || '').split(path.delimiter);
    for (const dir of pathDirs) {
      const candidate = path.join(dir, 'node.exe');
      if (fs.existsSync(candidate)) {
        console.log("✅ Found Node.js in PATH at:", candidate);
        return candidate;
      }
    }
  } catch (e) {
    console.warn("⚠️ PATH search failed:", e.message);
  }

  // Try 'where node' shell command as last resort (Windows)
  try {
    const result = execSync('where node', { timeout: 3000, encoding: 'utf8' }).trim();
    const firstLine = result.split('\n')[0].trim();
    if (firstLine && fs.existsSync(firstLine)) {
      console.log("✅ Found Node.js via 'where node':", firstLine);
      return firstLine;
    }
  } catch (e) {
    console.warn("⚠️ 'where node' failed:", e.message);
  }

  console.log("⚠️ Node.js not found in any location, using 'node' command");
  return 'node';
}

function getBackendPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "backend", "src", "app.js");
  }
  return path.join(__dirname, "..", "..", "backend", "src", "app.js");
}

// ✅ NEW: Kill backend process properly on Windows
function killBackend() {
  return new Promise((resolve) => {
    if (!backendProcess) {
      console.log("ℹ️ No backend process to kill");
      resolve();
      return;
    }

    const pid = backendProcess.pid;
    console.log(`🛑 Killing backend process (PID: ${pid})...`);

    if (process.platform === 'win32') {
      // Windows: Use taskkill to force kill the process tree
      exec(`taskkill /PID ${pid} /T /F`, (error) => {
        if (error) {
          console.log(`⚠️ taskkill error (may already be dead):`, error.message);
        } else {
          console.log(`✅ Backend process killed successfully`);
        }
        backendProcess = null;
        resolve();
      });
    } else {
      // Unix/Mac: Use process.kill
      try {
        process.kill(-pid, 'SIGTERM'); // Kill process group
      } catch (err) {
        try {
          backendProcess.kill('SIGTERM');
        } catch (err2) {
          console.log(`⚠️ Kill error:`, err2.message);
        }
      }
      backendProcess = null;
      resolve();
    }
  });
}

// ✅ NEW: Also kill any orphaned node processes running our backend
function killOrphanedBackend() {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      // Find and kill any node.exe running app.js on port 5001
      exec('netstat -ano | findstr ":5001"', (error, stdout) => {
        if (stdout) {
          const lines = stdout.trim().split('\n');
          const pids = new Set();
          
          lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && !isNaN(pid) && pid !== '0') {
              pids.add(pid);
            }
          });

          pids.forEach(pid => {
            console.log(`🧹 Killing orphaned process on port 5001 (PID: ${pid})`);
            exec(`taskkill /PID ${pid} /F`, () => {});
          });
        }
        setTimeout(resolve, 500);
      });
    } else {
      exec('lsof -ti:5001 | xargs kill -9 2>/dev/null', () => {
        resolve();
      });
    }
  });
}

async function startBackend() {
  const backendPath = getBackendPath();
  const backendDir = path.dirname(backendPath);

  if (!fs.existsSync(backendPath)) {
    console.error("❌ Backend file not found:", backendPath);
    dialog.showErrorBox("Backend Error", `Backend file not found:\n${backendPath}`);
    return false;
  }

  // ✅ Kill any orphaned backend first
  await killOrphanedBackend();

  const nodePath = app.isPackaged ? process.execPath : findNodePath();
  
  console.log("🚀 Starting backend...");
  console.log("📁 Node path:", nodePath);
  console.log("📁 Backend path:", backendPath);
  console.log("📁 Backend dir:", backendDir);

  const logDir = app.getPath('userData');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logFile = path.join(logDir, 'backend.log');
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  return new Promise((resolve) => {
    // ✅ CHANGED: Use spawn instead of exec for better process control
    const envVars = {
      ...process.env,
      NODE_ENV: 'production'
    };
    if (app.isPackaged) {
      envVars.ELECTRON_RUN_AS_NODE = '1';
    }

    logStream.write(`\n\n=== BACKEND START AT ${new Date().toISOString()} ===\n`);
    logStream.write(`Node Path: ${nodePath}\n`);
    logStream.write(`Backend Path: ${backendPath}\n`);
    logStream.write(`Backend Dir: ${backendDir}\n`);
    logStream.write(`app.isPackaged: ${app.isPackaged}\n`);
    logStream.write(`ELECTRON_RUN_AS_NODE: ${envVars.ELECTRON_RUN_AS_NODE}\n`);

    backendProcess = spawn(nodePath, [backendPath], {
      cwd: backendDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      detached: false, // ✅ Important: Don't detach on Windows
      env: envVars
    });

    console.log(`📝 Backend started with PID: ${backendProcess.pid}`);
    logStream.write(`Process spawned. PID: ${backendProcess.pid}\n`);

    let resolved = false;
    let output = '';

    backendProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      logStream.write(`[STDOUT] ${chunk}`);
      output += chunk;
      console.log('📦 Backend:', chunk.trim());
      
      if (!resolved && (output.includes('BACKEND READY') || output.includes('Backend Ready') || output.includes('Routes loaded'))) {
        console.log("✅ Backend startup confirmed");
        resolved = true;
        backendReady = true;
        setTimeout(() => resolve(true), 2000);
      }
    });

    backendProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      logStream.write(`[STDERR] ${chunk}`);
      console.error('❌ Backend Error:', chunk.trim());
    });

    backendProcess.on('error', async (err) => {
      logStream.write(`[ERROR event] ${err.stack || err.message}\n`);
      console.error('❌ Backend spawn error:', err.message);
      if (!resolved) {
        resolved = true;
        backendReady = false;
        const isHealthy = await checkBackendHealth();
        backendReady = isHealthy;
        resolve(isHealthy);
      }
    });

    backendProcess.on('close', async (code) => {
      logStream.write(`[CLOSE event] Code: ${code}\n`);
      console.log(`Backend closed with code: ${code}`);
      backendProcess = null;
      if (!resolved) {
        resolved = true;
        // If it closed due to EADDRINUSE but another backend instance is already running gracefully, let it pass
        const isHealthy = await checkBackendHealth();
        backendReady = isHealthy;
        if (isHealthy) {
          console.log("✅ Backend process closed but health check passed (re-using existing backend process)");
          resolve(true);
        } else {
          backendReady = false;
          resolve(false);
        }
      }
    });

    setTimeout(() => {
      if (!resolved) {
        console.log("⏰ Backend startup timeout, checking health...");
        resolved = true;
        checkBackendHealth().then((isHealthy) => {
          backendReady = isHealthy;
          resolve(isHealthy);
        });
      }
    }, 60000);
  });
}

async function checkBackendHealth() {
  console.log("🔍 Checking backend health...");
  
  for (let i = 0; i < 10; i++) {
    try {
      const http = require('http');
      const result = await new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:5001/health', (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject);
        req.setTimeout(2000, () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });
      
      if (result.status === 200) {
        try {
          const json = JSON.parse(result.data);
          if (json.status === 'OK') {
            console.log("✅ Backend health check passed (JSON)");
            return true;
          }
        } catch {
          if (result.data.trim() === 'OK') {
            console.log("✅ Backend health check passed (plain)");
            return true;
          }
        }
      }
    } catch (err) {
      console.log(`Health check attempt ${i + 1}/10 failed:`, err.message);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log("❌ Backend health check failed after 10 attempts");
  return false;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // ✅ Handle window close properly
  mainWindow.on('close', async (e) => {
    if (!isQuitting) {
      e.preventDefault();
      isQuitting = true;
      console.log("🛑 Window closing, cleaning up...");
      await killBackend();
      mainWindow.destroy();
      app.quit();
    }
  });

  if (app.isPackaged) {
    const indexPath = path.join(__dirname, "..", "dist", "index.html");
    console.log("📄 Loading:", indexPath);
    mainWindow.loadFile(indexPath);
  } else {
    mainWindow.loadURL("http://localhost:5173");
  }

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
    
    if (input.control && input.shift && input.key.toLowerCase() === 'i' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
    
    if (input.control && input.key.toLowerCase() === 'r' && input.type === 'keyDown') {
      mainWindow.webContents.reload();
      event.preventDefault();
    }
  });

  return mainWindow;
}

app.whenReady().then(async () => {
  console.log("=".repeat(50));
  console.log("🚀 MADHUVAN APP STARTING");
  console.log("=".repeat(50));
  console.log("📁 isPackaged:", app.isPackaged);
  console.log("📁 resourcesPath:", process.resourcesPath);
  console.log("📁 __dirname:", __dirname);
  console.log("📁 process.cwd():", process.cwd());
  console.log("=".repeat(50));
  
  const backendStarted = await startBackend();
  backendReady = backendStarted;
  
  console.log("📊 Backend started:", backendStarted);
  
  if (!backendStarted) {
    const result = await dialog.showMessageBox({
      type: 'warning',
      title: 'Backend Warning',
      message: 'Backend server failed to start automatically.',
      detail: 'The app will continue, but some features may not work.\n\nYou can try starting the backend manually.',
      buttons: ['Continue Anyway', 'Exit']
    });
    
    if (result.response === 1) {
      await killBackend();
      app.quit();
      return;
    }
  }
  
  console.log("⏳ Waiting for routes to load...");
  await new Promise(r => setTimeout(r, 3000));
  
  const isHealthy = await checkBackendHealth();
  console.log("📊 Final health check:", isHealthy);
  
  console.log("🖥️ Creating window...");
  createWindow();
});

// ✅ Handle all windows closed
app.on('window-all-closed', async () => {
  console.log("🛑 All windows closed");
  await killBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ✅ Cleanup before quit
app.on('before-quit', async (e) => {
  if (backendProcess && !isQuitting) {
    e.preventDefault();
    console.log("🛑 Before quit - killing backend...");
    await killBackend();
    app.quit();
  }
});

// ✅ Final cleanup on quit
app.on('quit', () => {
  console.log("👋 App quit");
  // Force kill any remaining processes synchronously
  if (backendProcess && backendProcess.pid) {
    try {
      if (process.platform === 'win32') {
        require('child_process').execSync(`taskkill /PID ${backendProcess.pid} /T /F`, { stdio: 'ignore' });
      } else {
        process.kill(backendProcess.pid);
      }
    } catch (err) {
      // Process already dead
    }
  }
});

// ✅ Handle uncaught exceptions - cleanup before crash
process.on('uncaughtException', async (error) => {
  console.error('💥 Uncaught Exception:', error);
  await killBackend();
  app.quit();
});

// ✅ Handle unhandled rejections
process.on('unhandledRejection', async (reason) => {
  console.error('💥 Unhandled Rejection:', reason);
});