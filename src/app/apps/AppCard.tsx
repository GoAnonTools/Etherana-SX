'use client';

import { useI18n } from '@/lib/i18n/useI18n';
import type { AppCatalogItem } from './types';

export const AppCard = ({
  app,
  onSelect,
}: {
  app: AppCatalogItem;
  onSelect: (app: AppCatalogItem) => void;
}) => {
  const { t } = useI18n();
  const Icon = app.icon;

  return (
    <button type="button" onClick={() => onSelect(app)} className="group h-full text-left">
      <article className="h-full rounded-3xl border border-light-200 bg-light-secondary p-6 shadow-sm transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg dark:border-dark-200 dark:bg-dark-secondary">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white dark:bg-white dark:text-black">
            <Icon size={22} />
          </div>

          <span className="rounded-full border border-light-200 px-3 py-1 text-xs font-medium text-black/55 dark:border-dark-200 dark:text-white/55">
            {app.isCustom ? 'Custom' : app.category}
          </span>
        </div>

        <h2 className="mt-5 text-xl font-semibold text-black dark:text-white">
          {app.name}
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-black/60 dark:text-white/60">
          {app.description}
        </p>

        <div className="mt-5 rounded-2xl bg-light-primary p-4 dark:bg-dark-primary">
          <p className="text-xs font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
            {t('appsPage.output')}
          </p>
          <p className="mt-1 text-sm text-black/75 dark:text-white/75">
            {app.outputType}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {app.goodFor.slice(0, 3).map((item) => (
            <span
              key={item}
              className="rounded-full bg-light-primary px-3 py-1 text-xs text-black/50 dark:bg-dark-primary dark:text-white/50"
            >
              {item}
            </span>
          ))}
        </div>
      </article>
    </button>
  );
};
