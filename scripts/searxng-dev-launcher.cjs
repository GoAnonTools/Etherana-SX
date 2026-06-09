#!/usr/bin/env node

const { spawn, spawnSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const composeFile = path.join(rootDir, 'docker-compose.searxng-local.yaml');

let shuttingDown = false;

function hasDockerComposePlugin() {
  const result = spawnSync('docker', ['compose', 'version'], {
    stdio: 'ignore',
  });

  return result.status === 0;
}

function getComposeCommand() {
  if (hasDockerComposePlugin()) {
    return {
      command: 'docker',
      baseArgs: ['compose'],
    };
  }

  return {
    command: 'docker-compose',
    baseArgs: [],
  };
}

function runCompose(args, options = {}) {
  const compose = getComposeCommand();

  return new Promise((resolve, reject) => {
    const child = spawn(
      compose.command,
      [...compose.baseArgs, '-f', composeFile, ...args],
      {
        cwd: rootDir,
        stdio: options.stdio || 'inherit',
      },
    );

    child.on('error', reject);

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${compose.command} ${args.join(' ')} exited with ${code}`));
    });
  });
}

async function start() {
  console.log('[searxng-dev] Starting Docker SearXNG on http://127.0.0.1:8080');
  await runCompose(['up', '-d', '--remove-orphans']);
  console.log('[searxng-dev] Docker SearXNG is starting/started.');
  console.log('[searxng-dev] Keeping launcher alive so Electron can manage lifecycle.');
}

function stopAndExit(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`[searxng-dev] Received ${signal}.`);

  if (process.env.ETHERANA_KEEP_SEARXNG === '1') {
    console.log('[searxng-dev] ETHERANA_KEEP_SEARXNG=1, leaving Docker SearXNG running.');
    process.exit(0);
  }

  const compose = getComposeCommand();

  console.log('[searxng-dev] Stopping Docker SearXNG...');

  const result = spawnSync(
    compose.command,
    [...compose.baseArgs, '-f', composeFile, 'down', '--remove-orphans'],
    {
      cwd: rootDir,
      stdio: 'inherit',
    },
  );

  if (result.status === 0) {
    console.log('[searxng-dev] Docker SearXNG stopped.');
  } else {
    console.error('[searxng-dev] Failed to stop Docker SearXNG.');
  }

  process.exit(0);
}

process.on('SIGTERM', () => stopAndExit('SIGTERM'));
process.on('SIGINT', () => stopAndExit('SIGINT'));

start().catch((error) => {
  console.error('[searxng-dev] Failed to start Docker SearXNG:', error);
  process.exit(1);
});

setInterval(() => {}, 60_000);
