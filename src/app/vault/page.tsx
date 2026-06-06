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
import { useI18n } from '@/lib/i18n/useI18n';

interface VaultSpace {
  id: string;
  name: string;
  description?: string;
  instruction?: string;
  createdAt?: string;
  files?: { name: string; fileId: string }[];
}

interface VaultConversationMessage {
  messageId: string;
  backendId: string;
  query: string;
  createdAt: string;
  responseBlocks: unknown[];
  status: 'answering' | 'completed' | 'error' | null;
}

interface VaultConversationChat {
  id: string;
  title: string;
  createdAt: string;
  sources: unknown[];
  files: { name: string; fileId: string }[];
  spaceId: string | null;
  messages: VaultConversationMessage[];
}

interface VaultUploadRecord {
  record: Record<string, unknown>;
  content: string;
}

interface VaultSpaceNote {
  id: string;
  spaceId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface VaultSpaceLink {
  id: string;
  spaceId: string;
  title: string;
  url: string;
  description?: string | null;
  createdAt: string;
}

interface VaultSpaceCaptures {
  notes: VaultSpaceNote[];
  links: VaultSpaceLink[];
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
  conversations: VaultConversationChat[];
  uploads: VaultUploadRecord[];
  captures?: VaultSpaceCaptures;
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
    type: 'application/vnd.etherana.goanon+json;charset=utf-8',
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
  return `etherana-private-vault-${date}.goanon`;
};

const getSpaceBackupFilename = (spaceName: string, spaceId: string) => {
  const date = new Date().toISOString().slice(0, 10);
  const slug =
    spaceName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || spaceId;

  return `etherana-space-${slug}-${date}.goanon`;
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
  const { t } = useI18n();
  const [vaultMeta, setVaultMeta] = useState<VaultMeta | null>(null);
  const [generatedPhrase, setGeneratedPhrase] = useState('');
  const [exportPhrase, setExportPhrase] = useState('');
  const [importPhrase, setImportPhrase] = useState('');
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [exportScope, setExportScope] = useState<'workspace' | 'space'>(
    'workspace',
  );
  const [exportSpaces, setExportSpaces] = useState<VaultSpace[]>([]);
  const [selectedExportSpaceId, setSelectedExportSpaceId] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setVaultMeta(readVaultMeta());

    fetchSpaces()
      .then((spaces) => {
        setExportSpaces(spaces);

        if (spaces.length > 0) {
          setSelectedExportSpaceId((current) => current || spaces[0].id);
        }
      })
      .catch(() => {
        setExportSpaces([]);
      });
  }, []);

  const phraseWarning = useMemo(() => {
    if (!exportPhrase) return null;

    if (exportPhrase.length < 16) {
      return t('vaultPage.shortPhraseWarning');
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
      t('vaultPage.privateVaultCreated'),
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
        name: String(space.name ?? t('vaultPage.untitledSpace')),
        description: String(space.description ?? ''),
        instruction: String(space.instruction ?? ''),
        createdAt: String(space.createdAt ?? ''),
        files: Array.isArray(space.files)
          ? space.files.filter(
              (file: any) =>
                typeof file?.name === 'string' &&
                typeof file?.fileId === 'string',
            )
          : [],
      }));
    } catch {
      return [];
    }
  };

  const fetchConversations = async (): Promise<VaultConversationChat[]> => {
    try {
      const res = await fetch('/api/vault/conversations');

      if (!res.ok) return [];

      const data = await res.json();

      return Array.isArray(data.conversations) ? data.conversations : [];
    } catch {
      return [];
    }
  };

  const fetchUploads = async (): Promise<VaultUploadRecord[]> => {
    try {
      const res = await fetch('/api/vault/uploads');

      if (!res.ok) return [];

      const data = await res.json();

      return Array.isArray(data.uploads) ? data.uploads : [];
    } catch {
      return [];
    }
  };

  const fetchCaptures = async (): Promise<VaultSpaceCaptures> => {
    try {
      const res = await fetch('/api/vault/captures');

      if (!res.ok) {
        return {
          notes: [],
          links: [],
        };
      }

      const data = await res.json();

      return {
        notes: Array.isArray(data.notes) ? data.notes : [],
        links: Array.isArray(data.links) ? data.links : [],
      };
    } catch {
      return {
        notes: [],
        links: [],
      };
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
      setStatus(t('vaultPage.enterPhraseBeforeExporting'));
      return;
    }

    if (exportScope === 'space' && !selectedExportSpaceId) {
      setStatus(t('vaultPage.chooseSpaceToExport'));
      return;
    }

    setWorking(true);
    setStatus(null);

    try {
      const meta = ensureVaultMeta();

      let payload: VaultPayload;
      let filename = getBackupFilename();

      if (exportScope === 'space') {
        const selectedSpace = exportSpaces.find(
          (space) => space.id === selectedExportSpaceId,
        );

        const res = await fetch(`/api/vault/spaces/${selectedExportSpaceId}`);

        if (!res.ok) {
          throw new Error(t('vaultPage.couldNotPrepareSpaceExport'));
        }

        payload = (await res.json()) as VaultPayload;
        filename = getSpaceBackupFilename(
          selectedSpace?.name ?? 'space',
          selectedExportSpaceId,
        );
      } else {
        const spaces = await fetchSpaces();
        const conversations = await fetchConversations();
        const uploads = await fetchUploads();
        const captures = await fetchCaptures();

        payload = {
          version: 1,
          exportedAt: new Date().toISOString(),
          app: 'etherana-sx',
          vaultId: meta.vaultId,
          localStorageRecords: readVaultStorageRecords(),
          spaces,
          conversations,
          uploads,
          captures,
          notes: [
            'This backup is end-to-end encrypted with your recovery phrase.',
            'Etherana cannot recover this vault if the recovery phrase is lost.',
            'Uploaded original file binaries are not included in this version.',
            'Processed knowledge chunks and embeddings are included.',
            'Space conversations and messages are included.',
            'Personal notes and saved links are included.',
          ],
        };
      }

      const backup = await encryptPayload(payload, exportPhrase.trim());

      downloadJson(filename, backup);

      const updatedMeta: VaultMeta = {
        ...meta,
        lastExportAt: new Date().toISOString(),
      };

      writeVaultMeta(updatedMeta);
      setVaultMeta(updatedMeta);

      setStatus(
        exportScope === 'space'
          ? t('vaultPage.encryptedSpaceExported')
          : t('vaultPage.encryptedWorkspaceExported'),
      );
    } catch (error) {
      console.error(error);
      setStatus(t('vaultPage.couldNotExport'));
    } finally {
      setWorking(false);
    }
  };

  const restoreSpaceFromVault = async (space: VaultSpace) => {
    const files = Array.isArray(space.files) ? space.files : [];

    try {
      const existingRes = await fetch(`/api/spaces/${space.id}`);

      if (existingRes.ok) {
        await fetch(`/api/spaces/${space.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: space.name,
            description: space.description ?? '',
            instruction: space.instruction ?? '',
            files,
          }),
        });

        return space.id;
      }
    } catch {
      // If lookup fails, create a new Space below.
    }

    const createRes = await fetch('/api/spaces', {
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

    if (!createRes.ok) return null;

    const created = await createRes.json();
    const createdId = String(created.id ?? created.space?.id ?? '');

    if (!createdId) return null;

    if (files.length > 0) {
      await fetch(`/api/spaces/${createdId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files,
        }),
      });
    }

    return createdId;
  };

  const importVault = async () => {
    if (!backupFile) {
      setStatus(t('vaultPage.chooseBackupFile'));
      return;
    }

    if (!importPhrase.trim()) {
      setStatus(t('vaultPage.enterPhraseForBackup'));
      return;
    }

    const confirmed = window.confirm(
      t('vaultPage.importConfirm'),
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
        const restoredSpaceId = await restoreSpaceFromVault(space);

        if (restoredSpaceId) {
          spaceIdMap[space.id] = restoredSpaceId;
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

      let importedChats = 0;
      let importedMessages = 0;

      if (Array.isArray(payload.conversations) && payload.conversations.length > 0) {
        const conversationsRes = await fetch('/api/vault/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversations: payload.conversations,
            spaceIdMap,
          }),
        });

        if (conversationsRes.ok) {
          const conversationsData = await conversationsRes.json();
          importedChats = Number(conversationsData.importedChats ?? 0);
          importedMessages = Number(conversationsData.importedMessages ?? 0);
        }
      }

      let importedUploads = 0;

      if (Array.isArray(payload.uploads) && payload.uploads.length > 0) {
        const uploadsRes = await fetch('/api/vault/uploads', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uploads: payload.uploads,
          }),
        });

        if (uploadsRes.ok) {
          const uploadsData = await uploadsRes.json();
          importedUploads = Number(uploadsData.imported ?? 0);
        }
      }

      let importedNotes = 0;
      let importedLinks = 0;

      if (payload.captures) {
        const capturesRes = await fetch('/api/vault/captures', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notes: payload.captures.notes ?? [],
            links: payload.captures.links ?? [],
            spaceIdMap,
          }),
        });

        if (capturesRes.ok) {
          const capturesData = await capturesRes.json();
          importedNotes = Number(capturesData.importedNotes ?? 0);
          importedLinks = Number(capturesData.importedLinks ?? 0);
        }
      }



      const importedMeta: VaultMeta = {
        vaultId: payload.vaultId || backup.vaultId || generateVaultId(),
        createdAt: new Date().toISOString(),
        lastImportAt: new Date().toISOString(),
      };

      writeVaultMeta(importedMeta);
      setVaultMeta(importedMeta);

      setStatus(
        `${t('vaultPage.importedPrefix')} ${
          payload.localStorageRecords.length
        } ${t('vaultPage.dataGroups')}, ${
          Object.keys(spaceIdMap).length
        } ${t('vaultPage.spaces')}, ${importedChats} ${t(
          'vaultPage.conversations',
        ).toLowerCase()}, ${importedMessages} ${t(
          'vaultPage.messages',
        ).toLowerCase()}, ${importedUploads} ${t(
          'vaultPage.knowledgeFiles',
        )}, ${importedNotes} ${t('vaultPage.notes')}, ${t(
          'vaultPage.and',
        )} ${importedLinks} ${t('vaultPage.links')}.`,
      );
    } catch (error) {
      console.error(error);
      setStatus(
        t('vaultPage.couldNotImport'),
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
          {t('vaultPage.backToSearch')}
        </Link>

        <header className="rounded-[2rem] border border-light-200 bg-light-secondary p-7 shadow-sm dark:border-dark-200 dark:bg-dark-secondary">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-light-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-black/45 dark:border-dark-200 dark:text-white/45">
            <ShieldCheck size={14} />
            {t('vaultPage.badge')}
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white md:text-5xl">
            {t('vaultPage.title')}
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-relaxed text-black/60 dark:text-white/60">
            {t('vaultPage.subtitle')}
          </p>
        </header>

        <section className="mt-8 rounded-[2rem] border border-light-200 bg-light-secondary p-6 shadow-sm dark:border-dark-200 dark:bg-dark-secondary">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Lock size={18} className="text-green-500" />
                <h2 className="text-xl font-semibold text-black dark:text-white">
                  {t('vaultPage.privateVaultIdentity')}
                </h2>
              </div>

              {vaultMeta ? (
                <div>
                  <p className="text-sm text-black/55 dark:text-white/55">
                    {t('vaultPage.linkedBrowser')}
                  </p>

                  <div className="mt-4 rounded-2xl bg-light-primary p-4 dark:bg-dark-primary">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/35 dark:text-white/35">
                      {t('vaultPage.vaultId')}
                    </p>

                    <p className="mt-2 break-all font-mono text-sm text-black/70 dark:text-white/70">
                      {vaultMeta.vaultId}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-black/55 dark:text-white/55 sm:grid-cols-3">
                    <p>{t('vaultPage.created')} {new Date(vaultMeta.createdAt).toLocaleString()}</p>
                    <p>
                      {t('vaultPage.lastExport')}{' '}
                      {vaultMeta.lastExportAt
                        ? new Date(vaultMeta.lastExportAt).toLocaleString()
                        : t('vaultPage.never')}
                    </p>
                    <p>
                      {t('vaultPage.lastImport')}{' '}
                      {vaultMeta.lastImportAt
                        ? new Date(vaultMeta.lastImportAt).toLocaleString()
                        : t('vaultPage.never')}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="max-w-2xl text-sm leading-relaxed text-black/55 dark:text-white/55">
                  {t('vaultPage.createVaultDescription')}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={createPrivateVault}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] dark:bg-white dark:text-black"
            >
              <ShieldCheck size={16} />
              {vaultMeta ? t('vaultPage.createNewVault') : t('vaultPage.createPrivateVault')}
            </button>
          </div>

          {generatedPhrase && (
            <div className="mt-6 rounded-3xl border border-orange-500/20 bg-orange-500/10 p-5">
              <div className="mb-3 flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <AlertTriangle size={18} />
                <p className="font-semibold">{t('vaultPage.saveRecoveryPhraseNow')}</p>
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
                {copied ? t('vaultPage.copied') : t('vaultPage.copyPhrase')}
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
                  {t('vaultPage.exportEncryptedVault')}
                </h2>

                <p className="text-sm text-black/50 dark:text-white/50">
                  {t('vaultPage.exportDescription')}
                </p>
              </div>
            </div>

            <div className="mb-5 rounded-3xl bg-light-primary p-4 dark:bg-dark-primary">
              <p className="mb-3 text-sm font-semibold text-black dark:text-white">
                {t('vaultPage.exportScope')}
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setExportScope('workspace')}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    exportScope === 'workspace'
                      ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                      : 'border-light-200 text-black/60 hover:text-black dark:border-dark-200 dark:text-white/60 dark:hover:text-white'
                  }`}
                >
                  <span className="block font-semibold">{t('vaultPage.entireWorkspace')}</span>
                  <span className="mt-1 block text-xs opacity-70">
                    {t('vaultPage.entireWorkspaceDescription')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportScope('space')}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    exportScope === 'space'
                      ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                      : 'border-light-200 text-black/60 hover:text-black dark:border-dark-200 dark:text-white/60 dark:hover:text-white'
                  }`}
                >
                  <span className="block font-semibold">{t('vaultPage.selectedSpace')}</span>
                  <span className="mt-1 block text-xs opacity-70">
                    {t('vaultPage.selectedSpaceDescription')}
                  </span>
                </button>
              </div>

              {exportScope === 'space' && (
                <label className="mt-4 block space-y-2">
                  <span className="text-sm font-medium text-black dark:text-white">
                    {t('vaultPage.spaceToExport')}
                  </span>

                  <select
                    value={selectedExportSpaceId}
                    onChange={(event) =>
                      setSelectedExportSpaceId(event.target.value)
                    }
                    className="w-full rounded-2xl border border-light-200 bg-light-secondary px-4 py-3 text-sm text-black outline-none dark:border-dark-200 dark:bg-dark-secondary dark:text-white"
                  >
                    {exportSpaces.map((space) => (
                      <option key={space.id} value={space.id}>
                        {space.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <label className="space-y-2">
              <span className="text-sm font-medium text-black dark:text-white">
                {t('vaultPage.recoveryPhrase')}
              </span>

              <input
                value={exportPhrase}
                onChange={(event) => setExportPhrase(event.target.value)}
                type="password"
                placeholder={t('vaultPage.enterRecoveryPhrase')}
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
              {t('vaultPage.exportVault')}
            </button>
          </div>

          <div className="rounded-[2rem] border border-light-200 bg-light-secondary p-6 shadow-sm dark:border-dark-200 dark:bg-dark-secondary">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-light-primary dark:bg-dark-primary">
                <Upload size={20} />
              </div>

              <div>
                <h2 className="text-xl font-semibold text-black dark:text-white">
                  {t('vaultPage.importEncryptedVault')}
                </h2>

                <p className="text-sm text-black/50 dark:text-white/50">
                  {t('vaultPage.importDescription')}
                </p>
              </div>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-medium text-black dark:text-white">
                {t('vaultPage.goanonVaultFile')}
              </span>

              <input
                type="file"
                accept=".goanon,.json,application/json,application/vnd.etherana.goanon+json"
                onChange={handleFileChange}
                className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-black file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:file:bg-white dark:file:text-black"
              />
            </label>

            <label className="mt-4 block space-y-2">
              <span className="text-sm font-medium text-black dark:text-white">
                {t('vaultPage.recoveryPhrase')}
              </span>

              <input
                value={importPhrase}
                onChange={(event) => setImportPhrase(event.target.value)}
                type="password"
                placeholder={t('vaultPage.enterImportPhrase')}
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
              {t('vaultPage.importVault')}
            </button>
          </div>
        </section>

        {status && (
          <div className="mt-6 rounded-3xl border border-light-200 bg-light-secondary p-5 text-sm text-black/65 dark:border-dark-200 dark:bg-dark-secondary dark:text-white/65">
            {status}
          </div>
        )}

        <section className="mt-8 rounded-[2rem] border border-light-200 bg-light-secondary p-6 shadow-sm dark:border-dark-200 dark:bg-dark-secondary">
          <div className="mb-5 flex items-center gap-2">
            <ShieldCheck size={18} className="text-blue-500" />
            <h2 className="text-lg font-semibold text-black dark:text-white">
              {t('vaultPage.restoreChecklist')}
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl bg-light-primary p-5 dark:bg-dark-primary">
              <p className="mb-3 text-sm font-semibold text-green-600 dark:text-green-400">
                {t('vaultPage.restored')}
              </p>

              <ul className="space-y-2 text-sm leading-relaxed text-black/60 dark:text-white/60">
                <li>{t('vaultPage.spacesMetadata')}</li>
                <li>{t('vaultPage.conversations')}</li>
                <li>{t('vaultPage.messages')}</li>
                <li>{t('vaultPage.customAutomations')}</li>
                <li>{t('vaultPage.automationOutputs')}</li>
                <li>{t('vaultPage.runHistory')}</li>
              </ul>
            </div>

            <div className="rounded-2xl bg-light-primary p-5 dark:bg-dark-primary">
              <p className="mb-3 text-sm font-semibold text-orange-600 dark:text-orange-400">
                {t('vaultPage.restored')} for search
              </p>

              <ul className="space-y-2 text-sm leading-relaxed text-black/60 dark:text-white/60">
                <li>{t('vaultPage.knowledgeFileNames')}</li>
                <li>{t('vaultPage.processedChunks')}</li>
                <li>{t('vaultPage.embeddings')}</li>
                <li>{t('vaultPage.uploadedFileSearchIndex')}</li>
              </ul>
            </div>

            <div className="rounded-2xl bg-light-primary p-5 dark:bg-dark-primary">
              <p className="mb-3 text-sm font-semibold text-black/55 dark:text-white/55">
                {t('vaultPage.notIncludedYet')}
              </p>

              <ul className="space-y-2 text-sm leading-relaxed text-black/60 dark:text-white/60">
                <li>{t('vaultPage.originalBinaries')}</li>
                <li>{t('vaultPage.crossDeviceSync')}</li>
                <li>{t('vaultPage.qrPairing')}</li>
                <li>{t('vaultPage.cloudEncryptedSync')}</li>
              </ul>
            </div>
          </div>

          <p className="mt-5 text-sm leading-relaxed text-black/50 dark:text-white/50">
            {t('vaultPage.checklistNote')}
          </p>
        </section>

        <section className="mt-8 rounded-[2rem] border border-light-200 bg-light-secondary p-6 shadow-sm dark:border-dark-200 dark:bg-dark-secondary">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-500" />
            <h2 className="text-lg font-semibold text-black dark:text-white">
              {t('vaultPage.privacyGuarantees')}
            </h2>
          </div>

          <div className="grid gap-4 text-sm leading-relaxed text-black/60 dark:text-white/60 md:grid-cols-3">
            <p>
              {t('vaultPage.privacyLocal')}
            </p>

            <p>
              {t('vaultPage.privacyRecovery')}
            </p>

            <p>
              {t('vaultPage.privacyTransfer')}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default VaultPage;
