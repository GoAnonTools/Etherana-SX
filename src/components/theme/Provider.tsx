'use client';

import { type ReactNode } from 'react';
import { EtheranaThemeProvider } from './ThemeContext';

const ThemeProviderComponent = ({ children }: { children: ReactNode }) => {
  return <EtheranaThemeProvider>{children}</EtheranaThemeProvider>;
};

export default ThemeProviderComponent;
