#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const releaseRoot = path.join(repoRoot, 'release-upload');

const VALID_PLATFORMS = new Set(['linux', 'windows', 'macos', 'all']);

const args = process.argv.slice(2);
const dryRun = process.env.R2_DRY_RUN === '1' || args.includes('--dry-run');

const accountId = process.env.R2_ACCOUNT_ID;
const bucket = process.env.R2_BUCKET;
const rawPrefix = process.env.R2_PREFIX || '';
const endpointUrl =
  process.env.R2_ENDPOINT_URL ||
  (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');

const prefix = rawPrefix.replace(/^\/+|\/+$/g, '');

const usage = () => {
  console.log(`Usage:
  node scripts/upload-release-r2.cjs [linux|windows|macos|all] [--dry-run]

Examples:
  R2_DRY_RUN=1 node scripts/upload-release-r2.cjs all
  node scripts/upload-release-r2.cjs linux
  node scripts/upload-release-r2.cjs windows
  node scripts/upload-release-r2.cjs macos

Required env:
  R2_ACCOUNT_ID
  R2_BUCKET

Optional env:
  R2_PREFIX
  R2_ENDPOINT_URL
  R2_DRY_RUN=1
`);
};

const parsePlatform = () => {
  const platformFromFlag = args
    .find((arg) => arg.startsWith('--platform='))
    ?.split('=')[1];

  const platformFromPositional = args.find((arg) => VALID_PLATFORMS.has(arg));
  const platform = platformFromFlag || platformFromPositional || process.env.R2_PLATFORM || 'linux';

  if (!VALID_PLATFORMS.has(platform)) {
    console.error(`Invalid platform: ${platform}`);
    usage();
    process.exit(1);
  }

  return platform;
};

const selectedPlatform = parsePlatform();

if (!accountId || !bucket) {
  console.error('Missing required R2 environment variables: R2_ACCOUNT_ID and R2_BUCKET.');
  usage();
  process.exit(1);
}

if (!dryRun && !process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_PROFILE) {
  console.error(
    'Missing AWS credentials. Set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY or AWS_PROFILE before uploading.',
  );
  process.exit(1);
}

const selectedPlatforms =
  selectedPlatform === 'all' ? ['linux', 'windows', 'macos'] : [selectedPlatform];

const walkFiles = (dir) => {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return walkFiles(fullPath);
    }

    if (entry.isFile()) {
      return [fullPath];
    }

    return [];
  });
};

const isVersionedFile = (fileName) => {
  if (/^latest[-.]/i.test(fileName)) {
    return false;
  }

  if (/latest/i.test(fileName)) {
    return false;
  }

  return /(^|[-\s])\d+\.\d+\.\d+($|[-\s.])/i.test(fileName);
};

const cacheControlFor = (fileName) => {
  if (isVersionedFile(fileName)) {
    return 'public, max-age=31536000, immutable';
  }

  return 'public, max-age=300, must-revalidate';
};

const contentTypeFor = (fileName) => {
  if (fileName.endsWith('.json')) return 'application/json';
  if (fileName.endsWith('.yml') || fileName.endsWith('.yaml')) return 'text/yaml';
  if (fileName.endsWith('.sha256')) return 'text/plain';
  if (fileName.endsWith('.AppImage')) return 'application/octet-stream';
  if (fileName.endsWith('.deb')) return 'application/vnd.debian.binary-package';
  if (fileName.endsWith('.exe')) return 'application/vnd.microsoft.portable-executable';
  if (fileName.endsWith('.dmg')) return 'application/x-apple-diskimage';
  if (fileName.endsWith('.zip')) return 'application/zip';

  return 'application/octet-stream';
};

const toS3Uri = (platform, filePath) => {
  const relativePath = path.relative(path.join(releaseRoot, platform), filePath);
  const normalizedRelativePath = relativePath.split(path.sep).join('/');
  const keyParts = [prefix, platform, normalizedRelativePath].filter(Boolean);

  return `s3://${bucket}/${keyParts.join('/')}`;
};

const runAwsUpload = ({ filePath, s3Uri, cacheControl, contentType }) => {
  const command = [
    's3',
    'cp',
    filePath,
    s3Uri,
    '--endpoint-url',
    endpointUrl,
    '--cache-control',
    cacheControl,
    '--content-type',
    contentType,
  ];

  if (dryRun) {
    console.log(`[dry-run] aws ${command.map((part) => JSON.stringify(part)).join(' ')}`);
    return;
  }

  const result = spawnSync('aws', command, {
    stdio: 'inherit',
    cwd: repoRoot,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
};

const uploadPlatform = (platform) => {
  const platformDir = path.join(releaseRoot, platform);
  const files = walkFiles(platformDir);

  if (files.length === 0) {
    console.warn(`No release files found for ${platform}: ${platformDir}`);
    return 0;
  }

  console.log(`Uploading ${files.length} ${platform} release file(s)...`);

  for (const filePath of files) {
    const fileName = path.basename(filePath);
    const s3Uri = toS3Uri(platform, filePath);
    const cacheControl = cacheControlFor(fileName);
    const contentType = contentTypeFor(fileName);

    console.log(`- ${platform}/${fileName}`);
    console.log(`  ${cacheControl}`);

    runAwsUpload({
      filePath,
      s3Uri,
      cacheControl,
      contentType,
    });
  }

  return files.length;
};

let totalFiles = 0;

for (const platform of selectedPlatforms) {
  totalFiles += uploadPlatform(platform);
}

if (totalFiles === 0) {
  console.error('No release artifacts were uploaded.');
  process.exit(1);
}

console.log(
  dryRun
    ? `R2 dry run complete for ${selectedPlatform}: ${totalFiles} file(s).`
    : `R2 upload complete for ${selectedPlatform}: ${totalFiles} file(s).`,
);
