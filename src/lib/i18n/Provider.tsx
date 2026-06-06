'use client';

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getTranslation,
  LOCALE_CHANGED_EVENT,
  LOCALE_STORAGE_KEY,
  type Locale,
  type TranslationKey,
} from './dictionaries';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

const getStoredLocale = (): Locale => {
  if (typeof window === 'undefined') {
    return 'en';
  }

  return window.localStorage.getItem(LOCALE_STORAGE_KEY) === 'fr'
    ? 'fr'
    : 'en';
};

const applyLocaleToDocument = (locale: Locale) => {
  document.documentElement.lang = locale;
  document.documentElement.dataset.locale = locale;
};

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const storedLocale = getStoredLocale();

    setLocaleState(storedLocale);
    applyLocaleToDocument(storedLocale);

    const handleLocaleChange = () => {
      const nextLocale = getStoredLocale();

      setLocaleState(nextLocale);
      applyLocaleToDocument(nextLocale);
    };

    window.addEventListener('storage', handleLocaleChange);
    window.addEventListener(LOCALE_CHANGED_EVENT, handleLocaleChange);

    return () => {
      window.removeEventListener('storage', handleLocaleChange);
      window.removeEventListener(LOCALE_CHANGED_EVENT, handleLocaleChange);
    };
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    setLocaleState(nextLocale);
    applyLocaleToDocument(nextLocale);
    window.dispatchEvent(new Event(LOCALE_CHANGED_EVENT));
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key) => getTranslation(locale, key),
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
