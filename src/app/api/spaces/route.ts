import { spaces } from '@/lib/db/schema';
import db from '@/lib/db';
import { desc } from 'drizzle-orm';
import crypto from 'crypto';

export const GET = async () => {
  try {
    const allSpaces = await db.query.spaces.findMany({
      orderBy: desc(spaces.createdAt),
    });

    return Response.json(allSpaces);
  } catch (err) {
    console.error('Failed to fetch spaces:', err);
    return Response.json(
      { message: 'Failed to fetch spaces' },
      { status: 500 },
    );
  }
};

export const POST = async (req: Request) => {
  try {
    const { name, description, instruction } = await req.json();

    if (!name) {
      return Response.json({ message: 'Name is required' }, { status: 400 });
    }

    const id = crypto.randomBytes(16).toString('hex');

    await db.insert(spaces).values({
      id,
      name,
      description: description || '',
      instruction: instruction || '',
      createdAt: new Date().toISOString(),
      files: [],
    });

    return Response.json({ id });
  } catch (err) {
    console.error('Failed to create space:', err);
    return Response.json({ message: 'Failed to create space' }, { status: 500 });
  }
};
