'use client';

import { Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  type SmallAppCategory,
  type SmallAppInput,
} from '@/lib/apps/catalog';
import { useI18n } from '@/lib/i18n/useI18n';
import {
  SMALL_APP_CATEGORIES,
  createBlankBuilderField,
  createBlankCustomAppForm,
  customAppRecordToBuilderForm,
  getFieldVariableName,
  slugifyFieldId,
  splitListText,
} from './helpers';
import type {
  BuilderFieldDraft,
  CustomAppBuilderForm,
  CustomAppRecord,
} from './types';

export const CustomAppBuilder = ({
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
