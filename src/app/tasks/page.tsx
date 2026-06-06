'use client';

// SELF_CONTAINED_AUTOMATIONS_PAGE_PATCH_6_CUSTOM_AUTOMATIONS

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  DollarSign,
  FileText,
  History,
  LayoutTemplate,
  Lightbulb,
  PencilLine,
  Play,
  Plus,
  Repeat,
  Save,
  Search,
  Sparkles,
  TrendingUp,
  Trash2,
  Users,
  Workflow,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  getAutomationStorageChangedEventName,
  pullAutomationStorageFromDatabase,
  readAutomationOutputs as readVaultAutomationOutputs,
  readAutomationRunHistory as readVaultAutomationRunHistory,
  readCustomAutomations as readVaultCustomAutomations,
  readHiddenTemplateIds as readVaultHiddenTemplateIds,
  writeAutomationOutputs as writeVaultAutomationOutputs,
  writeAutomationRunHistory as writeVaultAutomationRunHistory,
  writeCustomAutomations as writeVaultCustomAutomations,
  writeHiddenTemplateIds as writeVaultHiddenTemplateIds,
} from '@/lib/vault/localVault';
import { AUTOMATION_TEMPLATES } from '@/lib/automations/catalog';
import { computeNextRunAt } from '@/lib/automations/schedule';
import { useI18n } from '@/lib/i18n/useI18n';


type AutomationMode = 'manual' | 'auto';
type AutomationStatus = 'active' | 'paused';
type AutomationScheduleType = 'manual' | 'daily' | 'weekly' | 'monthly';

interface AutomationTemplate {
  id: string;
  name: string;
  icon: LucideIcon;
  category: string;
  purpose: string;
  frequency: string;
  prompt: string;
  output: string;
  outputType?: string;
  outputDestination?: string;
  outputDestinationLabel?: string;
  goodFor: string[];
  mode?: AutomationMode;
  status?: AutomationStatus;
  scheduleType?: AutomationScheduleType;
  scheduleTime?: string;
  scheduleDays?: string[];
  scheduleDayOfMonth?: number;
  nextRunAt?: string;
  lastRunAt?: string;
  isCustom?: boolean;
}

interface StoredAutomation {
  id: string;
  name: string;
  category: string;
  purpose: string;
  frequency: string;
  prompt: string;
  output: string;
  outputType?: string;
  outputDestination?: string;
  outputDestinationLabel?: string;
  goodFor: string[];
  mode?: AutomationMode;
  status?: AutomationStatus;
  scheduleType?: AutomationScheduleType;
  scheduleTime?: string;
  scheduleDays?: string[];
  scheduleDayOfMonth?: number;
  nextRunAt?: string;
  lastRunAt?: string;
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

interface AutomationSpace {
  id: string;
  name: string;
  description?: string;
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
  runId: string;
  prompt: string;
  expectedOutput: string;
  content?: string;
}

const CUSTOM_AUTOMATIONS_STORAGE_KEY = 'etherana.customAutomations.v1';
const HIDDEN_TEMPLATE_AUTOMATION_IDS_STORAGE_KEY =
  'etherana.hiddenTemplateAutomationIds.v1';
const AUTOMATION_RUN_HISTORY_STORAGE_KEY =
  'etherana.automationRunHistory.v1';
const AUTOMATION_OUTPUTS_STORAGE_KEY = 'etherana.automationOutputs.v1';
const DEFAULT_OUTPUT_TYPE = 'Document';
const DEFAULT_OUTPUT_DESTINATION = 'automation';
const NEW_SPACE_DESTINATION = '__new_space__';
const DEFAULT_OUTPUT_DESTINATION_LABEL = 'Automation outputs';

const OUTPUT_TYPES = [
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

const getAutomationOutputType = (automation: AutomationTemplate) => {
  return automation.outputType || DEFAULT_OUTPUT_TYPE;
};

const getAutomationOutputDestination = (automation: AutomationTemplate) => {
  return automation.outputDestination || DEFAULT_OUTPUT_DESTINATION;
};

const getAutomationOutputDestinationLabel = (
  automation: AutomationTemplate,
) => {
  return automation.outputDestinationLabel || DEFAULT_OUTPUT_DESTINATION_LABEL;
};


const WEEKDAY_OPTIONS = [
  { value: 'MO', labelKey: 'automationsPage.mon' },
  { value: 'TU', labelKey: 'automationsPage.tue' },
  { value: 'WE', labelKey: 'automationsPage.wed' },
  { value: 'TH', labelKey: 'automationsPage.thu' },
  { value: 'FR', labelKey: 'automationsPage.fri' },
  { value: 'SA', labelKey: 'automationsPage.sat' },
  { value: 'SU', labelKey: 'automationsPage.sun' },
] as const;

const getDefaultScheduleType = (frequency: string): AutomationScheduleType => {
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

const normalizeScheduleType = (
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

const getDefaultScheduleDays = (frequency: string) => {
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

const getAutomationScheduleType = (automation: AutomationTemplate): AutomationScheduleType => {
  return normalizeScheduleType(automation.scheduleType, automation.frequency);
};

const getAutomationScheduleLabel = (
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

const getNextRunLabel = (
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

const getAutomationMode = (automation: AutomationTemplate): AutomationMode => {
  return automation.mode || 'manual';
};

const getAutomationStatus = (automation: AutomationTemplate): AutomationStatus => {
  return automation.status || 'active';
};

const getAutomationModeLabel = (
  automation: AutomationTemplate,
  t?: (key: any) => string,
) => {
  if (getAutomationMode(automation) === 'auto') {
    return t ? t('automationsPage.autoRun') : 'Auto-run';
  }

  return t ? t('automationsPage.manual') : 'Manual';
};

const getAutomationStatusLabel = (
  automation: AutomationTemplate,
  t?: (key: any) => string,
) => {
  if (getAutomationStatus(automation) === 'paused') {
    return t ? t('automationsPage.paused') : 'Paused';
  }

  return t ? t('automationsPage.active') : 'Active';
};

const isAutomationPaused = (automation: AutomationTemplate) => {
  return getAutomationStatus(automation) === 'paused';
};

const AUTOMATIONS: AutomationTemplate[] = AUTOMATION_TEMPLATES.map(
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

const getAutomationFromUrl = () => {
  if (typeof window === 'undefined') return undefined;

  const params = new URLSearchParams(window.location.search);
  return params.get('automation') ?? undefined;
};

const normalizeStoredAutomationForRuntime = (
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

const getAutomationDisplayKey = (name: string) => {
  return name
    .replace(/\s+Copy$/i, '')
    .replace(/\s+Custom$/i, '')
    .trim()
    .toLowerCase();
};

const readCustomAutomations = (): StoredAutomation[] => {
  return readVaultCustomAutomations();
};

const writeCustomAutomations = (automations: StoredAutomation[]) => {
  writeVaultCustomAutomations(automations);
};

const readHiddenTemplateIds = (): string[] => {
  return readVaultHiddenTemplateIds();
};

const writeHiddenTemplateIds = (ids: string[]) => {
  writeVaultHiddenTemplateIds(ids);
};

const readAutomationRunHistory = (): AutomationRunHistoryItem[] => {
  return readVaultAutomationRunHistory();
};

const writeAutomationRunHistory = (runs: AutomationRunHistoryItem[]) => {
  writeVaultAutomationRunHistory(runs);
};

const readAutomationOutputs = (): AutomationOutputItem[] => {
  return readVaultAutomationOutputs();
};

const writeAutomationOutputs = (outputs: AutomationOutputItem[]) => {
  writeVaultAutomationOutputs(outputs);
};

const toAutomationTemplate = (
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

const buildAutomationRunPrompt = (automation: AutomationTemplate) => {
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

const AutomationBuilder = ({
  editingAutomation,
  spaces,
  onCancel,
  onSave,
  onCreateSpace,
}: {
  editingAutomation?: StoredAutomation | null;
  spaces: AutomationSpace[];
  onCancel: () => void;
  onSave: (automation: StoredAutomation) => void;
  onCreateSpace: (name: string) => Promise<AutomationSpace | null>;
}) => {
  const { t } = useI18n();
  const isEditing = Boolean(editingAutomation);

  const [name, setName] = useState(editingAutomation?.name ?? '');
  const [category, setCategory] = useState(
    editingAutomation?.category ?? 'Research',
  );
  const [frequency, setFrequency] = useState(
    editingAutomation?.frequency ?? 'Every Tuesday',
  );
  const [mode, setMode] = useState<AutomationMode>(editingAutomation?.mode ?? 'manual');
  const [status, setStatus] = useState<AutomationStatus>(editingAutomation?.status ?? 'active');
  const [scheduleType, setScheduleType] = useState<AutomationScheduleType>(
    editingAutomation?.scheduleType ?? getDefaultScheduleType(editingAutomation?.frequency ?? 'Manual'),
  );
  const [scheduleTime, setScheduleTime] = useState(editingAutomation?.scheduleTime ?? '09:00');
  const [scheduleDays, setScheduleDays] = useState<string[]>(editingAutomation?.scheduleDays ?? ['MO']);
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState(
    editingAutomation?.scheduleDayOfMonth ?? 1,
  );
  const [purpose, setPurpose] = useState(editingAutomation?.purpose ?? '');
  const [prompt, setPrompt] = useState(editingAutomation?.prompt ?? '');
  const [output, setOutput] = useState(editingAutomation?.output ?? '');
  const [outputType, setOutputType] = useState(
    editingAutomation?.outputType ?? 'Article',
  );
  const [outputDestination, setOutputDestination] = useState(
    editingAutomation?.outputDestination ?? DEFAULT_OUTPUT_DESTINATION,
  );
  const [newSpaceName, setNewSpaceName] = useState('');

  const canSave =
    name.trim().length > 0 &&
    prompt.trim().length > 0 &&
    (outputDestination !== NEW_SPACE_DESTINATION ||
      newSpaceName.trim().length > 0);

  const setTestScheduleInTwoMinutes = () => {
    const date = new Date(Date.now() + 2 * 60 * 1000);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    setMode('auto');
    setStatus('active');
    setScheduleType('daily');
    setScheduleTime(`${hours}:${minutes}`);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSave) return;

    let finalOutputDestination = outputDestination;
    let outputDestinationLabel =
      outputDestination === DEFAULT_OUTPUT_DESTINATION
        ? DEFAULT_OUTPUT_DESTINATION_LABEL
        : spaces.find((space) => `space:${space.id}` === outputDestination)
            ?.name ?? DEFAULT_OUTPUT_DESTINATION_LABEL;

    if (outputDestination === NEW_SPACE_DESTINATION) {
      const createdSpace = await onCreateSpace(newSpaceName.trim());

      if (!createdSpace) return;

      finalOutputDestination = `space:${createdSpace.id}`;
      outputDestinationLabel = createdSpace.name;
    }

    onSave(normalizeStoredAutomationForRuntime({
      id: editingAutomation?.id ?? `custom-${Date.now()}`,
      name: name.trim(),
      category: category.trim() || 'Custom',
      frequency: frequency.trim() || 'Manual',
      mode,
      status,
      scheduleType: normalizeScheduleType(scheduleType, frequency),
      scheduleTime,
      scheduleDays,
      scheduleDayOfMonth,
      lastRunAt: editingAutomation?.lastRunAt,
      
      purpose:
        purpose.trim() ||
        `Run a repeatable ${category.toLowerCase()} workflow.`,
      prompt: prompt.trim(),
      output:
        output.trim() ||
        'A structured deliverable generated by the agent.',
      outputType: outputType.trim() || DEFAULT_OUTPUT_TYPE,
      outputDestination: finalOutputDestination,
      outputDestinationLabel,
      goodFor:
        editingAutomation?.goodFor?.length
          ? editingAutomation.goodFor
          : ['Custom workflow', 'Agent execution', 'Reusable output'],
      createdAt: editingAutomation?.createdAt ?? new Date().toISOString(),
    }));
  };

  return (
    <section className="mb-10 rounded-3xl border border-light-200 bg-light-secondary p-6 shadow-sm dark:border-dark-200 dark:bg-dark-secondary">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-light-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-black/45 dark:border-dark-200 dark:text-white/45">
            {isEditing ? <PencilLine size={14} /> : <Plus size={14} />}
            {isEditing ? t('automationsPage.editAutomation') : t('automationsPage.newAutomation')}
          </div>

          <h2 className="text-2xl font-bold text-black dark:text-white">
            {isEditing
              ? t('automationsPage.editAutomationTitle')
              : t('automationsPage.createCustomAutomation')}
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-black/55 dark:text-white/55">
            {isEditing
              ? t('automationsPage.editDescription')
              : t('automationsPage.createDescription')}
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-full p-2 text-black/45 transition hover:bg-light-primary hover:text-black dark:text-white/45 dark:hover:bg-dark-primary dark:hover:text-white"
          aria-label={t('automationsPage.closeBuilder')}
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-black dark:text-white">
              {t('automationsPage.automationName')}
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="AI News Article"
              className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-black dark:text-white">
              {t('automationsPage.category')}
            </span>
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Research, Marketing, Sales..."
              className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
            />
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-medium text-black dark:text-white">
            {t('automationsPage.frequency')}
          </span>
          <input
            value={frequency}
            onChange={(event) => setFrequency(event.target.value)}
            placeholder="Every Tuesday, Every morning, Weekly..."
            className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
          />
        </label>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-black dark:text-white">
              {t('automationsPage.automationMode')}
            </span>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as AutomationMode)}
              className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
            >
              <option value="manual">{t('automationsPage.manualOption')}</option>
              <option value="auto">{t('automationsPage.autoOption')}</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-black dark:text-white">
              {t('automationsPage.status')}
            </span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as AutomationStatus)}
              className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
            >
              <option value="active">{t('automationsPage.active')}</option>
              <option value="paused">{t('automationsPage.paused')}</option>
            </select>
          </label>
        </div>

        <div className="rounded-3xl border border-light-200 bg-light-primary p-5 dark:border-dark-200 dark:bg-dark-primary">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-black dark:text-white">
              {t('automationsPage.scheduleSettings')}
            </h3>

            <p className="mt-1 text-xs text-black/50 dark:text-white/50">
              {t('automationsPage.scheduleDescription')}
            </p>

            <button
              type="button"
              onClick={setTestScheduleInTwoMinutes}
              className="mt-4 inline-flex items-center justify-center rounded-full border border-light-200 px-4 py-2 text-xs font-semibold text-black/60 transition hover:bg-light-secondary hover:text-black dark:border-dark-200 dark:text-white/60 dark:hover:bg-dark-secondary dark:hover:text-white"
            >
              {t('automationsPage.testInTwoMinutes')}
            </button>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-black dark:text-white">
                {t('automationsPage.scheduleType')}
              </span>

              <select
                value={scheduleType}
                onChange={(event) =>
                  setScheduleType(event.target.value as AutomationScheduleType)
                }
                className="w-full rounded-2xl border border-light-200 bg-light-secondary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-secondary dark:text-white dark:focus:border-white"
              >
                <option value="manual">{t('automationsPage.manualOnly')}</option>
                <option value="daily">{t('automationsPage.daily')}</option>
                <option value="weekly">{t('automationsPage.weekly')}</option>
                <option value="monthly">{t('automationsPage.monthly')}</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-black dark:text-white">
                {t('automationsPage.time')}
              </span>

              <input
                type="time"
                value={scheduleTime}
                onChange={(event) => setScheduleTime(event.target.value)}
                className="w-full rounded-2xl border border-light-200 bg-light-secondary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-secondary dark:text-white dark:focus:border-white"
              />
            </label>
          </div>

          {scheduleType === 'weekly' && (
            <div className="mt-5">
              <p className="mb-3 text-sm font-medium text-black dark:text-white">
                {t('automationsPage.days')}
              </p>

              <div className="flex flex-wrap gap-2">
                {WEEKDAY_OPTIONS.map((day) => {
                  const selected = scheduleDays.includes(day.value);

                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() =>
                        setScheduleDays((current) =>
                          selected
                            ? current.filter((item) => item !== day.value)
                            : [...current, day.value],
                        )
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        selected
                          ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                          : 'border-light-200 text-black/55 hover:bg-light-secondary dark:border-dark-200 dark:text-white/55 dark:hover:bg-dark-secondary'
                      }`}
                    >
                      {t(day.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {scheduleType === 'monthly' && (
            <label className="mt-5 block space-y-2">
              <span className="text-sm font-medium text-black dark:text-white">
                {t('automationsPage.dayOfMonth')}
              </span>

              <input
                type="number"
                min={1}
                max={31}
                value={scheduleDayOfMonth}
                onChange={(event) =>
                  setScheduleDayOfMonth(
                    Math.min(31, Math.max(1, Number(event.target.value) || 1)),
                  )
                }
                className="w-full rounded-2xl border border-light-200 bg-light-secondary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-secondary dark:text-white dark:focus:border-white"
              />
            </label>
          )}
        </div>

        <label className="space-y-2">
          <span className="text-sm font-medium text-black dark:text-white">
            {t('automationsPage.objective')}
          </span>
          <textarea
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            placeholder="Track AI development news and turn the best stories into a weekly article."
            rows={3}
            className="w-full resize-none rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-black dark:text-white">
            {t('automationsPage.agentInstructions')}
          </span>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Every Tuesday, find and collect important news about AI development, analyze the most relevant stories, then write a clear article for entrepreneurs."
            rows={5}
            className="w-full resize-none rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-black dark:text-white">
            {t('automationsPage.expectedOutput')}
          </span>
          <textarea
            value={output}
            onChange={(event) => setOutput(event.target.value)}
            placeholder="A structured article with title, intro, key news, analysis, and practical implications."
            rows={3}
            className="w-full resize-none rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
          />
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-black dark:text-white">
              {t('automationsPage.outputType')}
            </span>
            <select
              value={outputType}
              onChange={(event) => setOutputType(event.target.value)}
              className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
            >
              {OUTPUT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-black dark:text-white">
              {t('automationsPage.saveDestination')}
            </span>
            <select
              value={outputDestination}
              onChange={(event) => setOutputDestination(event.target.value)}
              className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
            >
              <option value={DEFAULT_OUTPUT_DESTINATION}>
                {t('automationsPage.automationOutputs')}
              </option>

              <option value={NEW_SPACE_DESTINATION}>
                {t('automationsPage.createNewSpace')}
              </option>

              {spaces.map((space) => (
                <option key={space.id} value={`space:${space.id}`}>
                  {space.name} Space
                </option>
              ))}
            </select>

            {outputDestination === NEW_SPACE_DESTINATION && (
              <input
                value={newSpaceName}
                onChange={(event) => setNewSpaceName(event.target.value)}
                placeholder={t('automationsPage.newSpaceName')}
                className="mt-3 w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
              />
            )}
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-light-200 px-5 py-2.5 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
          >
            {t('automationsPage.cancel')}
          </button>

          <button
            type="submit"
            disabled={!canSave}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black"
          >
            <Save size={16} />
            {isEditing ? t('automationsPage.saveChanges') : t('automationsPage.createAutomation')}
          </button>
        </div>
      </form>
    </section>
  );
};

const AutomationModeStatusPills = ({ automation }: { automation: AutomationTemplate }) => {
  const { t } = useI18n();
  const modeLabel = getAutomationModeLabel(automation, t);
  const statusLabel = getAutomationStatusLabel(automation, t);

  return (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full bg-light-primary px-3 py-1 text-xs font-medium text-black/45 dark:bg-dark-primary dark:text-white/45">
        {modeLabel}
      </span>
      <span className="rounded-full bg-light-primary px-3 py-1 text-xs font-medium text-black/45 dark:bg-dark-primary dark:text-white/45">
        {statusLabel}
      </span>
      <span className="rounded-full bg-light-primary px-3 py-1 text-xs font-medium text-black/45 dark:bg-dark-primary dark:text-white/45">
        {getAutomationScheduleLabel(automation, t)}
      </span>
    </div>
  );
};

const AutomationCard = ({
  automation,
  onSelect,
}: {
  automation: AutomationTemplate;
  onSelect: (id: string) => void;
}) => {
  const { t } = useI18n();
  const Icon = automation.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(automation.id)}
      className="group block h-full w-full text-left focus:outline-none"
    >
      <article className="relative h-full overflow-hidden rounded-3xl border border-light-200 bg-light-secondary p-6 shadow-sm transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg dark:border-dark-200 dark:bg-dark-secondary">
        <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-black/[0.03] dark:bg-white/[0.04]" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white dark:bg-white dark:text-black">
            <Icon size={22} />
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="rounded-full border border-light-200 px-3 py-1 text-xs font-medium text-black/55 dark:border-dark-200 dark:text-white/55">
              {automation.category}
            </span>

            {automation.isCustom && (
              <span className="rounded-full bg-light-primary px-3 py-1 text-xs font-medium text-black/45 dark:bg-dark-primary dark:text-white/45">
                {t('automationsPage.custom')}
              </span>
            )}
              <AutomationModeStatusPills automation={automation} />
          </div>
        </div>

        <div className="relative mt-5">
          <h2 className="text-xl font-semibold text-black dark:text-white">
            {automation.name}
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-black/60 dark:text-white/60">
            {automation.purpose}
          </p>
        </div>

        <div className="relative mt-6 space-y-4">
          <div className="rounded-2xl bg-light-primary p-4 dark:bg-dark-primary">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
              <Clock size={14} />
              {t('automationsPage.schedule')}
            </div>

            <p className="text-sm text-black/75 dark:text-white/75">
              {automation.frequency}
            </p>
          </div>

          <div className="rounded-2xl bg-light-primary p-4 dark:bg-dark-primary">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
              <Zap size={14} />
              {t('automationsPage.expectedOutput')}
            </div>

            <p className="text-sm leading-relaxed text-black/75 dark:text-white/75">
              {automation.output}
            </p>
          </div>
        </div>

        <div className="relative mt-6 flex items-center justify-between gap-3">
          <p className="text-xs text-black/40 dark:text-white/40">
            {t('automationsPage.reviewConfigureRun')}
          </p>

          <span className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition duration-200 group-hover:scale-[1.02] dark:bg-white dark:text-black">
            {t('automationsPage.viewDetails')}
            <ArrowRight size={16} />
          </span>
        </div>
      </article>
    </button>
  );
};

const AutomationsList = ({
  automations,
  customCount,
  hiddenTemplateCount,
  isBuilderOpen,
  editingAutomation,
  spaces,
  onOpenBuilder,
  onCloseBuilder,
  onSaveAutomation,
  onCleanDuplicateAutomations,
  onCreateSpace,
  onRestoreTemplates,
  onSelect,
}: {
  automations: AutomationTemplate[];
  customCount: number;
  hiddenTemplateCount: number;
  isBuilderOpen: boolean;
  editingAutomation: StoredAutomation | null;
  spaces: AutomationSpace[];
  onOpenBuilder: () => void;
  onCloseBuilder: () => void;
  onSaveAutomation: (automation: StoredAutomation) => void;
  onCleanDuplicateAutomations: () => void;
  onCreateSpace: (name: string) => Promise<AutomationSpace | null>;
  onRestoreTemplates: () => void;
  onSelect: (id: string) => void;
}) => {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
      <header className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-light-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-black/45 dark:border-dark-200 dark:text-white/45">
            <Sparkles size={14} />
            {t('automationsPage.automation')}
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white md:text-5xl">
            {t('automationsPage.automations')}
          </h1>

          <p className="mt-4 text-base leading-relaxed text-black/60 dark:text-white/60 md:text-lg">
            {t('automationsPage.listSubtitle')}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {hiddenTemplateCount > 0 && (
            <button
              type="button"
              onClick={onRestoreTemplates}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-light-200 px-5 py-3 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
            >
              <Repeat size={17} />
              {t('automationsPage.restoreTemplates')}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenBuilder}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] active:scale-[0.99] dark:bg-white dark:text-black"
          >
            <Plus size={17} />
            {t('automationsPage.newAutomationButton')}
          </button>

          <button
            type="button"
            onClick={onCleanDuplicateAutomations}
            className="inline-flex items-center justify-center rounded-full border border-light-200 px-4 py-2 text-sm font-semibold text-black/60 transition hover:bg-light-primary hover:text-black dark:border-dark-200 dark:text-white/60 dark:hover:bg-dark-primary dark:hover:text-white"
          >
            {t('automationsPage.cleanDuplicates')}
          </button>
        </div>
      </header>

      {isBuilderOpen && (
        <AutomationBuilder
          editingAutomation={editingAutomation}
          spaces={spaces}
          onCancel={onCloseBuilder}
          onSave={onSaveAutomation}
          onCreateSpace={onCreateSpace}
        />
      )}

      <section className="mb-10 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-light-200 bg-light-secondary p-5 dark:border-dark-200 dark:bg-dark-secondary">
          <p className="text-sm font-semibold text-black dark:text-white">
            {t('automationsPage.searchTitle')}
          </p>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">
            {t('automationsPage.searchDescription')}
          </p>
        </div>

        <div className="rounded-3xl border border-light-200 bg-light-secondary p-5 dark:border-dark-200 dark:bg-dark-secondary">
          <p className="text-sm font-semibold text-black dark:text-white">
            {t('automationsPage.spaceTitle')}
          </p>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">
            {t('automationsPage.spaceDescription')}
          </p>
        </div>

        <div className="rounded-3xl border border-light-200 bg-light-secondary p-5 dark:border-dark-200 dark:bg-dark-secondary">
          <p className="text-sm font-semibold text-black dark:text-white">
            {t('automationsPage.automation')}
          </p>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">
            {t('automationsPage.automationDescription')}
          </p>
        </div>
      </section>

      <section className="mb-8 flex flex-wrap items-center gap-3 text-sm text-black/45 dark:text-white/45">
        <span className="inline-flex items-center gap-2">
          <LayoutTemplate size={16} />
          {AUTOMATIONS.length} {t('automationsPage.templates')}
        </span>

        <span>•</span>

        <span>{customCount} {t('automationsPage.customAutomations')}</span>

        {hiddenTemplateCount > 0 && (
          <>
            <span>•</span>
            <span>{hiddenTemplateCount} {t('automationsPage.hiddenTemplates')}</span>
          </>
        )}
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {automations.map((automation) => (
          <AutomationCard
            key={automation.id}
            automation={automation}
            onSelect={onSelect}
          />
        ))}
      </section>
    </div>
  );
};

const AutomationDetail = ({
  automation,
  runHistory,
  outputs,
  onBack,
  onRunAutomation,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  automation: AutomationTemplate;
  runHistory: AutomationRunHistoryItem[];
  outputs: AutomationOutputItem[];
  onBack: () => void;
  onRunAutomation: (automation: AutomationTemplate) => void;
  onEdit: (automation: AutomationTemplate) => void;
  onDuplicate: (automation: AutomationTemplate) => void;
  onDelete: (automation: AutomationTemplate) => void;
}) => {
  const { t } = useI18n();
  const Icon = automation.icon;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-black/55 transition hover:text-black dark:text-white/55 dark:hover:text-white"
      >
        <ArrowLeft size={16} />
        {t('automationsPage.backToAutomations')}
      </button>

      <header className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-light-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-black/45 dark:border-dark-200 dark:text-white/45">
            <Sparkles size={14} />
            {automation.category} {t('automationsPage.automation')}
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black text-white dark:bg-white dark:text-black">
              <Icon size={26} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white md:text-5xl">
                  {automation.name}
                </h1>

                {automation.isCustom && (
                  <span className="rounded-full bg-light-secondary px-3 py-1 text-xs font-semibold text-black/45 dark:bg-dark-secondary dark:text-white/45">
                    {t('automationsPage.custom')}
                  </span>
                )}
              <AutomationModeStatusPills automation={automation} />
              </div>

              <p className="mt-4 max-w-3xl text-base leading-relaxed text-black/60 dark:text-white/60 md:text-lg">
                {automation.purpose}
              </p>
            </div>
          </div>
        </div>

        <aside className="rounded-3xl border border-light-200 bg-light-secondary p-6 shadow-sm dark:border-dark-200 dark:bg-dark-secondary">
          <p className="text-sm font-semibold text-black dark:text-white">
            {t('automationsPage.manualRun')}
          </p>

          <p className="mt-2 text-sm leading-relaxed text-black/55 dark:text-white/55">
            {t('automationsPage.manualRunDescription')}
          </p>

          <button
            type="button"
            onClick={() => onRunAutomation(automation)}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:scale-[1.01] active:scale-[0.99] dark:bg-white dark:text-black"
          >
            <Play size={16} />
            {t('automationsPage.runAutomation')}
          </button>
        <div className="mt-5 rounded-2xl bg-light-primary p-4 dark:bg-dark-primary">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
            <CheckCircle2 size={14} />
            {t('automationsPage.modeAndStatus')}
          </div>
          <p className="text-sm font-medium text-black/75 dark:text-white/75">
            {getAutomationModeLabel(automation)}
          </p>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">
            {getAutomationStatusLabel(automation)}
          </p>
        </div>

        <div className="mt-5 rounded-2xl bg-light-primary p-4 dark:bg-dark-primary">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
            <Clock size={14} />
            {t('automationsPage.scheduleAndNextRun')}
          </div>
          <p className="text-sm font-medium text-black/75 dark:text-white/75">
            {getAutomationScheduleLabel(automation, t)}
          </p>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">
            {t('automationsPage.next')}: {getNextRunLabel(automation, t)}
          </p>
        </div>

          <div className="mt-5 rounded-2xl bg-light-primary p-4 dark:bg-dark-primary">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
              <Clock size={14} />
              {t('automationsPage.schedule')}
            </div>

            <p className="text-sm text-black/75 dark:text-white/75">
              {automation.frequency}
            </p>
          </div>

          <div className="mt-5 rounded-2xl bg-light-primary p-4 dark:bg-dark-primary">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
              <FileText size={14} />
              {t('automationsPage.outputDestination')}
            </div>

            <p className="text-sm font-medium text-black/75 dark:text-white/75">
              {getAutomationOutputType(automation)}
            </p>

            <p className="mt-1 text-sm text-black/55 dark:text-white/55">
              {t('automationsPage.saveTo')} {getAutomationOutputDestinationLabel(automation)}
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={() => onEdit(automation)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-light-200 px-5 py-2.5 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
            >
              <PencilLine size={16} />
              {automation.isCustom ? t('automationsPage.editSettings') : t('automationsPage.customizeTemplate')}
            </button>

            <button
              type="button"
              onClick={() => onDuplicate(automation)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-light-200 px-5 py-2.5 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
            >
              <Copy size={16} />
              {t('automationsPage.duplicate')}
            </button>

            <button
              type="button"
              onClick={() => onDelete(automation)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-500/20 px-5 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-500/10"
            >
              <Trash2 size={16} />
              {automation.isCustom ? t('automationsPage.delete') : t('automationsPage.removeTemplate')}
            </button>
          </div>
        </aside>
      </header>

      <section className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-light-primary dark:bg-dark-primary">
            <Workflow size={20} className="text-black dark:text-white" />
          </div>

          <h2 className="text-lg font-semibold text-black dark:text-white">
            {t('automationsPage.workflow')}
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-black/55 dark:text-white/55">
            {t('automationsPage.workflowDescription')}
          </p>
        </div>

        <div className="rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-light-primary dark:bg-dark-primary">
            <Repeat size={20} className="text-black dark:text-white" />
          </div>

          <h2 className="text-lg font-semibold text-black dark:text-white">
            {t('automationsPage.repeatable')}
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-black/55 dark:text-white/55">
            {t('automationsPage.repeatableDescription')}
          </p>
        </div>

        <div className="rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-light-primary dark:bg-dark-primary">
            <FileText size={20} className="text-black dark:text-white" />
          </div>

          <h2 className="text-lg font-semibold text-black dark:text-white">
            {t('automationsPage.output')}
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-black/55 dark:text-white/55">
            {t('automationsPage.outputDescription')}
          </p>
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40">
            {t('automationsPage.agentPrompt')}
          </p>

          <p className="text-base leading-relaxed text-black/75 dark:text-white/75">
            “{automation.prompt}”
          </p>
        </div>

        <div className="rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40">
            {t('automationsPage.expectedOutput')}
          </p>

          <p className="text-sm leading-relaxed text-black/65 dark:text-white/65">
            {automation.output}
          </p>
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40">
          {t('automationsPage.goodFor')}
        </p>

        <div className="flex flex-wrap gap-3">
          {automation.goodFor.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-2 rounded-full bg-light-primary px-4 py-2 text-sm text-black/65 dark:bg-dark-primary dark:text-white/65"
            >
              <CheckCircle2 size={15} />
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40">
              {t('automationsPage.savedOutputs')}
            </p>

            <h2 className="text-lg font-semibold text-black dark:text-white">
              {t('automationsPage.automationOutputs')}
            </h2>
          </div>

          <FileText size={20} className="text-black/35 dark:text-white/35" />
        </div>

        {outputs.length > 0 ? (
          <div className="space-y-3">
            {outputs.slice(0, 5).map((output) => (
              <a
                key={output.id}
                href={`/outputs/${output.id}`}
                className="block rounded-2xl bg-light-primary p-4 transition hover:scale-[1.01] dark:bg-dark-primary"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-black dark:text-white">
                      {output.title}
                    </p>

                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-black/35 dark:text-white/35">
                      {output.outputType} → {output.outputDestinationLabel}
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-light-secondary px-3 py-1 text-xs font-medium capitalize text-black/45 dark:bg-dark-secondary dark:text-white/45">
                    {output.status}
                  </span>
                </div>

                <p className="mt-3 line-clamp-2 text-sm text-black/55 dark:text-white/55">
                  {output.expectedOutput}
                </p>

                <p className="mt-3 text-xs text-black/40 dark:text-white/40">
                  {t('automationsPage.created')} {new Date(output.createdAt).toLocaleString()}
                </p>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-black/55 dark:text-white/55">
            {t('automationsPage.noOutputsYet')}
          </p>
        )}
      </section>

      <section className="mt-10 rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40">
              {t('automationsPage.runHistory')}
            </p>

            <h2 className="text-lg font-semibold text-black dark:text-white">
              {t('automationsPage.recentManualRuns')}
            </h2>
          </div>

          <History size={20} className="text-black/35 dark:text-white/35" />
        </div>

        {runHistory.length > 0 ? (
          <div className="space-y-3">
            {runHistory.slice(0, 5).map((run) => (
              <div
                key={run.id}
                className="rounded-2xl bg-light-primary p-4 dark:bg-dark-primary"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-black dark:text-white">
                    {t('automationsPage.manualRunStarted')}
                  </p>

                  <p className="text-xs text-black/45 dark:text-white/45">
                    {new Date(run.startedAt).toLocaleString()}
                  </p>
                </div>

                <p className="mt-2 text-xs font-medium uppercase tracking-wide text-black/35 dark:text-white/35">
                  {run.outputType ?? DEFAULT_OUTPUT_TYPE} →{' '}
                  {run.outputDestinationLabel ?? DEFAULT_OUTPUT_DESTINATION_LABEL}
                </p>

                <p className="mt-2 line-clamp-2 text-sm text-black/55 dark:text-white/55">
                  {run.expectedOutput}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-black/55 dark:text-white/55">
            {t('automationsPage.noRunsYet')}
          </p>
        )}
      </section>
    </div>
  );
};

const AutomationsPage = () => {
  const { t } = useI18n();

  const refreshAutomationStorageFromCache = () => {
    setCustomAutomations(readCustomAutomations());
    setHiddenTemplateIds(readHiddenTemplateIds());
    setRunHistory(readAutomationRunHistory());
    setAutomationOutputs(readAutomationOutputs());
  };

  useEffect(() => {
    const automationStorageChangedEvent = getAutomationStorageChangedEventName();

    const hydrateAutomationStorage = async () => {
      try {
        await pullAutomationStorageFromDatabase();
      } catch (err) {
        console.warn('Could not hydrate automation storage from database:', err);
      } finally {
        refreshAutomationStorageFromCache();
      }
    };

    hydrateAutomationStorage();

    window.addEventListener(
      automationStorageChangedEvent,
      refreshAutomationStorageFromCache,
    );
    window.addEventListener('focus', refreshAutomationStorageFromCache);

    return () => {
      window.removeEventListener(
        automationStorageChangedEvent,
        refreshAutomationStorageFromCache,
      );
      window.removeEventListener('focus', refreshAutomationStorageFromCache);
    };
  }, []);

  const [selectedAutomationId, setSelectedAutomationId] = useState<
    string | undefined
  >(undefined);
  const [customAutomations, setCustomAutomations] = useState<
    StoredAutomation[]
  >([]);
  const [spaces, setSpaces] = useState<AutomationSpace[]>([]);
  const [hiddenTemplateIds, setHiddenTemplateIds] = useState<string[]>([]);
  const [runHistory, setRunHistory] = useState<AutomationRunHistoryItem[]>([]);
  const [automationOutputs, setAutomationOutputs] = useState<
    AutomationOutputItem[]
  >([]);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] =
    useState<StoredAutomation | null>(null);

  const customTemplates = useMemo(() => {
    return customAutomations.map(toAutomationTemplate);
  }, [customAutomations]);

  const visibleTemplates = useMemo(() => {
    return AUTOMATIONS.filter(
      (automation) => !hiddenTemplateIds.includes(automation.id),
    );
  }, [hiddenTemplateIds]);

  const allAutomations = useMemo(() => {
    const customByName = new Map<string, AutomationTemplate>();

    customAutomations
      .map(toAutomationTemplate)
      .sort((a, b) => {
        const aCreatedAt =
          typeof (a as { createdAt?: unknown }).createdAt === 'string'
            ? ((a as unknown) as { createdAt: string }).createdAt
            : '';
        const bCreatedAt =
          typeof (b as { createdAt?: unknown }).createdAt === 'string'
            ? ((b as unknown) as { createdAt: string }).createdAt
            : '';

        return bCreatedAt.localeCompare(aCreatedAt);
      })
      .forEach((automation) => {
        const key = automation.name
          .replace(/\s+Copy$/i, '')
          .replace(/\s+Custom$/i, '')
          .trim()
          .toLowerCase();

        if (!customByName.has(key)) {
          customByName.set(key, automation);
        }
      });

    const customTemplates = Array.from(customByName.values());

    const customizedTemplateKeys = new Set(
      customTemplates.map((automation) =>
        automation.name
          .replace(/\s+Copy$/i, '')
          .replace(/\s+Custom$/i, '')
          .trim()
          .toLowerCase(),
      ),
    );

    const visibleTemplates = AUTOMATIONS.filter((automation) => {
      if (hiddenTemplateIds.includes(automation.id)) return false;

      const templateKey = automation.name.trim().toLowerCase();

      return !customizedTemplateKeys.has(templateKey);
    });

    return [...customTemplates, ...visibleTemplates];
  }, [customAutomations, hiddenTemplateIds]);

  useEffect(() => {
    setCustomAutomations(readCustomAutomations());
    setHiddenTemplateIds(readHiddenTemplateIds());
    setRunHistory(readAutomationRunHistory());
    setAutomationOutputs(readAutomationOutputs());
    setSelectedAutomationId(getAutomationFromUrl());

    fetch('/api/spaces')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setSpaces(Array.isArray(data) ? data : []);
      })
      .catch(() => setSpaces([]));

    const handlePopState = () => {
      setSelectedAutomationId(getAutomationFromUrl());
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const selectedAutomation = selectedAutomationId
    ? allAutomations.find((automation) => automation.id === selectedAutomationId)
    : undefined;

  const selectAutomation = (id: string) => {
    const url = new URL(window.location.href);
    url.pathname = '/tasks';
    url.searchParams.set('automation', id);

    window.history.pushState({}, '', url.toString());
    setSelectedAutomationId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const createSpaceForAutomation = async (
    name: string,
  ): Promise<AutomationSpace | null> => {
    const cleanName = name.trim();

    if (!cleanName) return null;

    try {
      const res = await fetch('/api/spaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: cleanName,
          description: t('automationsPage.automationOutputs'),
        }),
      });

      if (!res.ok) {
        throw new Error('Could not create Space.');
      }

      const data = await res.json();
      const createdSpace = data?.space ?? data;

      if (
        !createdSpace ||
        typeof createdSpace.id !== 'string' ||
        typeof createdSpace.name !== 'string'
      ) {
        throw new Error('Invalid Space response.');
      }

      setSpaces((current) => {
        const exists = current.some((space) => space.id === createdSpace.id);

        if (exists) return current;

        return [createdSpace, ...current];
      });

      return createdSpace;
    } catch (error) {
      console.error('Failed to create Space from automation:', error);
      window.alert(t('automationsPage.couldNotCreateSpace'));
      return null;
    }
  };

  const saveAutomation = (automation: StoredAutomation) => {
    automation = normalizeStoredAutomationForRuntime(automation);
    setCustomAutomations((current) => {
      const exists = current.some((item) => item.id === automation.id);
      const next = exists
        ? current.map((item) => (item.id === automation.id ? automation : item))
        : [automation, ...current];

      writeCustomAutomations(next);
      return next;
    });

    setIsBuilderOpen(false);
    setEditingAutomation(null);

    const url = new URL(window.location.href);
    url.pathname = '/tasks';
    url.searchParams.set('automation', automation.id);

    window.history.pushState({}, '', url.toString());
    setSelectedAutomationId(automation.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const backToAutomations = () => {
    const url = new URL(window.location.href);
    url.pathname = '/tasks';
    url.search = '';

    window.history.pushState({}, '', url.toString());
    setSelectedAutomationId(undefined);
    setEditingAutomation(null);
    setIsBuilderOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const editAutomation = (automation: AutomationTemplate) => {
    const automationToEdit: StoredAutomation | undefined = automation.isCustom
      ? customAutomations.find((item) => item.id === automation.id)
      : {
          id: `custom-${Date.now()}`,
          name: `${automation.name} ${t('automationsPage.customSuffix')}`,
          category: automation.category,
          purpose: automation.purpose,
          frequency: automation.frequency,
          mode: getAutomationMode(automation),
          status: getAutomationStatus(automation),
          scheduleType: getAutomationScheduleType(automation),
          scheduleTime: automation.scheduleTime ?? '09:00',
          scheduleDays: automation.scheduleDays ?? ['MO'],
          scheduleDayOfMonth: automation.scheduleDayOfMonth ?? 1,
          nextRunAt: automation.nextRunAt,
          lastRunAt: automation.lastRunAt,
          prompt: automation.prompt,
          output: automation.output,
          outputType: getAutomationOutputType(automation),
          outputDestination: getAutomationOutputDestination(automation),
          outputDestinationLabel: getAutomationOutputDestinationLabel(automation),
          goodFor: automation.goodFor,
          createdAt: new Date().toISOString(),
        };

    if (!automationToEdit) return;

    const url = new URL(window.location.href);
    url.pathname = '/tasks';
    url.search = '';

    window.history.pushState({}, '', url.toString());
    setSelectedAutomationId(undefined);
    setEditingAutomation(automationToEdit);
    setIsBuilderOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cleanDuplicateAutomations = () => {
    const newestByKey = new Map<string, StoredAutomation>();

    [...customAutomations]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .forEach((automation) => {
        const key = getAutomationDisplayKey(automation.name);

        if (!newestByKey.has(key)) {
          newestByKey.set(key, automation);
        }
      });

    const cleanedAutomations = Array.from(newestByKey.values());
    const removedCount = customAutomations.length - cleanedAutomations.length;

    if (removedCount <= 0) {
      window.alert(t('automationsPage.noDuplicatesFound'));
      return;
    }

    const confirmed = window.confirm(
      `${t('automationsPage.cleanDuplicateConfirmPrefix')} ${removedCount} ${
        removedCount > 1
          ? t('automationsPage.duplicateAutomationPlural')
          : t('automationsPage.duplicateAutomationSingular')
      }? ${t('automationsPage.cleanDuplicateConfirmSuffix')}`,
    );

    if (!confirmed) return;

    setCustomAutomations(cleanedAutomations);
    writeCustomAutomations(cleanedAutomations);

    const selectedStillExists =
      selectedAutomationId &&
      cleanedAutomations.some((automation) => automation.id === selectedAutomationId);

    if (selectedAutomationId && !selectedStillExists) {
      setSelectedAutomationId(undefined);

      const url = new URL(window.location.href);
      url.pathname = '/tasks';
      url.search = '';
      window.history.pushState({}, '', url.toString());
    }

    window.alert(
      `${t('automationsPage.cleaned')} ${removedCount} ${
        removedCount > 1
          ? t('automationsPage.duplicateAutomationPlural')
          : t('automationsPage.duplicateAutomationSingular')
      }.`,
    );
  };

  const duplicateAutomation = (automation: AutomationTemplate) => {
    const duplicated: StoredAutomation = {
      id: `custom-${Date.now()}`,
      name: `${automation.name} ${t('automationsPage.copySuffix')}`,
      category: automation.category,
      purpose: automation.purpose,
      frequency: automation.frequency,
      prompt: automation.prompt,
      output: automation.output,
      outputType: getAutomationOutputType(automation),
      outputDestination: getAutomationOutputDestination(automation),
      outputDestinationLabel: getAutomationOutputDestinationLabel(automation),
      goodFor: automation.goodFor,
      mode: getAutomationMode(automation),
      status: getAutomationStatus(automation),
      scheduleType: getAutomationScheduleType(automation),
      scheduleTime: automation.scheduleTime ?? '09:00',
      scheduleDays: automation.scheduleDays ?? ['MO'],
      scheduleDayOfMonth: automation.scheduleDayOfMonth ?? 1,
      nextRunAt: automation.nextRunAt,
      lastRunAt: automation.lastRunAt,
      createdAt: new Date().toISOString(),
    };

    setCustomAutomations((current) => {
      const next = [duplicated, ...current];
      writeCustomAutomations(next);
      return next;
    });

    const url = new URL(window.location.href);
    url.pathname = '/tasks';
    url.searchParams.set('automation', duplicated.id);

    window.history.pushState({}, '', url.toString());
    setSelectedAutomationId(duplicated.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteAutomation = (automation: AutomationTemplate) => {
    if (automation.isCustom) {
      const confirmed = window.confirm(
        `${t('automationsPage.delete')} "${automation.name}"? ${t('automationsPage.deleteConfirmSuffix')}`,
      );

      if (!confirmed) return;

      setCustomAutomations((current) => {
        const next = current.filter((item) => item.id !== automation.id);
        writeCustomAutomations(next);
        return next;
      });
    } else {
      const confirmed = window.confirm(
        `${t('automationsPage.removeTemplateConfirmPrefix')} "${automation.name}" ${t('automationsPage.removeTemplateConfirmSuffix')}`,
      );

      if (!confirmed) return;

      setHiddenTemplateIds((current) => {
        const next = Array.from(new Set([...current, automation.id]));
        writeHiddenTemplateIds(next);
        return next;
      });
    }

    const url = new URL(window.location.href);
    url.pathname = '/tasks';
    url.search = '';

    window.history.pushState({}, '', url.toString());
    setSelectedAutomationId(undefined);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const restoreTemplates = () => {
    writeHiddenTemplateIds([]);
    setHiddenTemplateIds([]);
  };

  const runAutomation = (automation: AutomationTemplate) => {
    if (isAutomationPaused(automation)) {
      window.alert('This automation is paused. Resume it before running.');
      return;
    }
    const prompt = buildAutomationRunPrompt(automation);
    const timestamp = Date.now();
    const runId = `run-${timestamp}`;
    const outputId = `output-${timestamp}`;
    const outputType = getAutomationOutputType(automation);
    const outputDestination = getAutomationOutputDestination(automation);
    const outputDestinationLabel =
      getAutomationOutputDestinationLabel(automation);

    const output: AutomationOutputItem = {
      id: outputId,
      automationId: automation.id,
      automationName: automation.name,
      title: `${automation.name} — ${outputType}`,
      outputType,
      outputDestination,
      outputDestinationLabel,
      status: 'drafting',
      createdAt: new Date().toISOString(),
      runId,
      prompt,
      expectedOutput: automation.output,
      content: '',
    };

    const run: AutomationRunHistoryItem = {
      id: runId,
      automationId: automation.id,
      automationName: automation.name,
      startedAt: output.createdAt,
      mode: 'manual',
      status: 'started',
      prompt,
      expectedOutput: automation.output,
      outputType,
      outputDestination,
      outputDestinationLabel,
      outputId,
    };

    setAutomationOutputs((current) => {
      const next = [output, ...current];
      writeAutomationOutputs(next);
      return next;
    });

    setRunHistory((current) => {
      const next = [run, ...current];
      writeAutomationRunHistory(next);
      return next;
    });

    window.location.href = `/search?mode=agent&outputId=${encodeURIComponent(
      outputId,
    )}&q=${encodeURIComponent(prompt)}`;
  };

  if (selectedAutomation) {
    return (
      <AutomationDetail
        automation={selectedAutomation}
        runHistory={runHistory.filter(
          (run) => run.automationId === selectedAutomation.id,
        )}
        outputs={automationOutputs.filter(
          (output) => output.automationId === selectedAutomation.id,
        )}
        onBack={backToAutomations}
        onRunAutomation={runAutomation}
        onEdit={editAutomation}
        onDuplicate={duplicateAutomation}
        onDelete={deleteAutomation}
      />
    );
  }

  return (
    <AutomationsList
      automations={allAutomations}
      customCount={customAutomations.length}
      hiddenTemplateCount={hiddenTemplateIds.length}
      isBuilderOpen={isBuilderOpen}
      editingAutomation={editingAutomation}
      spaces={spaces}
      onOpenBuilder={() => {
        setEditingAutomation(null);
        setIsBuilderOpen(true);
      }}
      onCloseBuilder={() => {
        setEditingAutomation(null);
        setIsBuilderOpen(false);
      }}
      onSaveAutomation={saveAutomation}
      onCleanDuplicateAutomations={cleanDuplicateAutomations}
      onCreateSpace={createSpaceForAutomation}
      onRestoreTemplates={restoreTemplates}
      onSelect={selectAutomation}
    />
  );
};

export default AutomationsPage;
