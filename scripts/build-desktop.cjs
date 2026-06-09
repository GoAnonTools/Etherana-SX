const { spawnSync } = require('child_process');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const result = spawnSync(npmCommand, ['run', 'build'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    ETHERANA_DESKTOP_BUILD: '1',
  },
});

process.exit(result.status || 0);
