const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const releaseDir = path.join(root, 'release');
const unpackedDir = path.join(releaseDir, 'win-unpacked');

function findWindowsExecutable() {
  if (!fs.existsSync(unpackedDir)) return null;

  return fs
    .readdirSync(unpackedDir)
    .find((file) => file.endsWith('.exe') && !file.toLowerCase().includes('elevate'));
}

const appExe = findWindowsExecutable();

const requiredFiles = [
  {
    label: 'Windows unpacked app executable',
    path: appExe ? path.join(unpackedDir, appExe) : path.join(unpackedDir, 'Etherana SX.exe'),
  },
  {
    label: 'Next standalone server',
    path: path.join(unpackedDir, 'resources', 'app', '.next', 'standalone', 'server.js'),
  },
  {
    label: 'Bundled Windows Node runtime',
    path: path.join(unpackedDir, 'resources', 'node', 'windows', 'node.exe'),
  },
  {
    label: 'Bundled Windows SearXNG runtime',
    path: path.join(unpackedDir, 'resources', 'searxng', 'windows', 'searxng.exe'),
  },
];

function assertFile({ label, path: filePath }) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} missing: ${path.relative(root, filePath)}`);
  }

  const stat = fs.statSync(filePath);

  if (!stat.isFile()) {
    throw new Error(`${label} is not a file: ${path.relative(root, filePath)}`);
  }

  console.log(`✓ ${label}: ${path.relative(root, filePath)}`);
}

try {
  for (const file of requiredFiles) {
    assertFile(file);
  }

  const nodePath = path.join(unpackedDir, 'resources', 'node', 'windows', 'node.exe');
  const nodeVersion = spawnSync(nodePath, ['-v'], { encoding: 'utf8' });

  if (nodeVersion.status !== 0) {
    throw new Error('Bundled Windows Node runtime failed to execute.');
  }

  console.log(`✓ Bundled Windows Node executes: ${nodeVersion.stdout.trim()}`);

  const setupExe = fs.existsSync(releaseDir)
    ? fs.readdirSync(releaseDir).find((file) => file.endsWith('.exe'))
    : null;

  if (!setupExe) {
    throw new Error('No Windows installer .exe found in release/.');
  }

  console.log(`✓ Windows installer: ${path.relative(root, path.join(releaseDir, setupExe))}`);

  console.log('\nWindows desktop build verification passed.');
} catch (error) {
  console.error('\nWindows desktop build verification failed.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
