const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const releaseDir = path.join(root, 'release');

function findAppBundle() {
  const dirs = [
    path.join(releaseDir, 'mac'),
    path.join(releaseDir, 'mac-arm64'),
    path.join(releaseDir, 'mac-universal'),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const app = fs.readdirSync(dir).find((file) => file.endsWith('.app'));
    if (app) return path.join(dir, app);
  }

  return null;
}

function findFirstFile(startDir, matcher, maxDepth = 10) {
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

function assertFile(label, filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`${label} missing: ${filePath ? path.relative(root, filePath) : '(not found)'}`);
  }

  if (!fs.statSync(filePath).isFile()) {
    throw new Error(`${label} is not a file: ${path.relative(root, filePath)}`);
  }

  console.log(`✓ ${label}: ${path.relative(root, filePath)}`);
}

function assertDir(label, dirPath) {
  if (!dirPath || !fs.existsSync(dirPath)) {
    throw new Error(`${label} missing: ${dirPath ? path.relative(root, dirPath) : '(not found)'}`);
  }

  if (!fs.statSync(dirPath).isDirectory()) {
    throw new Error(`${label} is not a directory: ${path.relative(root, dirPath)}`);
  }

  console.log(`✓ ${label}: ${path.relative(root, dirPath)}`);
}

try {
  const appBundle = findAppBundle();
  assertDir('macOS app bundle', appBundle);

  const resourcesDir = path.join(appBundle, 'Contents', 'Resources');

  const nextStandaloneServer =
    findFirstFile(resourcesDir, (filePath) =>
      filePath.endsWith(path.join('.next', 'standalone', 'server.js')),
    ) ||
    findFirstFile(resourcesDir, (filePath) =>
      filePath.endsWith(path.join('standalone', 'server.js')),
    );

  assertFile('Next standalone server', nextStandaloneServer);

  const nodePath = path.join(resourcesDir, 'node', 'macos', 'node');
  assertFile('Bundled macOS Node runtime', nodePath);

  const searxngPath = path.join(resourcesDir, 'searxng', 'macos', 'searxng');
  assertFile('Bundled macOS SearXNG runtime', searxngPath);

  const nodeVersion = spawnSync(nodePath, ['-v'], { encoding: 'utf8' });

  if (nodeVersion.status !== 0) {
    throw new Error('Bundled macOS Node runtime failed to execute.');
  }

  console.log(`✓ Bundled macOS Node executes: ${nodeVersion.stdout.trim()}`);

  const dmg = fs.existsSync(releaseDir)
    ? fs.readdirSync(releaseDir).find((file) => file.endsWith('.dmg'))
    : null;

  const zip = fs.existsSync(releaseDir)
    ? fs.readdirSync(releaseDir).find((file) => file.endsWith('.zip'))
    : null;

  assertFile('macOS DMG', dmg ? path.join(releaseDir, dmg) : null);
  assertFile('macOS ZIP', zip ? path.join(releaseDir, zip) : null);

  console.log('\nmacOS desktop build verification passed.');
} catch (error) {
  console.error('\nmacOS desktop build verification failed.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
