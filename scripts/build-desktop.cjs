const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

console.log('[desktop-build] Building Next standalone app for desktop...');

const result = spawnSync(npmCommand, ['run', 'build'], {
  cwd: root,
  stdio: 'inherit',
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
