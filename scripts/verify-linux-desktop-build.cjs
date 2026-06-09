const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const releaseDir = path.join(root, 'release');
const unpackedDir = path.join(releaseDir, 'linux-unpacked');

const requiredFiles = [
  {
    label: 'Linux executable',
    path: path.join(unpackedDir, 'etherana-sx'),
    executable: true,
  },
  {
    label: 'Next standalone server',
    path: path.join(unpackedDir, 'resources', 'app', '.next', 'standalone', 'server.js'),
  },
  {
    label: 'Bundled Node runtime',
    path: path.join(unpackedDir, 'resources', 'node', 'linux', 'node'),
    executable: true,
  },
  {
    label: 'Bundled SearXNG launcher',
    path: path.join(unpackedDir, 'resources', 'searxng', 'linux', 'searxng'),
    executable: true,
  },
  {
    label: 'Bundled SearXNG Python',
    path: path.join(
      unpackedDir,
      'resources',
      'searxng',
      'linux',
      'runtime',
      'venv',
      'bin',
      'python',
    ),
    executable: true,
  },
  {
    label: 'Bundled SearXNG settings',
    path: path.join(
      unpackedDir,
      'resources',
      'searxng',
      'linux',
      'runtime',
      'settings.yml',
    ),
  },
];

function assertFile({ label, path: filePath, executable }) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} missing: ${path.relative(root, filePath)}`);
  }

  const stat = fs.statSync(filePath);

  if (!stat.isFile()) {
    throw new Error(`${label} is not a file: ${path.relative(root, filePath)}`);
  }

  if (executable && (stat.mode & 0o111) === 0) {
    throw new Error(`${label} is not executable: ${path.relative(root, filePath)}`);
  }

  console.log(`✓ ${label}: ${path.relative(root, filePath)}`);
}

function findAppImage() {
  if (!fs.existsSync(releaseDir)) return null;

  return fs
    .readdirSync(releaseDir)
    .find((file) => file.endsWith('.AppImage'));
}

try {
  for (const file of requiredFiles) {
    assertFile(file);
  }

  const nodePath = path.join(unpackedDir, 'resources', 'node', 'linux', 'node');
  const nodeVersion = spawnSync(nodePath, ['-v'], { encoding: 'utf8' });

  if (nodeVersion.status !== 0) {
    throw new Error('Bundled Node runtime failed to execute.');
  }

  console.log(`✓ Bundled Node executes: ${nodeVersion.stdout.trim()}`);

  const appImage = findAppImage();

  if (!appImage) {
    throw new Error('No AppImage found in release/.');
  }

  const appImagePath = path.join(releaseDir, appImage);
  const appImageStat = fs.statSync(appImagePath);
  const sha256 = crypto
    .createHash('sha256')
    .update(fs.readFileSync(appImagePath))
    .digest('hex');

  console.log(`✓ AppImage: ${path.relative(root, appImagePath)}`);
  console.log(`✓ AppImage size: ${(appImageStat.size / 1024 / 1024).toFixed(1)} MB`);
  console.log(`✓ AppImage sha256: ${sha256}`);

  console.log('\nLinux desktop build verification passed.');
} catch (error) {
  console.error('\nLinux desktop build verification failed.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
