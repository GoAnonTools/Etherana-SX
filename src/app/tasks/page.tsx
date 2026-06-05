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
  createdAt: string;
}

interface AutomationRunHistoryItem {
  id: string;
  automationId: string;
  automationName: string;
  startedAt: string;
  mode: 'manual';
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


const AUTOMATIONS: AutomationTemplate[] = [
  {
    id: 'daily-priorities',
    name: 'Daily Priorities',
    icon: ClipboardList,
    category: 'Planning',
    purpose:
      'Start the day with a clear list of the highest-impact actions to focus on.',
    frequency: 'Every morning',
    prompt:
      'What are my top 3 high-impact priorities for today? Review my recent client work, operations, and active spaces before suggesting them.',
    output:
      'A short prioritized action plan with rationales and recommended next steps.',
    goodFor: ['Daily focus', 'Execution', 'Decision clarity'],
  },
  {
    id: 'weekly-planning',
    name: 'Weekly Planning',
    icon: Calendar,
    category: 'Planning',
    purpose:
      'Turn your goals, open work, and recent progress into a structured weekly roadmap.',
    frequency: 'Every Monday',
    prompt:
      'Plan my week. Review last week’s client work, sales goals, and open projects. What are the key milestones I should hit this week?',
    output:
      'A weekly roadmap with focus areas, priorities, and suggested execution order.',
    goodFor: ['Weekly planning', 'Prioritization', 'Roadmapping'],
  },
  {
    id: 'client-followups',
    name: 'Client Follow-ups',
    icon: Users,
    category: 'Clients',
    purpose:
      'Identify client conversations that need attention and prepare professional follow-ups.',
    frequency: 'Twice a week',
    prompt:
      'Review my client work. Who have I not heard from recently? Draft a short, professional follow-up message for each client who needs attention.',
    output:
      'A list of client follow-ups with ready-to-send message drafts.',
    goodFor: ['Client management', 'Follow-ups', 'Retention'],
  },
  {
    id: 'content-ideas',
    name: 'Content Ideas',
    icon: Lightbulb,
    category: 'Marketing',
    purpose:
      'Generate fresh content ideas based on your current positioning, research, and business goals.',
    frequency: 'Every Wednesday',
    prompt:
      'Based on my recent research and marketing space, suggest 3 content pillars and 5 specific content ideas for this week.',
    output:
      'Content pillars, post ideas, hooks, and short outlines.',
    goodFor: ['Marketing', 'Content strategy', 'Audience growth'],
  },
  {
    id: 'sales-checkins',
    name: 'Sales Check-ins',
    icon: DollarSign,
    category: 'Sales',
    purpose:
      'Review your pipeline, detect stalled leads, and suggest ways to move deals forward.',
    frequency: 'Every Friday',
    prompt:
      'Review my Sales space. Which leads are stuck, cold, or unclear? Give me a strategy to move each one to the next stage or re-engage them.',
    output:
      'A sales pipeline status report with recommended follow-up actions.',
    goodFor: ['Sales pipeline', 'Lead follow-up', 'Revenue focus'],
  },
  {
    id: 'business-review',
    name: 'Business Review',
    icon: TrendingUp,
    category: 'Strategy',
    purpose:
      'Review the health of your business and identify what is working, blocked, or worth changing.',
    frequency: 'Monthly',
    prompt:
      'Conduct a monthly business review. Compare my operations, sales, client work, and marketing activity from the last 30 days. What is working and what should I change?',
    output:
      'A business review with insights, risks, opportunities, and next-month priorities.',
    goodFor: ['Strategy', 'Performance review', 'Business decisions'],
  },
  {
    id: 'research-updates',
    name: 'Market Monitoring',
    icon: Search,
    category: 'Research',
    purpose:
      'Monitor industry trends, competitor moves, and market signals that could affect your roadmap.',
    frequency: 'Weekly',
    prompt:
      'Search for the latest important trends in my industry. Summarize what changed, why it matters, and how it should impact my roadmap.',
    output:
      'A market briefing with sources, implications, and recommended actions.',
    goodFor: ['Research', 'Competitor monitoring', 'Market awareness'],
  },
  {
    id: 'important-reminders',
    name: 'Important Reminders',
    icon: AlertCircle,
    category: 'Operations',
    purpose:
      'Surface upcoming administrative, legal, financial, or operational deadlines.',
    frequency: 'As needed',
    prompt:
      'Review my Operations space for upcoming administrative deadlines, renewals, invoices, taxes, or obligations in the next 14 days.',
    output:
      'A checklist of important reminders with deadlines and priority levels.',
    goodFor: ['Operations', 'Deadlines', 'Admin follow-up'],
  },
];

const getAutomationFromUrl = () => {
  if (typeof window === 'undefined') return undefined;

  const params = new URLSearchParams(window.location.search);
  return params.get('automation') ?? undefined;
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

Suggested frequency:
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
  const isEditing = Boolean(editingAutomation);

  const [name, setName] = useState(editingAutomation?.name ?? '');
  const [category, setCategory] = useState(
    editingAutomation?.category ?? 'Research',
  );
  const [frequency, setFrequency] = useState(
    editingAutomation?.frequency ?? 'Every Tuesday',
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

    onSave({
      id: editingAutomation?.id ?? `custom-${Date.now()}`,
      name: name.trim(),
      category: category.trim() || 'Custom',
      frequency: frequency.trim() || 'Manual',
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
    });
  };

  return (
    <section className="mb-10 rounded-3xl border border-light-200 bg-light-secondary p-6 shadow-sm dark:border-dark-200 dark:bg-dark-secondary">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-light-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-black/45 dark:border-dark-200 dark:text-white/45">
            {isEditing ? <PencilLine size={14} /> : <Plus size={14} />}
            {isEditing ? 'Edit Automation' : 'New Automation'}
          </div>

          <h2 className="text-2xl font-bold text-black dark:text-white">
            {isEditing
              ? 'Edit automation'
              : 'Create a custom automation'}
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-black/55 dark:text-white/55">
            {isEditing
              ? 'Update the workflow instructions, frequency, and expected output. If this started from a template, saving will create your own custom automation.'
              : 'Define what the agent should do, how often it should happen, and what kind of output you expect.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-full p-2 text-black/45 transition hover:bg-light-primary hover:text-black dark:text-white/45 dark:hover:bg-dark-primary dark:hover:text-white"
          aria-label="Close automation builder"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-black dark:text-white">
              Automation name
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
              Category
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
            Frequency
          </span>
          <input
            value={frequency}
            onChange={(event) => setFrequency(event.target.value)}
            placeholder="Every Tuesday, Every morning, Weekly..."
            className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-black dark:text-white">
            Objective
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
            Agent instructions
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
            Expected output
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
              Output type
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
              Save destination
            </span>
            <select
              value={outputDestination}
              onChange={(event) => setOutputDestination(event.target.value)}
              className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
            >
              <option value={DEFAULT_OUTPUT_DESTINATION}>
                Automation outputs
              </option>

              <option value={NEW_SPACE_DESTINATION}>
                Create new Space…
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
                placeholder="New Space name, e.g. AI Research"
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
            Cancel
          </button>

          <button
            type="submit"
            disabled={!canSave}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black"
          >
            <Save size={16} />
            {isEditing ? 'Save Changes' : 'Create Automation'}
          </button>
        </div>
      </form>
    </section>
  );
};

const AutomationCard = ({
  automation,
  onSelect,
}: {
  automation: AutomationTemplate;
  onSelect: (id: string) => void;
}) => {
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
                Custom
              </span>
            )}
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
              Suggested frequency
            </div>

            <p className="text-sm text-black/75 dark:text-white/75">
              {automation.frequency}
            </p>
          </div>

          <div className="rounded-2xl bg-light-primary p-4 dark:bg-dark-primary">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
              <Zap size={14} />
              Expected output
            </div>

            <p className="text-sm leading-relaxed text-black/75 dark:text-white/75">
              {automation.output}
            </p>
          </div>
        </div>

        <div className="relative mt-6 flex items-center justify-between gap-3">
          <p className="text-xs text-black/40 dark:text-white/40">
            Review, configure, then run manually.
          </p>

          <span className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition duration-200 group-hover:scale-[1.02] dark:bg-white dark:text-black">
            View Details
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
  onCreateSpace: (name: string) => Promise<AutomationSpace | null>;
  onRestoreTemplates: () => void;
  onSelect: (id: string) => void;
}) => {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
      <header className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-light-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-black/45 dark:border-dark-200 dark:text-white/45">
            <Sparkles size={14} />
            Automation
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white md:text-5xl">
            Automations
          </h1>

          <p className="mt-4 text-base leading-relaxed text-black/60 dark:text-white/60 md:text-lg">
            Repeatable AI workflows for planning, research, sales, clients,
            content, and operations. Start manually today, then turn them into
            scheduled automations later.
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
              Restore Templates
            </button>
          )}

          <button
            type="button"
            onClick={onOpenBuilder}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] active:scale-[0.99] dark:bg-white dark:text-black"
          >
            <Plus size={17} />
            New Automation
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
            Search
          </p>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">
            Ask once and get a fast answer.
          </p>
        </div>

        <div className="rounded-3xl border border-light-200 bg-light-secondary p-5 dark:border-dark-200 dark:bg-dark-secondary">
          <p className="text-sm font-semibold text-black dark:text-white">
            Space
          </p>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">
            Save knowledge and outputs in context.
          </p>
        </div>

        <div className="rounded-3xl border border-light-200 bg-light-secondary p-5 dark:border-dark-200 dark:bg-dark-secondary">
          <p className="text-sm font-semibold text-black dark:text-white">
            Automation
          </p>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">
            Repeat the workflow and generate recurring outputs.
          </p>
        </div>
      </section>

      <section className="mb-8 flex flex-wrap items-center gap-3 text-sm text-black/45 dark:text-white/45">
        <span className="inline-flex items-center gap-2">
          <LayoutTemplate size={16} />
          {AUTOMATIONS.length} templates
        </span>

        <span>•</span>

        <span>{customCount} custom automations</span>

        {hiddenTemplateCount > 0 && (
          <>
            <span>•</span>
            <span>{hiddenTemplateCount} hidden templates</span>
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
  const Icon = automation.icon;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-black/55 transition hover:text-black dark:text-white/55 dark:hover:text-white"
      >
        <ArrowLeft size={16} />
        Back to Automations
      </button>

      <header className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-light-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-black/45 dark:border-dark-200 dark:text-white/45">
            <Sparkles size={14} />
            {automation.category} Automation
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
                    Custom
                  </span>
                )}
              </div>

              <p className="mt-4 max-w-3xl text-base leading-relaxed text-black/60 dark:text-white/60 md:text-lg">
                {automation.purpose}
              </p>
            </div>
          </div>
        </div>

        <aside className="rounded-3xl border border-light-200 bg-light-secondary p-6 shadow-sm dark:border-dark-200 dark:bg-dark-secondary">
          <p className="text-sm font-semibold text-black dark:text-white">
            Manual run
          </p>

          <p className="mt-2 text-sm leading-relaxed text-black/55 dark:text-white/55">
            Start this workflow in Agent mode. The generated result can later be
            saved as a Space output.
          </p>

          <button
            type="button"
            onClick={() => onRunAutomation(automation)}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:scale-[1.01] active:scale-[0.99] dark:bg-white dark:text-black"
          >
            <Play size={16} />
            Run Automation
          </button>

          <div className="mt-5 rounded-2xl bg-light-primary p-4 dark:bg-dark-primary">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
              <Clock size={14} />
              Suggested frequency
            </div>

            <p className="text-sm text-black/75 dark:text-white/75">
              {automation.frequency}
            </p>
          </div>

          <div className="mt-5 rounded-2xl bg-light-primary p-4 dark:bg-dark-primary">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
              <FileText size={14} />
              Output destination
            </div>

            <p className="text-sm font-medium text-black/75 dark:text-white/75">
              {getAutomationOutputType(automation)}
            </p>

            <p className="mt-1 text-sm text-black/55 dark:text-white/55">
              Save to {getAutomationOutputDestinationLabel(automation)}
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={() => onEdit(automation)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-light-200 px-5 py-2.5 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
            >
              <PencilLine size={16} />
              {automation.isCustom ? 'Edit' : 'Edit Template'}
            </button>

            <button
              type="button"
              onClick={() => onDuplicate(automation)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-light-200 px-5 py-2.5 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
            >
              <Copy size={16} />
              Duplicate
            </button>

            <button
              type="button"
              onClick={() => onDelete(automation)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-500/20 px-5 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-500/10"
            >
              <Trash2 size={16} />
              {automation.isCustom ? 'Delete' : 'Remove Template'}
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
            1. Workflow
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-black/55 dark:text-white/55">
            The automation starts from a predefined business prompt and runs as
            a multi-step agent task.
          </p>
        </div>

        <div className="rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-light-primary dark:bg-dark-primary">
            <Repeat size={20} className="text-black dark:text-white" />
          </div>

          <h2 className="text-lg font-semibold text-black dark:text-white">
            2. Repeatable
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-black/55 dark:text-white/55">
            Today it runs manually. Later, this same template can become a
            scheduled automation with history.
          </p>
        </div>

        <div className="rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-light-primary dark:bg-dark-primary">
            <FileText size={20} className="text-black dark:text-white" />
          </div>

          <h2 className="text-lg font-semibold text-black dark:text-white">
            3. Output
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-black/55 dark:text-white/55">
            The expected result is a reusable deliverable, not just a chat
            answer.
          </p>
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40">
            Agent prompt
          </p>

          <p className="text-base leading-relaxed text-black/75 dark:text-white/75">
            “{automation.prompt}”
          </p>
        </div>

        <div className="rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40">
            Expected output
          </p>

          <p className="text-sm leading-relaxed text-black/65 dark:text-white/65">
            {automation.output}
          </p>
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40">
          Good for
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
              Saved outputs
            </p>

            <h2 className="text-lg font-semibold text-black dark:text-white">
              Automation outputs
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
                  Created {new Date(output.createdAt).toLocaleString()}
                </p>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-black/55 dark:text-white/55">
            No outputs yet. Run this automation to create the first output
            record.
          </p>
        )}
      </section>

      <section className="mt-10 rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40">
              Run history
            </p>

            <h2 className="text-lg font-semibold text-black dark:text-white">
              Recent manual runs
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
                    Manual run started
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
            No runs yet. Start this automation once to create the first history
            entry.
          </p>
        )}
      </section>
    </div>
  );
};

const AutomationsPage = () => {
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
    return [...visibleTemplates, ...customTemplates];
  }, [visibleTemplates, customTemplates]);

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
          description: 'Created from an automation output destination.',
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
      window.alert('Could not create the Space. Please try again.');
      return null;
    }
  };

  const saveAutomation = (automation: StoredAutomation) => {
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
          name: `${automation.name} Custom`,
          category: automation.category,
          purpose: automation.purpose,
          frequency: automation.frequency,
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

  const duplicateAutomation = (automation: AutomationTemplate) => {
    const duplicated: StoredAutomation = {
      id: `custom-${Date.now()}`,
      name: `${automation.name} Copy`,
      category: automation.category,
      purpose: automation.purpose,
      frequency: automation.frequency,
      prompt: automation.prompt,
      output: automation.output,
      outputType: getAutomationOutputType(automation),
      outputDestination: getAutomationOutputDestination(automation),
      outputDestinationLabel: getAutomationOutputDestinationLabel(automation),
      goodFor: automation.goodFor,
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
        `Delete "${automation.name}"? This cannot be undone.`,
      );

      if (!confirmed) return;

      setCustomAutomations((current) => {
        const next = current.filter((item) => item.id !== automation.id);
        writeCustomAutomations(next);
        return next;
      });
    } else {
      const confirmed = window.confirm(
        `Remove the "${automation.name}" template from your Automations grid? You can restore default templates later.`,
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
      onCreateSpace={createSpaceForAutomation}
      onRestoreTemplates={restoreTemplates}
      onSelect={selectAutomation}
    />
  );
};

export default AutomationsPage;
