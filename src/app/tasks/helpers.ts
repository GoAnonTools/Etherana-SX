import { LayoutTemplate, Workflow } from 'lucide-react';
import { AUTOMATION_TEMPLATES } from '@/lib/automations/catalog';
import { computeNextRunAt } from '@/lib/automations/schedule';
import {
  readAutomationOutputs as readVaultAutomationOutputs,
  readAutomationRunHistory as readVaultAutomationRunHistory,
  readCustomAutomations as readVaultCustomAutomations,
  readHiddenTemplateIds as readVaultHiddenTemplateIds,
  writeAutomationOutputs as writeVaultAutomationOutputs,
  writeAutomationRunHistory as writeVaultAutomationRunHistory,
  writeCustomAutomations as writeVaultCustomAutomations,
  writeHiddenTemplateIds as writeVaultHiddenTemplateIds,
} from '@/lib/vault/localVault';
import type {
  AutomationMode,
  AutomationOutputItem,
  AutomationRunHistoryItem,
  AutomationScheduleType,
  AutomationStatus,
  AutomationTemplate,
  StoredAutomation,
} from './types';

export const CUSTOM_AUTOMATIONS_STORAGE_KEY = 'etherana.customAutomations.v1';
export const HIDDEN_TEMPLATE_AUTOMATION_IDS_STORAGE_KEY =
  'etherana.hiddenTemplateAutomationIds.v1';
export const AUTOMATION_RUN_HISTORY_STORAGE_KEY =
  'etherana.automationRunHistory.v1';
export const AUTOMATION_OUTPUTS_STORAGE_KEY = 'etherana.automationOutputs.v1';
export const DEFAULT_OUTPUT_TYPE = 'Document';
export const DEFAULT_OUTPUT_DESTINATION = 'automation';
export const NEW_SPACE_DESTINATION = '__new_space__';
export const DEFAULT_OUTPUT_DESTINATION_LABEL = 'Automation outputs';

export const OUTPUT_TYPES = [
  'Article',
  'Report',
  'Summary',
  'Dashboard',
  'Spreadsheet',
  'Presentation',
  'Task list',
  'Research brief',
  'Newsletter',
  'Content calendar',
  'Action plan',
  'Review',
  'Document',
];

export const getAutomationOutputType = (automation: AutomationTemplate) => {
  return automation.outputType || DEFAULT_OUTPUT_TYPE;
};

export const getAutomationOutputDestination = (automation: AutomationTemplate) => {
  return automation.outputDestination || DEFAULT_OUTPUT_DESTINATION;
};

export const getAutomationOutputDestinationLabel = (
  automation: AutomationTemplate,
) => {
  return automation.outputDestinationLabel || DEFAULT_OUTPUT_DESTINATION_LABEL;
};


export const WEEKDAY_OPTIONS = [
  { value: 'MO', labelKey: 'automationsPage.mon' },
  { value: 'TU', labelKey: 'automationsPage.tue' },
  { value: 'WE', labelKey: 'automationsPage.wed' },
  { value: 'TH', labelKey: 'automationsPage.thu' },
  { value: 'FR', labelKey: 'automationsPage.fri' },
  { value: 'SA', labelKey: 'automationsPage.sat' },
  { value: 'SU', labelKey: 'automationsPage.sun' },
] as const;

export const getDefaultScheduleType = (frequency: string): AutomationScheduleType => {
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

  if (normalized.includes('monthly') || normalized.includes('month')) return 'monthly';

  return 'manual';
};

export const normalizeScheduleType = (
  value?: string,
  fallbackFrequency = 'Manual',
): AutomationScheduleType => {
  const normalized = (value || '').toLowerCase();

  if (normalized === 'daily') return 'daily';
  if (normalized === 'weekly') return 'weekly';
  if (normalized === 'monthly') return 'monthly';
  if (normalized === 'manual') return 'manual';

  return getDefaultScheduleType(fallbackFrequency);
};

export const getDefaultScheduleDays = (frequency: string) => {
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

export const getAutomationScheduleType = (automation: AutomationTemplate): AutomationScheduleType => {
  return normalizeScheduleType(automation.scheduleType, automation.frequency);
};

export const getAutomationScheduleLabel = (
  automation: AutomationTemplate,
  t?: (key: any) => string,
) => {
  const translate = t ?? ((key: string) => key);
  const scheduleType = getAutomationScheduleType(automation);
  const time = automation.scheduleTime || '09:00';

  if (scheduleType === 'daily') {
    return `${translate('automationsPage.dailyAt')} ${time}`;
  }

  if (scheduleType === 'weekly') {
    const days =
      automation.scheduleDays && automation.scheduleDays.length > 0
        ? automation.scheduleDays
        : getDefaultScheduleDays(automation.frequency);
    const labels = days
      .map((day) => {
        const option = WEEKDAY_OPTIONS.find((item) => item.value === day);
        return option ? translate(option.labelKey) : day;
      })
      .join(', ');
    return `${translate('automationsPage.weeklyOn')} ${labels} ${translate(
      'automationsPage.at',
    )} ${time}`;
  }

  if (scheduleType === 'monthly') {
    return `${translate('automationsPage.monthlyOnDay')} ${
      automation.scheduleDayOfMonth || 1
    } ${translate('automationsPage.at')} ${time}`;
  }

  return automation.frequency || translate('automationsPage.manual');
};

export const getNextRunLabel = (
  automation: AutomationTemplate,
  t?: (key: any) => string,
) => {
  const translate = t ?? ((key: string) => key);

  if (getAutomationMode(automation) !== 'auto') {
    return translate('automationsPage.onlyWhenRun');
  }

  if (getAutomationStatus(automation) === 'paused') {
    return translate('automationsPage.paused');
  }

  return automation.nextRunAt
    ? new Date(automation.nextRunAt).toLocaleString()
    : translate('automationsPage.notCalculatedYet');
};

export const getAutomationMode = (automation: AutomationTemplate): AutomationMode => {
  return automation.mode || 'manual';
};

export const getAutomationStatus = (automation: AutomationTemplate): AutomationStatus => {
  return automation.status || 'active';
};

export const getAutomationModeLabel = (
  automation: AutomationTemplate,
  t?: (key: any) => string,
) => {
  if (getAutomationMode(automation) === 'auto') {
    return t ? t('automationsPage.autoRun') : 'Auto-run';
  }

  return t ? t('automationsPage.manual') : 'Manual';
};

export const getAutomationStatusLabel = (
  automation: AutomationTemplate,
  t?: (key: any) => string,
) => {
  if (getAutomationStatus(automation) === 'paused') {
    return t ? t('automationsPage.paused') : 'Paused';
  }

  return t ? t('automationsPage.active') : 'Active';
};

export const isAutomationPaused = (automation: AutomationTemplate) => {
  return getAutomationStatus(automation) === 'paused';
};

export const AUTOMATIONS: AutomationTemplate[] = AUTOMATION_TEMPLATES.map(
  (automation) => ({
    id: automation.id,
    name: automation.name,
    icon: automation.icon,
    category: automation.category,
    purpose: automation.description,
    frequency: automation.defaultFrequency,
    prompt: automation.prompt,
    output: automation.outputDescription,
    outputType: automation.outputType,
    outputDestination: DEFAULT_OUTPUT_DESTINATION,
    outputDestinationLabel:
      automation.saveDestination === 'library-and-space'
        ? 'Library + Space'
        : automation.saveDestination === 'space'
          ? 'Selected Space'
          : 'Library',
    goodFor: automation.goodFor,
    mode: automation.defaultMode,
    status: 'active',
    scheduleType: getDefaultScheduleType(automation.defaultFrequency),
    scheduleTime: '09:00',
    scheduleDays: ['MO'],
    scheduleDayOfMonth: 1,
  }),
);

export const getAutomationFromUrl = () => {
  if (typeof window === 'undefined') return undefined;

  const params = new URLSearchParams(window.location.search);
  return params.get('automation') ?? undefined;
};

export const normalizeStoredAutomationForRuntime = (
  automation: StoredAutomation,
): StoredAutomation => {
  const scheduleType = normalizeScheduleType(
    automation.scheduleType,
    automation.frequency,
  );

  const mode = automation.mode === 'auto' ? 'auto' : 'manual';
  const status = automation.status === 'paused' ? 'paused' : 'active';
  const scheduleTime =
    scheduleType === 'manual' ? undefined : automation.scheduleTime ?? '09:00';
  const scheduleDays =
    scheduleType === 'weekly'
      ? automation.scheduleDays && automation.scheduleDays.length > 0
        ? automation.scheduleDays
        : getDefaultScheduleDays(automation.frequency)
      : [];
  const scheduleDayOfMonth =
    scheduleType === 'monthly' ? automation.scheduleDayOfMonth ?? 1 : undefined;

  return {
    ...automation,
    mode,
    status,
    scheduleType,
    scheduleTime,
    scheduleDays,
    scheduleDayOfMonth,
    nextRunAt: computeNextRunAt({
      mode,
      status,
      scheduleType,
      scheduleTime,
      scheduleDays,
      scheduleDayOfMonth,
    }),
  };
};

export const getAutomationDisplayKey = (name: string) => {
  return name
    .replace(/\s+Copy$/i, '')
    .replace(/\s+Custom$/i, '')
    .trim()
    .toLowerCase();
};

export const readCustomAutomations = (): StoredAutomation[] => {
  return readVaultCustomAutomations();
};

export const writeCustomAutomations = (automations: StoredAutomation[]) => {
  writeVaultCustomAutomations(automations);
};

export const readHiddenTemplateIds = (): string[] => {
  return readVaultHiddenTemplateIds();
};

export const writeHiddenTemplateIds = (ids: string[]) => {
  writeVaultHiddenTemplateIds(ids);
};

export const readAutomationRunHistory = (): AutomationRunHistoryItem[] => {
  return readVaultAutomationRunHistory();
};

export const writeAutomationRunHistory = (runs: AutomationRunHistoryItem[]) => {
  writeVaultAutomationRunHistory(runs);
};

export const readAutomationOutputs = (): AutomationOutputItem[] => {
  return readVaultAutomationOutputs();
};

export const writeAutomationOutputs = (outputs: AutomationOutputItem[]) => {
  writeVaultAutomationOutputs(outputs);
};

export const toAutomationTemplate = (
  automation: StoredAutomation,
): AutomationTemplate => {
  return {
    ...automation,
    icon: Workflow,
    isCustom: true,
    category: automation.category || 'Custom',
    purpose:
      automation.purpose ||
      `Run a custom workflow for ${automation.name}.`,
    frequency: automation.frequency || 'Manual',
    output:
      automation.output ||
      'A reusable deliverable generated by the agent.',
    outputType: automation.outputType || DEFAULT_OUTPUT_TYPE,
    outputDestination:
      automation.outputDestination || DEFAULT_OUTPUT_DESTINATION,
    outputDestinationLabel:
      automation.outputDestinationLabel || DEFAULT_OUTPUT_DESTINATION_LABEL,
    goodFor:
      automation.goodFor.length > 0
        ? automation.goodFor
        : ['Custom workflow', 'Recurring work', 'Agent execution'],
  };
};

export const buildAutomationRunPrompt = (automation: AutomationTemplate) => {
  return `You are Etherana SX running an automation workflow.

Automation name:
${automation.name}

Category:
${automation.category}

Objective:
${automation.purpose}

Expected output:
${automation.output}

Output type:
${getAutomationOutputType(automation)}

Save destination:
${getAutomationOutputDestinationLabel(automation)}

Schedule:
${automation.frequency}

User request:
${automation.prompt}

Execution rules:
1. Do the work as an agent, not as a passive chatbot.
2. If useful context is available from the current chat, files, spaces, sources, or search tools, use it.
3. If no personal workspace context is available, do not stop and do not answer “I could not find relevant information.”
4. When context is missing, make reasonable assumptions, clearly label them, and still produce a useful starter output.
5. If the workflow requires fresh information, perform research before writing the final answer.
6. Structure the final answer as a deliverable the user can reuse.
7. Treat the final deliverable as an Output, not just a chat answer.
8. At the end, mention where the output should be saved.
9. End with a short “Next improvement” section explaining what data would make the automation smarter next time.

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
Explain what Etherana should remember, connect, or collect to make this automation better.`;
};
