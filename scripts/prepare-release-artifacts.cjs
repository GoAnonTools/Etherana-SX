const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const releaseDir = path.join(root, 'release');
const uploadRoot = path.join(root, 'release-upload');
const linuxUploadDir = path.join(uploadRoot, 'linux');

fs.mkdirSync(linuxUploadDir, { recursive: true });

const releaseFiles = fs.readdirSync(releaseDir);

const appImage = releaseFiles.find((file) => file.endsWith('.AppImage'));
const debPackage = releaseFiles.find((file) => file.endsWith('.deb'));

if (!appImage) {
  console.error('No AppImage found in release/. Run npm run desktop:pack:linux first.');
  process.exit(1);
}

if (!debPackage) {
  console.error('No deb package found in release/. Run npm run desktop:pack:linux first.');
  process.exit(1);
}

const version = pkg.version || '0.0.0';

function stageArtifact(sourceName, versionedName, latestName) {
  const sourcePath = path.join(releaseDir, sourceName);
  const versionedPath = path.join(linuxUploadDir, versionedName);
  const latestPath = path.join(linuxUploadDir, latestName);

  fs.copyFileSync(sourcePath, versionedPath);
  fs.copyFileSync(sourcePath, latestPath);

  const fileBuffer = fs.readFileSync(sourcePath);
  const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  const sizeBytes = fs.statSync(sourcePath).size;

  fs.writeFileSync(
    path.join(linuxUploadDir, `${versionedName}.sha256`),
    `${sha256}  ${versionedName}\n`,
  );

  fs.writeFileSync(
    path.join(linuxUploadDir, `${latestName}.sha256`),
    `${sha256}  ${latestName}\n`,
  );

  return {
    versionedName,
    latestName,
    sizeBytes,
    sha256,
  };
}

const appImageArtifact = stageArtifact(
  appImage,
  `Etherana-SX-${version}-linux-x64.AppImage`,
  'Etherana-SX-linux-x64.AppImage',
);

const debArtifact = stageArtifact(
  debPackage,
  `Etherana-SX-${version}-linux-x64.deb`,
  'Etherana-SX-linux-x64.deb',
);

const manifest = {
  productName: pkg.productName || pkg.build?.productName || 'Etherana SX',
  appId: pkg.build?.appId || 'app.etherana.sx',
  version,
  platform: 'linux',
  arch: 'x64',
  generatedAt: new Date().toISOString(),
  files: {
    appImage: appImageArtifact,
    deb: debArtifact,
  },
};

fs.writeFileSync(
  path.join(linuxUploadDir, 'latest-linux.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log('Linux release artifacts prepared:');
for (const file of fs.readdirSync(linuxUploadDir).sort()) {
  console.log(`  ${path.relative(root, path.join(linuxUploadDir, file))}`);
}
