'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { UIConfigField } from '@/lib/config/types';
import { locales, type Locale } from '@/lib/i18n/dictionaries';
import { useI18n } from '@/lib/i18n/useI18n';
import SettingsField from '../SettingsField';

const LIGHT_THEME_STYLE_STORAGE_KEY = 'etherana.lightThemeStyle.v1';
const LIGHT_THEME_STYLE_EVENT = 'etherana-light-theme-style-changed';

type AppThemeStyle = 'dark' | 'amber';

const applyThemeStyle = (style: AppThemeStyle) => {
  localStorage.setItem(LIGHT_THEME_STYLE_STORAGE_KEY, style);
  document.documentElement.dataset.lightThemeStyle =
    style === 'amber' ? 'amber' : 'classic';
  document.documentElement.classList.remove('theme-amber');
  window.dispatchEvent(new Event(LIGHT_THEME_STYLE_EVENT));
};

const ThemeStyleSetting = () => {
  const [style, setStyle] = useState<AppThemeStyle>('dark');
  const { setTheme } = useTheme();
  const { t } = useI18n();

  useEffect(() => {
    const saved = localStorage.getItem(LIGHT_THEME_STYLE_STORAGE_KEY);

    if (saved === 'amber') {
      setStyle('amber');
      document.documentElement.dataset.lightThemeStyle = 'amber';
      setTheme('light');
    } else {
      setStyle('dark');
      document.documentElement.dataset.lightThemeStyle = 'classic';
      setTheme('dark');
    }
  }, [setTheme]);

  const selectStyle = (nextStyle: AppThemeStyle) => {
    setStyle(nextStyle);
    applyThemeStyle(nextStyle);

    if (nextStyle === 'amber') {
      setTheme('light');
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      return;
    }

    setTheme('dark');
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  };

  return (
    <div className="rounded-3xl border border-light-200 bg-light-secondary p-5 dark:border-dark-200 dark:bg-dark-secondary">
      <div>
        <p className="text-sm font-semibold text-black dark:text-white">
          {t('settings.appTheme')}
        </p>

        <p className="mt-1 text-xs leading-relaxed text-black/50 dark:text-white/50">
          {t('settings.appThemeDescription')}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => selectStyle('dark')}
          className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
            style === 'dark'
              ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
              : 'border-light-200 text-black/60 hover:bg-light-200 hover:text-black dark:border-dark-200 dark:text-white/60 dark:hover:bg-dark-200 dark:hover:text-white'
          }`}
        >
          <span className="block font-semibold">{t('settings.dark')}</span>
          <span className="mt-1 block text-xs opacity-70">
            {t('settings.darkDescription')}
          </span>
        </button>

        <button
          type="button"
          onClick={() => selectStyle('amber')}
          className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
            style === 'amber'
              ? 'border-amber-800 bg-amber-700 text-white dark:border-white dark:bg-white dark:text-black'
              : 'border-light-200 text-black/60 hover:bg-light-200 hover:text-black dark:border-dark-200 dark:text-white/60 dark:hover:bg-dark-200 dark:hover:text-white'
          }`}
        >
          <span className="block font-semibold">{t('settings.amber')}</span>
          <span className="mt-1 block text-xs opacity-70">
            {t('settings.amberDescription')}
          </span>
        </button>
      </div>
    </div>
  );
};

const LanguageSetting = () => {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="rounded-3xl border border-light-200 bg-light-secondary p-5 dark:border-dark-200 dark:bg-dark-secondary">
      <div>
        <p className="text-sm font-semibold text-black dark:text-white">
          {t('settings.languageTitle')}
        </p>

        <p className="mt-1 text-xs leading-relaxed text-black/50 dark:text-white/50">
          {t('settings.languageDescription')}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {locales.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setLocale(item.value as Locale)}
            className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
              locale === item.value
                ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                : 'border-light-200 text-black/60 hover:bg-light-200 hover:text-black dark:border-dark-200 dark:text-white/60 dark:hover:bg-dark-200 dark:hover:text-white'
            }`}
          >
            <span className="block font-semibold">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const Preferences = ({
  fields,
  values,
}: {
  fields: UIConfigField[];
  values: Record<string, any>;
}) => {
  return (
    <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
      <ThemeStyleSetting />
      <LanguageSetting />

      {fields.map((field) => (
        <SettingsField
          key={field.key}
          field={field}
          value={
            (field.scope === 'client'
              ? localStorage.getItem(field.key)
              : values[field.key]) ?? field.default
          }
          dataAdd="preferences"
        />
      ))}
    </div>
  );
};

export default Preferences;
