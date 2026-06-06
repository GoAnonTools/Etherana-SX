'use client';

import {
  CheckSquare,
  ExternalLink,
  FileText,
  Filter,
  Square,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  type AutomationOutputItem,
  getAutomationStorageChangedEventName,
  readAutomationOutputs,
  writeAutomationOutputs,
} from '@/lib/vault/localVault';
import { useI18n } from '@/lib/i18n/useI18n';
import type { TranslationKey } from '@/lib/i18n/dictionaries';

type OutputFilter = 'all' | 'apps' | 'automations' | 'spaces';

const stripMarkdown = (value: string) => {
  return value
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*]\s+/gm, '• ')
    .trim();
};

const getOutputKind = (output: AutomationOutputItem) => {
  if (output.automationId.startsWith('app:')) return 'apps';
  if (output.outputDestination?.startsWith('space:')) return 'spaces';
  return 'automations';
};

const getOutputSourceLabelKey = (output: AutomationOutputItem): TranslationKey => {
  if (output.automationId.startsWith('app:')) return 'outputsPage.app';
  return 'outputsPage.automation';
};

const getOutputLocationLabel = (
  output: AutomationOutputItem,
  generalOutputsLabel: string,
) => {
  if (output.outputDestination?.startsWith('space:')) {
    return output.outputDestinationLabel || generalOutputsLabel;
  }

  return generalOutputsLabel;
};

const getOutputSourceName = (
  output: AutomationOutputItem,
  unknownSourceLabel: string,
) => {
  return output.automationName || unknownSourceLabel;
};

const filterOptions: Array<{
  value: OutputFilter;
  labelKey: TranslationKey;
}> = [
  { value: 'all', labelKey: 'outputsPage.all' },
  { value: 'apps', labelKey: 'outputsPage.apps' },
  { value: 'automations', labelKey: 'outputsPage.automations' },
  { value: 'spaces', labelKey: 'outputsPage.spaces' },
];

const isOutputFilter = (value: string | null): value is OutputFilter => {
  return (
    value === 'all' ||
    value === 'apps' ||
    value === 'automations' ||
    value === 'spaces'
  );
};

const getOutputs = () => {
  return readAutomationOutputs().sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

export default function OutputsPage() {
  const { t } = useI18n();
  const [outputs, setOutputs] = useState<AutomationOutputItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<OutputFilter>('all');

  const filteredOutputs = useMemo(() => {
    if (activeFilter === 'all') return outputs;

    return outputs.filter((output) => getOutputKind(output) === activeFilter);
  }, [activeFilter, outputs]);

  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedCount = selectedIds.length;
  const allSelected =
    filteredOutputs.length > 0 &&
    filteredOutputs.every((output) => selectedIdsSet.has(output.id));

  const counts = useMemo(() => {
    return outputs.reduce(
      (acc, output) => {
        const kind = getOutputKind(output);

        acc.all += 1;
        acc[kind] += 1;

        return acc;
      },
      {
        all: 0,
        apps: 0,
        automations: 0,
        spaces: 0,
      },
    );
  }, [outputs]);

  const refreshOutputs = () => {
    setOutputs(getOutputs());
  };

  useEffect(() => {
    const filterFromUrl = new URLSearchParams(window.location.search).get('filter');

    if (isOutputFilter(filterFromUrl)) {
      setActiveFilter(filterFromUrl);
    }
  }, []);

  useEffect(() => {
    refreshOutputs();

    const eventName = getAutomationStorageChangedEventName();

    window.addEventListener(eventName, refreshOutputs);
    window.addEventListener('focus', refreshOutputs);

    return () => {
      window.removeEventListener(eventName, refreshOutputs);
      window.removeEventListener('focus', refreshOutputs);
    };
  }, []);

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) => filteredOutputs.some((output) => output.id === id)),
    );
  }, [filteredOutputs]);

  const toggleOutputSelection = (outputId: string) => {
    setSelectedIds((current) =>
      current.includes(outputId)
        ? current.filter((id) => id !== outputId)
        : [...current, outputId],
    );
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      const visibleIds = new Set(filteredOutputs.map((output) => output.id));

      setSelectedIds((current) =>
        current.filter((id) => !visibleIds.has(id)),
      );
      return;
    }

    setSelectedIds((current) =>
      Array.from(
        new Set([...current, ...filteredOutputs.map((output) => output.id)]),
      ),
    );
  };

  const deleteSelected = () => {
    if (selectedIds.length === 0) return;

    const confirmed = window.confirm(
      `${t('outputsPage.deleteSelected')} ${selectedIds.length} ${
        selectedIds.length > 1
          ? t('outputsPage.outputPlural')
          : t('outputsPage.outputSingular')
      }? ${t('outputsPage.deleteConfirm')}`,
    );

    if (!confirmed) return;

    const selected = new Set(selectedIds);
    const nextOutputs = readAutomationOutputs().filter(
      (output) => !selected.has(output.id),
    );

    writeAutomationOutputs(nextOutputs);
    setOutputs(getOutputs());
    setSelectedIds([]);
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
      <header className="mb-8 flex flex-col gap-5 rounded-3xl border border-light-200 bg-light-secondary p-7 dark:border-dark-200 dark:bg-dark-secondary lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-light-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-black/45 dark:border-dark-200 dark:text-white/45">
            <FileText size={14} />
            {t('outputsPage.outputLibrary')}
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white md:text-5xl">
            {t('outputsPage.title')}
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-black/60 dark:text-white/60 md:text-base">
            {t('outputsPage.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {filteredOutputs.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAll}
              className="inline-flex items-center gap-2 rounded-full border border-light-200 px-4 py-2 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
            >
              {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
              {allSelected ? t('outputsPage.deselectAll') : t('outputsPage.selectAll')}
            </button>
          )}

          <button
            type="button"
            onClick={deleteSelected}
            disabled={selectedCount === 0}
            className="inline-flex items-center gap-2 rounded-full border border-red-500/20 px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 size={16} />
            {t('outputsPage.deleteSelected')}
          </button>
        </div>
      </header>

      <section className="mb-6 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-black/45 dark:text-white/45">
          <Filter size={16} />
          {t('outputsPage.filter')}
        </span>

        {filterOptions.map((option) => {
          const active = activeFilter === option.value;
          const count = counts[option.value];

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setActiveFilter(option.value)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                active
                  ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                  : 'border-light-200 text-black/55 hover:bg-light-secondary hover:text-black dark:border-dark-200 dark:text-white/55 dark:hover:bg-dark-secondary dark:hover:text-white'
              }`}
            >
              {t(option.labelKey)} · {count}
            </button>
          );
        })}
      </section>

      {selectedCount > 0 && (
        <div className="mb-5 rounded-2xl border border-light-200 bg-light-secondary px-5 py-3 text-sm text-black/60 dark:border-dark-200 dark:bg-dark-secondary dark:text-white/60">
          {selectedCount}{' '}
          {selectedCount === 1
            ? t('outputsPage.outputSingular')
            : t('outputsPage.outputPlural')}{' '}
          {t('outputsPage.selected')}
        </div>
      )}

      {filteredOutputs.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-light-200 bg-light-secondary p-10 text-center dark:border-dark-200 dark:bg-dark-secondary">
          <h2 className="text-xl font-semibold text-black dark:text-white">
            {t('outputsPage.noOutputsFound')}
          </h2>

          <p className="mt-2 text-sm text-black/55 dark:text-white/55">
            {t('outputsPage.emptyDescription')}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/apps"
              className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] dark:bg-white dark:text-black"
            >
              {t('outputsPage.openApps')}
            </Link>

            <Link
              href="/tasks"
              className="inline-flex items-center justify-center rounded-full border border-light-200 px-5 py-3 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
            >
              {t('outputsPage.openAutomations')}
            </Link>
          </div>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredOutputs.map((output) => {
            const selected = selectedIdsSet.has(output.id);
            const preview = stripMarkdown(output.content || output.expectedOutput);
            const kind = getOutputKind(output);

            return (
              <article
                key={output.id}
                className={`rounded-3xl border bg-light-secondary p-5 transition dark:bg-dark-secondary ${
                  selected
                    ? 'border-black ring-2 ring-black/10 dark:border-white dark:ring-white/10'
                    : 'border-light-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-dark-200'
                }`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggleOutputSelection(output.id)}
                    className="mt-1 text-black/55 transition hover:text-black dark:text-white/55 dark:hover:text-white"
                    aria-label={selected ? t('outputsPage.unselectOutput') : t('outputsPage.selectOutput')}
                  >
                    {selected ? (
                      <CheckSquare size={19} />
                    ) : (
                      <Square size={19} />
                    )}
                  </button>

                  <Link
                    href={`/outputs/${output.id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-light-200 px-3 py-1 text-xs font-semibold text-black/55 transition hover:bg-light-primary hover:text-black dark:border-dark-200 dark:text-white/55 dark:hover:bg-dark-primary dark:hover:text-white"
                  >
                    {t('outputsPage.open')}
                    <ExternalLink size={13} />
                  </Link>
                </div>

                <Link href={`/outputs/${output.id}`} className="block">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-light-primary px-3 py-1 text-xs font-semibold text-black/45 dark:bg-dark-primary dark:text-white/45">
                      {t(getOutputSourceLabelKey(output))}
                    </span>

                    <span className="rounded-full bg-light-primary px-3 py-1 text-xs font-semibold text-black/45 dark:bg-dark-primary dark:text-white/45">
                      {output.outputType}
                    </span>

                    {kind === 'spaces' && (
                      <span className="rounded-full bg-light-primary px-3 py-1 text-xs font-semibold text-black/45 dark:bg-dark-primary dark:text-white/45">
                        {t('outputsPage.space')}
                      </span>
                    )}
                  </div>

                  <h2 className="line-clamp-2 text-lg font-semibold text-black dark:text-white">
                    {output.title}
                  </h2>

                  <div className="mt-3 space-y-1 rounded-2xl bg-light-primary p-3 text-xs text-black/50 dark:bg-dark-primary dark:text-white/50">
                    <p>
                      <span className="font-semibold text-black/65 dark:text-white/65">
                        {t('outputsPage.from')}
                      </span>{' '}
                      {getOutputSourceName(output, t('outputsPage.unknownSource'))}
                    </p>

                    <p>
                      <span className="font-semibold text-black/65 dark:text-white/65">
                        {t('outputsPage.location')}
                      </span>{' '}
                      {getOutputLocationLabel(output, t('outputsPage.generalOutputs'))}
                    </p>

                    <p>
                      <span className="font-semibold text-black/65 dark:text-white/65">
                        {t('outputsPage.created')}
                      </span>{' '}
                      {new Date(output.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <p className="mt-4 line-clamp-5 text-sm leading-relaxed text-black/55 dark:text-white/55">
                    {preview}
                  </p>
                </Link>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
