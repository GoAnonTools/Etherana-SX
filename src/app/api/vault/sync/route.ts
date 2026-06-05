import db from '@/lib/db';
import { vaultSyncRecords } from '@/lib/db/schema';
import crypto from 'crypto';
import { and, desc, eq, gt } from 'drizzle-orm';

interface SyncRecordInput {
  recordKey: string;
  ciphertext: string;
  iv: string;
  updatedAt: string;
  deletedAt?: string | null;
  deviceId?: string | null;
}

interface PushPayload {
  vaultId: string;
  records: SyncRecordInput[];
}

const MAX_RECORDS_PER_PUSH = 250;

const getRecordId = (vaultId: string, recordKey: string) => {
  return crypto
    .createHash('sha256')
    .update(`${vaultId}:${recordKey}`)
    .digest('hex');
};

const isValidVaultId = (value: unknown): value is string => {
  return typeof value === 'string' && value.length >= 8 && value.length <= 256;
};

const isValidRecordKey = (value: unknown): value is string => {
  return typeof value === 'string' && value.length >= 1 && value.length <= 256;
};

const isValidCiphertext = (value: unknown): value is string => {
  return typeof value === 'string' && value.length > 0;
};

const isValidIsoDate = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;

  const time = Date.parse(value);

  return Number.isFinite(time);
};

const sanitizeRecord = (record: unknown): SyncRecordInput | null => {
  if (!record || typeof record !== 'object') return null;

  const candidate = record as SyncRecordInput;

  if (!isValidRecordKey(candidate.recordKey)) return null;
  if (!isValidCiphertext(candidate.ciphertext)) return null;
  if (!isValidCiphertext(candidate.iv)) return null;
  if (!isValidIsoDate(candidate.updatedAt)) return null;

  return {
    recordKey: candidate.recordKey,
    ciphertext: candidate.ciphertext,
    iv: candidate.iv,
    updatedAt: candidate.updatedAt,
    deletedAt: candidate.deletedAt ?? null,
    deviceId:
      typeof candidate.deviceId === 'string'
        ? candidate.deviceId.slice(0, 128)
        : null,
  };
};

export const GET = async (req: Request) => {
  try {
    const url = new URL(req.url);
    const vaultId = url.searchParams.get('vaultId');
    const since = url.searchParams.get('since');

    if (!isValidVaultId(vaultId)) {
      return Response.json(
        { message: 'Missing or invalid vaultId' },
        { status: 400 },
      );
    }

    const records = since
      ? await db.query.vaultSyncRecords.findMany({
          where: and(
            eq(vaultSyncRecords.vaultId, vaultId),
            gt(vaultSyncRecords.updatedAt, since),
          ),
          orderBy: desc(vaultSyncRecords.updatedAt),
        })
      : await db.query.vaultSyncRecords.findMany({
          where: eq(vaultSyncRecords.vaultId, vaultId),
          orderBy: desc(vaultSyncRecords.updatedAt),
        });

    return Response.json({
      vaultId,
      records: records.map((record) => ({
        recordKey: record.recordKey,
        ciphertext: record.ciphertext,
        iv: record.iv,
        updatedAt: record.updatedAt,
        deletedAt: record.deletedAt,
        deviceId: record.deviceId,
      })),
    });
  } catch (error) {
    console.error('Failed to pull vault sync records:', error);

    return Response.json(
      { message: 'Failed to pull sync records' },
      { status: 500 },
    );
  }
};

export const POST = async (req: Request) => {
  try {
    const body = (await req.json()) as PushPayload;

    if (!isValidVaultId(body.vaultId)) {
      return Response.json(
        { message: 'Missing or invalid vaultId' },
        { status: 400 },
      );
    }

    const records = Array.isArray(body.records)
      ? body.records.slice(0, MAX_RECORDS_PER_PUSH)
      : [];

    let accepted = 0;
    let skipped = 0;

    for (const rawRecord of records) {
      const record = sanitizeRecord(rawRecord);

      if (!record) {
        skipped += 1;
        continue;
      }

      const id = getRecordId(body.vaultId, record.recordKey);

      const existing = await db.query.vaultSyncRecords.findFirst({
        where: eq(vaultSyncRecords.id, id),
      });

      if (
        existing &&
        Date.parse(existing.updatedAt) > Date.parse(record.updatedAt)
      ) {
        skipped += 1;
        continue;
      }

      await db.delete(vaultSyncRecords).where(eq(vaultSyncRecords.id, id));

      await db.insert(vaultSyncRecords).values({
        id,
        vaultId: body.vaultId,
        recordKey: record.recordKey,
        ciphertext: record.ciphertext,
        iv: record.iv,
        updatedAt: record.updatedAt,
        deletedAt: record.deletedAt ?? null,
        deviceId: record.deviceId ?? null,
      });

      accepted += 1;
    }

    return Response.json({
      vaultId: body.vaultId,
      accepted,
      skipped,
    });
  } catch (error) {
    console.error('Failed to push vault sync records:', error);

    return Response.json(
      { message: 'Failed to push sync records' },
      { status: 500 },
    );
  }
};
