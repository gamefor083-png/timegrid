const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow = null;
let backendProcess = null;

const isDev = !app.isPackaged;
const BACKEND_PORT = 8000;
const FRONTEND_DEV_PORT = 3000;

function startBackend() {
  const backendDir = isDev
    ? path.join(__dirname, '..', '..', 'backend')
    : path.join(process.resourcesPath, 'backend');

  const pythonExe = isDev
    ? 'python'
    : path.join(process.resourcesPath, 'backend', 'venv', 'Scripts', 'python.exe');

  console.log(`Starting backend from: ${backendDir}`);

  backendProcess = spawn(
    pythonExe,
    ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', String(BACKEND_PORT)],
    {
      cwd: backendDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
      shell: true,
    }
  );

  backendProcess.stdout.on('data', (data) => {
    console.log(`[Backend] ${data.toString().trim()}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.log(`[Backend] ${data.toString().trim()}`);
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend:', err);
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
    backendProcess = null;
  });
}

function stopBackend() {
  if (backendProcess) {
    console.log('Stopping backend...');
    // On Windows, we need to kill the process tree
    spawn('taskkill', ['/pid', String(backendProcess.pid), '/f', '/t'], { shell: true });
    backendProcess = null;
  }
}

async function waitForBackend(maxRetries = 30) {
  const http = require('http');
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${BACKEND_PORT}/`, (res) => {
          resolve(res);
        });
        req.on('error', reject);
        req.setTimeout(1000, () => { req.destroy(); reject(new Error('timeout')); });
      });
      console.log('Backend is ready!');
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  console.error('Backend failed to start after retries');
  return false;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'TimeGrid — Timetable Generator',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    show: false,
    backgroundColor: '#f8fafc',
  });

  // Remove default menu for cleaner look
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        { role: 'reload', label: 'Refresh' },
        { type: 'separator' },
        { role: 'quit', label: 'Exit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    ...(isDev ? [{
      label: 'Developer',
      submenu: [
        { role: 'toggleDevTools' },
      ],
    }] : []),
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  if (isDev) {
    mainWindow.loadURL(`http://localhost:${FRONTEND_DEV_PORT}`);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

async function isBackendAlreadyRunning() {
  const http = require('http');
  try {
    await new Promise((resolve, reject) => {
      const req = http.get(`http://127.0.0.1:${BACKEND_PORT}/`, (res) => {
        resolve(res);
      });
      req.on('error', reject);
      req.setTimeout(1000, () => { req.destroy(); reject(new Error('timeout')); });
    });
    return true;
  } catch {
    return false;
  }
}

app.whenReady().then(async () => {
  const alreadyRunning = await isBackendAlreadyRunning();

  if (alreadyRunning) {
    console.log('Backend already running on port ' + BACKEND_PORT + ', skipping launch.');
  } else {
    startBackend();
    await waitForBackend();
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  stopBackend();
});
