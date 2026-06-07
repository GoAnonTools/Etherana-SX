'use client';

import {
  Copy,
  Download,
  LayoutTemplate,
  Loader2,
  PencilLine,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SMALL_APP_TEMPLATES,
  type SmallAppTemplate,
} from '@/lib/apps/catalog';
import {
  type AutomationOutputItem,
  getAutomationStorageChangedEventName,
  readAutomationOutputs,
} from '@/lib/vault/localVault';
import { useI18n } from '@/lib/i18n/useI18n';
import {
  SMALL_APP_CATEGORIES,
  getExportFilename,
  mapCustomAppToTemplate,
  normalizeSmallAppCategory,
  unwrapImportedCustomApp,
} from './helpers';
import type {
  AppCatalogItem,
  CustomAppRecord,
} from './types';

import { AppCard } from './AppCard';
import { CustomAppBuilder } from './CustomAppBuilder';
import { AppRunner } from './AppRunner';
import { renderSafePrintableMarkdown } from './printableMarkdown';

export default function AppsPage() {
  const { t } = useI18n();
  const [selectedApp, setSelectedApp] = useState<AppCatalogItem | null>(null);
  const [customApps, setCustomApps] = useState<CustomAppRecord[]>([]);
  const [customAppsError, setCustomAppsError] = useState('');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingCustomApp, setEditingCustomApp] =
    useState<CustomAppRecord | null>(null);
  const [deletingCustomAppId, setDeletingCustomAppId] = useState('');
  const [duplicatingCustomAppId, setDuplicatingCustomAppId] = useState('');
  const [isImportingCustomApp, setIsImportingCustomApp] = useState(false);
  const importCustomAppInputRef = useRef<HTMLInputElement | null>(null);

  const [appOutputs, setAppOutputs] = useState<AutomationOutputItem[]>([]);

  const refreshCustomApps = useCallback(async () => {
    try {
      const res = await fetch('/api/apps/custom');

      if (!res.ok) {
        throw new Error('Failed to load custom apps.');
      }

      const data = await res.json();

      setCustomApps(Array.isArray(data) ? data : []);
      setCustomAppsError('');
    } catch (err) {
      console.error('Failed to fetch custom apps:', err);
      setCustomAppsError('Custom apps could not be loaded.');
    }
  }, []);

  useEffect(() => {
    refreshCustomApps();
  }, [refreshCustomApps]);

  const openCreateCustomApp = () => {
    setEditingCustomApp(null);
    setIsBuilderOpen(true);
  };

  const openEditCustomApp = (app: CustomAppRecord) => {
    setEditingCustomApp(app);
    setIsBuilderOpen(true);
  };

  const closeCustomAppBuilder = () => {
    setEditingCustomApp(null);
    setIsBuilderOpen(false);
  };

  const handleCustomAppSaved = async () => {
    await refreshCustomApps();
    closeCustomAppBuilder();
  };

  const handleDuplicateCustomApp = async (app: CustomAppRecord) => {
    setDuplicatingCustomAppId(app.id);
    setCustomAppsError('');

    try {
      const res = await fetch('/api/apps/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${app.name} ${t('appsPage.copySuffix')}`,
          category: app.category,
          description: app.description,
          outputType: app.outputType,
          promptTemplate: app.promptTemplate,
          inputs: app.inputs,
          goodFor: app.goodFor,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.message || t('appsPage.couldNotDuplicateCustomApp'),
        );
      }

      await refreshCustomApps();
    } catch (err) {
      console.error('Failed to duplicate custom app:', err);
      setCustomAppsError(
        err instanceof Error
          ? err.message
          : t('appsPage.couldNotDuplicateCustomApp'),
      );
    } finally {
      setDuplicatingCustomAppId('');
    }
  };

  const handleExportCustomApp = (app: CustomAppRecord) => {
    const payload = {
      kind: 'etherana-sx-custom-app',
      version: 1,
      exportedAt: new Date().toISOString(),
      app: {
        name: app.name,
        category: app.category,
        description: app.description,
        outputType: app.outputType,
        promptTemplate: app.promptTemplate,
        inputs: app.inputs,
        goodFor: app.goodFor,
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = getExportFilename(app.name);
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  const handleImportCustomAppFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) {
      return;
    }

    setIsImportingCustomApp(true);
    setCustomAppsError('');

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const payload = unwrapImportedCustomApp(parsed);

      const res = await fetch('/api/apps/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || t('appsPage.couldNotImportCustomApp'));
      }

      await refreshCustomApps();
    } catch (err) {
      console.error('Failed to import custom app:', err);
      setCustomAppsError(
        err instanceof SyntaxError
          ? t('appsPage.invalidCustomAppJson')
          : err instanceof Error
            ? err.message
            : t('appsPage.couldNotImportCustomApp'),
      );
    } finally {
      setIsImportingCustomApp(false);
    }
  };

  const handleDeleteCustomApp = async (app: CustomAppRecord) => {
    if (
      !window.confirm(
        `${t('appsPage.deleteCustomAppConfirmPrefix')} "${app.name}"? ${t(
          'appsPage.deleteCustomAppConfirmSuffix',
        )}`,
      )
    ) {
      return;
    }

    setDeletingCustomAppId(app.id);
    setCustomAppsError('');

    try {
      const res = await fetch(
        `/api/apps/custom?id=${encodeURIComponent(app.id)}`,
        {
          method: 'DELETE',
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || t('appsPage.couldNotDeleteCustomApp'));
      }

      if (editingCustomApp?.id === app.id) {
        closeCustomAppBuilder();
      }

      await refreshCustomApps();
    } catch (err) {
      console.error('Failed to delete custom app:', err);
      setCustomAppsError(
        err instanceof Error ? err.message : t('appsPage.couldNotDeleteCustomApp'),
      );
    } finally {
      setDeletingCustomAppId('');
    }
  };

  const customCatalogApps = useMemo(
    () => customApps.map(mapCustomAppToTemplate),
    [customApps],
  );

  const builtInCatalogApps = useMemo(
    () => SMALL_APP_TEMPLATES as AppCatalogItem[],
    [],
  );

  const totalAppCount = customCatalogApps.length + builtInCatalogApps.length;

  useEffect(() => {
    const refreshAppOutputs = () => {
      setAppOutputs(
        readAutomationOutputs()
          .filter((output) => output.automationId.startsWith('app:'))
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime(),
          ),
      );
    };

    refreshAppOutputs();

    const eventName = getAutomationStorageChangedEventName();

    window.addEventListener(eventName, refreshAppOutputs);
    window.addEventListener('focus', refreshAppOutputs);

    return () => {
      window.removeEventListener(eventName, refreshAppOutputs);
      window.removeEventListener('focus', refreshAppOutputs);
    };
  }, [selectedApp]);

  if (selectedApp) {
    return <AppRunner app={selectedApp} onBack={() => setSelectedApp(null)} />;
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
      <header className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-light-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-black/45 dark:border-dark-200 dark:text-white/45">
            <Sparkles size={14} />
            {t('appsPage.smallApps')}
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white md:text-5xl">
            {t('appsPage.title')}
          </h1>

          <p className="mt-4 text-base leading-relaxed text-black/60 dark:text-white/60 md:text-lg">
            {t('appsPage.subtitle')}

          </p>
        </div>

        <button
          type="button"
          onClick={openCreateCustomApp}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] dark:bg-white dark:text-black"
        >
          <Plus size={16} />
          {t('appsPage.createCustomApp')}
        </button>
      </header>

      {isBuilderOpen && (
        <CustomAppBuilder
          initialApp={editingCustomApp}
          onCancel={closeCustomAppBuilder}
          onSaved={handleCustomAppSaved}
        />
      )}

      <section className="mb-10 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-light-200 bg-light-secondary p-5 dark:border-dark-200 dark:bg-dark-secondary">
          <p className="text-sm font-semibold text-black dark:text-white">
            Open
          </p>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">
            {t('appsPage.chooseReusableMiniTool')}
          </p>
        </div>

        <div className="rounded-3xl border border-light-200 bg-light-secondary p-5 dark:border-dark-200 dark:bg-dark-secondary">
          <p className="text-sm font-semibold text-black dark:text-white">
            Fill
          </p>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">
            Add the inputs the app needs.
          </p>
        </div>

        <div className="rounded-3xl border border-light-200 bg-light-secondary p-5 dark:border-dark-200 dark:bg-dark-secondary">
          <p className="text-sm font-semibold text-black dark:text-white">
            Produce
          </p>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">
            {t('appsPage.generateReusableOutput')}
          </p>
        </div>
      </section>

      <section className="mb-8 flex flex-wrap items-center gap-3 text-sm text-black/45 dark:text-white/45">
        <span className="inline-flex items-center gap-2">
          <LayoutTemplate size={16} />
          {totalAppCount} {t('appsPage.appTemplates')}
        </span>
      </section>

      <section className="mb-8 rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-black dark:text-white">
              {t('appsPage.yourCustomApps')}
            </h2>
            <p className="mt-1 text-sm text-black/55 dark:text-white/55">
              {customApps.length > 0
                ? t('appsPage.yourCustomAppsDescription')
                : t('appsPage.noCustomAppsDescription')}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              ref={importCustomAppInputRef}
              type="file"
              accept="application/json,.json,.etherana-app.json"
              className="hidden"
              onChange={handleImportCustomAppFile}
            />

            <button
              type="button"
              onClick={() => importCustomAppInputRef.current?.click()}
              disabled={isImportingCustomApp}
              title={t('appsPage.importCustomAppHelp')}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-light-200 px-4 py-2 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
            >
              {isImportingCustomApp ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Upload size={16} />
              )}
              {isImportingCustomApp
                ? t('appsPage.importing')
                : t('appsPage.importJson')}
            </button>

            <button
              type="button"
              onClick={openCreateCustomApp}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-light-200 px-4 py-2 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
            >
              <Plus size={16} />
              {customApps.length > 0
                ? t('appsPage.createCustomApp')
                : t('appsPage.createFirstCustomApp')}
            </button>
          </div>
        </div>

        {customApps.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-light-200 bg-light-primary p-6 text-center dark:border-dark-200 dark:bg-dark-primary">
            <LayoutTemplate
              size={28}
              className="mx-auto text-black/35 dark:text-white/35"
            />

            <h3 className="mt-3 text-lg font-semibold text-black dark:text-white">
              {t('appsPage.noCustomAppsTitle')}
            </h3>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-black/55 dark:text-white/55">
              {t('appsPage.noCustomAppsDescription')}
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={openCreateCustomApp}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.01] dark:bg-white dark:text-black"
              >
                <Plus size={16} />
                {t('appsPage.createFirstCustomApp')}
              </button>

              <button
                type="button"
                onClick={() => importCustomAppInputRef.current?.click()}
                disabled={isImportingCustomApp}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-light-200 px-5 py-2.5 text-sm font-semibold text-black/65 transition hover:bg-light-secondary hover:text-black disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-secondary dark:hover:text-white"
              >
                {isImportingCustomApp ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Upload size={16} />
                )}
                {isImportingCustomApp
                  ? t('appsPage.importing')
                  : t('appsPage.importJson')}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {customApps.map((app) => (
              <article
                key={app.id}
                className="rounded-2xl border border-light-200 bg-light-primary p-4 dark:border-dark-200 dark:bg-dark-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-black dark:text-white">
                      {app.name}
                    </p>
                    <p className="mt-1 text-xs text-black/45 dark:text-white/45">
                      {app.category} · {app.outputType}
                    </p>
                  </div>

                  <span className="rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-black/45 dark:bg-white/10 dark:text-white/45">
                    {t('appsPage.custom')}
                  </span>
                </div>

                <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-black/55 dark:text-white/55">
                  {app.description}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedApp(mapCustomAppToTemplate(app))}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-3 py-2 text-xs font-semibold text-white transition hover:scale-[1.01] dark:bg-white dark:text-black"
                  >
                    <Play size={14} />
                    {t('appsPage.open')}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDuplicateCustomApp(app)}
                    disabled={duplicatingCustomAppId === app.id}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-light-200 px-3 py-2 text-xs font-semibold text-black/65 transition hover:bg-light-secondary hover:text-black disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-secondary dark:hover:text-white"
                  >
                    {duplicatingCustomAppId === app.id ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <Copy size={14} />
                    )}
                    {duplicatingCustomAppId === app.id
                      ? t('appsPage.duplicating')
                      : t('appsPage.duplicate')}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportCustomApp(app)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-light-200 px-3 py-2 text-xs font-semibold text-black/65 transition hover:bg-light-secondary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-secondary dark:hover:text-white"
                  >
                    <Download size={14} />
                    {t('appsPage.exportJson')}
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditCustomApp(app)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-light-200 px-3 py-2 text-xs font-semibold text-black/65 transition hover:bg-light-secondary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-secondary dark:hover:text-white"
                  >
                    <PencilLine size={14} />
                    {t('appsPage.edit')}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteCustomApp(app)}
                    disabled={deletingCustomAppId === app.id}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingCustomAppId === app.id ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    {t('appsPage.delete')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {customAppsError && (
        <section className="mb-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">
          {customAppsError}
        </section>
      )}

      <section className="mb-5">
        <h2 className="text-xl font-semibold text-black dark:text-white">
          {t('appsPage.builtInTemplates')}
        </h2>
        <p className="mt-1 text-sm text-black/55 dark:text-white/55">
          {t('appsPage.builtInTemplatesDescription')}
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {builtInCatalogApps.map((app) => (
          <AppCard key={app.id} app={app} onSelect={setSelectedApp} />
        ))}
      </section>

      {appOutputs.length > 0 && (
        <section className="mt-10 mb-10 rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-black dark:text-white">
                {t('appsPage.recentOutputs')}
              </h2>
              <p className="mt-1 text-sm text-black/55 dark:text-white/55">
                {t('appsPage.recentOutputsDescription')}
              </p>
            </div>

            <Link
              href="/outputs?filter=apps"
              className="inline-flex items-center justify-center rounded-full border border-light-200 px-4 py-2 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
            >
              See all
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {appOutputs.slice(0, 3).map((output) => (
              <Link
                key={output.id}
                href={`/outputs/${output.id}`}
                className="rounded-2xl border border-light-200 bg-light-primary p-4 transition hover:-translate-y-0.5 hover:shadow-md dark:border-dark-200 dark:bg-dark-primary"
              >
                <p className="text-sm font-semibold text-black dark:text-white">
                  {output.title}
                </p>

                <p className="mt-1 text-xs text-black/45 dark:text-white/45">
                  {output.outputType} · {new Date(output.createdAt).toLocaleString()}
                </p>

                <article
                  className="mt-3 line-clamp-4 text-sm leading-relaxed text-black/55 dark:text-white/55 [&_blockquote]:border-l-2 [&_blockquote]:border-black/20 [&_blockquote]:pl-3 dark:[&_blockquote]:border-white/20 [&_em]:italic [&_h1]:mb-1 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:ml-4 [&_ol]:list-decimal [&_p]:mb-1 [&_strong]:font-semibold [&_ul]:ml-4 [&_ul]:list-disc"
                  dangerouslySetInnerHTML={{
                    __html: renderSafePrintableMarkdown(
                      output.content || output.expectedOutput,
                    ),
                  }}
                />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
