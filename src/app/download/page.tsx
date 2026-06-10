import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Download Etherana SX Desktop',
  description:
    'Download Etherana SX desktop releases for Linux, Windows, and macOS.',
};

const VERSION = '1.12.2';

const RELEASE_BASE_URL = (
  process.env.NEXT_PUBLIC_RELEASE_BASE_URL || ''
).replace(/\/+$/g, '');

type DownloadAsset = {
  label: string;
  fileName: string;
  checksumFileName: string;
  size: string;
  description: string;
  checksum?: string;
};

type PlatformRelease = {
  key: 'linux' | 'windows' | 'macos';
  title: string;
  subtitle: string;
  status: string;
  description: string;
  warning?: string;
  assets: DownloadAsset[];
};

const fileUrl = (platform: PlatformRelease['key'], fileName: string) => {
  const path = `${platform}/${fileName}`;

  return RELEASE_BASE_URL ? `${RELEASE_BASE_URL}/${path}` : `/${path}`;
};

const releases: PlatformRelease[] = [
  {
    key: 'linux',
    title: 'Linux',
    subtitle: 'AppImage and Debian package',
    status: 'Verified locally',
    description:
      'Standalone Linux build with bundled Node runtime, bundled local SearXNG runtime, and writable desktop SQLite storage.',
    assets: [
      {
        label: 'Download AppImage',
        fileName: 'Etherana-SX-linux-x64.AppImage',
        checksumFileName: 'Etherana-SX-linux-x64.AppImage.sha256',
        size: 'About 1 GB',
        description:
          'Best portable option for most Linux users. Make it executable, then launch it directly.',
      },
      {
        label: 'Download .deb',
        fileName: 'Etherana-SX-linux-x64.deb',
        checksumFileName: 'Etherana-SX-linux-x64.deb.sha256',
        size: 'About 1 GB',
        description:
          'Recommended for Debian, Ubuntu, Pop!_OS, Linux Mint, and other Debian-based systems.',
      },
    ],
  },
  {
    key: 'windows',
    title: 'Windows',
    subtitle: 'NSIS installer',
    status: 'Built by CI',
    description:
      'Windows x64 installer built through GitHub Actions with bundled Node runtime, bundled SearXNG runtime, and desktop verification.',
    warning:
      'This build is not code-signed yet. Windows SmartScreen may show a warning during installation.',
    assets: [
      {
        label: 'Download Setup.exe',
        fileName: 'Etherana-SX-windows-x64-Setup.exe',
        checksumFileName: 'Etherana-SX-windows-x64-Setup.exe.sha256',
        size: 'About 495 MB',
        description:
          'Recommended installer for Windows 10 and Windows 11 on x64 machines.',
        checksum:
          '9c82b42f7520d3c5d2abe775f0aa028a68901d6700947f66383053f75d414e17',
      },
    ],
  },
  {
    key: 'macos',
    title: 'macOS',
    subtitle: 'Apple Silicon DMG and ZIP',
    status: 'Built by CI',
    description:
      'macOS arm64 build for Apple Silicon Macs, built through GitHub Actions with bundled Node and SearXNG runtimes.',
    warning:
      'This build is not notarized yet. macOS Gatekeeper may warn or block the first launch.',
    assets: [
      {
        label: 'Download DMG',
        fileName: 'Etherana-SX-macos-arm64.dmg',
        checksumFileName: 'Etherana-SX-macos-arm64.dmg.sha256',
        size: 'About 598 MB',
        description:
          'Recommended installer-style package for Apple Silicon Macs.',
        checksum:
          'e898edcc1314a8abb2ecf30431677b4a3e3a92996301d1916fa6f574c6c5011d',
      },
      {
        label: 'Download ZIP',
        fileName: 'Etherana-SX-macos-arm64.zip',
        checksumFileName: 'Etherana-SX-macos-arm64.zip.sha256',
        size: 'About 637 MB',
        description:
          'Alternative archive package for Apple Silicon Macs.',
        checksum:
          'b096c43dc4a74ab0f688d6a73d0d845d2d9150856d762c7e7cd04dfeb21a981e',
      },
    ],
  },
];

const shellCommands = [
  {
    title: 'Linux AppImage',
    command:
      'chmod +x Etherana-SX-linux-x64.AppImage\n./Etherana-SX-linux-x64.AppImage',
  },
  {
    title: 'Linux .deb',
    command: 'sudo apt install ./Etherana-SX-linux-x64.deb',
  },
  {
    title: 'Verify checksum',
    command: 'sha256sum -c <downloaded-file>.sha256',
  },
];

export default function DownloadPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/30">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-sm font-medium text-amber-200">
              Desktop release
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-neutral-300">
              Version {VERSION}
            </span>
            <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-sm font-medium text-emerald-200">
              Local-first
            </span>
          </div>

          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Download Etherana SX Desktop
            </h1>
            <p className="mt-4 text-lg leading-8 text-neutral-300">
              Install Etherana SX as a standalone desktop app with bundled Node,
              local SearXNG, writable SQLite storage, Spaces, Apps, Automations,
              Outputs, Discover, Search, and encrypted .goanon Vault support.
            </p>
          </div>

          {!RELEASE_BASE_URL ? (
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
              Download links are using root-relative paths. Set{' '}
              <code className="rounded bg-black/30 px-1.5 py-0.5">
                NEXT_PUBLIC_RELEASE_BASE_URL
              </code>{' '}
              to your Cloudflare R2 public base URL when deploying this page.
            </div>
          ) : null}
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          {releases.map((release) => (
            <article
              key={release.key}
              className="flex flex-col rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.25em] text-amber-200">
                    {release.subtitle}
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold">
                    {release.title}
                  </h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-300">
                  {release.status}
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-neutral-300">
                {release.description}
              </p>

              {release.warning ? (
                <div className="mt-5 rounded-2xl border border-orange-300/20 bg-orange-300/10 p-4 text-sm leading-6 text-orange-100">
                  {release.warning}
                </div>
              ) : null}

              <div className="mt-6 flex flex-1 flex-col gap-4">
                {release.assets.map((asset) => (
                  <div
                    key={asset.fileName}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-medium">{asset.label}</h3>
                        <p className="mt-1 text-xs text-neutral-400">
                          {asset.size}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-neutral-300">
                      {asset.description}
                    </p>

                    {asset.checksum ? (
                      <p className="mt-3 break-all rounded-xl bg-black/30 p-3 font-mono text-xs text-neutral-300">
                        SHA256: {asset.checksum}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <a
                        href={fileUrl(release.key, asset.fileName)}
                        className="rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-amber-100"
                      >
                        Download
                      </a>
                      <a
                        href={fileUrl(release.key, asset.checksumFileName)}
                        className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:bg-white/10"
                      >
                        Checksum
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-semibold">Install notes</h2>
            <div className="mt-6 grid gap-4">
              {shellCommands.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4"
                >
                  <h3 className="font-medium">{item.title}</h3>
                  <pre className="mt-3 overflow-x-auto rounded-xl bg-black/40 p-4 text-sm text-neutral-200">
                    <code>{item.command}</code>
                  </pre>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-semibold">What is included</h2>
            <ul className="mt-6 space-y-3 text-sm leading-6 text-neutral-300">
              <li>✓ Electron desktop shell</li>
              <li>✓ Next standalone production app</li>
              <li>✓ Bundled Node runtime</li>
              <li>✓ Bundled local SearXNG runtime</li>
              <li>✓ Writable desktop SQLite data directory</li>
              <li>✓ Local-first Spaces, Apps, Automations, and Outputs</li>
              <li>✓ Encrypted .goanon Vault export/import</li>
            </ul>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-neutral-300">
              For public distribution, code signing and macOS notarization are
              recommended next. For internal testing, these builds are ready for
              real-device QA.
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
