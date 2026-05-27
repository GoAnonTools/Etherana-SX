import OpenAI from 'openai';
import BaseLLM from '../../base/llm';
import { zodTextFormat, zodResponseFormat } from 'openai/helpers/zod';
import {
  GenerateObjectInput,
  GenerateOptions,
  GenerateTextInput,
  GenerateTextOutput,
  StreamTextOutput,
  ToolCall,
} from '../../types';
import { parse } from 'partial-json';
import z from 'zod';
import {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolMessageParam,
} from 'openai/resources/index.mjs';
import { Message } from '@/lib/types';
import { repairJson } from '@toolsycc/json-repair';

type OpenAIConfig = {
  apiKey: string;
  model: string;
  baseURL?: string;
  options?: GenerateOptions;
};

class OpenAILLM extends BaseLLM<OpenAIConfig> {
  openAIClient: OpenAI;

  // Fix #3: detect local/OpenAI-compat providers so we can strip parameters
  // that real OpenAI supports but local servers (LM Studio, Ollama shim,
  // LiteLLM, etc.) reject with a 400 "unknown field" error.
  // Local providers are identified by a custom baseURL that isn't api.openai.com.
  protected get isLocalProvider(): boolean {
    return (
      !!this.config.baseURL &&
      !this.config.baseURL.includes('api.openai.com')
    );
  }

  constructor(protected config: OpenAIConfig) {
    super(config);

    this.openAIClient = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL || 'https://api.openai.com/v1',
    });
  }

  convertToOpenAIMessages(messages: Message[]): ChatCompletionMessageParam[] {
    return messages.map((msg) => {
      if (msg.role === 'tool') {
        return {
          role: 'tool',
          tool_call_id: msg.id,
          content: msg.content,
        } as ChatCompletionToolMessageParam;
      } else if (msg.role === 'assistant') {
        return {
          role: 'assistant',
          content: msg.content,
          ...(msg.tool_calls &&
            msg.tool_calls.length > 0 && {
              tool_calls: msg.tool_calls?.map((tc) => ({
                id: tc.id,
                type: 'function',
                function: {
                  name: tc.name,
                  arguments: JSON.stringify(tc.arguments),
                },
              })),
            }),
        } as ChatCompletionAssistantMessageParam;
      }

      return msg;
    });
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
    const openaiTools: ChatCompletionTool[] = [];

    input.tools?.forEach((tool) => {
      openaiTools.push({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: z.toJSONSchema(tool.schema),
        },
      });
    });

    const response = await this.openAIClient.chat.completions.create({
      model: this.config.model,
      tools: openaiTools.length > 0 ? openaiTools : undefined,
      messages: this.convertToOpenAIMessages(input.messages),
      temperature:
        input.options?.temperature ?? this.config.options?.temperature ?? 1.0,
      top_p: input.options?.topP ?? this.config.options?.topP,
      // Local OpenAI-compat servers reject max_completion_tokens — use max_tokens instead
      ...(this.isLocalProvider
        ? { max_tokens: input.options?.maxTokens ?? this.config.options?.maxTokens }
        : { max_completion_tokens: input.options?.maxTokens ?? this.config.options?.maxTokens }),
      stop: input.options?.stopSequences ?? this.config.options?.stopSequences,
      frequency_penalty:
        input.options?.frequencyPenalty ??
        this.config.options?.frequencyPenalty,
      presence_penalty:
        input.options?.presencePenalty ?? this.config.options?.presencePenalty,
    });

    if (response.choices && response.choices.length > 0) {
      return {
        content: response.choices[0].message.content!,
        toolCalls:
          response.choices[0].message.tool_calls
            ?.map((tc) => {
              if (tc.type === 'function') {
                return {
                  name: tc.function.name,
                  id: tc.id,
                  arguments: JSON.parse(tc.function.arguments),
                };
              }
            })
            .filter((tc) => tc !== undefined) || [],
        additionalInfo: {
          finishReason: response.choices[0].finish_reason,
        },
      };
    }

    throw new Error('No response from OpenAI');
  }

  async *streamText(
    input: GenerateTextInput,
  ): AsyncGenerator<StreamTextOutput> {
    const openaiTools: ChatCompletionTool[] = [];

    input.tools?.forEach((tool) => {
      openaiTools.push({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: z.toJSONSchema(tool.schema),
        },
      });
    });

    const providerBaseURL = String(
      (this.config as any).baseURL ?? (this.config as any).baseUrl ?? '',
    ).toLowerCase();

    const isMistralProvider =
      providerBaseURL.includes('mistral') ||
      String(this.config.model || '').toLowerCase().includes('mistral');

    // Local llama-server and Mistral can reject OpenAI-style tool payloads
    // with a vague 400/no-body error. Keep Agent mode stable first.
    const safeTools =
      !this.isLocalProvider && !isMistralProvider && openaiTools.length > 0
        ? openaiTools
        : undefined;

    const maxTokens = input.options?.maxTokens ?? this.config.options?.maxTokens;

    const etheranaProviderFingerprint = JSON.stringify({
      model: this.config.model,
      provider: (this.config as any).provider,
      providerId: (this.config as any).providerId,
      name: (this.config as any).name,
      baseURL: (this.config as any).baseURL,
      baseUrl: (this.config as any).baseUrl,
      apiBaseURL: (this.config as any).apiBaseURL,
      apiBaseUrl: (this.config as any).apiBaseUrl,
      endpoint: (this.config as any).endpoint,
      url: (this.config as any).url,
    }).toLowerCase();

    const etheranaModelName = String(this.config.model || '').toLowerCase();

    const etheranaIsMistral =
      etheranaProviderFingerprint.includes('mistral') ||
      etheranaModelName.includes('mistral') ||
      etheranaModelName.includes('codestral') ||
      etheranaModelName.includes('magistral') ||
      etheranaModelName.includes('ministral');

    const etheranaRawModel = String(this.config.model || '');
    const etheranaRawModelLower = etheranaRawModel.toLowerCase();

    const etheranaLooksLikeMistralModel =
      etheranaRawModelLower.startsWith('mistral-') ||
      etheranaRawModelLower.startsWith('ministral-') ||
      etheranaRawModelLower.startsWith('codestral-') ||
      etheranaRawModelLower.startsWith('magistral-');

    const etheranaLooksLikeSecretModel =
      etheranaRawModel.length >= 24 &&
      !etheranaRawModel.includes('-') &&
      !etheranaLooksLikeMistralModel;

    const etheranaRuntimeModel =
      etheranaIsMistral && (!etheranaLooksLikeMistralModel || etheranaLooksLikeSecretModel)
        ? 'mistral-small-latest'
        : etheranaRawModel;

    const etheranaMessages = this.convertToOpenAIMessages(input.messages);

    // Mistral is stricter than local llama-server/OpenAI-compatible servers.
    // Normalize Agent messages into simple system/user/assistant string messages.
    const etheranaSafeMessages = etheranaIsMistral
      ? etheranaMessages.map((message: any) => {
          const cleanMessage: any = { ...message };

          if (!['system', 'user', 'assistant'].includes(cleanMessage.role)) {
            cleanMessage.role = 'user';
          }

          delete cleanMessage.tool_calls;
          delete cleanMessage.tool_call_id;
          delete cleanMessage.name;

          if (Array.isArray(cleanMessage.content)) {
            cleanMessage.content = cleanMessage.content
              .map((part: any) => {
                if (typeof part === 'string') return part;
                if (typeof part?.text === 'string') return part.text;
                if (typeof part?.content === 'string') return part.content;
                return '';
              })
              .filter(Boolean)
              .join('\n');
          }

          if (cleanMessage.content == null) {
            cleanMessage.content = '';
          }

          return cleanMessage;
        })
      : etheranaMessages;

    const etheranaMaxTokens =
      input.options?.maxTokens ?? this.config.options?.maxTokens;

    const etheranaPayload: any = {
      model: etheranaRuntimeModel,
      messages: etheranaSafeMessages,
      temperature:
        input.options?.temperature ?? this.config.options?.temperature ?? 1.0,
      top_p: input.options?.topP ?? this.config.options?.topP,
      stream: true,
    };

    // Do not send tools to Mistral/local for now. This avoids vague 400/no-body errors.
    if (!etheranaIsMistral && !this.isLocalProvider && openaiTools.length > 0) {
      etheranaPayload.tools = openaiTools;
    }

    if (etheranaMaxTokens !== undefined) {
      if (this.isLocalProvider || etheranaIsMistral) {
        etheranaPayload.max_tokens = etheranaMaxTokens;
      } else {
        etheranaPayload.max_completion_tokens = etheranaMaxTokens;
      }
    }

    // Keep Mistral minimal. Some OpenAI params can trigger provider-specific 400s.
    if (!etheranaIsMistral) {
      const stopSequences =
        input.options?.stopSequences ?? this.config.options?.stopSequences;
      const frequencyPenalty =
        input.options?.frequencyPenalty ??
        this.config.options?.frequencyPenalty;
      const presencePenalty =
        input.options?.presencePenalty ?? this.config.options?.presencePenalty;

      if (stopSequences !== undefined) etheranaPayload.stop = stopSequences;
      if (frequencyPenalty !== undefined) {
        etheranaPayload.frequency_penalty = frequencyPenalty;
      }
      if (presencePenalty !== undefined) {
        etheranaPayload.presence_penalty = presencePenalty;
      }
    }
    const stream = (await this.openAIClient.chat.completions.create({
      ...etheranaPayload,
      stream: true as const,
    } as any)) as unknown as AsyncIterable<any>;

    let recievedToolCalls: { name: string; id: string; arguments: string }[] =
      [];

    for await (const chunk of stream) {
      if (chunk.choices && chunk.choices.length > 0) {
        const toolCalls = chunk.choices[0].delta.tool_calls;
        yield {
          contentChunk: chunk.choices[0].delta.content || '',
          toolCallChunk:
            toolCalls?.map((tc: any) => {
              if (!recievedToolCalls[tc.index]) {
                const call = {
                  name: tc.function?.name!,
                  id: tc.id!,
                  arguments: tc.function?.arguments || '',
                };
                recievedToolCalls.push(call);
                return { ...call, arguments: parse(call.arguments || '{}') };
              } else {
                const existingCall = recievedToolCalls[tc.index];
                existingCall.arguments += tc.function?.arguments || '';
                return {
                  ...existingCall,
                  arguments: parse(existingCall.arguments),
                };
              }
            }) || [],
          done: chunk.choices[0].finish_reason !== null,
          additionalInfo: {
            finishReason: chunk.choices[0].finish_reason,
          },
        };
      }
    }
  }

  async generateObject<T>(input: GenerateObjectInput): Promise<T> {
    // fix: try json_schema first, fall back to json_object mode for providers that don't support it (Groq, Mistral, etc.)
    const commonParams = {
      messages: this.convertToOpenAIMessages(input.messages),
      model: this.config.model,
      temperature:
        input.options?.temperature ?? this.config.options?.temperature ?? 1.0,
      top_p: input.options?.topP ?? this.config.options?.topP,
      // Local OpenAI-compat servers reject max_completion_tokens — use max_tokens instead
      ...(this.isLocalProvider
        ? { max_tokens: input.options?.maxTokens ?? this.config.options?.maxTokens }
        : { max_completion_tokens: input.options?.maxTokens ?? this.config.options?.maxTokens }),
      stop: input.options?.stopSequences ?? this.config.options?.stopSequences,
      frequency_penalty:
        input.options?.frequencyPenalty ??
        this.config.options?.frequencyPenalty,
      presence_penalty:
        input.options?.presencePenalty ?? this.config.options?.presencePenalty,
    };

    let content: string | null = null;

    try {
      // First try: json_schema mode (OpenAI native)
      const response = await this.openAIClient.chat.completions.parse({
        ...commonParams,
        response_format: zodResponseFormat(input.schema, 'object'),
      });
      if (response.choices && response.choices.length > 0) {
        content = response.choices[0].message.content;
      }
    } catch (err: any) {
      // Fallback: json_object mode for providers that don't support json_schema
      if (err?.status === 400 || err?.code === 'model_not_found' || String(err).includes('response_format')) {
        const response = await this.openAIClient.chat.completions.create({
          ...commonParams,
          response_format: { type: 'json_object' },
        });
        if (response.choices && response.choices.length > 0) {
          content = response.choices[0].message.content;
        }
      } else {
        throw err;
      }
    }

    if (content) {
      try {
        return input.schema.parse(
          JSON.parse(
            repairJson(content, {
              extractJson: true,
            }) as string,
          ),
        ) as T;
      } catch (err) {
        throw new Error(`Error parsing response from OpenAI: ${err}`);
      }
    }

    throw new Error('No response from OpenAI');
  }

  async *streamObject<T>(input: GenerateObjectInput): AsyncGenerator<T> {
    let recievedObj: string = '';

    const stream = this.openAIClient.responses.stream({
      model: this.config.model,
      input: input.messages,
      temperature:
        input.options?.temperature ?? this.config.options?.temperature ?? 1.0,
      top_p: input.options?.topP ?? this.config.options?.topP,
      max_completion_tokens:
        input.options?.maxTokens ?? this.config.options?.maxTokens,
      stop: input.options?.stopSequences ?? this.config.options?.stopSequences,
      frequency_penalty:
        input.options?.frequencyPenalty ??
        this.config.options?.frequencyPenalty,
      presence_penalty:
        input.options?.presencePenalty ?? this.config.options?.presencePenalty,
      text: {
        format: zodTextFormat(input.schema, 'object'),
      },
    });

    for await (const chunk of stream) {
      if (chunk.type === 'response.output_text.delta' && chunk.delta) {
        recievedObj += chunk.delta;

        try {
          yield parse(recievedObj) as T;
        } catch (err) {
          console.log('Error parsing partial object from OpenAI:', err);
          yield {} as T;
        }
      } else if (chunk.type === 'response.output_text.done' && chunk.text) {
        try {
          yield parse(chunk.text) as T;
        } catch (err) {
          throw new Error(`Error parsing response from OpenAI: ${err}`);
        }
      }
    }
  }
}

export default OpenAILLM;