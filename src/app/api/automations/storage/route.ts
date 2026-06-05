import db from '@/lib/db';
import {
  automationOutputRecords,
  automationRecords,
  automationRunRecords,
  hiddenTemplateAutomationRecords,
} from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

type AutomationMode = 'manual' | 'auto';
type AutomationStatus = 'active' | 'paused';
type AutomationScheduleType = 'manual' | 'daily' | 'weekly' | 'monthly';

interface StoredAutomation {
  id: string;
  name: string;
  category: string;
  purpose: string;
  frequency: string;
  mode?: AutomationMode;
  status?: AutomationStatus;
  scheduleType?: AutomationScheduleType;
  scheduleTime?: string;
  scheduleDays?: string[];
  scheduleDayOfMonth?: number;
  nextRunAt?: string;
  lastRunAt?: string;
  prompt: string;
  output: string;
  outputType?: string;
  outputDestination?: string;
  outputDestinationLabel?: string;
  goodFor: string[];
  createdAt: string;
}

interface AutomationRunHistoryItem {
  id: string;
  automationId: string;
  automationName: string;
  startedAt: string;
  mode: AutomationMode;
  status: 'started';
  prompt: string;
  expectedOutput: string;
  outputType?: string;
  outputDestination?: string;
  outputDestinationLabel?: string;
  outputId?: string;
}

interface AutomationOutputItem {
  id: string;
  automationId: string;
  automationName: string;
  title: string;
  outputType: string;
  outputDestination: string;
  outputDestinationLabel: string;
  status: 'drafting' | 'ready';
  createdAt: string;
  updatedAt?: string;
  runId: string;
  prompt: string;
  expectedOutput: string;
  content?: string;
}

interface AutomationStoragePayload {
  automations?: StoredAutomation[];
  hiddenTemplateIds?: string[];
  runs?: AutomationRunHistoryItem[];
  outputs?: AutomationOutputItem[];
}

const safeString = (value: unknown, fallback = '') => {
  return typeof value === 'string' ? value : fallback;
};

const safeOptionalString = (value: unknown) => {
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : undefined;
};

const safeStringArray = (value: unknown) => {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
};

const safeOptionalNumber = (value: unknown) => {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
};

const safeAutomationMode = (value: unknown): AutomationMode => {
  return value === 'auto' ? 'auto' : 'manual';
};

const safeAutomationStatus = (value: unknown): AutomationStatus => {
  return value === 'paused' ? 'paused' : 'active';
};

const inferScheduleTypeFromFrequency = (
  frequency: string,
): AutomationScheduleType => {
  const normalized = frequency.toLowerCase();

  if (normalized.includes('daily')) return 'daily';
  if (
    normalized.includes('weekly') ||
    normalized.includes('week') ||
    normalized.includes('monday') ||
    normalized.includes('tuesday') ||
    normalized.includes('wednesday') ||
    normalized.includes('thursday') ||
    normalized.includes('friday') ||
    normalized.includes('saturday') ||
    normalized.includes('sunday')
  ) {
    return 'weekly';
  }
  if (normalized.includes('monthly') || normalized.includes('month')) {
    return 'monthly';
  }

  return 'manual';
};

const inferScheduleDaysFromFrequency = (frequency: string) => {
  const normalized = frequency.toLowerCase();

  if (normalized.includes('monday')) return ['MO'];
  if (normalized.includes('tuesday')) return ['TU'];
  if (normalized.includes('wednesday')) return ['WE'];
  if (normalized.includes('thursday')) return ['TH'];
  if (normalized.includes('friday')) return ['FR'];
  if (normalized.includes('saturday')) return ['SA'];
  if (normalized.includes('sunday')) return ['SU'];

  return ['MO'];
};

const safeAutomationScheduleType = (
  value: unknown,
  frequency = 'Manual',
): AutomationScheduleType => {
  if (
    value === 'manual' ||
    value === 'daily' ||
    value === 'weekly' ||
    value === 'monthly'
  ) {
    return value;
  }

  return inferScheduleTypeFromFrequency(frequency);
};

const normalizeAutomation = (
  automation: unknown,
): StoredAutomation | null => {
  if (!automation || typeof automation !== 'object') return null;

  const candidate = automation as StoredAutomation;

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.name !== 'string' ||
    typeof candidate.prompt !== 'string'
  ) {
    return null;
  }

  const frequency = safeString(candidate.frequency, 'Manual');
  const scheduleType = safeAutomationScheduleType(
    candidate.scheduleType,
    frequency,
  );

  return {
    id: candidate.id,
    name: candidate.name,
    category: safeString(candidate.category, 'Custom'),
    purpose: safeString(candidate.purpose),
    frequency,
    mode: safeAutomationMode(candidate.mode),
    status: safeAutomationStatus(candidate.status),
    scheduleType,
    scheduleTime:
      scheduleType === 'manual'
        ? undefined
        : safeOptionalString(candidate.scheduleTime) ?? '09:00',
    scheduleDays:
      scheduleType === 'weekly'
        ? safeStringArray(candidate.scheduleDays).length > 0
          ? safeStringArray(candidate.scheduleDays)
          : inferScheduleDaysFromFrequency(frequency)
        : [],
    scheduleDayOfMonth:
      scheduleType === 'monthly'
        ? safeOptionalNumber(candidate.scheduleDayOfMonth) ?? 1
        : undefined,
    nextRunAt: safeOptionalString(candidate.nextRunAt),
    lastRunAt: safeOptionalString(candidate.lastRunAt),
    prompt: candidate.prompt,
    output: safeString(candidate.output, 'A reusable output.'),
    outputType: safeString(candidate.outputType, 'Document'),
    outputDestination: safeString(candidate.outputDestination, 'automation'),
    outputDestinationLabel: safeString(
      candidate.outputDestinationLabel,
      'Automation outputs',
    ),
    goodFor: safeStringArray(candidate.goodFor),
    createdAt: safeString(candidate.createdAt, new Date().toISOString()),
  };
};

const normalizeRun = (
  run: unknown,
): AutomationRunHistoryItem | null => {
  if (!run || typeof run !== 'object') return null;

  const candidate = run as AutomationRunHistoryItem;

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.automationId !== 'string' ||
    typeof candidate.automationName !== 'string'
  ) {
    return null;
  }

  return {
    id: candidate.id,
    automationId: candidate.automationId,
    automationName: candidate.automationName,
    startedAt: safeString(candidate.startedAt, new Date().toISOString()),
    mode: safeAutomationMode(candidate.mode),
    status: 'started',
    prompt: safeString(candidate.prompt),
    expectedOutput: safeString(candidate.expectedOutput),
    outputType: safeString(candidate.outputType, 'Document'),
    outputDestination: safeString(candidate.outputDestination, 'automation'),
    outputDestinationLabel: safeString(
      candidate.outputDestinationLabel,
      'Automation outputs',
    ),
    outputId: safeString(candidate.outputId),
  };
};

const normalizeOutput = (
  output: unknown,
): AutomationOutputItem | null => {
  if (!output || typeof output !== 'object') return null;

  const candidate = output as AutomationOutputItem;

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.automationId !== 'string' ||
    typeof candidate.automationName !== 'string' ||
    typeof candidate.title !== 'string'
  ) {
    return null;
  }

  return {
    id: candidate.id,
    automationId: candidate.automationId,
    automationName: candidate.automationName,
    title: candidate.title,
    outputType: safeString(candidate.outputType, 'Document'),
    outputDestination: safeString(candidate.outputDestination, 'automation'),
    outputDestinationLabel: safeString(
      candidate.outputDestinationLabel,
      'Automation outputs',
    ),
    status: candidate.status === 'ready' ? 'ready' : 'drafting',
    createdAt: safeString(candidate.createdAt, new Date().toISOString()),
    updatedAt: safeString(candidate.updatedAt),
    runId: safeString(candidate.runId),
    prompt: safeString(candidate.prompt),
    expectedOutput: safeString(candidate.expectedOutput),
    content: safeString(candidate.content),
  };
};

export const GET = async () => {
  try {
    const [automationRows, hiddenTemplates, runs, outputs] = await Promise.all([
      db.query.automationRecords.findMany({
        orderBy: desc(automationRecords.createdAt),
      }),
      db.query.hiddenTemplateAutomationRecords.findMany(),
      db.query.automationRunRecords.findMany({
        orderBy: desc(automationRunRecords.startedAt),
      }),
      db.query.automationOutputRecords.findMany({
        orderBy: desc(automationOutputRecords.createdAt),
      }),
    ]);

    return Response.json({
      automations: automationRows.map((automation) => ({
        id: automation.id,
        name: automation.name,
        category: automation.category,
        purpose: automation.purpose,
        frequency: automation.frequency,
        mode: automation.mode === 'auto' ? 'auto' : 'manual',
        status: automation.status === 'paused' ? 'paused' : 'active',
        scheduleType:
          automation.scheduleType === 'daily' ||
          automation.scheduleType === 'weekly' ||
          automation.scheduleType === 'monthly'
            ? automation.scheduleType
            : inferScheduleTypeFromFrequency(automation.frequency),
        scheduleTime: automation.scheduleTime ?? undefined,
        scheduleDays: automation.scheduleDays ?? [],
        scheduleDayOfMonth: automation.scheduleDayOfMonth ?? undefined,
        nextRunAt: automation.nextRunAt ?? undefined,
        lastRunAt: automation.lastRunAt ?? undefined,
        prompt: automation.prompt,
        output: automation.output,
        outputType: automation.outputType ?? undefined,
        outputDestination: automation.outputDestination ?? undefined,
        outputDestinationLabel:
          automation.outputDestinationLabel ?? undefined,
        goodFor: automation.goodFor ?? [],
        createdAt: automation.createdAt,
      })),
      hiddenTemplateIds: hiddenTemplates.map((item) => item.templateId),
      runs: runs.map((run) => ({
        id: run.id,
        automationId: run.automationId,
        automationName: run.automationName,
        startedAt: run.startedAt,
        mode: run.mode === 'auto' ? 'auto' : 'manual',
        status: 'started',
        prompt: run.prompt,
        expectedOutput: run.expectedOutput,
        outputType: run.outputType ?? undefined,
        outputDestination: run.outputDestination ?? undefined,
        outputDestinationLabel: run.outputDestinationLabel ?? undefined,
        outputId: run.outputId ?? undefined,
      })),
      outputs: outputs.map((output) => ({
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
    });
  } catch (error) {
    console.error('Failed to read automation storage:', error);

    return Response.json(
      { message: 'Failed to read automation storage' },
      { status: 500 },
    );
  }
};

export const PUT = async (req: Request) => {
  try {
    const body = (await req.json()) as AutomationStoragePayload;

    const automations = Array.isArray(body.automations)
      ? body.automations.map(normalizeAutomation).filter(Boolean)
      : null;

    const hiddenTemplateIds = Array.isArray(body.hiddenTemplateIds)
      ? body.hiddenTemplateIds.filter(
          (id): id is string => typeof id === 'string',
        )
      : null;

    const runs = Array.isArray(body.runs)
      ? body.runs.map(normalizeRun).filter(Boolean)
      : null;

    const outputs = Array.isArray(body.outputs)
      ? body.outputs.map(normalizeOutput).filter(Boolean)
      : null;

    if (automations) {
      await db.delete(automationRecords);

      for (const automation of automations) {
        if (!automation) continue;

        await db.insert(automationRecords).values({
          id: automation.id,
          name: automation.name,
          category: automation.category,
          purpose: automation.purpose,
          frequency: automation.frequency,
          mode: automation.mode ?? 'manual',
          status: automation.status ?? 'active',
          scheduleType: automation.scheduleType ?? 'manual',
          scheduleTime: automation.scheduleTime ?? null,
          scheduleDays: automation.scheduleDays ?? [],
          scheduleDayOfMonth: automation.scheduleDayOfMonth ?? null,
          nextRunAt: automation.nextRunAt ?? null,
          lastRunAt: automation.lastRunAt ?? null,
          prompt: automation.prompt,
          output: automation.output,
          outputType: automation.outputType ?? null,
          outputDestination: automation.outputDestination ?? null,
          outputDestinationLabel: automation.outputDestinationLabel ?? null,
          goodFor: automation.goodFor,
          createdAt: automation.createdAt,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    if (hiddenTemplateIds) {
      await db.delete(hiddenTemplateAutomationRecords);

      for (const templateId of hiddenTemplateIds) {
        await db.insert(hiddenTemplateAutomationRecords).values({
          templateId,
          hiddenAt: new Date().toISOString(),
        });
      }
    }

    if (runs) {
      await db.delete(automationRunRecords);

      for (const run of runs) {
        if (!run) continue;

        await db.insert(automationRunRecords).values({
          id: run.id,
          automationId: run.automationId,
          automationName: run.automationName,
          startedAt: run.startedAt,
          mode: run.mode,
          status: run.status,
          prompt: run.prompt,
          expectedOutput: run.expectedOutput,
          outputType: run.outputType ?? null,
          outputDestination: run.outputDestination ?? null,
          outputDestinationLabel: run.outputDestinationLabel ?? null,
          outputId: run.outputId ?? null,
        });
      }
    }

    if (outputs) {
      await db.delete(automationOutputRecords);

      for (const output of outputs) {
        if (!output) continue;

        await db.insert(automationOutputRecords).values({
          id: output.id,
          automationId: output.automationId,
          automationName: output.automationName,
          title: output.title,
          outputType: output.outputType,
          outputDestination: output.outputDestination,
          outputDestinationLabel: output.outputDestinationLabel,
          status: output.status,
          createdAt: output.createdAt,
          updatedAt: output.updatedAt ?? null,
          runId: output.runId,
          prompt: output.prompt,
          expectedOutput: output.expectedOutput,
          content: output.content ?? null,
        });
      }
    }

    return Response.json({
      message: 'Automation storage saved',
    });
  } catch (error) {
    console.error('Failed to write automation storage:', error);

    return Response.json(
      { message: 'Failed to write automation storage' },
      { status: 500 },
    );
  }
};
