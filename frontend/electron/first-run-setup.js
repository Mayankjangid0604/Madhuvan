import { dialog, shell, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export async function checkFirstRun() {
  const backendDir = path.join(process.resourcesPath, 'backend');
  const nodeModulesPath = path.join(backendDir, 'node_modules');
  const setupCompletePath = path.join(backendDir, '.setup-complete');

  // Check if setup is already complete
  if (fs.existsSync(setupCompletePath)) {
    return true;
  }

  // Check if node_modules exist
  if (!fs.existsSync(nodeModulesPath)) {
    const result = dialog.showMessageBoxSync({
      type: 'info',
      title: 'First-Time Setup',
      message: 'Madhuvan - First Time Setup',
      detail: 'This appears to be the first time running the application.\n\n' +
        'The setup process will:\n' +
        '1. Install backend dependencies (may take 2-3 minutes)\n' +
        '2. Initialize the database\n' +
        '3. Configure the application\n\n' +
        'Please ensure you have an internet connection.',
      buttons: ['Start Setup', 'Exit'],
      defaultId: 0,
      cancelId: 1
    });

    if (result === 1) {
      return false; // User cancelled
    }

    // Show progress window
    const progressWindow = new BrowserWindow({
      width: 500,
      height: 200,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: true
      }
    });

    progressWindow.loadURL(`data:text/html;charset=utf-8,
      <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              height: 100vh;
            }
            h2 { margin: 0 0 10px 0; }
            p { margin: 5px 0; }
            .spinner {
              border: 4px solid rgba(255,255,255,0.3);
              border-radius: 50%;
              border-top: 4px solid white;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin-top: 20px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <h2>Setting up Madhuvan</h2>
          <p>Installing dependencies... This may take a few minutes.</p>
          <div class="spinner"></div>
        </body>
      </html>
    `);

    // Run npm install in backend directory
    return new Promise((resolve) => {
      const npmInstall = spawn('npm', ['install', '--production'], {
        cwd: backendDir,
        shell: true,
        stdio: 'pipe'
      });

      let output = '';

      npmInstall.stdout.on('data', (data) => {
        output += data.toString();
        console.log(data.toString());
      });

      npmInstall.stderr.on('data', (data) => {
        output += data.toString();
        console.error(data.toString());
      });

      npmInstall.on('close', (code) => {
        progressWindow.close();

        if (code === 0) {
          // Mark setup as complete
          fs.writeFileSync(setupCompletePath, 'Setup completed on ' + new Date().toISOString());

          dialog.showMessageBoxSync({
            type: 'info',
            title: 'Setup Complete',
            message: 'Installation Successful',
            detail: 'The application is now ready to use!',
            buttons: ['OK']
          });

          resolve(true);
        } else {
          dialog.showMessageBoxSync({
            type: 'error',
            title: 'Setup Failed',
            message: 'Installation Failed',
            detail: 'Failed to install backend dependencies.\n\n' +
              'Error code: ' + code + '\n\n' +
              'Please check your internet connection and try again.',
            buttons: ['OK']
          });

          resolve(false);
        }
      });
    });
  }

  return true;
}