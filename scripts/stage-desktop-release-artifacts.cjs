#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const releaseDir = path.join(repoRoot, 'release');
const uploadRoot = path.join(repoRoot, 'release-upload');
const packageJson = require(path.join(repoRoot, 'package.json'));

const version = packageJson.version;
const platform = process.argv[2];

if (!['linux', 'windows', 'macos'].includes(platform)) {
  console.error('Usage: node scripts/stage-desktop-release-artifacts.cjs <linux|windows|macos>');
  process.exit(1);
}

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const fileSize = (filePath) => fs.statSync(filePath).size;

const sha256 = (filePath) =>
  crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');

const copyFile = (source, target) => {
  if (!fs.existsSync(source)) {
    throw new Error(`Missing release artifact: ${source}`);
  }

  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
};

const writeSha256File = (filePath) => {
  const hash = sha256(filePath);
  fs.writeFileSync(`${filePath}.sha256`, `${hash}  ${path.basename(filePath)}\n`);
  return hash;
};

const writeJson = (filePath, data) => {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
};

const stageLinux = () => {
  const outDir = path.join(uploadRoot, 'linux');
  fs.rmSync(outDir, { recursive: true, force: true });
  ensureDir(outDir);

  const appImageSource = path.join(releaseDir, `Etherana SX-${version}.AppImage`);
  const debSource = path.join(releaseDir, `etherana-sx_${version}_amd64.deb`);

  const versionedAppImage = path.join(outDir, `Etherana-SX-${version}-linux-x64.AppImage`);
  const latestAppImage = path.join(outDir, 'Etherana-SX-linux-x64.AppImage');
  const versionedDeb = path.join(outDir, `Etherana-SX-${version}-linux-x64.deb`);
  const latestDeb = path.join(outDir, 'Etherana-SX-linux-x64.deb');

  copyFile(appImageSource, versionedAppImage);
  copyFile(appImageSource, latestAppImage);
  copyFile(debSource, versionedDeb);
  copyFile(debSource, latestDeb);

  const appImageSha = writeSha256File(versionedAppImage);
  writeSha256File(latestAppImage);
  const debSha = writeSha256File(versionedDeb);
  writeSha256File(latestDeb);

  writeJson(path.join(outDir, 'latest-linux.json'), {
    version,
    platform: 'linux',
    arch: 'x64',
    artifacts: {
      appImage: {
        fileName: 'Etherana-SX-linux-x64.AppImage',
        versionedFileName: `Etherana-SX-${version}-linux-x64.AppImage`,
        size: fileSize(versionedAppImage),
        sha256: appImageSha,
      },
      deb: {
        fileName: 'Etherana-SX-linux-x64.deb',
        versionedFileName: `Etherana-SX-${version}-linux-x64.deb`,
        size: fileSize(versionedDeb),
        sha256: debSha,
      },
    },
  });

  return outDir;
};

const stageWindows = () => {
  const outDir = path.join(uploadRoot, 'windows');
  fs.rmSync(outDir, { recursive: true, force: true });
  ensureDir(outDir);

  const setupSource = path.join(releaseDir, `Etherana SX Setup ${version}.exe`);
  const latestYmlSource = path.join(releaseDir, 'latest.yml');

  const versionedSetup = path.join(outDir, `Etherana-SX-${version}-windows-x64-Setup.exe`);
  const latestSetup = path.join(outDir, 'Etherana-SX-windows-x64-Setup.exe');

  copyFile(setupSource, versionedSetup);
  copyFile(setupSource, latestSetup);
  copyFile(latestYmlSource, path.join(outDir, 'latest.yml'));

  const setupSha = writeSha256File(versionedSetup);
  writeSha256File(latestSetup);

  writeJson(path.join(outDir, 'latest-windows.json'), {
    version,
    platform: 'windows',
    arch: 'x64',
    artifacts: {
      setup: {
        fileName: 'Etherana-SX-windows-x64-Setup.exe',
        versionedFileName: `Etherana-SX-${version}-windows-x64-Setup.exe`,
        size: fileSize(versionedSetup),
        sha256: setupSha,
      },
    },
  });

  return outDir;
};

const stageMacos = () => {
  const outDir = path.join(uploadRoot, 'macos');
  fs.rmSync(outDir, { recursive: true, force: true });
  ensureDir(outDir);

  const dmgSource = path.join(releaseDir, `Etherana SX-${version}-arm64.dmg`);
  const zipSource = path.join(releaseDir, `Etherana SX-${version}-arm64-mac.zip`);
  const latestMacYmlSource = path.join(releaseDir, 'latest-mac.yml');

  const versionedDmg = path.join(outDir, `Etherana-SX-${version}-macos-arm64.dmg`);
  const latestDmg = path.join(outDir, 'Etherana-SX-macos-arm64.dmg');
  const versionedZip = path.join(outDir, `Etherana-SX-${version}-macos-arm64.zip`);
  const latestZip = path.join(outDir, 'Etherana-SX-macos-arm64.zip');

  copyFile(dmgSource, versionedDmg);
  copyFile(dmgSource, latestDmg);
  copyFile(zipSource, versionedZip);
  copyFile(zipSource, latestZip);
  copyFile(latestMacYmlSource, path.join(outDir, 'latest-mac.yml'));

  const dmgSha = writeSha256File(versionedDmg);
  writeSha256File(latestDmg);
  const zipSha = writeSha256File(versionedZip);
  writeSha256File(latestZip);

  writeJson(path.join(outDir, 'latest-macos.json'), {
    version,
    platform: 'macos',
    arch: 'arm64',
    artifacts: {
      dmg: {
        fileName: 'Etherana-SX-macos-arm64.dmg',
        versionedFileName: `Etherana-SX-${version}-macos-arm64.dmg`,
        size: fileSize(versionedDmg),
        sha256: dmgSha,
      },
      zip: {
        fileName: 'Etherana-SX-macos-arm64.zip',
        versionedFileName: `Etherana-SX-${version}-macos-arm64.zip`,
        size: fileSize(versionedZip),
        sha256: zipSha,
      },
    },
  });

  return outDir;
};

const stagedDir =
  platform === 'linux'
    ? stageLinux()
    : platform === 'windows'
      ? stageWindows()
      : stageMacos();

console.log(`Staged ${platform} release artifacts: ${stagedDir}`);
for (const file of fs.readdirSync(stagedDir).sort()) {
  console.log(`- ${file}`);
}
