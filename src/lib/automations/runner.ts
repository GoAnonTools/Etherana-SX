import db from '@/lib/db';
import {
  automationOutputRecords,
  automationRecords,
  automationRunRecords,
} from '@/lib/db/schema';
import { computeNextRunAt } from '@/lib/automations/schedule';
import { and, eq } from 'drizzle-orm';

type AutomationRecord = typeof automationRecords.$inferSelect;
type AutomationRunTrigger = 'manual' | 'auto';

const RUNNER_INTERVAL_MS = 60_000;

const getScheduleType = (
  value: string | null | undefined,
  frequency = 'Manual',
) => {
  if (value === 'daily' || value === 'weekly' || value === 'monthly') {
    return value;
  }

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

const getScheduleDays = (
  scheduleDays: string[] | null | undefined,
  frequency = 'Manual',
) => {
  if (scheduleDays && scheduleDays.length > 0) return scheduleDays;

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

type RunnerGlobalState = {
  interval?: ReturnType<typeof setInterval>;
  isRunning?: boolean;
};

const getRunnerState = () => {
  const globalForRunner = globalThis as typeof globalThis & {
    __etheranaAutomationRunner?: RunnerGlobalState;
  };

  if (!globalForRunner.__etheranaAutomationRunner) {
    globalForRunner.__etheranaAutomationRunner = {};
  }

  return globalForRunner.__etheranaAutomationRunner;
};

const getAutomationOutputType = (automation: AutomationRecord) => {
  return automation.outputType || 'Document';
};

const getAutomationOutputDestination = (automation: AutomationRecord) => {
  return automation.outputDestination || 'automation';
};

const getAutomationOutputDestinationLabel = (automation: AutomationRecord) => {
  return automation.outputDestinationLabel || 'Automation outputs';
};

const buildAutomationRunPrompt = (automation: AutomationRecord) => {
  return `You are Etherana SX running an automation workflow.

Automation name: ${automation.name}
Category: ${automation.category}
Objective: ${automation.purpose}
Expected output: ${automation.output}
Output type: ${getAutomationOutputType(automation)}
Save destination: ${getAutomationOutputDestinationLabel(automation)}
Schedule: ${automation.frequency}

User instructions:
${automation.prompt}

Execution rules:
1. Produce a reusable deliverable, not a casual chat answer.
2. Use clear sections and practical recommendations.
3. If useful workspace context is available, use it.
4. If context is missing, make reasonable assumptions and label them.
5. If fresh information is required, research before writing the final answer.
6. End with a short “Next improvement” section.

Return the result in this format:

# ${automation.name}

## Summary
Give the short result.

## Main Output
Produce the actual useful deliverable.

## Assumptions Used
List assumptions only if context was missing.

## Recommended Next Actions
Give 3 to 5 concrete next actions.

## Next Improvement
Explain what Etherana should remember, connect, or collect to make this automation better next time.`;
};

const buildPreparedOutputContent = ({
  automation,
  prompt,
  trigger,
  startedAt,
}: {
  automation: AutomationRecord;
  prompt: string;
  trigger: AutomationRunTrigger;
  startedAt: Date;
}) => {
  return `# ${automation.name}

## Summary

This automation was triggered by Etherana SX.

- Trigger: ${trigger === 'auto' ? 'Auto-run' : 'Manual'}
- Started at: ${startedAt.toLocaleString()}
- Output type: ${getAutomationOutputType(automation)}
- Save destination: ${getAutomationOutputDestinationLabel(automation)}

## Prepared Workflow

Etherana prepared this automation run using the saved workflow instructions below.

## Automation Instructions

${prompt}

## Recommended Next Actions

1. Review this prepared automation output.
2. Open it in Search or Agent mode if you want the AI to expand it immediately.
3. Keep the automation active if the schedule is useful.
4. Pause it if you want to keep the setup but stop future runs.

## Next Improvement

The next runner upgrade will connect this scheduled run directly to the AI execution pipeline so auto-run can generate the final deliverable without manual review.`;
};

export const runAutomationById = async (
  automationId: string,
  trigger: AutomationRunTrigger = 'manual',
) => {
  const [automation] = await db
    .select()
    .from(automationRecords)
    .where(eq(automationRecords.id, automationId))
    .limit(1);

  if (!automation) {
    throw new Error(`Automation not found: ${automationId}`);
  }

  if (automation.status === 'paused') {
    throw new Error(`Automation is paused: ${automation.name}`);
  }

  const startedAt = new Date();
  const runId = crypto.randomUUID();
  const outputId = crypto.randomUUID();
  const prompt = buildAutomationRunPrompt(automation);

  const outputType = getAutomationOutputType(automation);
  const outputDestination = getAutomationOutputDestination(automation);
  const outputDestinationLabel = getAutomationOutputDestinationLabel(automation);

  await db.insert(automationRunRecords).values({
    id: runId,
    automationId: automation.id,
    automationName: automation.name,
    startedAt: startedAt.toISOString(),
    mode: trigger,
    status: 'started',
    prompt,
    expectedOutput: automation.output,
    outputType,
    outputDestination,
    outputDestinationLabel,
    outputId,
  });

  await db.insert(automationOutputRecords).values({
    id: outputId,
    automationId: automation.id,
    automationName: automation.name,
    title: `${automation.name} — ${outputType}`,
    outputType,
    outputDestination,
    outputDestinationLabel,
    status: 'ready',
    createdAt: startedAt.toISOString(),
    runId,
    prompt,
    expectedOutput: automation.output,
    content: buildPreparedOutputContent({
      automation,
      prompt,
      trigger,
      startedAt,
    }),
  });

  const completedAt = new Date();
  const nextRunAt =
    automation.mode === 'auto'
      ? computeNextRunAt(
          {
            mode: 'auto',
            status: automation.status === 'paused' ? 'paused' : 'active',
            scheduleType: getScheduleType(automation.scheduleType, automation.frequency),
            scheduleTime: automation.scheduleTime || undefined,
            scheduleDays: getScheduleDays(automation.scheduleDays, automation.frequency),
            scheduleDayOfMonth: automation.scheduleDayOfMonth || undefined,
          },
          completedAt,
        )
      : undefined;

  await db
    .update(automationRecords)
    .set({
      lastRunAt: completedAt.toISOString(),
      nextRunAt,
    })
    .where(eq(automationRecords.id, automation.id));

  return {
    automationId: automation.id,
    automationName: automation.name,
    runId,
    outputId,
    trigger,
    status: 'started',
    lastRunAt: completedAt.toISOString(),
    nextRunAt,
  };
};

export const runDueAutomations = async () => {
  const state = getRunnerState();

  if (state.isRunning) {
    return {
      skipped: true,
      reason: 'Automation runner is already active.',
    };
  }

  state.isRunning = true;

  try {
    const now = new Date();

    const activeAutoAutomations = await db
      .select()
      .from(automationRecords)
      .where(
        and(
          eq(automationRecords.mode, 'auto'),
          eq(automationRecords.status, 'active'),
        ),
      );

    const results = [];

    for (const automation of activeAutoAutomations) {
      const currentNextRunAt =
        automation.nextRunAt ||
        computeNextRunAt(
          {
            mode: 'auto',
            status: 'active',
            scheduleType: getScheduleType(automation.scheduleType, automation.frequency),
            scheduleTime: automation.scheduleTime || undefined,
            scheduleDays: getScheduleDays(automation.scheduleDays, automation.frequency),
            scheduleDayOfMonth: automation.scheduleDayOfMonth || undefined,
          },
          now,
        );

      if (!currentNextRunAt) {
        continue;
      }

      if (!automation.nextRunAt) {
        await db
          .update(automationRecords)
          .set({ nextRunAt: currentNextRunAt })
          .where(eq(automationRecords.id, automation.id));
      }

      const isDue = new Date(currentNextRunAt).getTime() <= now.getTime();

      if (!isDue) {
        continue;
      }

      try {
        results.push(await runAutomationById(automation.id, 'auto'));
      } catch (error) {
        results.push({
          automationId: automation.id,
          automationName: automation.name,
          status: 'failed',
          error:
            error instanceof Error
              ? error.message
              : 'Automation run failed.',
        });
      }
    }

    if (results.length > 0) {
      console.log(
        `[automation-runner] Ran ${results.length} due automation(s).`,
      );
    }

    return {
      checkedAt: now.toISOString(),
      checked: activeAutoAutomations.length,
      ran: results.length,
      results,
    };
  } finally {
    state.isRunning = false;
  }
};

export const startAutomationRunner = () => {
  const state = getRunnerState();

  if (state.interval) {
    return;
  }

  console.log('[automation-runner] Started. Checking every 60 seconds.');

  state.interval = setInterval(() => {
    runDueAutomations().catch((error) => {
      console.error('[automation-runner] Tick failed:', error);
    });
  }, RUNNER_INTERVAL_MS);

  runDueAutomations().catch((error) => {
    console.error('[automation-runner] Initial tick failed:', error);
  });
};
