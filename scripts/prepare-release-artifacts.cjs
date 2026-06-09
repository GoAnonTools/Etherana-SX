const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const releaseDir = path.join(root, 'release');
const uploadRoot = path.join(root, 'release-upload');
const linuxUploadDir = path.join(uploadRoot, 'linux');

fs.mkdirSync(linuxUploadDir, { recursive: true });

const appImage = fs
  .readdirSync(releaseDir)
  .find((file) => file.endsWith('.AppImage'));

if (!appImage) {
  console.error('No AppImage found in release/. Run npm run desktop:pack:linux first.');
  process.exit(1);
}

const sourcePath = path.join(releaseDir, appImage);
const version = pkg.version || '0.0.0';

const versionedName = `Etherana-SX-${version}-linux-x64.AppImage`;
const latestName = 'Etherana-SX-linux-x64.AppImage';

const versionedPath = path.join(linuxUploadDir, versionedName);
const latestPath = path.join(linuxUploadDir, latestName);

fs.copyFileSync(sourcePath, versionedPath);
fs.copyFileSync(sourcePath, latestPath);

const fileBuffer = fs.readFileSync(sourcePath);
const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
const sizeBytes = fs.statSync(sourcePath).size;

const checksumText = `${sha256}  ${versionedName}\n`;
fs.writeFileSync(path.join(linuxUploadDir, `${versionedName}.sha256`), checksumText);
fs.writeFileSync(path.join(linuxUploadDir, `${latestName}.sha256`), `${sha256}  ${latestName}\n`);

const manifest = {
  productName: pkg.productName || pkg.build?.productName || 'Etherana SX',
  appId: pkg.build?.appId || 'app.etherana.sx',
  version,
  platform: 'linux',
  arch: 'x64',
  generatedAt: new Date().toISOString(),
  files: {
    appImage: {
      versionedName,
      latestName,
      sizeBytes,
      sha256,
    },
  },
};

fs.writeFileSync(
  path.join(linuxUploadDir, 'latest-linux.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log('Linux release artifacts prepared:');
console.log(`  ${path.relative(root, versionedPath)}`);
console.log(`  ${path.relative(root, latestPath)}`);
console.log(`  ${path.relative(root, path.join(linuxUploadDir, `${versionedName}.sha256`))}`);
console.log(`  ${path.relative(root, path.join(linuxUploadDir, 'latest-linux.json'))}`);
