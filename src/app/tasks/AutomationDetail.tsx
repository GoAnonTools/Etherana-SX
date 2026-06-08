'use client';

import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  History,
  PencilLine,
  Play,
  Repeat,
  Sparkles,
  Trash2,
  Workflow,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/useI18n';
import { AutomationModeStatusPills } from './AutomationModeStatusPills';
import {
  DEFAULT_OUTPUT_DESTINATION_LABEL,
  DEFAULT_OUTPUT_TYPE,
  getAutomationMode,
  getAutomationModeLabel,
  getAutomationOutputDestination,
  getAutomationOutputDestinationLabel,
  getAutomationOutputType,
  getAutomationScheduleLabel,
  getAutomationStatus,
  getAutomationStatusLabel,
  getNextRunLabel,
} from './helpers';
import type {
  AutomationOutputItem,
  AutomationRunHistoryItem,
  AutomationTemplate,
} from './types';

export const AutomationDetail = ({
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
