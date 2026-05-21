import configManager from '@/lib/config';
import ModelRegistry from '@/lib/models/registry';
import { NextRequest, NextResponse } from 'next/server';
import { ConfigModelProvider } from '@/lib/config/types';

type SaveConfigBody = {
  key: string;
  value: string;
};

const redactProviderConfig = (config: Record<string, string>): Record<string, string> => {
  return Object.fromEntries(
    Object.entries(config).map(([k, v]) => [k, v ? '**redacted**' : v]),
  );
};

const ALLOWED_CONFIG_KEY_PREFIXES = ['preferences.', 'personalization.', 'search.'];

const isAllowedConfigKey = (key: string): boolean =>
  ALLOWED_CONFIG_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));

export const GET = async (req: NextRequest) => {
  try {
    const values = configManager.getCurrentConfig();
    const fields = configManager.getUIConfigSections();

    const modelRegistry = new ModelRegistry();
    const modelProviders = await modelRegistry.getActiveProviders();

    values.modelProviders = values.modelProviders.map(
      (mp: ConfigModelProvider) => {
        const activeProvider = modelProviders.find((p) => p.id === mp.id);

        return {
          ...mp,
          config: redactProviderConfig(mp.config),
          chatModels: activeProvider?.chatModels ?? mp.chatModels,
          embeddingModels:
            activeProvider?.embeddingModels ?? mp.embeddingModels,
        };
      },
    );

    return NextResponse.json({
      values,
      fields,
    });
  } catch (err) {
    console.error('Error in getting config: ', err);
    return Response.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
};

export const POST = async (req: NextRequest) => {
  try {
    const body: SaveConfigBody = await req.json();

    if (!body.key || body.value === undefined) {
      return Response.json(
        { message: 'Key and value are required.' },
        { status: 400 },
      );
    }

    if (!isAllowedConfigKey(body.key)) {
      return Response.json(
        { message: `Config key "${body.key}" is not writable.` },
        { status: 403 },
      );
    }

    configManager.updateConfig(body.key, body.value);

    return Response.json(
      { message: 'Config updated successfully.' },
      { status: 200 },
    );
  } catch (err) {
    console.error('Error in updating config: ', err);
    return Response.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
};