'use client';

import {
  ArrowLeft,
  Copy,
  FileText,
  Loader2,
  PencilLine,
  Play,
  Save,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  type AutomationOutputItem,
  readAutomationOutputs,
  writeAutomationOutputs,
} from '@/lib/vault/localVault';
import { useI18n } from '@/lib/i18n/useI18n';
import {
  buildPromptFromTemplate,
  escapeHtml,
  renderSafePrintableMarkdown,
} from './printableMarkdown';
import type {
  AppCatalogItem,
  AppInputValues,
  AppSpace,
} from './types';

export const AppRunner = ({
  app,
  onBack,
}: {
  app: AppCatalogItem;
  onBack: () => void;
}) => {
  const { t } = useI18n();
  const Icon = app.icon;
  const [values, setValues] = useState<AppInputValues>({});
  const [preparedPrompt, setPreparedPrompt] = useState('');
  const [generatedOutput, setGeneratedOutput] = useState('');
  const [editDraft, setEditDraft] = useState('');
  const [isEditingOutput, setIsEditingOutput] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedOutputId, setSavedOutputId] = useState('');
  const [spaces, setSpaces] = useState<AppSpace[]>([]);
  const [outputDestination, setOutputDestination] = useState('automation');

  useEffect(() => {
    const fetchSpacesForApps = async () => {
      try {
        const res = await fetch('/api/spaces');

        if (!res.ok) return;

        const data = await res.json();

        setSpaces(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch Spaces for Apps:', err);
      }
    };

    fetchSpacesForApps();
  }, []);

  const canRun = useMemo(() => {
    return app.inputs.every((input) => {
      if (!input.required) return true;
      return values[input.id]?.trim().length > 0;
    });
  }, [app.inputs, values]);

  const handleRunApp = async () => {
    if (!canRun || isRunning) return;

    const prompt = buildPromptFromTemplate(app, values);

    setPreparedPrompt(prompt);
    setGeneratedOutput('');
    setEditDraft('');
    setIsEditingOutput(false);
    setError('');
    setCopied(false);
    setSavedOutputId('');
    setIsRunning(true);

    try {
      const res = await fetch('/api/apps/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appId: app.id,
          appName: app.name,
          category: app.category,
          outputType: app.outputType,
          prompt,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || t('appsPage.smallAppFailed'));
      }

      const output = data.content || '';
      setGeneratedOutput(output);
      setEditDraft(output);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('appsPage.smallAppFailedOutput'),
      );
    } finally {
      setIsRunning(false);
    }
  };

  const handleStartEditingOutput = () => {
    const currentResult = generatedOutput || preparedPrompt;

    if (!currentResult.trim()) return;

    setEditDraft(currentResult);
    setIsEditingOutput(true);
  };

  const handleSaveEditedOutput = () => {
    if (generatedOutput.trim()) {
      setGeneratedOutput(editDraft);
    } else {
      setPreparedPrompt(editDraft);
    }

    setIsEditingOutput(false);
    setCopied(false);
    setSavedOutputId('');
  };

  const handleCancelEditingOutput = () => {
    setEditDraft(generatedOutput || preparedPrompt);
    setIsEditingOutput(false);
  };

  const handleCopy = async () => {
    const result = generatedOutput || preparedPrompt;

    if (!result) return;

    await navigator.clipboard.writeText(result);
    setCopied(true);
  };

  const handlePrintPdf = () => {
    const result = generatedOutput || preparedPrompt;

    if (!result.trim()) return;

    const printableWindow = window.open('', '_blank');

    if (!printableWindow) {
      window.alert(t('appsPage.couldNotOpenPrintWindow'));
      return;
    }

    printableWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(app.name)}</title>
  <style>
    body {
      margin: 0;
      background: #f5f5f5;
      color: #111;
      font-family: Inter, Arial, sans-serif;
      line-height: 1.65;
    }

    main {
      max-width: 850px;
      margin: 0 auto;
      background: #fff;
      min-height: 100vh;
      padding: 48px;
    }

    .content {
      font-size: 15px;
    }

    .content h1,
    .content h2,
    .content h3,
    .content h4 {
      margin: 26px 0 12px;
      line-height: 1.25;
    }

    .content h1 {
      font-size: 28px;
    }

    .content h2 {
      font-size: 22px;
      border-bottom: 1px solid #e5e5e5;
      padding-bottom: 8px;
    }

    .content h3 {
      font-size: 18px;
    }

    .content p {
      margin: 0 0 14px;
    }

    .content ul,
    .content ol {
      margin: 0 0 18px 22px;
      padding: 0;
    }

    .content li {
      margin: 6px 0;
    }

    .content blockquote {
      margin: 18px 0;
      border-left: 4px solid #111;
      padding: 10px 16px;
      background: #f7f7f7;
      color: #333;
    }

    .content table {
      width: 100%;
      border-collapse: collapse;
      margin: 18px 0 24px;
      font-size: 13px;
    }

    .content th,
    .content td {
      border: 1px solid #ddd;
      padding: 9px 10px;
      text-align: left;
      vertical-align: top;
    }

    .content th {
      background: #f1f1f1;
      font-weight: 750;
    }

    .content hr {
      border: 0;
      border-top: 1px solid #ddd;
      margin: 28px 0;
    }

    .content code {
      border-radius: 5px;
      background: #f1f1f1;
      padding: 2px 5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.92em;
    }

    @media print {
      body {
        background: #fff;
      }

      main {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <main>
    <article class="content">${renderSafePrintableMarkdown(result)}</article>
  </main>
</body>
</html>`);

    printableWindow.document.close();

    window.setTimeout(() => {
      printableWindow.focus();
      printableWindow.print();
    }, 250);
  };

  const getSelectedOutputDestinationLabel = () => {
    if (outputDestination === 'automation') {
      return t('appsPage.appOutputs');
    }

    if (outputDestination.startsWith('space:')) {
      const spaceId = outputDestination.replace('space:', '');
      return spaces.find((space) => space.id === spaceId)?.name ?? t('appsPage.space');
    }

    return t('appsPage.appOutputs');
  };

  const handleSaveOutput = () => {
    if (!generatedOutput.trim()) return;

    const now = new Date().toISOString();
    const outputId = `app-output-${Date.now()}`;

    const output: AutomationOutputItem = {
      id: outputId,
      automationId: `app:${app.id}`,
      automationName: app.name,
      title: `${app.name} — ${app.outputType}`,
      outputType: app.outputType,
      outputDestination,
      outputDestinationLabel: getSelectedOutputDestinationLabel(),
      status: 'ready',
      createdAt: now,
      updatedAt: now,
      runId: `app-run-${Date.now()}`,
      prompt: preparedPrompt,
      expectedOutput: app.outputType,
      content: generatedOutput,
    };

    writeAutomationOutputs([output, ...readAutomationOutputs()]);
    setSavedOutputId(outputId);
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 lg:px-10">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-black/55 transition hover:text-black dark:text-white/55 dark:hover:text-white"
      >
        <ArrowLeft size={16} />
        {t('appsPage.backToApps')}
      </button>

      <header className="mb-8 rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black text-white dark:bg-white dark:text-black">
            <Icon size={26} />
          </div>

          <div>
            <div className="mb-2 inline-flex rounded-full border border-light-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-black/45 dark:border-dark-200 dark:text-white/45">
              {app.category} {t('appsPage.app')}
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white">
              {app.name}
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-black/60 dark:text-white/60 md:text-base">
              {app.description}
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <form
          className="rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary"
          onSubmit={(event) => {
            event.preventDefault();
            handleRunApp();
          }}
        >
          <h2 className="text-xl font-semibold text-black dark:text-white">
            Inputs
          </h2>

          <p className="mt-2 text-sm text-black/55 dark:text-white/55">
            Fill the fields, then generate a reusable output.
          </p>

          <div className="mt-6 space-y-5">
            {app.inputs.map((input) => (
              <label key={input.id} className="block space-y-2">
                <span className="text-sm font-medium text-black dark:text-white">
                  {input.label}
                  {input.required ? ' *' : ''}
                </span>

                {input.type === 'textarea' ||
                (app.isCustom && input.type === 'text') ? (
                  <textarea
                    value={values[input.id] || ''}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [input.id]: event.target.value,
                      }))
                    }
                    placeholder={input.placeholder}
                    rows={input.type === 'textarea' ? 8 : 4}
                    className="min-h-[120px] w-full resize-y rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm leading-relaxed text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
                  />
                ) : input.type === 'select' ? (
                  <select
                    value={values[input.id] || ''}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [input.id]: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
                  >
                    <option value="">{t('sharedUi.choose')}</option>
                    {input.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={
                      input.type === 'date'
                        ? 'date'
                        : input.type === 'number'
                          ? 'number'
                          : 'text'
                    }
                    value={values[input.id] || ''}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [input.id]: event.target.value,
                      }))
                    }
                    placeholder={input.placeholder}
                    className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
                  />
                )}
              </label>
            ))}
          </div>

          <button
            type="submit"
            disabled={!canRun}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black"
          >
            {isRunning ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
            {isRunning ? t('appsPage.generating') : t('appsPage.generateOutput')}
          </button>

          {error && (
            <p className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              {error}
            </p>
          )}
        </form>

        <aside className="space-y-5">
          <div className="rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
            <h2 className="text-sm font-semibold text-black dark:text-white">
              {t('appsPage.howAppsWork')}
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-black/55 dark:text-white/55">
              {t('appsPage.howAppsWorkDescription')}
              fill the inputs, run it, then save the result if useful.
            </p>
          </div>

          <div className="rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
            <p className="text-xs font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
              {t('appsPage.outputType')}
            </p>
            <p className="mt-1 text-sm font-medium text-black/75 dark:text-white/75">
              {app.outputType}
            </p>
          </div>

          <div className="rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
                {t('appsPage.saveDestination')}
              </span>

              <select
                value={outputDestination}
                onChange={(event) => {
                  setOutputDestination(event.target.value);
                  setSavedOutputId('');
                }}
                className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
              >
                <option value="automation">{t('appsPage.appOutputs')}</option>
                {spaces.map((space) => (
                  <option key={space.id} value={`space:${space.id}`}>
                    {space.name}
                  </option>
                ))}
              </select>
            </label>

            <p className="mt-3 text-xs leading-relaxed text-black/45 dark:text-white/45">
              {t('appsPage.saveDestinationDescription')}
            </p>
          </div>
        </aside>
      </section>

      {(preparedPrompt || generatedOutput) && (
        <section className="mt-6 rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-black dark:text-white">
                {generatedOutput ? t('appsPage.generatedOutput') : t('appsPage.preparedInstructions')}
              </h2>
              <p className="mt-1 text-sm text-black/55 dark:text-white/55">
                {generatedOutput
                  ? t('appsPage.generatedDescription')
                  : 'These instructions are ready to run once the app generates.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {(generatedOutput || preparedPrompt) && !isEditingOutput && (
                <button
                  type="button"
                  onClick={handleStartEditingOutput}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-light-200 px-5 py-2.5 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
                >
                  <PencilLine size={16} />
                  {t('appsPage.editOutput')}
                </button>
              )}

              {(generatedOutput || preparedPrompt) && isEditingOutput && (
                <>
                  <button
                    type="button"
                    onClick={handleSaveEditedOutput}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.01] dark:bg-white dark:text-black"
                  >
                    {t('appsPage.saveEdits')}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelEditingOutput}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-light-200 px-5 py-2.5 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
                  >
                    {t('appsPage.cancel')}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleCopy}
                disabled={!generatedOutput && !preparedPrompt}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-light-200 px-5 py-2.5 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black disabled:cursor-not-allowed disabled:opacity-40 dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
              >
                <Copy size={16} />
                {copied ? t('appsPage.copied') : t('appsPage.copy')}
              </button>

              <button
                type="button"
                onClick={handlePrintPdf}
                disabled={!generatedOutput && !preparedPrompt}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-light-200 px-5 py-2.5 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black disabled:cursor-not-allowed disabled:opacity-40 dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
              >
                <FileText size={16} />
                {t('appsPage.printSavePdf')}
              </button>

              <button
                type="button"
                onClick={handleSaveOutput}
                disabled={!generatedOutput.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-light-200 px-5 py-2.5 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black disabled:cursor-not-allowed disabled:opacity-40 dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
              >
                <Save size={16} />
                {savedOutputId
                  ? t('appsPage.saved')
                  : outputDestination === 'automation'
                    ? t('appsPage.saveToOutputs')
                    : t('appsPage.saveToSpace')}
              </button>

              {savedOutputId && (
                <a
                  href={`/outputs/${savedOutputId}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.01] dark:bg-white dark:text-black"
                >
                  {t('appsPage.openOutput')}
                </a>
              )}

              {savedOutputId && outputDestination.startsWith('space:') && (
                <a
                  href={`/spaces/${outputDestination.replace('space:', '')}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-light-200 px-5 py-2.5 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
                >
                  {t('appsPage.openSpace')}
                </a>
              )}
            </div>
          </div>

          {(generatedOutput || preparedPrompt) && isEditingOutput ? (
            <textarea
              value={editDraft}
              onChange={(event) => setEditDraft(event.target.value)}
              rows={18}
              className="mt-5 w-full resize-y rounded-2xl border border-light-200 bg-light-primary p-5 text-sm leading-relaxed text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
            />
          ) : (
            <article
              className="mt-5 rounded-2xl bg-light-primary p-5 text-sm leading-relaxed text-black/75 dark:bg-dark-primary dark:text-white/75 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-black/30 [&_blockquote]:pl-4 [&_blockquote]:text-black/60 dark:[&_blockquote]:border-white/30 dark:[&_blockquote]:text-white/60 [&_code]:rounded-md [&_code]:bg-light-secondary [&_code]:px-1.5 [&_code]:py-0.5 dark:[&_code]:bg-dark-secondary [&_em]:italic [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:border-b [&_h2]:border-light-200 [&_h2]:pb-2 [&_h2]:text-xl [&_h2]:font-semibold dark:[&_h2]:border-dark-200 [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-semibold [&_hr]:my-6 [&_hr]:border-light-200 dark:[&_hr]:border-dark-200 [&_li]:my-1 [&_ol]:mb-4 [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:mb-3 [&_strong]:font-semibold [&_table]:my-5 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-light-200 [&_td]:p-3 dark:[&_td]:border-dark-200 [&_th]:border [&_th]:border-light-200 [&_th]:bg-light-secondary [&_th]:p-3 [&_th]:text-left [&_th]:font-semibold dark:[&_th]:border-dark-200 dark:[&_th]:bg-dark-secondary [&_ul]:mb-4 [&_ul]:ml-5 [&_ul]:list-disc"
              dangerouslySetInnerHTML={{
                __html: renderSafePrintableMarkdown(generatedOutput || preparedPrompt),
              }}
            />
          )}
        </section>
      )}
    </div>
  );
};
