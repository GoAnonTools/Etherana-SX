'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type EtheranaTheme = 'dark' | 'light' | 'system';
export type EtheranaResolvedTheme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'theme';
const LIGHT_THEME_STYLE_STORAGE_KEY = 'etherana.lightThemeStyle.v1';
const LIGHT_THEME_STYLE_EVENT = 'etherana-light-theme-style-changed';

type EtheranaThemeContextValue = {
  theme: EtheranaTheme;
  resolvedTheme: EtheranaResolvedTheme;
  setTheme: (theme: EtheranaTheme) => void;
};

const EtheranaThemeContext = createContext<EtheranaThemeContextValue | null>(
  null,
);

const getSystemTheme = (): EtheranaResolvedTheme => {
  if (typeof window === 'undefined') return 'dark';

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

const getStoredTheme = (): EtheranaTheme => {
  if (typeof window === 'undefined') return 'dark';

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);

  return stored === 'light' || stored === 'system' ? stored : 'dark';
};

const getThemeStyle = () => {
  if (typeof window === 'undefined') return 'dark';

  return window.localStorage.getItem(LIGHT_THEME_STYLE_STORAGE_KEY) === 'amber'
    ? 'amber'
    : 'dark';
};

const resolveTheme = (theme: EtheranaTheme): EtheranaResolvedTheme => {
  return theme === 'system' ? getSystemTheme() : theme;
};

const applyTheme = (theme: EtheranaTheme) => {
  if (typeof document === 'undefined') return;

  const resolvedTheme = resolveTheme(theme);
  const root = document.documentElement;

  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.classList.toggle('light', resolvedTheme === 'light');

  const style = getThemeStyle();
  root.dataset.lightThemeStyle = style === 'amber' ? 'amber' : 'classic';
  root.classList.remove('theme-amber');
};

export const EtheranaThemeProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [theme, setThemeState] = useState<EtheranaTheme>('dark');
  const [resolvedTheme, setResolvedTheme] =
    useState<EtheranaResolvedTheme>('dark');

  const syncTheme = useCallback(() => {
    const nextTheme = getStoredTheme();
    const nextResolvedTheme = resolveTheme(nextTheme);

    setThemeState(nextTheme);
    setResolvedTheme(nextResolvedTheme);
    applyTheme(nextTheme);
  }, []);

  useEffect(() => {
    syncTheme();

    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => syncTheme();

    window.addEventListener('storage', handleChange);
    window.addEventListener(LIGHT_THEME_STYLE_EVENT, handleChange);
    media.addEventListener('change', handleChange);

    return () => {
      window.removeEventListener('storage', handleChange);
      window.removeEventListener(LIGHT_THEME_STYLE_EVENT, handleChange);
      media.removeEventListener('change', handleChange);
    };
  }, [syncTheme]);

  const setTheme = useCallback((nextTheme: EtheranaTheme) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setThemeState(nextTheme);
    setResolvedTheme(resolveTheme(nextTheme));
    applyTheme(nextTheme);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [theme, resolvedTheme, setTheme],
  );

  return (
    <EtheranaThemeContext.Provider value={value}>
      {children}
    </EtheranaThemeContext.Provider>
  );
};

export const useEtheranaTheme = () => {
  const value = useContext(EtheranaThemeContext);

  if (!value) {
    throw new Error('useEtheranaTheme must be used inside EtheranaThemeProvider');
  }

  return value;
};
