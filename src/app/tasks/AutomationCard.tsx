'use client';

import { ArrowRight, Clock, Zap } from 'lucide-react';
import { useI18n } from '@/lib/i18n/useI18n';
import { AutomationModeStatusPills } from './AutomationModeStatusPills';
import type { AutomationTemplate } from './types';

export const AutomationCard = ({
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
