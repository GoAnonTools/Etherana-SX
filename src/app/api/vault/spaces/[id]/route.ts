import db from '@/lib/db';
import {
  automationOutputRecords,
  automationRecords,
  automationRunRecords,
  chats,
  messages,
  spaceLinks,
  spaceNotes,
  spaces,
} from '@/lib/db/schema';
import {
  AUTOMATION_OUTPUTS_STORAGE_KEY,
  AUTOMATION_RUN_HISTORY_STORAGE_KEY,
  CUSTOM_AUTOMATIONS_STORAGE_KEY,
  HIDDEN_TEMPLATE_AUTOMATION_IDS_STORAGE_KEY,
} from '@/lib/vault/localVault';
import fs from 'fs';
import path from 'path';
import { desc, eq } from 'drizzle-orm';

const uploadsDir = path.join(process.env.ETHERANA_DATA_DIR || path.join(process.cwd(), 'data'), 'uploads');
const uploadedFilesRecordPath = path.join(uploadsDir, 'uploaded_files.json');

const isSafeUploadPath = (candidatePath: string) => {
  const resolvedUploadsDir = path.resolve(uploadsDir);
  const resolvedCandidate = path.resolve(candidatePath);

  return resolvedCandidate.startsWith(resolvedUploadsDir);
};

const readUploadedFilesRecord = (): { files: Record<string, unknown>[] } => {
  if (!fs.existsSync(uploadedFilesRecordPath)) {
    return { files: [] };
  }

  try {
    const raw = fs.readFileSync(uploadedFilesRecordPath, 'utf-8');
    const parsed = JSON.parse(raw);

    return {
      files: Array.isArray(parsed.files) ? parsed.files : [],
    };
  } catch {
    return { files: [] };
  }
};

const getContentPathFromRecord = (record: Record<string, unknown>) => {
  const contentPath = record.contentPath;

  if (typeof contentPath !== 'string') return null;
  if (!isSafeUploadPath(contentPath)) return null;

  return contentPath;
};

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

    const conversations = await Promise.all(
      spaceChats.map(async (chat) => {
        const chatMessages = await db.query.messages.findMany({
          where: eq(messages.chatId, chat.id),
          orderBy: (messageTable, { asc }) => [asc(messageTable.id)],
        });

        return {
          id: chat.id,
          title: chat.title,
          createdAt: chat.createdAt,
          sources: chat.sources ?? [],
          files: chat.files ?? [],
          spaceId: chat.spaceId ?? null,
          messages: chatMessages.map((message) => ({
            messageId: message.messageId,
            backendId: message.backendId,
            query: message.query,
            createdAt: message.createdAt,
            responseBlocks: message.responseBlocks ?? [],
            status: message.status,
          })),
        };
      }),
    );

    const [notes, links] = await Promise.all([
      db.query.spaceNotes.findMany({
        where: eq(spaceNotes.spaceId, spaceId),
      }),
      db.query.spaceLinks.findMany({
        where: eq(spaceLinks.spaceId, spaceId),
      }),
    ]);

    const spaceFileIds = new Set(
      (space.files ?? [])
        .map((file) => file.fileId)
        .filter((fileId): fileId is string => typeof fileId === 'string'),
    );

    conversations.forEach((conversation) => {
      conversation.files.forEach((file) => {
        if (typeof file?.fileId === 'string') {
          spaceFileIds.add(file.fileId);
        }
      });
    });

    const uploadedFiles = readUploadedFilesRecord();

    const uploads = uploadedFiles.files.flatMap((record) => {
      if (typeof record.id !== 'string') return [];
      if (!spaceFileIds.has(record.id)) return [];

      const contentPath = getContentPathFromRecord(record);

      if (!contentPath || !fs.existsSync(contentPath)) return [];

      return [
        {
          record,
          content: fs.readFileSync(contentPath, 'utf-8'),
        },
      ];
    });

    const allOutputs = await db.query.automationOutputRecords.findMany({
      orderBy: desc(automationOutputRecords.createdAt),
    });

    const outputs = allOutputs.filter(
      (output) => output.outputDestination === `space:${spaceId}`,
    );

    const outputAutomationIds = new Set(
      outputs.map((output) => output.automationId),
    );
    const outputIds = new Set(outputs.map((output) => output.id));

    const allAutomations = await db.query.automationRecords.findMany({
      orderBy: desc(automationRecords.createdAt),
    });

    const automations = allAutomations.filter((automation) => {
      return (
        automation.outputDestination === `space:${spaceId}` ||
        outputAutomationIds.has(automation.id)
      );
    });

    automations.forEach((automation) => {
      outputAutomationIds.add(automation.id);
    });

    const allRuns = await db.query.automationRunRecords.findMany({
      orderBy: desc(automationRunRecords.startedAt),
    });

    const runs = allRuns.filter((run) => {
      return (
        outputAutomationIds.has(run.automationId) ||
        (run.outputId ? outputIds.has(run.outputId) : false) ||
        run.outputDestination === `space:${spaceId}`
      );
    });

    const localStorageRecords = [
      {
        key: CUSTOM_AUTOMATIONS_STORAGE_KEY,
        value: JSON.stringify(
          automations.map((automation) => ({
            id: automation.id,
            name: automation.name,
            category: automation.category,
            purpose: automation.purpose,
            frequency: automation.frequency,
            prompt: automation.prompt,
            output: automation.output,
            outputType: automation.outputType ?? undefined,
            outputDestination: automation.outputDestination ?? undefined,
            outputDestinationLabel:
              automation.outputDestinationLabel ?? undefined,
            goodFor: automation.goodFor ?? [],
            createdAt: automation.createdAt,
          })),
        ),
      },
      {
        key: AUTOMATION_RUN_HISTORY_STORAGE_KEY,
        value: JSON.stringify(
          runs.map((run) => ({
            id: run.id,
            automationId: run.automationId,
            automationName: run.automationName,
            startedAt: run.startedAt,
            mode: 'manual',
            status: 'started',
            prompt: run.prompt,
            expectedOutput: run.expectedOutput,
            outputType: run.outputType ?? undefined,
            outputDestination: run.outputDestination ?? undefined,
            outputDestinationLabel: run.outputDestinationLabel ?? undefined,
            outputId: run.outputId ?? undefined,
          })),
        ),
      },
      {
        key: AUTOMATION_OUTPUTS_STORAGE_KEY,
        value: JSON.stringify(
          outputs.map((output) => ({
            id: output.id,
            automationId: output.automationId,
            automationName: output.automationName,
            title: output.title,
            outputType: output.outputType,
            outputDestination: output.outputDestination,
            outputDestinationLabel: output.outputDestinationLabel,
            status: output.status === 'ready' ? 'ready' : 'drafting',
            createdAt: output.createdAt,
            updatedAt: output.updatedAt ?? undefined,
            runId: output.runId,
            prompt: output.prompt,
            expectedOutput: output.expectedOutput,
            content: output.content ?? '',
          })),
        ),
      },
      {
        key: HIDDEN_TEMPLATE_AUTOMATION_IDS_STORAGE_KEY,
        value: JSON.stringify([]),
      },
    ];

    return Response.json({
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'etherana-sx',
      vaultId: `space_export_${space.id}`,
      scope: {
        type: 'space',
        spaceId: space.id,
        spaceName: space.name,
      },
      localStorageRecords,
      spaces: [
        {
          id: space.id,
          name: space.name,
          description: space.description ?? '',
          instruction: space.instruction ?? '',
          createdAt: space.createdAt,
          files: space.files ?? [],
        },
      ],
      conversations,
      uploads,
      captures: {
        notes,
        links,
      },
      notes: [
        'This encrypted vault contains one selected Space.',
        'Processed knowledge chunks and embeddings are included.',
        'Original uploaded file binaries are not included in this version.',
      ],
    });
  } catch (error) {
    console.error('Failed to export Space vault:', error);

    return Response.json(
      { message: 'Failed to export Space vault' },
      { status: 500 },
    );
  }
};
