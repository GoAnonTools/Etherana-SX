import { spaces, chats } from '@/lib/db/schema';
import db from '@/lib/db';
import { eq, desc } from 'drizzle-orm';

export const GET = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id: spaceId } = await params;

    const space = await db.query.spaces.findFirst({
      where: eq(spaces.id, spaceId),
    });

    if (!space) {
      return Response.json({ message: 'Space not found' }, { status: 404 });
    }

    const spaceChats = await db.query.chats.findMany({
      where: eq(chats.spaceId, spaceId),
      orderBy: desc(chats.createdAt),
    });

    return Response.json({ space, chats: spaceChats });
  } catch (err) {
    console.error('Failed to fetch space details:', err);
    return Response.json(
      { message: 'Failed to fetch space details' },
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

    await db.delete(spaces).where(eq(spaces.id, spaceId)).execute();

    // Optionally disassociate chats from the space
    await db
      .update(chats)
      .set({ spaceId: null })
      .where(eq(chats.spaceId, spaceId))
      .execute();

    return Response.json({ message: 'Space deleted' });
  } catch (err) {
    console.error('Failed to delete space:', err);
    return Response.json({ message: 'Failed to delete space' }, { status: 500 });
  }
};

export const PATCH = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id: spaceId } = await params;
    const { name, description, instruction, files } = await req.json();

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (instruction !== undefined) updateData.instruction = instruction;
    if (files !== undefined) updateData.files = files;

    await db
      .update(spaces)
      .set(updateData)
      .where(eq(spaces.id, spaceId))
      .execute();

    return Response.json({ message: 'Space updated' });
  } catch (err) {
    console.error('Failed to update space:', err);
    return Response.json({ message: 'Failed to update space' }, { status: 500 });
  }
};
