import db from '@/lib/db';
import { spaceLinks, spaceNotes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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

interface ImportPayload {
  notes?: VaultSpaceNote[];
  links?: VaultSpaceLink[];
  spaceIdMap: Record<string, string>;
}

const safeString = (value: unknown, fallback = '') => {
  return typeof value === 'string' ? value : fallback;
};

export const GET = async () => {
  try {
    const [notes, links] = await Promise.all([
      db.query.spaceNotes.findMany(),
      db.query.spaceLinks.findMany(),
    ]);

    return Response.json({
      notes,
      links,
    });
  } catch (error) {
    console.error('Failed to export vault captures:', error);

    return Response.json(
      { message: 'Failed to export captures' },
      { status: 500 },
    );
  }
};

export const POST = async (req: Request) => {
  try {
    const body = (await req.json()) as ImportPayload;
    const notes = Array.isArray(body.notes) ? body.notes : [];
    const links = Array.isArray(body.links) ? body.links : [];
    const spaceIdMap = body.spaceIdMap ?? {};

    let importedNotes = 0;
    let importedLinks = 0;
    let skippedNotes = 0;
    let skippedLinks = 0;

    for (const note of notes) {
      if (!note?.id || !note?.spaceId) {
        skippedNotes += 1;
        continue;
      }

      const mappedSpaceId = spaceIdMap[note.spaceId] ?? note.spaceId;

      const existing = await db.query.spaceNotes.findFirst({
        where: eq(spaceNotes.id, note.id),
      });

      if (existing) {
        skippedNotes += 1;
        continue;
      }

      await db.insert(spaceNotes).values({
        id: note.id,
        spaceId: mappedSpaceId,
        title: safeString(note.title, 'Untitled note'),
        content: safeString(note.content),
        createdAt: safeString(note.createdAt, new Date().toISOString()),
        updatedAt: safeString(note.updatedAt, new Date().toISOString()),
      });

      importedNotes += 1;
    }

    for (const link of links) {
      if (!link?.id || !link?.spaceId || !link?.url) {
        skippedLinks += 1;
        continue;
      }

      const mappedSpaceId = spaceIdMap[link.spaceId] ?? link.spaceId;

      const existing = await db.query.spaceLinks.findFirst({
        where: eq(spaceLinks.id, link.id),
      });

      if (existing) {
        skippedLinks += 1;
        continue;
      }

      await db.insert(spaceLinks).values({
        id: link.id,
        spaceId: mappedSpaceId,
        title: safeString(link.title, link.url),
        url: safeString(link.url),
        description: safeString(link.description),
        createdAt: safeString(link.createdAt, new Date().toISOString()),
      });

      importedLinks += 1;
    }

    return Response.json({
      importedNotes,
      importedLinks,
      skippedNotes,
      skippedLinks,
    });
  } catch (error) {
    console.error('Failed to import vault captures:', error);

    return Response.json(
      { message: 'Failed to import captures' },
      { status: 500 },
    );
  }
};
