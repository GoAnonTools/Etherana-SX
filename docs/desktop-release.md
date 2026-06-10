# Etherana SX Desktop Release Guide

Current desktop release branch:

```bash
desktop-electron-poc
```

Current release version:

```bash
1.12.2
```

Etherana SX Desktop is now a local-first desktop app candidate for Linux, Windows, and macOS.

## Completed desktop release paths

### Linux

Completed:

- AppImage
- `.deb`
- Bundled Node runtime
- Bundled local SearXNG runtime
- Writable desktop SQLite data directory
- Next standalone desktop build
- Linux verification script
- Release artifact staging

Build command:

```bash
npm run desktop:release:linux
```

Expected staged artifacts:

```bash
release-upload/linux/Etherana-SX-1.12.2-linux-x64.AppImage
release-upload/linux/Etherana-SX-linux-x64.AppImage
release-upload/linux/Etherana-SX-1.12.2-linux-x64.deb
release-upload/linux/Etherana-SX-linux-x64.deb
release-upload/linux/latest-linux.json
release-upload/linux/*.sha256
```

### Windows

Windows release is built through GitHub Actions.

Workflow:

```bash
.github/workflows/desktop-windows.yml
```

Manual run:

```bash
gh workflow run desktop-windows.yml --ref desktop-electron-poc
```

Expected staged artifacts:

```bash
release-upload/windows/Etherana-SX-1.12.2-windows-x64-Setup.exe
release-upload/windows/Etherana-SX-windows-x64-Setup.exe
release-upload/windows/latest.yml
release-upload/windows/latest-windows.json
release-upload/windows/*.sha256
```

Current Windows installer is unsigned, so Windows SmartScreen may warn users.

### macOS

macOS release is built through GitHub Actions.

Workflow:

```bash
.github/workflows/desktop-macos.yml
```

Manual run:

```bash
gh workflow run desktop-macos.yml --ref desktop-electron-poc
```

Expected staged artifacts:

```bash
release-upload/macos/Etherana-SX-1.12.2-macos-arm64.dmg
release-upload/macos/Etherana-SX-macos-arm64.dmg
release-upload/macos/Etherana-SX-1.12.2-macos-arm64.zip
release-upload/macos/Etherana-SX-macos-arm64.zip
release-upload/macos/latest-mac.yml
release-upload/macos/latest-macos.json
release-upload/macos/*.sha256
```

Current macOS build is not notarized, so Gatekeeper may warn or block the first launch.

## Release artifacts

Local release artifacts are staged under:

```bash
release-upload/
```

Important:

```bash
release-upload/
```

is ignored and must stay local. Do not commit release binaries.

## Upload to Cloudflare R2

Required environment variables:

```bash
export R2_ACCOUNT_ID="your-account-id"
export R2_BUCKET="your-bucket"
```

Optional:

```bash
export R2_PREFIX="releases"
export R2_ENDPOINT_URL="https://your-account-id.r2.cloudflarestorage.com"
```

Dry run all platforms:

```bash
R2_DRY_RUN=1 npm run desktop:release:upload:r2:all
```

Upload all platforms:

```bash
npm run desktop:release:upload:r2:all
```

Upload one platform:

```bash
npm run desktop:release:upload:r2:linux
npm run desktop:release:upload:r2:windows
npm run desktop:release:upload:r2:macos
```

Cache behavior:

- Versioned files use long immutable cache.
- Latest files and manifests use short revalidation cache.

## Download page

The public download page is available at:

```bash
/download
```

When deploying, set:

```bash
NEXT_PUBLIC_RELEASE_BASE_URL="https://your-public-r2-domain"
```

The download page expects this structure:

```bash
/linux/...
/windows/...
/macos/...
```

## Install notes

### Linux AppImage

```bash
chmod +x Etherana-SX-linux-x64.AppImage
./Etherana-SX-linux-x64.AppImage
```

### Linux `.deb`

```bash
sudo apt install ./Etherana-SX-linux-x64.deb
```

### Windows

Run:

```bash
Etherana-SX-windows-x64-Setup.exe
```

### macOS

Use the DMG for normal installation:

```bash
Etherana-SX-macos-arm64.dmg
```

## Verify checksums

Each release file has a matching `.sha256`.

Example:

```bash
sha256sum -c Etherana-SX-linux-x64.AppImage.sha256
```

## Real-device QA checklist

Test on each platform:

- Launch the app
- Confirm local SearXNG starts
- Confirm Search Results works
- Confirm Agent mode works
- Confirm Discover works
- Create a Space
- Save an Output
- Run a Small App
- Run an Automation manually
- Export a `.goanon` Vault backup
- Import a `.goanon` Vault backup
- Change theme
- Change language
- Restart app and confirm data persists

Linux-specific:

- Test AppImage on a clean Linux machine
- Test `.deb` on Debian, Ubuntu, Pop!_OS, or Linux Mint

Windows-specific:

- Test on Windows 10 or Windows 11
- Confirm SmartScreen behavior
- Confirm shortcut creation
- Confirm uninstall works

macOS-specific:

- Test on Apple Silicon Mac
- Confirm DMG opens
- Confirm app launches
- Confirm Gatekeeper behavior
- Confirm app can be moved to Applications

## Later release maturity work

Not urgent for internal testing:

- Windows code signing
- macOS signing and notarization
- In-app update checker
- Auto-update flow with `electron-updater`
- Bundle size optimization
- Real-device QA before merging into `main`

## Recommended merge strategy

Keep:

```bash
desktop-electron-poc
```

as the release branch until at least one real Windows or macOS device test is done.

Then decide between:

- PR `desktop-electron-poc` into `main`
- Keep `desktop-electron-poc` as a long-lived desktop release branch
