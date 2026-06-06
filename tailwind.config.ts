import type { Config } from 'tailwindcss';

const withAlpha = (variable: string) =>
  `rgb(var(${variable}) / <alpha-value>)`;

const themeDark = () => ({
  50: '#0d1117',
  100: '#161b22',
  200: '#21262d',
  300: '#30363d',
});

const themeLight = () => ({
  50: withAlpha('--color-light-50'),
  100: withAlpha('--color-light-100'),
  200: withAlpha('--color-light-200'),
  300: withAlpha('--color-light-300'),
});

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      borderColor: () => {
        return {
          light: themeLight(),
          dark: themeDark(),
        };
      },
      colors: () => {
        const colorsDark = themeDark();
        const colorsLight = themeLight();

        return {
          dark: {
            primary: colorsDark[50],
            secondary: colorsDark[100],
            ...colorsDark,
          },
          light: {
            primary: colorsLight[50],
            secondary: colorsLight[100],
            ...colorsLight,
          },
        };
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@headlessui/tailwindcss')({ prefix: 'headless' }),
  ],
};

export default config;
