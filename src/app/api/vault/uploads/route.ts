import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface VaultUploadRecord {
  record: Record<string, unknown>;
  content: string;
}

interface ImportPayload {
  uploads: VaultUploadRecord[];
}

const uploadsDir = path.join(process.env.ETHERANA_DATA_DIR || path.join(process.cwd(), 'data'), 'uploads');
const uploadedFilesRecordPath = path.join(uploadsDir, 'uploaded_files.json');

const ensureUploadsDir = () => {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  if (!fs.existsSync(uploadedFilesRecordPath)) {
    fs.writeFileSync(
      uploadedFilesRecordPath,
      JSON.stringify({ files: [] }, null, 2),
    );
  }
};

const readUploadedFilesRecord = (): { files: Record<string, unknown>[] } => {
  ensureUploadsDir();

  try {
    const raw = fs.readFileSync(uploadedFilesRecordPath, 'utf-8');
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed.files)) {
      return { files: [] };
    }

    return { files: parsed.files };
  } catch {
    return { files: [] };
  }
};

const writeUploadedFilesRecord = (files: Record<string, unknown>[]) => {
  ensureUploadsDir();

  fs.writeFileSync(
    uploadedFilesRecordPath,
    JSON.stringify({ files }, null, 2),
  );
};

const isSafeUploadPath = (candidatePath: string) => {
  const resolvedUploadsDir = path.resolve(uploadsDir);
  const resolvedCandidate = path.resolve(candidatePath);

  return resolvedCandidate.startsWith(resolvedUploadsDir);
};

const getContentPathFromRecord = (record: Record<string, unknown>) => {
  const contentPath = record.contentPath;

  if (typeof contentPath !== 'string') return null;

  if (!isSafeUploadPath(contentPath)) return null;

  return contentPath;
};

export const GET = async () => {
  try {
    const uploadedFiles = readUploadedFilesRecord();

    const uploads = uploadedFiles.files.flatMap((record) => {
      const contentPath = getContentPathFromRecord(record);

      if (!contentPath || !fs.existsSync(contentPath)) return [];

      return [
        {
          record,
          content: fs.readFileSync(contentPath, 'utf-8'),
        },
      ];
    });

    return Response.json({
      uploads,
    });
  } catch (error) {
    console.error('Failed to export vault uploads:', error);

    return Response.json(
      { message: 'Failed to export uploads' },
      { status: 500 },
    );
  }
};

export const POST = async (req: Request) => {
  try {
    ensureUploadsDir();

    const body = (await req.json()) as ImportPayload;
    const uploads = Array.isArray(body.uploads) ? body.uploads : [];

    const current = readUploadedFilesRecord();

    const currentById = new Map(
      current.files
        .filter((record) => typeof record.id === 'string')
        .map((record) => [String(record.id), record]),
    );

    let imported = 0;

    for (const upload of uploads) {
      if (
        !upload ||
        typeof upload !== 'object' ||
        !upload.record ||
        typeof upload.content !== 'string'
      ) {
        continue;
      }

      const oldRecord = upload.record;

      if (typeof oldRecord.id !== 'string') continue;

      const fileExtension =
        typeof oldRecord.fileExtension === 'string'
          ? oldRecord.fileExtension
          : 'json';

      const contentFileName = `${crypto.randomBytes(16).toString(
        'hex',
      )}.json`;

      const contentPath = path.join(uploadsDir, contentFileName);

      fs.writeFileSync(contentPath, upload.content);

      const restoredRecord = {
        ...oldRecord,
        contentPath,
        id: oldRecord.id,
        fileExtension,
      };

      currentById.set(String(oldRecord.id), restoredRecord);
      imported += 1;
    }

    writeUploadedFilesRecord(Array.from(currentById.values()));

    return Response.json({
      imported,
    });
  } catch (error) {
    console.error('Failed to import vault uploads:', error);

    return Response.json(
      { message: 'Failed to import uploads' },
      { status: 500 },
    );
  }
};
