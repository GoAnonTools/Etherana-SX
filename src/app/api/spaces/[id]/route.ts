import db from '@/lib/db';
import { chats, spaces } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const safeString = (value: unknown, fallback = '') => {
  return typeof value === 'string' ? value : fallback;
};

export const GET = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;

    const space = await db.query.spaces.findFirst({
      where: eq(spaces.id, id),
    });

    if (!space) {
      return Response.json({ message: 'Space not found' }, { status: 404 });
    }

    const spaceChats = await db.query.chats.findMany({
      where: eq(chats.spaceId, id),
    });

    return Response.json({
      ...space,
      chats: spaceChats,
    });
  } catch (error) {
    console.error('Failed to fetch space:', error);

    return Response.json(
      { message: 'Failed to fetch space' },
      { status: 500 },
    );
  }
};

export const PATCH = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.query.spaces.findFirst({
      where: eq(spaces.id, id),
    });

    if (!existing) {
      return Response.json({ message: 'Space not found' }, { status: 404 });
    }

    const patch: Partial<typeof spaces.$inferInsert> = {};

    if ('name' in body) {
      patch.name = safeString(body.name, existing.name);
    }

    if ('description' in body) {
      patch.description = safeString(body.description);
    }

    if ('instruction' in body) {
      patch.instruction = safeString(body.instruction);
    }

    if ('files' in body) {
      patch.files = Array.isArray(body.files) ? body.files : [];
    }

    if ('archivedAt' in body) {
      patch.archivedAt =
        typeof body.archivedAt === 'string' ? body.archivedAt : null;
    }

    await db.update(spaces).set(patch).where(eq(spaces.id, id));

    const updated = await db.query.spaces.findFirst({
      where: eq(spaces.id, id),
    });

    return Response.json(updated);
  } catch (error) {
    console.error('Failed to update space:', error);

    return Response.json(
      { message: 'Failed to update space' },
      { status: 500 },
    );
  }
};

export const DELETE = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;

    await db.delete(spaces).where(eq(spaces.id, id));

    return Response.json({ message: 'Space deleted' });
  } catch (error) {
    console.error('Failed to delete space:', error);

    return Response.json(
      { message: 'Failed to delete space' },
      { status: 500 },
    );
  }
};
