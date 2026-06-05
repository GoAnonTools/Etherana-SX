import db from '@/lib/db';
import { spaces } from '@/lib/db/schema';
import crypto from 'crypto';
import { desc, isNotNull, isNull } from 'drizzle-orm';

const generateId = () => crypto.randomBytes(20).toString('hex');

const safeString = (value: unknown, fallback = '') => {
  return typeof value === 'string' ? value : fallback;
};

export const GET = async (req: Request) => {
  try {
    const url = new URL(req.url);
    const archived = url.searchParams.get('archived') === 'true';
    const includeArchived = url.searchParams.get('includeArchived') === 'true';

    const rows = includeArchived
      ? await db.query.spaces.findMany({
          orderBy: desc(spaces.createdAt),
        })
      : await db.query.spaces.findMany({
          where: archived ? isNotNull(spaces.archivedAt) : isNull(spaces.archivedAt),
          orderBy: desc(spaces.createdAt),
        });

    return Response.json(rows);
  } catch (error) {
    console.error('Failed to fetch spaces:', error);

    return Response.json(
      { message: 'Failed to fetch spaces' },
      { status: 500 },
    );
  }
};

export const POST = async (req: Request) => {
  try {
    const body = await req.json();
    const now = new Date().toISOString();

    const space = {
      id: generateId(),
      name: safeString(body.name, 'Untitled Space'),
      description: safeString(body.description),
      instruction: safeString(body.instruction),
      files: Array.isArray(body.files) ? body.files : [],
      createdAt: now,
      archivedAt: null,
    };

    await db.insert(spaces).values(space);

    return Response.json(space);
  } catch (error) {
    console.error('Failed to create space:', error);

    return Response.json(
      { message: 'Failed to create space' },
      { status: 500 },
    );
  }
};
