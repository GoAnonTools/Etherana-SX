'use client';

import { ThemeProvider } from 'next-themes';
import { useEffect, type ReactNode } from 'react';

const LIGHT_THEME_STYLE_STORAGE_KEY = 'etherana.lightThemeStyle.v1';
const LIGHT_THEME_STYLE_EVENT = 'etherana-light-theme-style-changed';

const getThemeStyle = () => {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  return window.localStorage.getItem(LIGHT_THEME_STYLE_STORAGE_KEY) === 'amber'
    ? 'amber'
    : 'dark';
};

const applyThemeStyle = () => {
  const style = getThemeStyle();

  document.documentElement.dataset.lightThemeStyle =
    style === 'amber' ? 'amber' : 'classic';
  document.documentElement.classList.remove('theme-amber');
};

const ThemeProviderComponent = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    applyThemeStyle();

    const handleChange = () => applyThemeStyle();

    window.addEventListener('storage', handleChange);
    window.addEventListener(LIGHT_THEME_STYLE_EVENT, handleChange);

    return () => {
      window.removeEventListener('storage', handleChange);
      window.removeEventListener(LIGHT_THEME_STYLE_EVENT, handleChange);
    };
  }, []);

  return (
    <ThemeProvider attribute="class" enableSystem={false} defaultTheme="dark">
      {children}
    </ThemeProvider>
  );
};

export default ThemeProviderComponent;
