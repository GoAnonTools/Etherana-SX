export type Locale = 'en' | 'fr';

export const LOCALE_STORAGE_KEY = 'etherana.locale.v1';
export const LOCALE_CHANGED_EVENT = 'etherana-locale-changed';

export const locales: { value: Locale; label: string }[] = [
  {
    value: 'en',
    label: 'English',
  },
  {
    value: 'fr',
    label: 'Français',
  },
];

export const dictionaries = {
  en: {
    common: {
      language: 'Language',
      english: 'English',
      french: 'French',
    },
    sidebar: {
      subtitle: 'AI workspace',
      newSearch: 'New Search',
      search: 'Search',
      discover: 'Discover',
      library: 'Library',
      outputs: 'Outputs',
      workspaces: 'Workspaces',
      allSpaces: 'All Spaces',
      createFirstSpace: 'Create your first Space',
      automation: 'Automation',
      automations: 'Automations',
      apps: 'Apps',
      privacy: 'Privacy',
      backupVault: 'Backup Vault',
      spaces: 'Spaces',
    },
    settings: {
      appTheme: 'App theme',
      appThemeDescription:
        'Choose between the original dark interface and the warm Amber interface.',
      dark: 'Dark',
      darkDescription: 'Original Etherana dark mode.',
      amber: 'Amber',
      amberDescription: 'Warmer cream and gold interface.',
      languageTitle: 'Language',
      languageDescription:
        'Choose the interface language. Generated content stays in the language you ask for.',
    },
  },
  fr: {
    common: {
      language: 'Langue',
      english: 'Anglais',
      french: 'Français',
    },
    sidebar: {
      subtitle: 'Espace de travail IA',
      newSearch: 'Nouvelle recherche',
      search: 'Recherche',
      discover: 'Découvrir',
      library: 'Bibliothèque',
      outputs: 'Sorties',
      workspaces: 'Espaces',
      allSpaces: 'Tous les espaces',
      createFirstSpace: 'Créer votre premier espace',
      automation: 'Automatisation',
      automations: 'Automatisations',
      apps: 'Apps',
      privacy: 'Confidentialité',
      backupVault: 'Coffre de sauvegarde',
      spaces: 'Espaces',
    },
    settings: {
      appTheme: 'Thème de l’application',
      appThemeDescription:
        'Choisissez entre le mode sombre original et l’interface chaude Amber.',
      dark: 'Sombre',
      darkDescription: 'Mode sombre original d’Etherana.',
      amber: 'Amber',
      amberDescription: 'Interface plus chaude, crème et dorée.',
      languageTitle: 'Langue',
      languageDescription:
        'Choisissez la langue de l’interface. Les contenus générés gardent la langue demandée.',
    },
  },
} as const;

export type TranslationKey =
  | 'common.language'
  | 'common.english'
  | 'common.french'
  | 'sidebar.subtitle'
  | 'sidebar.newSearch'
  | 'sidebar.search'
  | 'sidebar.discover'
  | 'sidebar.library'
  | 'sidebar.outputs'
  | 'sidebar.workspaces'
  | 'sidebar.allSpaces'
  | 'sidebar.createFirstSpace'
  | 'sidebar.automation'
  | 'sidebar.automations'
  | 'sidebar.apps'
  | 'sidebar.privacy'
  | 'sidebar.backupVault'
  | 'sidebar.spaces'
  | 'settings.appTheme'
  | 'settings.appThemeDescription'
  | 'settings.dark'
  | 'settings.darkDescription'
  | 'settings.amber'
  | 'settings.amberDescription'
  | 'settings.languageTitle'
  | 'settings.languageDescription';

export const getTranslation = (locale: Locale, key: TranslationKey) => {
  const [section, item] = key.split('.') as [
    keyof typeof dictionaries.en,
    string,
  ];

  const dictionary = dictionaries[locale] ?? dictionaries.en;
  const sectionValues = dictionary[section] as Record<string, string> | undefined;
  const fallbackSectionValues = dictionaries.en[section] as
    | Record<string, string>
    | undefined;

  return sectionValues?.[item] ?? fallbackSectionValues?.[item] ?? key;
};
