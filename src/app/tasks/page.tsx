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
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  getAutomationStorageChangedEventName,
  pullAutomationStorageFromDatabase,
} from '@/lib/vault/localVault';
import { useI18n } from '@/lib/i18n/useI18n';
import {
  AUTOMATIONS,
  DEFAULT_OUTPUT_DESTINATION,
  DEFAULT_OUTPUT_DESTINATION_LABEL,
  DEFAULT_OUTPUT_TYPE,
  NEW_SPACE_DESTINATION,
  OUTPUT_TYPES,
  WEEKDAY_OPTIONS,
  buildAutomationRunPrompt,
  getAutomationDisplayKey,
  getAutomationFromUrl,
  getDefaultScheduleType,
  getAutomationMode,
  getAutomationModeLabel,
  getAutomationOutputDestination,
  getAutomationOutputDestinationLabel,
  getAutomationOutputType,
  getAutomationScheduleLabel,
  getAutomationScheduleType,
  getAutomationStatus,
  getAutomationStatusLabel,
  getNextRunLabel,
  isAutomationPaused,
  normalizeScheduleType,
  normalizeStoredAutomationForRuntime,
  readAutomationOutputs,
  readAutomationRunHistory,
  readCustomAutomations,
  readHiddenTemplateIds,
  toAutomationTemplate,
  writeAutomationOutputs,
  writeAutomationRunHistory,
  writeCustomAutomations,
  writeHiddenTemplateIds,
} from './helpers';
import { AutomationModeStatusPills } from './AutomationModeStatusPills';
import { AutomationCard } from './AutomationCard';
import { AutomationBuilder } from './AutomationBuilder';
import type {
  AutomationMode,
  AutomationOutputItem,
  AutomationRunHistoryItem,
  AutomationScheduleType,
  AutomationSpace,
  AutomationStatus,
  AutomationTemplate,
  StoredAutomation,
} from './types';


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
