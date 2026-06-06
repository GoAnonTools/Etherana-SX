'use client';

import {
  ArrowLeft,
  CheckSquare,
  ExternalLink,
  FileText,
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

const getAppOutputs = () => {
  return readAutomationOutputs()
    .filter((output) => output.automationId.startsWith('app:'))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
};

export default function AppOutputsPage() {
  const [outputs, setOutputs] = useState<AutomationOutputItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedCount = selectedIds.length;
  const allSelected = outputs.length > 0 && selectedCount === outputs.length;

  const refreshOutputs = () => {
    setOutputs(getAppOutputs());
  };

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

  const toggleOutputSelection = (outputId: string) => {
    setSelectedIds((current) =>
      current.includes(outputId)
        ? current.filter((id) => id !== outputId)
        : [...current, outputId],
    );
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : outputs.map((output) => output.id));
  };

  const deleteSelected = () => {
    if (selectedIds.length === 0) return;

    const confirmed = window.confirm(
      `Delete ${selectedIds.length} selected app output${
        selectedIds.length > 1 ? 's' : ''
      }? This cannot be undone.`,
    );

    if (!confirmed) return;

    const selected = new Set(selectedIds);
    const nextOutputs = readAutomationOutputs().filter(
      (output) => !selected.has(output.id),
    );

    writeAutomationOutputs(nextOutputs);
    setOutputs(getAppOutputs());
    setSelectedIds([]);
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
      <Link
        href="/apps"
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-black/55 transition hover:text-black dark:text-white/55 dark:hover:text-white"
      >
        <ArrowLeft size={16} />
        Back to Apps
      </Link>

      <header className="mb-8 flex flex-col gap-5 rounded-3xl border border-light-200 bg-light-secondary p-7 dark:border-dark-200 dark:bg-dark-secondary lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-light-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-black/45 dark:border-dark-200 dark:text-white/45">
            <FileText size={14} />
            Small App Outputs
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white md:text-5xl">
            App Outputs
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-black/60 dark:text-white/60 md:text-base">
            All saved outputs generated from your Small Apps.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {outputs.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAll}
              className="inline-flex items-center gap-2 rounded-full border border-light-200 px-4 py-2 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
            >
              {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          )}

          <button
            type="button"
            onClick={deleteSelected}
            disabled={selectedCount === 0}
            className="inline-flex items-center gap-2 rounded-full border border-red-500/20 px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 size={16} />
            Delete selected
          </button>
        </div>
      </header>

      {selectedCount > 0 && (
        <div className="mb-5 rounded-2xl border border-light-200 bg-light-secondary px-5 py-3 text-sm text-black/60 dark:border-dark-200 dark:bg-dark-secondary dark:text-white/60">
          {selectedCount} {selectedCount === 1 ? 'output' : 'outputs'} selected
        </div>
      )}

      {outputs.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-light-200 bg-light-secondary p-10 text-center dark:border-dark-200 dark:bg-dark-secondary">
          <h2 className="text-xl font-semibold text-black dark:text-white">
            No app outputs yet.
          </h2>

          <p className="mt-2 text-sm text-black/55 dark:text-white/55">
            Run a Small App and save the result to see it here.
          </p>

          <Link
            href="/apps"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] dark:bg-white dark:text-black"
          >
            Open Apps
          </Link>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {outputs.map((output) => {
            const selected = selectedIdsSet.has(output.id);
            const preview = stripMarkdown(output.content || output.expectedOutput);

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
                    aria-label={selected ? 'Unselect output' : 'Select output'}
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
                    Open
                    <ExternalLink size={13} />
                  </Link>
                </div>

                <Link href={`/outputs/${output.id}`} className="block">
                  <h2 className="line-clamp-2 text-lg font-semibold text-black dark:text-white">
                    {output.title}
                  </h2>

                  <p className="mt-2 text-xs text-black/45 dark:text-white/45">
                    {output.outputType} ·{' '}
                    {new Date(output.createdAt).toLocaleString()}
                  </p>

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
