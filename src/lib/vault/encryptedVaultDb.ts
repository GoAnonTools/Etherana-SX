'use client';

import {
  readVaultMeta,
  readVaultStorageRecords,
  writeVaultMeta,
  writeVaultStorageRecord,
  type VaultMeta,
} from './localVault';

interface EncryptedVaultRecord {
  key: string;
  ciphertext: string;
  iv: string;
  updatedAt: string;
}

interface DecryptedVaultRecord {
  key: string;
  value: string;
  updatedAt: string;
}

const DB_NAME = 'etherana-private-vault';
const DB_VERSION = 1;
const STORE_NAME = 'records';
const PBKDF2_ITERATIONS = 310_000;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

let unlockedKey: CryptoKey | null = null;
let unlockedVaultId: string | null = null;

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

const generateBytes = (length: number) => {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return bytes;
};

const openVaultDb = () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: 'key',
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
  });
};

const getVaultMetaOrThrow = () => {
  const meta = readVaultMeta();

  if (!meta) {
    throw new Error('Create a private vault before using encrypted storage.');
  }

  return meta;
};

const ensureEncryptedDbSalt = () => {
  const meta = getVaultMetaOrThrow();

  if (meta.encryptedDbSalt) return meta;

  const updatedMeta: VaultMeta = {
    ...meta,
    encryptedDbSalt: bytesToBase64(generateBytes(16)),
  };

  writeVaultMeta(updatedMeta);

  return updatedMeta;
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

const encryptString = async (value: string) => {
  if (!unlockedKey) {
    throw new Error('Encrypted vault storage is locked.');
  }

  const iv = generateBytes(12);

  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
    },
    unlockedKey,
    toArrayBuffer(textEncoder.encode(value)),
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
  };
};

const decryptString = async (record: EncryptedVaultRecord) => {
  if (!unlockedKey) {
    throw new Error('Encrypted vault storage is locked.');
  }

  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(base64ToBytes(record.iv)),
    },
    unlockedKey,
    toArrayBuffer(base64ToBytes(record.ciphertext)),
  );

  return textDecoder.decode(decrypted);
};

export const isEncryptedVaultUnlocked = () => {
  return Boolean(unlockedKey && unlockedVaultId);
};

export const getUnlockedVaultId = () => {
  return unlockedVaultId;
};

export const unlockEncryptedVaultStorage = async (
  recoveryPhrase: string,
) => {
  const meta = ensureEncryptedDbSalt();

  unlockedKey = await deriveKey(
    recoveryPhrase,
    base64ToBytes(meta.encryptedDbSalt!),
  );
  unlockedVaultId = meta.vaultId;

  return {
    vaultId: meta.vaultId,
  };
};

export const lockEncryptedVaultStorage = () => {
  unlockedKey = null;
  unlockedVaultId = null;
};

export const writeEncryptedVaultRecord = async (
  key: string,
  value: string,
) => {
  const db = await openVaultDb();
  const encrypted = await encryptString(value);

  const record: EncryptedVaultRecord = {
    key,
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv,
    updatedAt: new Date().toISOString(),
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    store.put(record);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  db.close();
};

export const readEncryptedVaultRecord = async (
  key: string,
): Promise<DecryptedVaultRecord | null> => {
  const db = await openVaultDb();

  const record = await new Promise<EncryptedVaultRecord | undefined>(
    (resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    },
  );

  db.close();

  if (!record) return null;

  return {
    key: record.key,
    value: await decryptString(record),
    updatedAt: record.updatedAt,
  };
};

export const readAllEncryptedVaultRecords = async () => {
  const db = await openVaultDb();

  const records = await new Promise<EncryptedVaultRecord[]>(
    (resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result ?? []);
      request.onerror = () => reject(request.error);
    },
  );

  db.close();

  const decrypted: DecryptedVaultRecord[] = [];

  for (const record of records) {
    decrypted.push({
      key: record.key,
      value: await decryptString(record),
      updatedAt: record.updatedAt,
    });
  }

  return decrypted;
};

export const getEncryptedVaultDbStats = async () => {
  const db = await openVaultDb();

  const count = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  db.close();

  return {
    count,
    unlocked: isEncryptedVaultUnlocked(),
    vaultId: unlockedVaultId,
  };
};

export const migrateLocalVaultToEncryptedDb = async () => {
  if (!isEncryptedVaultUnlocked()) {
    throw new Error('Unlock encrypted storage before migrating.');
  }

  const records = readVaultStorageRecords();

  for (const record of records) {
    await writeEncryptedVaultRecord(record.key, record.value);
  }

  const meta = getVaultMetaOrThrow();
  const updatedMeta: VaultMeta = {
    ...meta,
    encryptedDbMigratedAt: new Date().toISOString(),
  };

  writeVaultMeta(updatedMeta);

  return {
    migrated: records.length,
  };
};

export const restoreEncryptedDbToLocalVault = async () => {
  if (!isEncryptedVaultUnlocked()) {
    throw new Error('Unlock encrypted storage before restoring.');
  }

  const records = await readAllEncryptedVaultRecords();

  records.forEach((record) => {
    writeVaultStorageRecord(record.key, record.value);
  });

  return {
    restored: records.length,
  };
};

interface VaultSyncServerRecord {
  recordKey: string;
  ciphertext: string;
  iv: string;
  updatedAt: string;
  deletedAt?: string | null;
  deviceId?: string | null;
}

interface VaultSyncPushResponse {
  vaultId: string;
  accepted: number;
  skipped: number;
}

interface VaultSyncPullResponse {
  vaultId: string;
  records: VaultSyncServerRecord[];
}

const getDeviceId = () => {
  const key = 'etherana.privateVault.deviceId.v1';
  const existing = localStorage.getItem(key);

  if (existing) return existing;

  const deviceId = `device_${Math.random()
    .toString(36)
    .slice(2)}_${Date.now().toString(36)}`;

  localStorage.setItem(key, deviceId);

  return deviceId;
};

const readAllEncryptedVaultRecordsRaw = async () => {
  const db = await openVaultDb();

  const records = await new Promise<EncryptedVaultRecord[]>(
    (resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result ?? []);
      request.onerror = () => reject(request.error);
    },
  );

  db.close();

  return records;
};

const writeEncryptedVaultRecordRaw = async (
  record: EncryptedVaultRecord,
) => {
  const db = await openVaultDb();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    store.put(record);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  db.close();
};

export const pushEncryptedVaultToSyncServer = async () => {
  const meta = getVaultMetaOrThrow();

  if (!isEncryptedVaultUnlocked()) {
    throw new Error('Unlock encrypted storage before pushing sync records.');
  }

  const records = await readAllEncryptedVaultRecordsRaw();
  const deviceId = getDeviceId();

  const res = await fetch('/api/vault/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      vaultId: meta.vaultId,
      records: records.map((record) => ({
        recordKey: record.key,
        ciphertext: record.ciphertext,
        iv: record.iv,
        updatedAt: record.updatedAt,
        deviceId,
      })),
    }),
  });

  if (!res.ok) {
    throw new Error('Could not push encrypted vault records.');
  }

  const data = (await res.json()) as VaultSyncPushResponse;

  const updatedMeta: VaultMeta = {
    ...meta,
    lastSyncPushAt: new Date().toISOString(),
  };

  writeVaultMeta(updatedMeta);

  return data;
};

export const pullEncryptedVaultFromSyncServer = async () => {
  const meta = getVaultMetaOrThrow();

  if (!isEncryptedVaultUnlocked()) {
    throw new Error('Unlock encrypted storage before pulling sync records.');
  }

  const res = await fetch(
    `/api/vault/sync?vaultId=${encodeURIComponent(meta.vaultId)}`,
  );

  if (!res.ok) {
    throw new Error('Could not pull encrypted vault records.');
  }

  const data = (await res.json()) as VaultSyncPullResponse;
  let imported = 0;
  let skipped = 0;

  const currentRecords = await readAllEncryptedVaultRecordsRaw();
  const currentByKey = new Map(
    currentRecords.map((record) => [record.key, record]),
  );

  for (const record of data.records ?? []) {
    if (
      !record.recordKey ||
      !record.ciphertext ||
      !record.iv ||
      !record.updatedAt
    ) {
      skipped += 1;
      continue;
    }

    const existing = currentByKey.get(record.recordKey);

    if (
      existing &&
      Date.parse(existing.updatedAt) > Date.parse(record.updatedAt)
    ) {
      skipped += 1;
      continue;
    }

    await writeEncryptedVaultRecordRaw({
      key: record.recordKey,
      ciphertext: record.ciphertext,
      iv: record.iv,
      updatedAt: record.updatedAt,
    });

    imported += 1;
  }

  const updatedMeta: VaultMeta = {
    ...meta,
    lastSyncPullAt: new Date().toISOString(),
  };

  writeVaultMeta(updatedMeta);

  return {
    vaultId: data.vaultId,
    imported,
    skipped,
  };
};
