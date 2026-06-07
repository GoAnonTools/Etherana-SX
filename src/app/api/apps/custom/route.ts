import db from '@/lib/db';
import { customAppRecords } from '@/lib/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CustomAppInputType = 'text' | 'textarea' | 'select' | 'date' | 'number';

type CustomAppInput = {
  id: string;
  label: string;
  type: CustomAppInputType;
  placeholder?: string;
  required?: boolean;
  options?: string[];
};

type CustomAppPayload = {
  id?: string;
  name?: unknown;
  category?: unknown;
  description?: unknown;
  outputType?: unknown;
  promptTemplate?: unknown;
  inputs?: unknown;
  goodFor?: unknown;
};

const generateId = () => `custom-app-${crypto.randomBytes(12).toString('hex')}`;

const validCategories = new Set([
  'Business',
  'Content',
  'Client Work',
  'Study',
  'Personal',
]);

const validInputTypes = new Set<CustomAppInputType>([
  'text',
  'textarea',
  'select',
  'date',
  'number',
]);

const slugifyId = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

const safeString = (value: unknown, fallback = '') => {
  return typeof value === 'string' ? value.trim() : fallback;
};

const safeStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
};

const normalizeInput = (input: unknown, index: number): CustomAppInput | null => {
  if (!input || typeof input !== 'object') return null;

  const candidate = input as Record<string, unknown>;
  const label = safeString(candidate.label);
  const type = safeString(candidate.type, 'text') as CustomAppInputType;

  if (!label || !validInputTypes.has(type)) {
    return null;
  }

  const baseId = safeString(candidate.id) || label || `field-${index + 1}`;
  const id = slugifyId(baseId) || `field-${index + 1}`;
  const options =
    type === 'select' ? safeStringArray(candidate.options).slice(0, 20) : [];

  return {
    id,
    label,
    type,
    placeholder: safeString(candidate.placeholder),
    required: Boolean(candidate.required),
    options,
  };
};

const normalizeInputs = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();

  return value
    .map(normalizeInput)
    .filter((input): input is CustomAppInput => Boolean(input))
    .map((input, index) => {
      let id = input.id || `field-${index + 1}`;
      let suffix = 2;

      while (seen.has(id)) {
        id = `${input.id}-${suffix}`;
        suffix += 1;
      }

      seen.add(id);

      return {
        ...input,
        id,
      };
    })
    .slice(0, 20);
};

const normalizePayload = (payload: CustomAppPayload) => {
  const name = safeString(payload.name);
  const category = safeString(payload.category, 'Business');
  const description = safeString(payload.description);
  const outputType = safeString(payload.outputType, 'Document');
  const promptTemplate = safeString(payload.promptTemplate);
  const inputs = normalizeInputs(payload.inputs);
  const goodFor = safeStringArray(payload.goodFor);

  if (!name) {
    throw new Error('Custom app name is required.');
  }

  if (!description) {
    throw new Error('Custom app description is required.');
  }

  if (!promptTemplate) {
    throw new Error('Custom app prompt template is required.');
  }

  if (inputs.length === 0) {
    throw new Error('Custom app needs at least one input field.');
  }

  return {
    name,
    category: validCategories.has(category) ? category : 'Business',
    description,
    outputType,
    promptTemplate,
    inputs,
    goodFor,
  };
};

export const GET = async () => {
  try {
    const rows = await db.query.customAppRecords.findMany({
      orderBy: desc(customAppRecords.updatedAt),
    });

    return Response.json(rows);
  } catch (error) {
    console.error('Failed to fetch custom apps:', error);

    return Response.json(
      { message: 'Failed to fetch custom apps.' },
      { status: 500 },
    );
  }
};

export const POST = async (req: Request) => {
  try {
    const payload = normalizePayload(await req.json());
    const now = new Date().toISOString();

    const customApp = {
      id: generateId(),
      ...payload,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(customAppRecords).values(customApp);

    return Response.json(customApp);
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Failed to create custom app.',
      },
      { status: 400 },
    );
  }
};

export const PUT = async (req: Request) => {
  try {
    const body = (await req.json()) as CustomAppPayload;
    const id = safeString(body.id);

    if (!id) {
      return Response.json(
        { message: 'Custom app id is required.' },
        { status: 400 },
      );
    }

    const payload = normalizePayload(body);
    const now = new Date().toISOString();

    const existing = await db.query.customAppRecords.findFirst({
      where: eq(customAppRecords.id, id),
    });

    if (!existing) {
      return Response.json(
        { message: 'Custom app not found.' },
        { status: 404 },
      );
    }

    await db
      .update(customAppRecords)
      .set({
        ...payload,
        updatedAt: now,
      })
      .where(eq(customAppRecords.id, id));

    return Response.json({
      ...existing,
      ...payload,
      updatedAt: now,
    });
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Failed to update custom app.',
      },
      { status: 400 },
    );
  }
};

export const DELETE = async (req: Request) => {
  try {
    const url = new URL(req.url);
    const id = safeString(url.searchParams.get('id'));

    if (!id) {
      return Response.json(
        { message: 'Custom app id is required.' },
        { status: 400 },
      );
    }

    await db
      .delete(customAppRecords)
      .where(and(eq(customAppRecords.id, id)));

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Failed to delete custom app:', error);

    return Response.json(
      { message: 'Failed to delete custom app.' },
      { status: 500 },
    );
  }
};
