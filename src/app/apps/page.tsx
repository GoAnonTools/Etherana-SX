'use client';

import {
  ArrowLeft,
  Copy,
  Download,
  FileText,
  LayoutTemplate,
  PencilLine,
  Loader2,
  Plus,
  Play,
  Save,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SMALL_APP_TEMPLATES,
  type SmallAppCategory,
  type SmallAppInput,
  type SmallAppTemplate,
} from '@/lib/apps/catalog';
import {
  type AutomationOutputItem,
  getAutomationStorageChangedEventName,
  readAutomationOutputs,
  writeAutomationOutputs,
} from '@/lib/vault/localVault';
import { useI18n } from '@/lib/i18n/useI18n';
import {
  SMALL_APP_CATEGORIES,
  createBlankBuilderField,
  createBlankCustomAppForm,
  customAppRecordToBuilderForm,
  getExportFilename,
  getFieldVariableName,
  mapCustomAppToTemplate,
  normalizeSmallAppCategory,
  slugifyFieldId,
  splitListText,
  unwrapImportedCustomApp,
} from './helpers';
import type {
  AppCatalogItem,
  AppInputValues,
  AppSpace,
  BuilderFieldDraft,
  CustomAppBuilderForm,
  CustomAppRecord,
} from './types';

import {
  buildPromptFromTemplate,
  escapeHtml,
  renderSafePrintableMarkdown,
} from './printableMarkdown';

import { AppCard } from './AppCard';

const CustomAppBuilder = ({
  initialApp,
  onCancel,
  onSaved,
}: {
  initialApp: CustomAppRecord | null;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) => {
  const { t } = useI18n();
  const [form, setForm] = useState<CustomAppBuilderForm>(() =>
    initialApp ? customAppRecordToBuilderForm(initialApp) : createBlankCustomAppForm(),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(
      initialApp ? customAppRecordToBuilderForm(initialApp) : createBlankCustomAppForm(),
    );
    setError('');
  }, [initialApp]);

  const updateField = (
    index: number,
    updates: Partial<BuilderFieldDraft>,
  ) => {
    setForm((current) => ({
      ...current,
      inputs: current.inputs.map((input, inputIndex) =>
        inputIndex === index ? { ...input, ...updates } : input,
      ),
    }));
  };

  const addField = () => {
    setForm((current) => ({
      ...current,
      inputs: [...current.inputs, createBlankBuilderField()],
    }));
  };

  const removeField = (index: number) => {
    setForm((current) => ({
      ...current,
      inputs:
        current.inputs.length <= 1
          ? current.inputs
          : current.inputs.filter((_, inputIndex) => inputIndex !== index),
    }));
  };

  const buildPayload = () => {
    const inputs = form.inputs
      .map((input, index) => {
        const label = input.label.trim();
        const id =
          slugifyFieldId(input.id || label) ||
          slugifyFieldId(label) ||
          `field-${index + 1}`;

        return {
          id,
          label,
          type: input.type,
          placeholder: input.placeholder?.trim() || '',
          required: Boolean(input.required),
          options:
            input.type === 'select'
              ? splitListText(input.optionsText || '')
              : [],
        };
      })
      .filter((input) => input.label);

    return {
      id: initialApp?.id,
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim(),
      outputType: form.outputType.trim() || 'Document',
      promptTemplate: form.promptTemplate.trim(),
      inputs,
      goodFor: splitListText(form.goodForText),
    };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const payload = buildPayload();

    if (!payload.name) {
      setError(t('appsPage.customAppNameRequired'));
      return;
    }

    if (!payload.description) {
      setError(t('appsPage.customAppDescriptionRequired'));
      return;
    }

    if (!payload.promptTemplate) {
      setError(t('appsPage.customAppPromptRequired'));
      return;
    }

    if (payload.inputs.length === 0) {
      setError(t('appsPage.customAppInputRequired'));
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const res = await fetch('/api/apps/custom', {
        method: initialApp ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || t('appsPage.couldNotSaveCustomApp'));
      }

      await onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('appsPage.couldNotSaveCustomApp'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mb-10 rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="inline-flex rounded-full border border-light-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-black/45 dark:border-dark-200 dark:text-white/45">
            {t('appsPage.customApp')}
          </p>

          <h2 className="mt-3 text-2xl font-semibold text-black dark:text-white">
            {initialApp ? t('appsPage.editCustomApp') : t('appsPage.createCustomApp')}
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-black/55 dark:text-white/55">
            {t('appsPage.createCustomAppDescription')}
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-light-200 px-4 py-2 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
        >
          <X size={16} />
          {t('appsPage.close')}
        </button>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-black dark:text-white">
              {t('appsPage.appName')} *
            </span>
            <input
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder={t('appsPage.appNamePlaceholder')}
              className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-black dark:text-white">
              {t('appsPage.category')}
            </span>
            <select
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: event.target.value as SmallAppCategory,
                }))
              }
              className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
            >
              {SMALL_APP_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-black dark:text-white">
              Output type
            </span>
            <input
              value={form.outputType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  outputType: event.target.value,
                }))
              }
              placeholder={t('appsPage.outputTypePlaceholder')}
              className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-black dark:text-white">
              {t('appsPage.goodFor')}
            </span>
            <input
              value={form.goodForText}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  goodForText: event.target.value,
                }))
              }
              placeholder={t('appsPage.goodForPlaceholder')}
              className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
            />
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-black dark:text-white">
            Description *
          </span>
          <textarea
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            rows={3}
            placeholder={t('appsPage.customAppDescriptionPlaceholder')}
            className="w-full resize-none rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
          />
        </label>

        <div className="rounded-3xl border border-light-200 bg-light-primary p-5 dark:border-dark-200 dark:bg-dark-primary">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-black dark:text-white">
                {t('appsPage.fields')}
              </h3>
              <p className="mt-1 text-sm text-black/55 dark:text-white/55">
                {t('appsPage.fieldsDescription')}
              </p>
            </div>

            <button
              type="button"
              onClick={addField}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-light-200 px-4 py-2 text-sm font-semibold text-black/65 transition hover:bg-light-secondary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-secondary dark:hover:text-white"
            >
              <Plus size={16} />
              {t('appsPage.addField')}
            </button>
          </div>

          <div className="space-y-4">
            {form.inputs.map((input, index) => (
              <div
                key={`${input.id}-${index}`}
                className="rounded-2xl border border-light-200 bg-light-secondary p-4 dark:border-dark-200 dark:bg-dark-secondary"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-black dark:text-white">
                    {t('appsPage.field')} {index + 1}
                  </p>

                  <button
                    type="button"
                    onClick={() => removeField(index)}
                    disabled={form.inputs.length <= 1}
                    className="inline-flex items-center gap-2 rounded-full border border-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                    {t('appsPage.remove')}
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-xs font-medium text-black/65 dark:text-white/65">
                      {t('appsPage.label')} *
                    </span>
                    <input
                      value={input.label}
                      onChange={(event) =>
                        updateField(index, {
                          label: event.target.value,
                          id:
                            input.id.startsWith('field-') || !input.id
                              ? slugifyFieldId(event.target.value)
                              : input.id,
                        })
                      }
                      placeholder={t('appsPage.fieldLabelPlaceholder')}
                      className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-xs font-medium text-black/65 dark:text-white/65">
                      {t('appsPage.type')}
                    </span>
                    <select
                      value={input.type}
                      onChange={(event) =>
                        updateField(index, {
                          type: event.target.value as SmallAppInput['type'],
                        })
                      }
                      className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
                    >
                      <option value="text">{t('appsPage.fieldTypeText')}</option>
                      <option value="textarea">{t('appsPage.fieldTypeTextarea')}</option>
                      <option value="select">{t('appsPage.fieldTypeSelect')}</option>
                      <option value="number">{t('appsPage.fieldTypeNumber')}</option>
                      <option value="date">{t('appsPage.fieldTypeDate')}</option>
                    </select>
                  </label>

                  <label className="block space-y-2">
                    <span className="text-xs font-medium text-black/65 dark:text-white/65">
                      {t('appsPage.placeholder')}
                    </span>
                    <input
                      value={input.placeholder || ''}
                      onChange={(event) =>
                        updateField(index, {
                          placeholder: event.target.value,
                        })
                      }
                      placeholder={t('appsPage.fieldPlaceholderExample')}
                      className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
                    />
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black/70 dark:border-dark-200 dark:bg-dark-primary dark:text-white/70">
                    <input
                      type="checkbox"
                      checked={Boolean(input.required)}
                      onChange={(event) =>
                        updateField(index, {
                          required: event.target.checked,
                        })
                      }
                    />
                    {t('appsPage.requiredField')}
                  </label>
                </div>

                {input.type === 'select' && (
                  <label className="mt-3 block space-y-2">
                    <span className="text-xs font-medium text-black/65 dark:text-white/65">
                      {t('appsPage.selectOptions')}
                    </span>
                    <textarea
                      value={input.optionsText || ''}
                      onChange={(event) =>
                        updateField(index, {
                          optionsText: event.target.value,
                        })
                      }
                      rows={3}
                      placeholder={t('appsPage.selectOptionsPlaceholder')}
                      className="w-full resize-none rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
                    />
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-light-200 bg-light-primary p-5 dark:border-dark-200 dark:bg-dark-primary">
          <h3 className="text-lg font-semibold text-black dark:text-white">
            {t('appsPage.availableVariables')}
          </h3>

          <p className="mt-1 text-sm text-black/55 dark:text-white/55">
            {t('appsPage.availableVariablesDescription')}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {form.inputs
              .map((field, index) => getFieldVariableName(field, index))
              .filter(Boolean).length > 0 ? (
              form.inputs
                .map((field, index) => getFieldVariableName(field, index))
                .filter(Boolean)
                .map((variableName) => (
                  <code
                    key={variableName}
                    className="rounded-full border border-light-200 bg-light-secondary px-3 py-1.5 text-xs font-semibold text-black/65 dark:border-dark-200 dark:bg-dark-secondary dark:text-white/65"
                  >
                    {`{{${variableName}}}`}
                  </code>
                ))
            ) : (
              <p className="text-sm text-black/45 dark:text-white/45">
                {t('appsPage.noVariablesYet')}
              </p>
            )}
          </div>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-black dark:text-white">
            {t('appsPage.promptTemplate')} *
          </span>
          <textarea
            value={form.promptTemplate}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                promptTemplate: event.target.value,
              }))
            }
            rows={7}
            placeholder={t('appsPage.promptTemplatePlaceholder')}
            className="w-full resize-y rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
          />
          <p className="text-xs leading-relaxed text-black/45 dark:text-white/45">
            {t('appsPage.promptTemplateHelp')}
          </p>
        </label>

        {error && (
          <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            {isSaving
              ? t('appsPage.saving')
              : initialApp
                ? t('appsPage.saveCustomApp')
                : t('appsPage.createCustomApp')}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-full border border-light-200 px-5 py-3 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
          >
            {t('appsPage.cancel')}
          </button>
        </div>
      </form>
    </section>
  );
};

const AppRunner = ({
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
