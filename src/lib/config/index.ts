import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

import type {
  Config,
  ConfigModelProvider,
  UIConfigSections,
} from './types';

const CONFIG_DIR = process.env.ETHERANA_DATA_DIR || path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const createDefaultGemmaProvider = (): ConfigModelProvider => {
  const type = 'ollama';
  const name = 'Local Gemma 4';
  const config = {
    baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  };

  const provider: ConfigModelProvider = {
    id: 'local-gemma-4',
    name,
    type,
    chatModels: [
      {
        name: 'Gemma 4',
        key: process.env.ETHERANA_DEFAULT_GEMMA_MODEL || 'gemma4',
      },
    ],
    embeddingModels: [
      {
        name: 'Nomic Embed Text',
        key:
          process.env.ETHERANA_DEFAULT_EMBEDDING_MODEL || 'nomic-embed-text',
      },
    ],
    config,
    hash: crypto
      .createHash('sha256')
      .update(JSON.stringify({ type, name, config }))
      .digest('hex'),
  };

  return provider;
};

const getDefaultModelProviders = (): ConfigModelProvider[] => {
  if (process.env.ETHERANA_DISABLE_DEFAULT_GEMMA_PROVIDER === '1') {
    return [];
  }

  return [createDefaultGemmaProvider()];
};

const defaultConfig: Config = {
  version: 1,
  setupComplete: true,
  preferences: {
    theme: 'system',
    optimizationMode: 'balanced',
  },
  personalization: {
    instructions: '',
  },
  modelProviders: getDefaultModelProviders(),
  search: {
    searxngURL: process.env.SEARXNG_URL || 'http://localhost:8080',
  },
};

const uiConfigSections: UIConfigSections = {
  preferences: [
    {
      name: 'Optimization mode',
      key: 'preferences.optimizationMode',
      type: 'select',
      required: false,
      description: 'Default response mode for Etherana SX.',
      scope: 'client',
      default: 'balanced',
      options: [
        { name: 'Speed', value: 'speed' },
        { name: 'Balanced', value: 'balanced' },
        { name: 'Quality', value: 'quality' },
      ],
    },
  ],
  personalization: [
    {
      name: 'System instructions',
      key: 'personalization.instructions',
      type: 'textarea',
      required: false,
      description: 'Default custom instructions for your assistant.',
      scope: 'client',
      default: '',
    },
  ],
  modelProviders: [],
  search: [
    {
      name: 'SearXNG URL',
      key: 'search.searxngURL',
      type: 'string',
      required: true,
      description: 'URL used by Etherana SX for SearXNG web search.',
      scope: 'server',
      default: process.env.SEARXNG_URL || 'http://localhost:8080',
    },
  ],
};

class ConfigManager {
  private config: Config;

  constructor() {
    this.ensureConfigDir();
    this.config = this.loadConfig();
  }

  private ensureConfigDir() {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
  }

  private loadConfig(): Config {
    if (!fs.existsSync(CONFIG_FILE)) {
      this.saveConfig(defaultConfig);
      return structuredClone(defaultConfig);
    }

    try {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const parsedModelProviders =
        Array.isArray(parsed.modelProviders) && parsed.modelProviders.length > 0
          ? parsed.modelProviders
          : getDefaultModelProviders();

      return {
        ...structuredClone(defaultConfig),
        ...parsed,
        preferences: {
          ...defaultConfig.preferences,
          ...(parsed.preferences || {}),
        },
        personalization: {
          ...defaultConfig.personalization,
          ...(parsed.personalization || {}),
        },
        search: {
          ...defaultConfig.search,
          ...(parsed.search || {}),
        },
        modelProviders: parsedModelProviders,
      };
    } catch (err) {
      console.error('Failed to load config, using defaults:', err);
      return structuredClone(defaultConfig);
    }
  }

  private saveConfig(config: Config = this.config) {
    this.ensureConfigDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  }

  private getNestedValue(obj: any, key: string, fallback?: any) {
    return key.split('.').reduce((acc, part) => {
      if (acc && Object.prototype.hasOwnProperty.call(acc, part)) {
        return acc[part];
      }

      return undefined;
    }, obj) ?? fallback;
  }

  private setNestedValue(obj: any, key: string, value: any) {
    const parts = key.split('.');
    const last = parts.pop();

    if (!last) return;

    const target = parts.reduce((acc, part) => {
      if (!acc[part] || typeof acc[part] !== 'object') {
        acc[part] = {};
      }

      return acc[part];
    }, obj);

    target[last] = value;
  }

  isSetupComplete() {
    return Boolean(this.config.setupComplete);
  }

  markSetupComplete() {
    this.config.setupComplete = true;
    this.saveConfig();
  }

  getCurrentConfig() {
    return structuredClone(this.config);
  }

  getUIConfigSections() {
    return structuredClone(uiConfigSections);
  }

  getConfig<T = any>(key: string, fallback?: T): T {
    return this.getNestedValue(this.config, key, fallback) as T;
  }

  updateConfig(key: string, value: any) {
    this.setNestedValue(this.config, key, value);
    this.saveConfig();
  }

  addModelProvider(
    type: string,
    name: string,
    config: Record<string, any>,
  ): ConfigModelProvider {
    const provider: ConfigModelProvider = {
      id: crypto.randomUUID(),
      name,
      type,
      chatModels: [],
      embeddingModels: [],
      config,
      hash: crypto
        .createHash('sha256')
        .update(JSON.stringify({ type, name, config }))
        .digest('hex'),
    };

    this.config.modelProviders.push(provider);
    this.saveConfig();

    return provider;
  }

  removeModelProvider(providerId: string) {
    this.config.modelProviders = this.config.modelProviders.filter(
      (provider) => provider.id !== providerId,
    );

    this.saveConfig();
  }

  async updateModelProvider(
    providerId: string,
    name: string,
    config: Record<string, any>,
  ): Promise<ConfigModelProvider> {
    const provider = this.config.modelProviders.find(
      (item) => item.id === providerId,
    );

    if (!provider) {
      throw new Error(`Model provider "${providerId}" not found`);
    }

    provider.name = name;
    provider.config = config;
    provider.hash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ type: provider.type, name, config }))
      .digest('hex');

    this.saveConfig();

    return provider;
  }

  addProviderModel(
    providerId: string,
    type: 'embedding' | 'chat',
    model: any,
  ) {
    const provider = this.config.modelProviders.find(
      (item) => item.id === providerId,
    );

    if (!provider) {
      throw new Error(`Model provider "${providerId}" not found`);
    }

    if (type === 'chat') {
      provider.chatModels.push(model);
    } else {
      provider.embeddingModels.push(model);
    }

    this.saveConfig();

    return model;
  }

  removeProviderModel(
    providerId: string,
    type: 'embedding' | 'chat',
    modelKey: string,
  ) {
    const provider = this.config.modelProviders.find(
      (item) => item.id === providerId,
    );

    if (!provider) {
      throw new Error(`Model provider "${providerId}" not found`);
    }

    if (type === 'chat') {
      provider.chatModels = provider.chatModels.filter(
        (model) => model.key !== modelKey,
      );
    } else {
      provider.embeddingModels = provider.embeddingModels.filter(
        (model) => model.key !== modelKey,
      );
    }

    this.saveConfig();
  }
}

const configManager = new ConfigManager();

export default configManager;
