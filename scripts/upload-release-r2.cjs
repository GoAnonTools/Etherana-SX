const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const uploadDir = path.join(root, 'release-upload', 'linux');

const bucket = process.env.R2_BUCKET;
const accountId = process.env.R2_ACCOUNT_ID;
const prefix = (process.env.R2_PREFIX || 'linux').replace(/^\/+|\/+$/g, '');
const dryRun = process.env.R2_DRY_RUN === '1';

if (!bucket) {
  console.error('Missing R2_BUCKET.');
  process.exit(1);
}

if (!accountId) {
  console.error('Missing R2_ACCOUNT_ID.');
  process.exit(1);
}

if (!fs.existsSync(uploadDir)) {
  console.error('Missing release-upload/linux. Run npm run desktop:release:linux first.');
  process.exit(1);
}

const files = fs
  .readdirSync(uploadDir)
  .filter((file) => fs.statSync(path.join(uploadDir, file)).isFile())
  .sort();

if (files.length === 0) {
  console.error('No files found in release-upload/linux.');
  process.exit(1);
}

const endpointUrl = `https://${accountId}.r2.cloudflarestorage.com`;

function getContentType(file) {
  if (file.endsWith('.json')) return 'application/json';
  if (file.endsWith('.sha256')) return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}

function getCacheControl(file) {
  if (file.includes('-1.') || /-\d+\.\d+\.\d+-/.test(file)) {
    return 'public, max-age=31536000, immutable';
  }

  if (file === 'latest-linux.json' || file.includes('latest') || file.endsWith('.sha256')) {
    return 'public, max-age=300';
  }

  return 'public, max-age=3600';
}

function runAws(args) {
  if (dryRun) {
    console.log(`[dry-run] aws ${args.join(' ')}`);
    return;
  }

  const result = spawnSync('aws', args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION || 'auto',
    },
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log(`Uploading Linux release artifacts to R2 bucket: ${bucket}`);
console.log(`Endpoint: ${endpointUrl}`);
console.log(`Prefix: ${prefix || '(root)'}`);
console.log(dryRun ? 'Mode: dry run' : 'Mode: upload');

for (const file of files) {
  const sourcePath = path.join(uploadDir, file);
  const key = prefix ? `${prefix}/${file}` : file;
  const destination = `s3://${bucket}/${key}`;

  runAws([
    's3',
    'cp',
    sourcePath,
    destination,
    '--endpoint-url',
    endpointUrl,
    '--content-type',
    getContentType(file),
    '--cache-control',
    getCacheControl(file),
  ]);
}

console.log('R2 upload complete.');
