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

function findFirstFile(startDir, matcher, maxDepth = 8) {
  if (!fs.existsSync(startDir) || maxDepth < 0) return null;

  for (const entry of fs.readdirSync(startDir, { withFileTypes: true })) {
    const fullPath = path.join(startDir, entry.name);

    if (entry.isFile() && matcher(fullPath)) {
      return fullPath;
    }

    if (entry.isDirectory()) {
      const found = findFirstFile(fullPath, matcher, maxDepth - 1);
      if (found) return found;
    }
  }

  return null;
}

function printDirectoryPreview(startDir, depth = 2, indent = '') {
  if (!fs.existsSync(startDir) || depth < 0) return;

  for (const entry of fs.readdirSync(startDir, { withFileTypes: true }).slice(0, 80)) {
    const fullPath = path.join(startDir, entry.name);
    console.log(`${indent}${entry.isDirectory() ? '📁' : '📄'} ${path.relative(root, fullPath)}`);

    if (entry.isDirectory()) {
      printDirectoryPreview(fullPath, depth - 1, `${indent}  `);
    }
  }
}

function assertFile(label, filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`${label} missing: ${filePath ? path.relative(root, filePath) : '(not found)'}`);
  }

  const stat = fs.statSync(filePath);

  if (!stat.isFile()) {
    throw new Error(`${label} is not a file: ${path.relative(root, filePath)}`);
  }

  console.log(`✓ ${label}: ${path.relative(root, filePath)}`);
}

try {
  const appExe = findWindowsExecutable();
  assertFile(
    'Windows unpacked app executable',
    appExe ? path.join(unpackedDir, appExe) : path.join(unpackedDir, 'Etherana SX.exe'),
  );

  const resourcesDir = path.join(unpackedDir, 'resources');

  const nextStandaloneServer =
    findFirstFile(resourcesDir, (filePath) =>
      filePath.endsWith(path.join('.next', 'standalone', 'server.js')),
    ) ||
    findFirstFile(resourcesDir, (filePath) =>
      filePath.endsWith(path.join('standalone', 'server.js')),
    );

  if (!nextStandaloneServer) {
    console.log('\nWindows resources preview:');
    printDirectoryPreview(resourcesDir, 3);
  }

  assertFile('Next standalone server', nextStandaloneServer);

  const nodePath = path.join(resourcesDir, 'node', 'windows', 'node.exe');
  assertFile('Bundled Windows Node runtime', nodePath);

  const searxngPath = fs.existsSync(path.join(resourcesDir, 'searxng', 'windows', 'searxng.exe'))
    ? path.join(resourcesDir, 'searxng', 'windows', 'searxng.exe')
    : path.join(resourcesDir, 'searxng', 'windows', 'searxng.cmd');

  assertFile('Bundled Windows SearXNG runtime', searxngPath);

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
