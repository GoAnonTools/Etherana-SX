'use client';

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  FileKey2,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  type VaultMeta,
  readVaultMeta,
  readVaultStorageRecords,
  writeVaultMeta,
  writeVaultStorageRecord,
} from '@/lib/vault/localVault';
import {
  getEncryptedVaultDbStats,
  isEncryptedVaultUnlocked,
  migrateLocalVaultToEncryptedDb,
  restoreEncryptedDbToLocalVault,
  unlockEncryptedVaultStorage,
} from '@/lib/vault/encryptedVaultDb';

interface VaultSpace {
  id: string;
  name: string;
  description?: string;
  instruction?: string;
  createdAt?: string;
}

interface VaultPayload {
  version: 1;
  exportedAt: string;
  app: 'etherana-sx';
  vaultId: string;
  localStorageRecords: {
    key: string;
    value: string;
  }[];
  spaces: VaultSpace[];
  notes: string[];
}

interface EncryptedVaultBackup {
  version: 1;
  app: 'etherana-sx';
  vaultId: string;
  createdAt: string;
  kdf: {
    name: 'PBKDF2';
    hash: 'SHA-256';
    iterations: number;
    salt: string;
  };
  cipher: {
    name: 'AES-GCM';
    iv: string;
  };
  ciphertext: string;
}


const PBKDF2_ITERATIONS = 310_000;

const RECOVERY_WORDS = [
  'anchor',
  'atlas',
  'aurora',
  'bamboo',
  'beacon',
  'binary',
  'bridge',
  'carbon',
  'cedar',
  'cipher',
  'cloud',
  'compass',
  'copper',
  'delta',
  'ember',
  'falcon',
  'forest',
  'galaxy',
  'harbor',
  'horizon',
  'index',
  'jungle',
  'kernel',
  'lantern',
  'ledger',
  'lotus',
  'magnet',
  'matrix',
  'nebula',
  'nickel',
  'oracle',
  'orbit',
  'pebble',
  'phoenix',
  'plasma',
  'quartz',
  'radar',
  'raven',
  'rocket',
  'saffron',
  'signal',
  'silver',
  'summit',
  'temple',
  'thunder',
  'timber',
  'titan',
  'vector',
  'velvet',
  'voyage',
  'walnut',
  'willow',
  'zenith',
  'zephyr',
  'oxide',
  'pixel',
  'prism',
  'river',
  'shadow',
  'signal',
  'sphere',
  'stone',
  'vault',
  'vertex',
];

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(bytes.byteLength);
  const view = new Uint8Array(buffer);
  view.set(bytes);
  return buffer;
};

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return window.btoa(binary);
};

const base64ToBytes = (base64: string) => {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const toBase64Url = (bytes: Uint8Array) => {
  return bytesToBase64(bytes)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
};

const generateBytes = (length: number) => {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return bytes;
};

const generateVaultId = () => {
  return `vault_${toBase64Url(generateBytes(18))}`;
};

const generateRecoveryPhrase = () => {
  const bytes = generateBytes(16);

  return Array.from(bytes)
    .map((byte) => RECOVERY_WORDS[byte % RECOVERY_WORDS.length])
    .join('-');
};


const deriveKey = async (recoveryPhrase: string, salt: Uint8Array) => {
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    toArrayBuffer(textEncoder.encode(recoveryPhrase)),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  );
};

const encryptPayload = async (
  payload: VaultPayload,
  recoveryPhrase: string,
): Promise<EncryptedVaultBackup> => {
  const salt = generateBytes(16);
  const iv = generateBytes(12);
  const key = await deriveKey(recoveryPhrase, salt);

  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
    },
    key,
    toArrayBuffer(textEncoder.encode(JSON.stringify(payload))),
  );

  return {
    version: 1,
    app: 'etherana-sx',
    vaultId: payload.vaultId,
    createdAt: new Date().toISOString(),
    kdf: {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: PBKDF2_ITERATIONS,
      salt: bytesToBase64(salt),
    },
    cipher: {
      name: 'AES-GCM',
      iv: bytesToBase64(iv),
    },
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
  };
};

const decryptBackup = async (
  backup: EncryptedVaultBackup,
  recoveryPhrase: string,
): Promise<VaultPayload> => {
  if (backup.app !== 'etherana-sx' || backup.version !== 1) {
    throw new Error('Invalid Etherana vault backup.');
  }

  const key = await deriveKey(recoveryPhrase, base64ToBytes(backup.kdf.salt));

  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(base64ToBytes(backup.cipher.iv)),
    },
    key,
    toArrayBuffer(base64ToBytes(backup.ciphertext)),
  );

  return JSON.parse(textDecoder.decode(decrypted)) as VaultPayload;
};

const downloadJson = (filename: string, data: unknown) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
};

const getBackupFilename = () => {
  const date = new Date().toISOString().slice(0, 10);
  return `etherana-private-vault-${date}.json`;
};


const rewriteSpaceDestinations = (
  key: string,
  value: string,
  spaceIdMap: Record<string, string>,
) => {
  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) return value;

    const rewritten = parsed.map((item) => {
      if (
        item &&
        typeof item === 'object' &&
        typeof item.outputDestination === 'string' &&
        item.outputDestination.startsWith('space:')
      ) {
        const oldSpaceId = item.outputDestination.replace('space:', '');
        const newSpaceId = spaceIdMap[oldSpaceId];

        if (!newSpaceId) return item;

        return {
          ...item,
          outputDestination: `space:${newSpaceId}`,
        };
      }

      return item;
    });

    return JSON.stringify(rewritten);
  } catch {
    return value;
  }
};

const VaultPage = () => {
  const [vaultMeta, setVaultMeta] = useState<VaultMeta | null>(null);
  const [generatedPhrase, setGeneratedPhrase] = useState('');
  const [exportPhrase, setExportPhrase] = useState('');
  const [importPhrase, setImportPhrase] = useState('');
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [encryptedStorageStatus, setEncryptedStorageStatus] =
    useState<string | null>(null);
  const [encryptedRecordCount, setEncryptedRecordCount] = useState(0);
  const [unlockPhrase, setUnlockPhrase] = useState('');
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);

  const refreshEncryptedStorageStats = async () => {
    try {
      const stats = await getEncryptedVaultDbStats();
      setEncryptedRecordCount(stats.count);
    } catch {
      setEncryptedRecordCount(0);
    }
  };

  useEffect(() => {
    setVaultMeta(readVaultMeta());
    refreshEncryptedStorageStats();
  }, []);

  const phraseWarning = useMemo(() => {
    if (!exportPhrase) return null;

    if (exportPhrase.length < 16) {
      return 'Use a longer recovery phrase. Short phrases are easier to guess.';
    }

    return null;
  }, [exportPhrase]);

  const createPrivateVault = () => {
    const meta: VaultMeta = {
      vaultId: generateVaultId(),
      createdAt: new Date().toISOString(),
    };

    const phrase = generateRecoveryPhrase();

    writeVaultMeta(meta);
    setVaultMeta(meta);
    setGeneratedPhrase(phrase);
    setExportPhrase(phrase);
    setStatus(
      'Private vault created. Save the recovery phrase now. Etherana will not store it.',
    );
  };

  const copyGeneratedPhrase = async () => {
    if (!generatedPhrase) return;

    await navigator.clipboard.writeText(generatedPhrase);
    setCopied(true);

    window.setTimeout(() => setCopied(false), 1500);
  };

  const fetchSpaces = async (): Promise<VaultSpace[]> => {
    try {
      const res = await fetch('/api/spaces');

      if (!res.ok) return [];

      const data = await res.json();

      if (!Array.isArray(data)) return [];

      return data.map((space) => ({
        id: String(space.id),
        name: String(space.name ?? 'Untitled Space'),
        description: String(space.description ?? ''),
        instruction: String(space.instruction ?? ''),
        createdAt: String(space.createdAt ?? ''),
      }));
    } catch {
      return [];
    }
  };

  const ensureVaultMeta = () => {
    const existing = readVaultMeta();

    if (existing) return existing;

    const created: VaultMeta = {
      vaultId: generateVaultId(),
      createdAt: new Date().toISOString(),
    };

    writeVaultMeta(created);
    setVaultMeta(created);

    return created;
  };

  const exportVault = async () => {
    if (!exportPhrase.trim()) {
      setStatus('Enter a recovery phrase before exporting.');
      return;
    }

    setWorking(true);
    setStatus(null);

    try {
      const meta = ensureVaultMeta();
      const spaces = await fetchSpaces();

      const payload: VaultPayload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        app: 'etherana-sx',
        vaultId: meta.vaultId,
        localStorageRecords: readVaultStorageRecords(),
        spaces,
        notes: [
          'This backup is end-to-end encrypted with your recovery phrase.',
          'Etherana cannot recover this vault if the recovery phrase is lost.',
          'Uploaded file binaries are not included in this version.',
        ],
      };

      const backup = await encryptPayload(payload, exportPhrase.trim());

      downloadJson(getBackupFilename(), backup);

      const updatedMeta: VaultMeta = {
        ...meta,
        lastExportAt: new Date().toISOString(),
      };

      writeVaultMeta(updatedMeta);
      setVaultMeta(updatedMeta);

      setStatus('Encrypted vault exported successfully.');
    } catch (error) {
      console.error(error);
      setStatus('Could not export the vault.');
    } finally {
      setWorking(false);
    }
  };

  const importVault = async () => {
    if (!backupFile) {
      setStatus('Choose an encrypted vault backup file first.');
      return;
    }

    if (!importPhrase.trim()) {
      setStatus('Enter the recovery phrase for this backup.');
      return;
    }

    const confirmed = window.confirm(
      'Importing this vault will merge encrypted backup data into this browser. Continue?',
    );

    if (!confirmed) return;

    setWorking(true);
    setStatus(null);

    try {
      const raw = await backupFile.text();
      const backup = JSON.parse(raw) as EncryptedVaultBackup;
      const payload = await decryptBackup(backup, importPhrase.trim());

      const spaceIdMap: Record<string, string> = {};

      for (const space of payload.spaces) {
        const res = await fetch('/api/spaces', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: space.name,
            description: space.description ?? '',
            instruction: space.instruction ?? '',
          }),
        });

        if (!res.ok) continue;

        const created = await res.json();
        const createdId = String(created.id ?? created.space?.id ?? '');

        if (createdId) {
          spaceIdMap[space.id] = createdId;
        }
      }

      payload.localStorageRecords.forEach((record) => {
        const rewrittenValue = rewriteSpaceDestinations(
          record.key,
          record.value,
          spaceIdMap,
        );

        writeVaultStorageRecord(record.key, rewrittenValue);
      });

      const importedMeta: VaultMeta = {
        vaultId: payload.vaultId || backup.vaultId || generateVaultId(),
        createdAt: new Date().toISOString(),
        lastImportAt: new Date().toISOString(),
      };

      writeVaultMeta(importedMeta);
      setVaultMeta(importedMeta);

      setStatus(
        `Vault imported. Restored ${payload.localStorageRecords.length} data groups and ${Object.keys(spaceIdMap).length} spaces.`,
      );
    } catch (error) {
      console.error(error);
      setStatus(
        'Could not import the vault. Check the file and recovery phrase.',
      );
    } finally {
      setWorking(false);
    }
  };

  const unlockEncryptedStorage = async () => {
    if (!unlockPhrase.trim()) {
      setEncryptedStorageStatus('Enter your recovery phrase first.');
      return;
    }

    setWorking(true);
    setEncryptedStorageStatus(null);

    try {
      const result = await unlockEncryptedVaultStorage(unlockPhrase.trim());
      await refreshEncryptedStorageStats();
      setEncryptedStorageStatus(
        `Encrypted device storage unlocked for ${result.vaultId}.`,
      );
    } catch (error) {
      console.error(error);
      setEncryptedStorageStatus('Could not unlock encrypted storage.');
    } finally {
      setWorking(false);
    }
  };

  const migrateToEncryptedStorage = async () => {
    setWorking(true);
    setEncryptedStorageStatus(null);

    try {
      const result = await migrateLocalVaultToEncryptedDb();
      await refreshEncryptedStorageStats();
      setEncryptedStorageStatus(
        `Migrated ${result.migrated} local data groups into encrypted storage.`,
      );
    } catch (error) {
      console.error(error);
      setEncryptedStorageStatus(
        'Could not migrate. Unlock encrypted storage first.',
      );
    } finally {
      setWorking(false);
    }
  };

  const restoreFromEncryptedStorage = async () => {
    const confirmed = window.confirm(
      'Restore encrypted records into local app storage on this browser?',
    );

    if (!confirmed) return;

    setWorking(true);
    setEncryptedStorageStatus(null);

    try {
      const result = await restoreEncryptedDbToLocalVault();
      await refreshEncryptedStorageStats();
      setEncryptedStorageStatus(
        `Restored ${result.restored} encrypted records into local app storage.`,
      );
    } catch (error) {
      console.error(error);
      setEncryptedStorageStatus(
        'Could not restore. Unlock encrypted storage first.',
      );
    } finally {
      setWorking(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setBackupFile(event.target.files?.[0] ?? null);
  };

  return (
    <div className="min-h-screen bg-light-primary px-6 py-10 dark:bg-dark-primary lg:px-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/search"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-black/55 transition hover:text-black dark:text-white/55 dark:hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to Search
        </Link>

        <header className="rounded-[2rem] border border-light-200 bg-light-secondary p-7 shadow-sm dark:border-dark-200 dark:bg-dark-secondary">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-light-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-black/45 dark:border-dark-200 dark:text-white/45">
            <ShieldCheck size={14} />
            Privacy Vault
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white md:text-5xl">
            Sync without an account
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-relaxed text-black/60 dark:text-white/60">
            Export and import your Etherana workspace as an encrypted vault.
            Your recovery phrase encrypts the data locally before it leaves this
            browser.
          </p>
        </header>

        <section className="mt-8 rounded-[2rem] border border-light-200 bg-light-secondary p-6 shadow-sm dark:border-dark-200 dark:bg-dark-secondary">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Lock size={18} className="text-green-500" />
                <h2 className="text-xl font-semibold text-black dark:text-white">
                  Private vault identity
                </h2>
              </div>

              {vaultMeta ? (
                <div>
                  <p className="text-sm text-black/55 dark:text-white/55">
                    This browser is linked to a local private vault.
                  </p>

                  <div className="mt-4 rounded-2xl bg-light-primary p-4 dark:bg-dark-primary">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/35 dark:text-white/35">
                      Vault ID
                    </p>

                    <p className="mt-2 break-all font-mono text-sm text-black/70 dark:text-white/70">
                      {vaultMeta.vaultId}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-black/55 dark:text-white/55 sm:grid-cols-3">
                    <p>Created: {new Date(vaultMeta.createdAt).toLocaleString()}</p>
                    <p>
                      Last export:{' '}
                      {vaultMeta.lastExportAt
                        ? new Date(vaultMeta.lastExportAt).toLocaleString()
                        : 'Never'}
                    </p>
                    <p>
                      Last import:{' '}
                      {vaultMeta.lastImportAt
                        ? new Date(vaultMeta.lastImportAt).toLocaleString()
                        : 'Never'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="max-w-2xl text-sm leading-relaxed text-black/55 dark:text-white/55">
                  Create a private vault to generate a vault ID and recovery
                  phrase. The phrase is shown once and is not stored by Etherana.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={createPrivateVault}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] dark:bg-white dark:text-black"
            >
              <ShieldCheck size={16} />
              {vaultMeta ? 'Create new vault' : 'Create private vault'}
            </button>
          </div>

          {generatedPhrase && (
            <div className="mt-6 rounded-3xl border border-orange-500/20 bg-orange-500/10 p-5">
              <div className="mb-3 flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <AlertTriangle size={18} />
                <p className="font-semibold">Save this recovery phrase now</p>
              </div>

              <p className="rounded-2xl bg-light-primary p-4 font-mono text-sm leading-relaxed text-black dark:bg-dark-primary dark:text-white">
                {generatedPhrase}
              </p>

              <button
                type="button"
                onClick={copyGeneratedPhrase}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.01] dark:bg-white dark:text-black"
              >
                <Copy size={16} />
                {copied ? 'Copied' : 'Copy phrase'}
              </button>
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-light-200 bg-light-secondary p-6 shadow-sm dark:border-dark-200 dark:bg-dark-secondary">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-light-primary dark:bg-dark-primary">
                <Download size={20} />
              </div>

              <div>
                <h2 className="text-xl font-semibold text-black dark:text-white">
                  Export encrypted vault
                </h2>

                <p className="text-sm text-black/50 dark:text-white/50">
                  Create a portable backup for another device.
                </p>
              </div>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-medium text-black dark:text-white">
                Recovery phrase
              </span>

              <input
                value={exportPhrase}
                onChange={(event) => setExportPhrase(event.target.value)}
                type="password"
                placeholder="Enter your recovery phrase"
                className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
              />
            </label>

            {phraseWarning && (
              <p className="mt-3 flex items-center gap-2 text-sm text-orange-500">
                <AlertTriangle size={16} />
                {phraseWarning}
              </p>
            )}

            <button
              type="button"
              onClick={exportVault}
              disabled={working}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 dark:bg-white dark:text-black"
            >
              {working ? <RefreshCw size={16} /> : <FileKey2 size={16} />}
              Export vault
            </button>
          </div>

          <div className="rounded-[2rem] border border-light-200 bg-light-secondary p-6 shadow-sm dark:border-dark-200 dark:bg-dark-secondary">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-light-primary dark:bg-dark-primary">
                <Upload size={20} />
              </div>

              <div>
                <h2 className="text-xl font-semibold text-black dark:text-white">
                  Import encrypted vault
                </h2>

                <p className="text-sm text-black/50 dark:text-white/50">
                  Restore workspace data on this device.
                </p>
              </div>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-medium text-black dark:text-white">
                Vault file
              </span>

              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-black file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:file:bg-white dark:file:text-black"
              />
            </label>

            <label className="mt-4 block space-y-2">
              <span className="text-sm font-medium text-black dark:text-white">
                Recovery phrase
              </span>

              <input
                value={importPhrase}
                onChange={(event) => setImportPhrase(event.target.value)}
                type="password"
                placeholder="Enter the phrase used during export"
                className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
              />
            </label>

            <button
              type="button"
              onClick={importVault}
              disabled={working}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 dark:bg-white dark:text-black"
            >
              {working ? <RefreshCw size={16} /> : <KeyRound size={16} />}
              Import vault
            </button>
          </div>
        </section>

        {status && (
          <div className="mt-6 rounded-3xl border border-light-200 bg-light-secondary p-5 text-sm text-black/65 dark:border-dark-200 dark:bg-dark-secondary dark:text-white/65">
            {status}
          </div>
        )}

        <section className="mt-8 rounded-[2rem] border border-light-200 bg-light-secondary p-6 shadow-sm dark:border-dark-200 dark:bg-dark-secondary">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-light-primary dark:bg-dark-primary">
              <Lock size={20} />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-black dark:text-white">
                Encrypted device storage
              </h2>

              <p className="text-sm text-black/50 dark:text-white/50">
                Store local vault records encrypted inside this browser. This is
                the foundation for anonymous encrypted sync.
              </p>
            </div>
          </div>

          <div className="mb-5 grid gap-3 text-sm text-black/55 dark:text-white/55 md:grid-cols-3">
            <div className="rounded-2xl bg-light-primary p-4 dark:bg-dark-primary">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/35 dark:text-white/35">
                State
              </p>
              <p className="mt-2 font-medium">
                {isEncryptedVaultUnlocked() ? 'Unlocked' : 'Locked'}
              </p>
            </div>

            <div className="rounded-2xl bg-light-primary p-4 dark:bg-dark-primary">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/35 dark:text-white/35">
                Records
              </p>
              <p className="mt-2 font-medium">{encryptedRecordCount}</p>
            </div>

            <div className="rounded-2xl bg-light-primary p-4 dark:bg-dark-primary">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/35 dark:text-white/35">
                Last migration
              </p>
              <p className="mt-2 font-medium">
                {vaultMeta?.encryptedDbMigratedAt
                  ? new Date(vaultMeta.encryptedDbMigratedAt).toLocaleString()
                  : 'Never'}
              </p>
            </div>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-black dark:text-white">
              Recovery phrase
            </span>

            <input
              value={unlockPhrase}
              onChange={(event) => setUnlockPhrase(event.target.value)}
              type="password"
              placeholder="Enter your recovery phrase to unlock encrypted storage"
              className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
            />
          </label>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={unlockEncryptedStorage}
              disabled={working}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:opacity-40 dark:bg-white dark:text-black"
            >
              <KeyRound size={16} />
              Unlock
            </button>

            <button
              type="button"
              onClick={migrateToEncryptedStorage}
              disabled={working}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-light-200 px-5 py-3 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black disabled:opacity-40 dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
            >
              <Lock size={16} />
              Migrate
            </button>

            <button
              type="button"
              onClick={restoreFromEncryptedStorage}
              disabled={working}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-light-200 px-5 py-3 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black disabled:opacity-40 dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
            >
              <RefreshCw size={16} />
              Restore
            </button>
          </div>

          {encryptedStorageStatus && (
            <div className="mt-5 rounded-2xl bg-light-primary p-4 text-sm text-black/65 dark:bg-dark-primary dark:text-white/65">
              {encryptedStorageStatus}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-[2rem] border border-light-200 bg-light-secondary p-6 shadow-sm dark:border-dark-200 dark:bg-dark-secondary">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-500" />
            <h2 className="text-lg font-semibold text-black dark:text-white">
              Privacy guarantees
            </h2>
          </div>

          <div className="grid gap-4 text-sm leading-relaxed text-black/60 dark:text-white/60 md:grid-cols-3">
            <p>
              The vault is encrypted locally using AES-GCM before it is
              downloaded.
            </p>

            <p>
              Etherana cannot recover the vault if the recovery phrase is lost.
            </p>

            <p>
              This is the foundation for future anonymous encrypted sync and QR
              device pairing.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default VaultPage;
