const { app, BrowserWindow, dialog } = require('electron');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');

const PORT = process.env.ETHERANA_PORT || '3217';
const HOST = '127.0.0.1';
const LOCAL_URL = `http://${HOST}:${PORT}`;

const SEARXNG_PORT = process.env.ETHERANA_SEARXNG_PORT || '8080';
const SEARXNG_URL =
  process.env.SEARXNG_URL || `http://${HOST}:${SEARXNG_PORT}`;

let mainWindow = null;
let nextProcess = null;
let searxngProcess = null;

function getSearxngPlatformFolder() {
  if (process.platform === 'win32') return 'windows';
  if (process.platform === 'darwin') return 'macos';
  return 'linux';
}

function getSearxngExecutableName() {
  return process.platform === 'win32' ? 'searxng.exe' : 'searxng';
}

function findSearxngBinary() {
  const platformFolder = getSearxngPlatformFolder();
  const executableName = getSearxngExecutableName();

  const candidates = [
    process.env.ETHERANA_SEARXNG_BIN,
    path.join(process.resourcesPath || '', 'searxng', platformFolder, executableName),
    path.join(app.getAppPath(), 'desktop', 'searxng', platformFolder, executableName),
    path.join(process.cwd(), 'desktop', 'searxng', platformFolder, executableName),
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function startSearxng() {
  const searxngBinary = findSearxngBinary();

  if (!searxngBinary) {
    console.log(
      `[searxng] No bundled runtime found. Using configured URL: ${SEARXNG_URL}`
    );
    return false;
  }

  console.log(`[searxng] Starting bundled runtime: ${searxngBinary}`);

  searxngProcess = spawn(searxngBinary, [], {
    cwd: path.dirname(searxngBinary),
    env: {
      ...process.env,
      SEARXNG_URL,
      SEARXNG_PORT,
      ETHERANA_DESKTOP: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  searxngProcess.stdout.on('data', (data) => {
    console.log(`[searxng] ${data.toString().trim()}`);
  });

  searxngProcess.stderr.on('data', (data) => {
    console.error(`[searxng:error] ${data.toString().trim()}`);
  });

  searxngProcess.on('exit', (code) => {
    console.log(`[searxng] exited with code ${code}`);
  });

  return true;
}

function isDevSearxngLauncher() {
  return (
    process.env.ETHERANA_SEARXNG_BIN &&
    process.env.ETHERANA_SEARXNG_BIN.includes('searxng-dev-launcher')
  );
}

function stopDevDockerSearxng() {
  if (!isDevSearxngLauncher()) return;

  if (process.env.ETHERANA_KEEP_SEARXNG === '1') {
    console.log('[searxng] ETHERANA_KEEP_SEARXNG=1, leaving dev SearXNG running.');
    return;
  }

  const composeFile = path.join(process.cwd(), 'docker-compose.searxng-local.yaml');

  console.log('[searxng] Stopping dev Docker SearXNG from Electron...');

  let result = spawnSync(
    'docker',
    ['compose', '-f', composeFile, 'down', '--remove-orphans'],
    {
      cwd: process.cwd(),
      stdio: 'inherit',
    },
  );

  if (result.status !== 0) {
    result = spawnSync(
      'docker-compose',
      ['-f', composeFile, 'down', '--remove-orphans'],
      {
        cwd: process.cwd(),
        stdio: 'inherit',
      },
    );
  }

  if (result.status === 0) {
    console.log('[searxng] Dev Docker SearXNG stopped.');
  } else {
    console.error('[searxng] Failed to stop dev Docker SearXNG.');
  }
}

function stopSearxng() {
  if (searxngProcess && !searxngProcess.killed) {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(searxngProcess.pid), '/f', '/t']);
    } else {
      searxngProcess.kill('SIGTERM');
    }
  }

  stopDevDockerSearxng();

  searxngProcess = null;
}

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
  const startedBundledSearxng = startSearxng();

  if (startedBundledSearxng) {
    await waitForPort(SEARXNG_PORT, HOST);
  }

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
  stopSearxng();
});

app.on('window-all-closed', () => {
  stopNextServer();
  stopSearxng();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});
