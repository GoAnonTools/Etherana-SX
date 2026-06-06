import APISearchAgent from '@/lib/agents/search/api';
import type { SearchSources } from '@/lib/agents/search/types';
import configManager from '@/lib/config';
import ModelRegistry from '@/lib/models/registry';
import SessionManager from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AppRunBody = {
  appId?: string;
  appName?: string;
  category?: string;
  outputType?: string;
  prompt?: string;
};

const getFirstUsableModel = (
  models: Array<{ key?: string; name?: string }> | undefined,
) => {
  return models?.find((model) => model.key && model.key !== 'error');
};

const getOptimizationMode = () => {
  const mode = configManager.getConfig<string>(
    'preferences.optimizationMode',
    'balanced',
  );

  if (mode === 'speed' || mode === 'balanced' || mode === 'quality') {
    return mode;
  }

  return 'balanced';
};

const getAppSources = (body: AppRunBody): SearchSources[] => {
  const text = [
    body.appName,
    body.category,
    body.outputType,
    body.prompt,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const sources = new Set<SearchSources>();

  if (
    text.includes('research') ||
    text.includes('news') ||
    text.includes('market') ||
    text.includes('competitor') ||
    text.includes('trend') ||
    text.includes('regulatory') ||
    text.includes('watch') ||
    text.includes('latest')
  ) {
    sources.add('web');
  }

  if (
    text.includes('academic') ||
    text.includes('study') ||
    text.includes('paper') ||
    text.includes('quiz')
  ) {
    sources.add('academic');
  }

  if (
    text.includes('reddit') ||
    text.includes('forum') ||
    text.includes('community') ||
    text.includes('discussion')
  ) {
    sources.add('discussions');
  }

  return Array.from(sources);
};

const runAppWithAgent = async (body: AppRunBody) => {
  const registry = new ModelRegistry();
  const providers = await registry.getActiveProviders();

  const chatProvider = providers.find((provider) =>
    getFirstUsableModel(provider.chatModels),
  );
  const embeddingProvider = providers.find((provider) =>
    getFirstUsableModel(provider.embeddingModels),
  );

  const chatModel = getFirstUsableModel(chatProvider?.chatModels);
  const embeddingModel = getFirstUsableModel(embeddingProvider?.embeddingModels);

  if (!chatProvider || !chatModel?.key) {
    throw new Error('No configured chat model is available for Apps.');
  }

  if (!embeddingProvider || !embeddingModel?.key) {
    throw new Error('No configured embedding model is available for Apps.');
  }

  const [llm, embedding] = await Promise.all([
    registry.loadChatModel(chatProvider.id, chatModel.key),
    registry.loadEmbeddingModel(embeddingProvider.id, embeddingModel.key),
  ]);

  const session = SessionManager.createSession();
  const agent = new APISearchAgent();

  const systemInstructions = [
    configManager.getConfig<string>('personalization.instructions', ''),
    `You are Etherana SX running a reusable Small App.

Small App: ${body.appName || 'Untitled App'}
Category: ${body.category || 'App'}
Expected output type: ${body.outputType || 'Output'}

Produce the final reusable output directly.

Small App output rules:
1. Use only the information provided by the user in the app inputs.
2. Do not invent missing names, payment details, deadlines, fees, contact details, or legal terms.
3. Do not add citation markers like [1], [2], or source references unless actual sources were used and the user asked for citations.
4. Do not use placeholders like [Recipient Name] unless the user explicitly asked for a reusable template.
5. If important information is missing, either omit that section or write a short neutral sentence such as "Payment details were not provided."
6. Keep the output practical, clean, and ready to copy.
7. Do not mention file formats unless the user explicitly requested export instructions.`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return new Promise<{ content: string; sourceCount: number }>(
    (resolve, reject) => {
      let content = '';
      let sourceCount = 0;
      let settled = false;

      const timeout = setTimeout(() => {
        fail(new Error('Small App execution timed out.'));
      }, 180_000);

      const finish = () => {
        if (settled) return;

        settled = true;
        clearTimeout(timeout);
        session.removeAllListeners();

        const cleanContent = content.trim();

        if (!cleanContent) {
          reject(new Error('Small App returned empty content.'));
          return;
        }

        resolve({
          content: cleanContent,
          sourceCount,
        });
      };

      const fail = (error: unknown) => {
        if (settled) return;

        settled = true;
        clearTimeout(timeout);
        session.removeAllListeners();

        reject(
          error instanceof Error
            ? error
            : new Error('Small App execution failed.'),
        );
      };

      session.subscribe((event: string, data: Record<string, any>) => {
        if (event === 'data') {
          if (data.type === 'response') {
            content += data.data || '';
          }

          if (data.type === 'searchResults' && Array.isArray(data.data)) {
            sourceCount = data.data.length;
          }
        }

        if (event === 'end') {
          finish();
        }

        if (event === 'error') {
          fail(
            new Error(
              typeof data?.data === 'string'
                ? data.data
                : 'Small App execution failed.',
            ),
          );
        }
      });

      agent
        .searchAsync(session, {
          chatHistory: [],
          followUp: body.prompt || '',
          chatId: `app-${body.appId || 'custom'}-${crypto.randomUUID()}`,
          messageId: crypto.randomUUID(),
          config: {
            llm,
            embedding,
            sources: getAppSources(body),
            mode: getOptimizationMode(),
            fileIds: [],
            systemInstructions,
          },
        })
        .catch(fail);
    },
  );
};

export const POST = async (req: Request) => {
  try {
    const body = (await req.json()) as AppRunBody;

    if (!body.prompt?.trim()) {
      return Response.json(
        { message: 'Missing app prompt.' },
        { status: 400 },
      );
    }

    const result = await runAppWithAgent(body);

    return Response.json({
      content: result.content,
      sourceCount: result.sourceCount,
    });
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Small App execution failed.',
      },
      { status: 500 },
    );
  }
};
