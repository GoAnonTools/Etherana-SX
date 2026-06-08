'use client';

import { LayoutTemplate, Plus, Repeat, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n/useI18n';
import { AUTOMATIONS } from './helpers';
import { AutomationBuilder } from './AutomationBuilder';
import { AutomationCard } from './AutomationCard';
import type {
  AutomationSpace,
  AutomationTemplate,
  StoredAutomation,
} from './types';

export const AutomationsList = ({
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
