import db from '@/lib/db';
import { spaceLinks, spaceNotes } from '@/lib/db/schema';
import crypto from 'crypto';
import { and, desc, eq } from 'drizzle-orm';

const generateId = (prefix: string) => {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
};

const safeString = (value: unknown, fallback = '') => {
  return typeof value === 'string' ? value.trim() : fallback;
};

export const GET = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id: spaceId } = await params;

    const [notes, links] = await Promise.all([
      db.query.spaceNotes.findMany({
        where: eq(spaceNotes.spaceId, spaceId),
        orderBy: desc(spaceNotes.updatedAt),
      }),
      db.query.spaceLinks.findMany({
        where: eq(spaceLinks.spaceId, spaceId),
        orderBy: desc(spaceLinks.createdAt),
      }),
    ]);

    return Response.json({
      notes,
      links,
    });
  } catch (error) {
    console.error('Failed to read Space captures:', error);

    return Response.json(
      { message: 'Failed to read Space captures' },
      { status: 500 },
    );
  }
};

export const POST = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id: spaceId } = await params;
    const body = await req.json();
    const kind = safeString(body.kind);

    if (kind === 'note') {
      const title = safeString(body.title, 'Untitled note');
      const content = safeString(body.content);

      if (!content) {
        return Response.json(
          { message: 'Note content is required' },
          { status: 400 },
        );
      }

      const now = new Date().toISOString();

      const note = {
        id: generateId('note'),
        spaceId,
        title,
        content,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(spaceNotes).values(note);

      return Response.json({ note });
    }

    if (kind === 'link') {
      const title = safeString(body.title, 'Saved link');
      const url = safeString(body.url);
      const description = safeString(body.description);

      if (!url) {
        return Response.json(
          { message: 'URL is required' },
          { status: 400 },
        );
      }

      const link = {
        id: generateId('link'),
        spaceId,
        title,
        url,
        description,
        createdAt: new Date().toISOString(),
      };

      await db.insert(spaceLinks).values(link);

      return Response.json({ link });
    }

    return Response.json(
      { message: 'Invalid capture kind' },
      { status: 400 },
    );
  } catch (error) {
    console.error('Failed to create Space capture:', error);

    return Response.json(
      { message: 'Failed to create Space capture' },
      { status: 500 },
    );
  }
};

export const DELETE = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id: spaceId } = await params;
    const url = new URL(req.url);
    const kind = url.searchParams.get('kind');
    const id = url.searchParams.get('id');

    if (!id) {
      return Response.json(
        { message: 'Missing capture id' },
        { status: 400 },
      );
    }

    if (kind === 'note') {
      await db
        .delete(spaceNotes)
        .where(and(eq(spaceNotes.id, id), eq(spaceNotes.spaceId, spaceId)));

      return Response.json({ message: 'Note deleted' });
    }

    if (kind === 'link') {
      await db
        .delete(spaceLinks)
        .where(and(eq(spaceLinks.id, id), eq(spaceLinks.spaceId, spaceId)));

      return Response.json({ message: 'Link deleted' });
    }

    return Response.json(
      { message: 'Invalid capture kind' },
      { status: 400 },
    );
  } catch (error) {
    console.error('Failed to delete Space capture:', error);

    return Response.json(
      { message: 'Failed to delete Space capture' },
      { status: 500 },
    );
  }
};
