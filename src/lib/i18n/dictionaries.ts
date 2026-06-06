export type Locale = 'en' | 'fr';

export const LOCALE_STORAGE_KEY = 'etherana.locale.v1';
export const LOCALE_CHANGED_EVENT = 'etherana-locale-changed';

export const locales: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
];

export const dictionaries = {
  en: {
    common: {
      language: 'Language',
      english: 'English',
      french: 'French',
      back: 'Back',
      version: 'Version',
      localWorkspace: 'Etherana SX local workspace',
      add: 'Add',
      save: 'Save',
      cancel: 'Cancel',
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
      preferences: 'Preferences',
      preferencesDescription: 'Customize your application preferences.',
      personalization: 'Personalization',
      personalizationDescription: 'Customize the behavior and tone of the model.',
      models: 'Models',
      modelsDescription: 'Connect to AI services and manage connections.',
      search: 'Search',
      searchDescription: 'Manage search settings.',
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
    searchPage: {
      serverError: 'Failed to connect to the server. Please try again later.',
      askAnything: 'Ask anything...',
      createNewSpace: 'Create new Space',
      results: 'Results',
      agent: 'Agent',
      resultsTitle: 'Show normal search results',
      agentTitle: 'Use the AI agent',
      couldNotLoadNews: 'Could not load news.',
      noNewsPreview: 'No news preview available.',
      news: 'News',
    },
    models: {
      selectModels: 'Select models',
      manageConnections: 'Manage connections',
      addConnection: 'Add Connection',
      addNewConnection: 'Add new connection',
      selectConnectionType: 'Select connection type',
      connectionName: 'Connection Name*',
      connectionNamePlaceholder: 'e.g., My OpenAI Connection',
      noConnections: 'No connections yet',
      noConnectionsDescription:
        'Add your first connection to start using AI models. Connect to OpenAI, Anthropic, Ollama, and more.',
      chatModels: 'Chat Models',
      embeddingModels: 'Embedding Models',
      noChatModels: 'No chat models configured',
      noEmbeddingModels: 'No embedding models configured',
      configured: 'configured',
      modelSingular: 'model',
      modelPlural: 'models',
      addNewChatModel: 'Add new chat model',
      addNewEmbeddingModel: 'Add new embedding model',
      modelName: 'Model name*',
      modelKey: 'Model key*',
      modelNamePlaceholder: 'e.g., GPT-4',
      modelKeyPlaceholder: 'e.g., gpt-4',
      addModel: 'Add Model',
      modelDeleted: 'Model deleted successfully.',
      modelDeleteFailed: 'Failed to delete model.',
      modelAdded: 'Model added successfully.',
      modelAddFailed: 'Failed to add model.',
      connectionAdded: 'Connection added successfully.',
      connectionAddFailed: 'Failed to add connection.',
    },
  },
  fr: {
    common: {
      language: 'Langue',
      english: 'Anglais',
      french: 'Français',
      back: 'Retour',
      version: 'Version',
      localWorkspace: 'Espace de travail local Etherana SX',
      add: 'Ajouter',
      save: 'Enregistrer',
      cancel: 'Annuler',
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
      preferences: 'Préférences',
      preferencesDescription: 'Personnalisez les préférences de l’application.',
      personalization: 'Personnalisation',
      personalizationDescription:
        'Personnalisez le comportement et le ton du modèle.',
      models: 'Modèles',
      modelsDescription: 'Connectez vos services IA et gérez les connexions.',
      search: 'Recherche',
      searchDescription: 'Gérez les paramètres de recherche.',
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
    searchPage: {
      serverError: 'Impossible de se connecter au serveur. Veuillez réessayer plus tard.',
      askAnything: 'Posez votre question...',
      createNewSpace: 'Créer un nouvel espace',
      results: 'Résultats',
      agent: 'Agent',
      resultsTitle: 'Afficher les résultats de recherche classiques',
      agentTitle: 'Utiliser l’agent IA',
      couldNotLoadNews: 'Impossible de charger les actualités.',
      noNewsPreview: 'Aucun aperçu d’actualité disponible.',
      news: 'Actualités',
    },
    models: {
      selectModels: 'Choisir les modèles',
      manageConnections: 'Gérer les connexions',
      addConnection: 'Ajouter une connexion',
      addNewConnection: 'Ajouter une nouvelle connexion',
      selectConnectionType: 'Choisir le type de connexion',
      connectionName: 'Nom de la connexion*',
      connectionNamePlaceholder: 'ex. Ma connexion OpenAI',
      noConnections: 'Aucune connexion pour le moment',
      noConnectionsDescription:
        'Ajoutez votre première connexion pour utiliser des modèles IA. Connectez OpenAI, Anthropic, Ollama, et plus encore.',
      chatModels: 'Modèles de chat',
      embeddingModels: 'Modèles d’embedding',
      noChatModels: 'Aucun modèle de chat configuré',
      noEmbeddingModels: 'Aucun modèle d’embedding configuré',
      configured: 'configuré(s)',
      modelSingular: 'modèle',
      modelPlural: 'modèles',
      addNewChatModel: 'Ajouter un modèle de chat',
      addNewEmbeddingModel: 'Ajouter un modèle d’embedding',
      modelName: 'Nom du modèle*',
      modelKey: 'Clé du modèle*',
      modelNamePlaceholder: 'ex. GPT-4',
      modelKeyPlaceholder: 'ex. gpt-4',
      addModel: 'Ajouter le modèle',
      modelDeleted: 'Modèle supprimé avec succès.',
      modelDeleteFailed: 'Échec de la suppression du modèle.',
      modelAdded: 'Modèle ajouté avec succès.',
      modelAddFailed: 'Échec de l’ajout du modèle.',
      connectionAdded: 'Connexion ajoutée avec succès.',
      connectionAddFailed: 'Échec de l’ajout de la connexion.',
    },
  },
} as const;

export type TranslationKey =
  | `common.${keyof typeof dictionaries.en.common}`
  | `sidebar.${keyof typeof dictionaries.en.sidebar}`
  | `settings.${keyof typeof dictionaries.en.settings}`
  | `searchPage.${keyof typeof dictionaries.en.searchPage}`
  | `models.${keyof typeof dictionaries.en.models}`;

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
