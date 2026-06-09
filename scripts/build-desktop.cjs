const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();

console.log('[desktop-build] Building Next standalone app for desktop...');

const isWindows = process.platform === 'win32';

const command = isWindows ? (process.env.ComSpec || 'cmd.exe') : 'npm';
const args = isWindows ? ['/d', '/s', '/c', 'npm run build'] : ['run', 'build'];

const result = spawnSync(command, args, {
  cwd: root,
  stdio: 'inherit',
  windowsHide: true,
  env: {
    ...process.env,
    ETHERANA_DESKTOP_BUILD: '1',
  },
});

if (result.error) {
  console.error('[desktop-build] Failed to start Next build.');
  console.error(result.error);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(`[desktop-build] Next build failed with exit code ${result.status}.`);
  process.exit(result.status || 1);
}

const standaloneServer = path.join(root, '.next', 'standalone', 'server.js');

if (!fs.existsSync(standaloneServer)) {
  console.error('[desktop-build] Missing Next standalone server after build:');
  console.error(`  ${standaloneServer}`);
  console.error('');
  console.error('Check next.config.* output: "standalone" is required for desktop packaging.');
  process.exit(1);
}

console.log('[desktop-build] Next standalone server ready.');
