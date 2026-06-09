const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');

const PORT = process.env.ETHERANA_PORT || '3217';
const HOST = '127.0.0.1';
const LOCAL_URL = `http://${HOST}:${PORT}`;

let mainWindow = null;
let nextProcess = null;

function findNextServer() {
  const candidates = [
    path.join(app.getAppPath(), '.next', 'standalone', 'server.js'),
    path.join(process.cwd(), '.next', 'standalone', 'server.js'),
  ];

  const found = candidates.find((candidate) => fs.existsSync(candidate));

  if (!found) {
    throw new Error(`Next standalone server not found.\n\nTried:\n${candidates.join('\n')}`);
  }

  return found;
}

function waitForPort(port, host, timeoutMs = 60000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.createConnection({ port: Number(port), host });

      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });

      socket.once('error', () => {
        socket.destroy();

        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${host}:${port}`));
          return;
        }

        setTimeout(tryConnect, 500);
      });
    };

    tryConnect();
  });
}

function findNodeBinary() {
  const candidates = [
    process.env.ETHERANA_NODE,
    '/usr/bin/node',
    '/usr/local/bin/node',
    '/bin/node',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return 'node';
}

function startNextServer() {
  const serverPath = findNextServer();
  const nodeBinary = findNodeBinary();
  const userDataPath = app.getPath('userData');
  const dataDir = path.join(userDataPath, 'data');

  fs.mkdirSync(dataDir, { recursive: true });

  nextProcess = spawn(nodeBinary, [serverPath], {
    cwd: path.dirname(serverPath),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT,
      HOSTNAME: HOST,
      ETHERANA_DESKTOP: '1',
      ETHERANA_DATA_DIR: dataDir,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  nextProcess.stdout.on('data', (data) => {
    console.log(`[next] ${data.toString().trim()}`);
  });

  nextProcess.stderr.on('data', (data) => {
    console.error(`[next:error] ${data.toString().trim()}`);
  });

  nextProcess.on('exit', (code) => {
    console.log(`[next] exited with code ${code}`);
  });
}

function stopNextServer() {
  if (!nextProcess || nextProcess.killed) return;

  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(nextProcess.pid), '/f', '/t']);
  } else {
    nextProcess.kill('SIGTERM');
  }

  nextProcess = null;
}

async function createWindow() {
  startNextServer();
  await waitForPort(PORT, HOST);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    title: 'Etherana SX',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  await mainWindow.loadURL(LOCAL_URL);
}

app.whenReady().then(async () => {
  try {
    await createWindow();
  } catch (error) {
    dialog.showErrorBox(
      'Etherana SX failed to start',
      error instanceof Error ? error.message : String(error)
    );
    app.quit();
  }
});

app.on('before-quit', () => {
  stopNextServer();
});

app.on('window-all-closed', () => {
  stopNextServer();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});
