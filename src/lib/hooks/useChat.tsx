'use client';

import { captureAutomationOutputContent } from '@/lib/vault/localVault';

import { Message } from '@/components/ChatWindow';
import { Block } from '@/lib/types';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { getSuggestions } from '../actions';
import { MinimalProvider } from '../models/types';
import { getAutoMediaSearch } from '../config/clientRegistry';
import { applyPatch } from 'rfc6902';
import { Widget } from '@/components/ChatWindow';

export type Section = {
  message: Message;
  widgets: Widget[];
  parsedTextBlocks: string[];
  speechMessage: string;
  thinkingEnded: boolean;
  suggestions?: string[];
};

type ChatContext = {
  messages: Message[];
  sections: Section[];
  chatHistory: [string, string][];
  files: File[];
  fileIds: string[];
  sources: string[];
  chatId: string | undefined;
  optimizationMode: string;
  isMessagesLoaded: boolean;
  loading: boolean;
  notFound: boolean;
  messageAppeared: boolean;
  isReady: boolean;
  hasError: boolean;
  chatModelProvider: ChatModelProvider;
  embeddingModelProvider: EmbeddingModelProvider;
  researchEnded: boolean;
  setResearchEnded: (ended: boolean) => void;
  setOptimizationMode: (mode: string) => void;
  searchMode: SearchMode;
  setSearchMode: (mode: SearchMode) => void;
  setSources: (sources: string[]) => void;
  setFiles: (files: File[]) => void;
  setFileIds: (fileIds: string[]) => void;
  sendMessage: (
    message: string,
    messageId?: string,
    rewrite?: boolean,
  ) => Promise<void>;
  rewrite: (messageId: string) => void;
  setChatModelProvider: (provider: ChatModelProvider) => void;
  setEmbeddingModelProvider: (provider: EmbeddingModelProvider) => void;
  systemInstructions: string;
  setSystemInstructions: (instructions: string) => void;
  spaceId: string | null;
  setSpaceId: (spaceId: string | null) => void;
};

export interface File {
  fileName: string;
  fileExtension: string;
  fileId: string;
}

interface ChatModelProvider {
  key: string;
  providerId: string;
}

interface EmbeddingModelProvider {
  key: string;
  providerId: string;
}

type SearchMode = 'results' | 'agent';



const generateId = (bytes: number) => {
  if (
    typeof window !== 'undefined' &&
    window.crypto &&
    window.crypto.getRandomValues
  ) {
    const array = new Uint8Array(bytes);
    window.crypto.getRandomValues(array);
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

const checkConfig = async (
  setChatModelProvider: (provider: ChatModelProvider) => void,
  setEmbeddingModelProvider: (provider: EmbeddingModelProvider) => void,
  setIsConfigReady: (ready: boolean) => void,
  setHasError: (hasError: boolean) => void,
) => {
  try {
    let chatModelKey = localStorage.getItem('chatModelKey');
    let chatModelProviderId = localStorage.getItem('chatModelProviderId');
    let embeddingModelKey = localStorage.getItem('embeddingModelKey');
    let embeddingModelProviderId = localStorage.getItem(
      'embeddingModelProviderId',
    );

    const res = await fetch(`/api/providers`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(
        `Provider fetching failed with status code ${res.status}`,
      );
    }

    const data = await res.json();
    const providers: MinimalProvider[] = data.providers;

    if (providers.length === 0) {
      throw new Error(
        'No chat model providers found, please configure them in the settings page.',
      );
    }

    const chatModelProvider =
      providers.find((p) => p.id === chatModelProviderId) ??
      providers.find((p) => p.chatModels.length > 0);

    if (!chatModelProvider) {
      throw new Error(
        'No chat models found, pleae configure them in the settings page.',
      );
    }

    chatModelProviderId = chatModelProvider.id;

    const chatModel =
      chatModelProvider.chatModels.find((m) => m.key === chatModelKey) ??
      chatModelProvider.chatModels[0];
    chatModelKey = chatModel.key;

    const embeddingModelProvider =
      providers.find((p) => p.id === embeddingModelProviderId) ??
      providers.find((p) => p.embeddingModels.length > 0);

    if (!embeddingModelProvider) {
      throw new Error(
        'No embedding models found, pleae configure them in the settings page.',
      );
    }

    embeddingModelProviderId = embeddingModelProvider.id;

    const embeddingModel =
      embeddingModelProvider.embeddingModels.find(
        (m) => m.key === embeddingModelKey,
      ) ?? embeddingModelProvider.embeddingModels[0];
    embeddingModelKey = embeddingModel.key;

    localStorage.setItem('chatModelKey', chatModelKey);
    localStorage.setItem('chatModelProviderId', chatModelProviderId);
    localStorage.setItem('embeddingModelKey', embeddingModelKey);
    localStorage.setItem('embeddingModelProviderId', embeddingModelProviderId);

    setChatModelProvider({
      key: chatModelKey,
      providerId: chatModelProviderId,
    });

    setEmbeddingModelProvider({
      key: embeddingModelKey,
      providerId: embeddingModelProviderId,
    });

    setIsConfigReady(true);
  } catch (err: any) {
    console.error('An error occurred while checking the configuration:', err);
    toast.error(err.message);
    setIsConfigReady(false);
    setHasError(true);
  }
};

const loadMessages = async (
  chatId: string,
  setMessages: (messages: Message[]) => void,
  setIsMessagesLoaded: (loaded: boolean) => void,
  chatHistory: React.MutableRefObject<[string, string][]>,
  setSources: (sources: string[]) => void,
  setNotFound: (notFound: boolean) => void,
  setFiles: (files: File[]) => void,
  setFileIds: (fileIds: string[]) => void,
  setSpaceId: (spaceId: string | null) => void,
) => {
  const res = await fetch(`/api/chats/${chatId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (res.status === 404) {
    setNotFound(true);
    setIsMessagesLoaded(true);
    return;
  }

  const data = await res.json();

  const messages = data.messages as Message[];

  setMessages(messages);

  const history: [string, string][] = [];
  messages.forEach((msg) => {
    history.push(['human', msg.query]);

    const textBlocks = msg.responseBlocks
      .filter(
        (block): block is Block & { type: 'text' } => block.type === 'text',
      )
      .map((block) => block.data)
      .join('\n');

    if (textBlocks) {
      history.push(['assistant', textBlocks]);
    }
  });

  console.debug(new Date(), 'app:messages_loaded');

  if (messages.length > 0) {
    document.title = messages[0].query;
  }

  const files = data.chat.files.map((file: any) => {
    return {
      fileName: file.name,
      fileExtension: file.name.split('.').pop(),
      fileId: file.fileId,
    };
  });

  setFiles(files);
  setFileIds(files.map((file: File) => file.fileId));

  setSpaceId(data.chat.spaceId || null);

  chatHistory.current = history;
  setSources(data.chat.sources);
  setIsMessagesLoaded(true);
};

export const chatContext = createContext<ChatContext>({
  chatHistory: [],
  chatId: '',
  fileIds: [],
  files: [],
  sources: [],
  hasError: false,
  isMessagesLoaded: false,
  isReady: false,
  loading: false,
  messageAppeared: false,
  messages: [],
  sections: [],
  notFound: false,
  optimizationMode: 'speed',
  searchMode: 'results',
  chatModelProvider: { key: '', providerId: '' },
  embeddingModelProvider: { key: '', providerId: '' },
  researchEnded: false,
  rewrite: () => {},
  sendMessage: async () => {},
  setFileIds: () => {},
  setFiles: () => {},
  setSources: () => {},
  setOptimizationMode: () => {},
  setSearchMode: () => {},
  setChatModelProvider: () => {},
  setEmbeddingModelProvider: () => {},
  setResearchEnded: () => {},
  systemInstructions: '',
  setSystemInstructions: () => {},
  spaceId: null,
  setSpaceId: () => {},
});

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const params: { chatId: string } = useParams();

  const searchParams = useSearchParams();
  const initialMessage = searchParams.get('q');
  const initialMode = searchParams.get('mode');
  const initialOutputId = searchParams.get('outputId');

  const [chatId, setChatId] = useState<string | undefined>(params.chatId);
  const [spaceId, setSpaceId] = useState<string | null>(
    searchParams.get('spaceId'),
  );
  const [newChatCreated, setNewChatCreated] = useState(false);

  const [loading, setLoading] = useState(false);
  const [messageAppeared, setMessageAppeared] = useState(false);

  const [researchEnded, setResearchEnded] = useState(false);

  const chatHistory = useRef<[string, string][]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [files, setFiles] = useState<File[]>([]);
  const [fileIds, setFileIds] = useState<string[]>([]);

  const [sources, setSources] = useState<string[]>([]);
  const [optimizationMode, setOptimizationMode] = useState<'speed' | 'balanced' | 'quality'>(() => {
    if (typeof window === 'undefined') return 'speed';
    const stored = localStorage.getItem('optimizationMode');
    if (stored === 'speed' || stored === 'balanced' || stored === 'quality') return stored;
    return 'speed';
  });
  const [searchMode, setSearchMode] = useState<SearchMode>(() => initialMode === 'agent' ? 'agent' : 'results');

  useEffect(() => {
    if (initialMode === 'agent' || initialMode === 'results') {
      setSearchMode(initialMode);
    }
  }, [initialMode]);
  const [isMessagesLoaded, setIsMessagesLoaded] = useState(false);

  const [notFound, setNotFound] = useState(false);

  const [chatModelProvider, setChatModelProvider] = useState<ChatModelProvider>(
    {
      key: '',
      providerId: '',
    },
  );

  const [embeddingModelProvider, setEmbeddingModelProvider] =
    useState<EmbeddingModelProvider>({
      key: '',
      providerId: '',
    });

  const [isConfigReady, setIsConfigReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // B10: store systemInstructions in React state so it's reactive (settings
  // dialog changes take effect immediately), testable, and SSR-safe (no raw
  // localStorage access inside the render path or inside sendMessage).
  const [systemInstructions, setSystemInstructionsState] = useState<string>(
    () => {
      if (typeof window === 'undefined') return '';
      return localStorage.getItem('systemInstructions') ?? '';
    },
  );

  const setSystemInstructions = (instructions: string) => {
    setSystemInstructionsState(instructions);
    if (typeof window !== 'undefined') {
      localStorage.setItem('systemInstructions', instructions);
    }
  };

  const messagesRef = useRef<Message[]>([]);

  const sections = useMemo<Section[]>(() => {
    return messages.map((msg) => {
      const textBlocks: string[] = [];
      let speechMessage = '';
      let thinkingEnded = false;
      let suggestions: string[] = [];

      const sourceBlocks = msg.responseBlocks.filter(
        (block): block is Block & { type: 'source' } => block.type === 'source',
      );
      const sources = sourceBlocks.flatMap((block) => block.data);

      const widgetBlocks = msg.responseBlocks
        .filter((b) => b.type === 'widget')
        .map((b) => b.data) as Widget[];

      msg.responseBlocks.forEach((block) => {
        if (block.type === 'text') {
          let processedText = block.data;
          const citationRegex = /\[([^\]]+)\]/g;
          const regex = /\[(\d+)\]/g;

          if (processedText.includes('<think>')) {
            const openThinkTag = processedText.match(/<think/g)?.length || 0;
            const closeThinkTag =
              processedText.match(/<\/think>/g)?.length || 0;

            if (openThinkTag && !closeThinkTag) {
              processedText += ' <a> </a>';
            }
          }

          if (block.data.includes('</think>')) {
            thinkingEnded = true;
          }

          if (sources.length > 0) {
            processedText = processedText.replace(
              citationRegex,
              (_, capturedContent: string) => {
                const numbers = capturedContent
                  .split(',')
                  .map((numStr) => numStr.trim());

                const linksHtml = numbers
                  .map((numStr) => {
                    const number = parseInt(numStr);

                    if (isNaN(number) || number <= 0) {
                      return `[${numStr}]`;
                    }

                    const source = sources[number - 1];
                    const url = source?.metadata?.url;

                    if (url) {
                      return `<citation href="${url}">${numStr}</citation>`;
                    } else {
                      return ``;
                    }
                  })
                  .join('');

                return linksHtml;
              },
            );
            speechMessage += block.data.replace(regex, '');
          } else {
            processedText = processedText.replace(regex, '');
            speechMessage += block.data.replace(regex, '');
          }

          textBlocks.push(processedText);
        } else if (block.type === 'suggestion') {
          suggestions = block.data;
        }
      });

      return {
        message: msg,
        parsedTextBlocks: textBlocks,
        speechMessage,
        thinkingEnded,
        suggestions,
        widgets: widgetBlocks,
      };
    });
  }, [messages]);

  const isReconnectingRef = useRef(false);
  const handledMessageEndRef = useRef<Set<string>>(new Set());

  // Refs to coordinate the /?q=xxx reset with the auto-send effect.
  // resetForQRef tracks the last q param we've processed, preventing
  // infinite loops when the reset causes state changes.
  // resetInProgressRef is a synchronous flag that blocks the auto-send
  // effect in the same render cycle where the reset fires (React state
  // updates from effects are batched and not visible to other effects
  // in the same cycle, but ref updates are immediate).
  const resetForQRef = useRef<string | null>(null);
  const resetInProgressRef = useRef(false);

  const checkReconnect = async () => {
    if (isReconnectingRef.current) return;

    setIsReady(true);
    console.debug(new Date(), 'app:ready');

    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];

      if (lastMsg.status === 'answering') {
        setLoading(true);
        setResearchEnded(false);
        setMessageAppeared(false);

        isReconnectingRef.current = true;

        // Fix B6: wrap the entire reconnect in try/catch/finally so that a
        // stale backendId (server restarted, session gone) or any network
        // failure does not permanently block future reconnect attempts and
        // does not leave the UI stuck in a loading state.
        try {
          const res = await fetch(`/api/reconnect/${lastMsg.backendId}`, {
            method: 'POST',
          });

          if (!res.ok) {
            // Session is gone — mark the message as errored and move on.
            console.warn(`Reconnect failed with status ${res.status}, session likely expired.`);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.messageId === lastMsg.messageId
                  ? { ...msg, status: 'error' as const }
                  : msg,
              ),
            );
            return;
          }

          if (!res.body) throw new Error('No response body on reconnect');

          const reader = res.body.getReader();
          const decoder = new TextDecoder('utf-8');

          let partialChunk = '';

          const messageHandler = getMessageHandler(lastMsg);

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            // Fix B4 (reconnect path): keep incomplete last line as partial
            // tail instead of discarding it on a successful parse batch.
            partialChunk += decoder.decode(value, { stream: true });
            const lines = partialChunk.split('\n');
            partialChunk = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const json = JSON.parse(line);
                messageHandler(json);
              } catch {
                console.warn('Malformed reconnect event line, skipping:', line);
              }
            }
          }
        } catch (err) {
          console.error('Reconnect error:', err);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.messageId === lastMsg.messageId
                ? { ...msg, status: 'error' as const }
                : msg,
            ),
          );
        } finally {
          // Always reset — no matter what happened above.
          isReconnectingRef.current = false;
          setLoading(false);
        }
      }
    }
  };

  useEffect(() => {
    checkConfig(
      setChatModelProvider,
      setEmbeddingModelProvider,
      setIsConfigReady,
      setHasError,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (params.chatId && params.chatId !== chatId) {
      setChatId(params.chatId);
      setMessages([]);
      chatHistory.current = [];
      setFiles([]);
      setFileIds([]);
      setIsMessagesLoaded(false);
      setNotFound(false);
      setNewChatCreated(false);
      // B9: clear the dedup set so messageEnd events from the new chat are
      // never silently dropped because a stale id from a previous chat
      // happens to collide, and so reconnect re-delivery always completes.
      handledMessageEndRef.current = new Set();
    }
  }, [params.chatId, chatId]);

  // When navigating to /?spaceId=xxx (e.g. from a Space detail page),
  // reset the entire chat state so a fresh conversation is started
  // within that Space. Without this, the old chatId and null spaceId
  // persist because ChatProvider lives in the root layout and never
  // unmounts during navigation.
  useEffect(() => {
    const urlSpaceId = searchParams.get('spaceId');
    if (urlSpaceId && urlSpaceId !== spaceId) {
      setSpaceId(urlSpaceId);
      setChatId(generateId(20));
      setMessages([]);
      chatHistory.current = [];
      setFiles([]);
      setFileIds([]);
      setSources([]);
      setNewChatCreated(true);
      setIsMessagesLoaded(true);
      setNotFound(false);
      setLoading(false);
      setResearchEnded(false);
      handledMessageEndRef.current = new Set();
    }
  }, [searchParams, spaceId]);

  // When navigating to /?q=xxx from a preset or external entry point, reset the
  // chat state so a fresh conversation starts. Without this, the old
  // chatId persists because ChatProvider lives in the root layout and
  // never unmounts during navigation — so clicking the same preset sends
  // the prompt into the existing chat instead of creating a new one.
  //
  // The resetForQRef prevents infinite loops by tracking the last `q`
  // value we processed. The resetInProgressRef blocks the auto-send
  // effect in the same render cycle (refs update synchronously, state
  // updates are batched and not visible to other effects until the
  // next render). On the next render, chatId has changed, the
  // auto-send effect re-fires, and it sends to the correct new chat.
  useEffect(() => {
    const urlQ = searchParams.get('q');
    if (urlQ && !params.chatId) {
      // Only process if this is a new q value we haven't handled yet
      if (resetForQRef.current !== urlQ) {
        resetForQRef.current = urlQ;
        // Only reset if we're coming from an existing conversation
        if (messages.length > 0) {
          resetInProgressRef.current = true;
          setChatId(generateId(20));
          setMessages([]);
          chatHistory.current = [];
          setFiles([]);
          setFileIds([]);
          setSources([]);
          setNewChatCreated(true);
          setIsMessagesLoaded(true);
          setNotFound(false);
          setLoading(false);
          setResearchEnded(false);
          handledMessageEndRef.current = new Set();
        }
      }
    } else if (!urlQ || params.chatId) {
      // Clear the ref when navigating away from /?q=xxx so that
      // clicking the same preset again triggers a fresh reset.
      resetForQRef.current = null;
    }
  }, [searchParams, params.chatId]);

  useEffect(() => {
    if (
      chatId &&
      !newChatCreated &&
      !isMessagesLoaded &&
      messages.length === 0
    ) {
      loadMessages(
        chatId,
        setMessages,
        setIsMessagesLoaded,
        chatHistory,
        setSources,
        setNotFound,
        setFiles,
        setFileIds,
        setSpaceId,
      );
    } else if (!chatId) {
      setNewChatCreated(true);
      setIsMessagesLoaded(true);
      setChatId(generateId(20));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, isMessagesLoaded, newChatCreated, messages.length]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (isMessagesLoaded && isConfigReady && newChatCreated) {
      setIsReady(true);
      console.debug(new Date(), 'app:ready');
    } else if (isMessagesLoaded && isConfigReady && !newChatCreated) {
      checkReconnect();
    } else {
      setIsReady(false);
    }
  }, [isMessagesLoaded, isConfigReady, newChatCreated]);

  const rewrite = (messageId: string) => {
    const index = messages.findIndex((msg) => msg.messageId === messageId);

    if (index === -1) return;

    setMessages((prev) => prev.slice(0, index));

    chatHistory.current = chatHistory.current.slice(0, index * 2);

    const messageToRewrite = messages[index];
    sendMessage(messageToRewrite.query, messageToRewrite.messageId, true);
  };

  useEffect(() => {
    if (isReady && initialMessage && isConfigReady) {
      if (!isConfigReady) {
        toast.error('Cannot send message before the configuration is ready');
        return;
      }
      // If a q-param reset just fired in this same render cycle, skip
      // the send. The ref was set synchronously by the reset effect
      // above, so we can see it here even though state updates are
      // still batched. On the next render (with the new chatId),
      // this effect will re-fire because chatId is a dependency.
      if (resetInProgressRef.current) {
        resetInProgressRef.current = false;
        return;
      }
      sendMessage(initialMessage);
    }
  }, [isConfigReady, isReady, initialMessage, chatId]);

  const getMessageHandler = (message: Message) => {
    const messageId = message.messageId;

    return async (data: any) => {
      if (data.type === 'error') {
        toast.error(data.data);
        setLoading(false);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.messageId === messageId
              ? { ...msg, status: 'error' as const }
              : msg,
          ),
        );
        return;
      }

      if (data.type === 'researchComplete') {
        setResearchEnded(true);
        if (
          message.responseBlocks.find(
            (b) => b.type === 'source' && b.data.length > 0,
          )
        ) {
          setMessageAppeared(true);
        }
      }

      if (data.type === 'block') {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.messageId === messageId) {
              const exists = msg.responseBlocks.findIndex(
                (b) => b.id === data.block.id,
              );

              if (exists !== -1) {
                const existingBlocks = [...msg.responseBlocks];
                existingBlocks[exists] = data.block;

                return {
                  ...msg,
                  responseBlocks: existingBlocks,
                };
              }

              return {
                ...msg,
                responseBlocks: [...msg.responseBlocks, data.block],
              };
            }
            return msg;
          }),
        );

        if (
          (data.block.type === 'source' && data.block.data.length > 0) ||
          data.block.type === 'text'
        ) {
          setMessageAppeared(true);
        }
      }

      if (data.type === 'updateBlock') {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.messageId === messageId) {
              const updatedBlocks = msg.responseBlocks.map((block) => {
                if (block.id === data.blockId) {
                  const updatedBlock = { ...block };
                  applyPatch(updatedBlock, data.patch);
                  return updatedBlock;
                }
                return block;
              });
              return { ...msg, responseBlocks: updatedBlocks };
            }
            return msg;
          }),
        );
      }

      if (data.type === 'messageEnd') {
        if (handledMessageEndRef.current.has(messageId)) {
          return;
        }

        handledMessageEndRef.current.add(messageId);

        const currentMsg = messagesRef.current.find(
          (msg) => msg.messageId === messageId,
        );

        const newHistory: [string, string][] = [
          ...chatHistory.current,
          ['human', message.query],
          [
            'assistant',
            currentMsg?.responseBlocks.find((b) => b.type === 'text')?.data ||
              '',
          ],
        ];

        chatHistory.current = newHistory;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.messageId === messageId
              ? { ...msg, status: 'completed' as const }
              : msg,
          ),
        );

        setLoading(false);

        const lastMsg = messagesRef.current[messagesRef.current.length - 1];

        const autoMediaSearch = getAutoMediaSearch();

        if (autoMediaSearch) {
          setTimeout(() => {
            document
              .getElementById(`search-images-${lastMsg.messageId}`)
              ?.click();

            document
              .getElementById(`search-videos-${lastMsg.messageId}`)
              ?.click();
          }, 200);
        }

        // Check if there are sources and no suggestions

        const hasSourceBlocks = currentMsg?.responseBlocks.some(
          (block) => block.type === 'source' && block.data.length > 0,
        );
        const hasSuggestions = currentMsg?.responseBlocks.some(
          (block) => block.type === 'suggestion',
        );

        if (hasSourceBlocks && !hasSuggestions) {
          const suggestions = await getSuggestions(newHistory);
          const suggestionBlock: Block = {
            id: generateId(7),
            type: 'suggestion',
            data: suggestions,
          };

          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.messageId === messageId) {
                return {
                  ...msg,
                  responseBlocks: [...msg.responseBlocks, suggestionBlock],
                };
              }
              return msg;
            }),
          );
        }
      }
    };
  };

  const sendMessage: ChatContext['sendMessage'] = async (
    message,
    messageId,
    rewrite = false,
  ) => {
    if (loading || !message) return;

    // Guard: if the model config hasn't loaded yet, block the send and tell the
    // user rather than letting a request go out with empty providerId/key which
    // will result in a server-side 'Invalid provider id' error (500).
    if (!isConfigReady) {
      toast.error('Model config is still loading, please wait a moment.');
      return;
    }
    setLoading(true);
    setResearchEnded(false);
    setMessageAppeared(false);

    if (messages.length <= 1) {
      const urlParamsForChat =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search)
          : null;

      const preservedMode = urlParamsForChat?.get('mode') ?? null;
      const preservedOutputId =
        urlParamsForChat?.get('outputId') ?? initialOutputId;

      const nextChatParams = new URLSearchParams();

      if (preservedMode === 'agent') {
        nextChatParams.set('mode', 'agent');
      }

      if (preservedOutputId) {
        nextChatParams.set('outputId', preservedOutputId);
      }

      const nextChatQuery = nextChatParams.toString();
      const nextChatUrl = nextChatQuery
        ? `/c/${chatId}?${nextChatQuery}`
        : `/c/${chatId}`;

      window.history.replaceState(null, '', nextChatUrl);
    }

    messageId = messageId ?? generateId(7);
    const backendId = generateId(20);

    // Fix #2: compute messageIndex BEFORE adding the new message to state,
    // using the current messages array (which doesn't contain the new entry yet).
    // This gives the correct slice index for rewrite history truncation.
    const messageIndex = messages.findIndex((m) => m.messageId === messageId);

    const newMessage: Message = {
      messageId,
      chatId: chatId!,
      backendId,
      query: message,
      responseBlocks: [],
      status: 'answering',
      createdAt: new Date(),
    };

    setMessages((prevMessages) => [...prevMessages, newMessage]);

    const urlMode =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('mode')
        : null;

    const effectiveSearchMode: SearchMode =
      urlMode === 'agent' || urlMode === 'results' ? urlMode : searchMode;

    if (effectiveSearchMode === 'results' && fileIds.length === 0 && !spaceId) {
      try {
        const res = await fetch('/api/results', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: message,
            limit: 8,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Could not fetch results.');
        }

        const results = data.results ?? [];

        const resultText =
          results.length > 0
            ? [
                `### Results for "${message}"`,
                '',
                ...results.map((result: any, index: number) => {
                  const snippet = result.content
                    ? `\n${result.content}`
                    : '';
                  return `${index + 1}. [${result.title}](${result.url})${snippet}`;
                }),
              ].join('\n\n')
            : `No clear results found for "${message}". Try Agent mode for deeper research.`;

        const resultBlock: Block = {
          id: generateId(7),
          type: 'text',
          data: resultText,
        };

        setMessages((prev) =>
          prev.map((msg) =>
            msg.messageId === messageId
              ? {
                  ...msg,
                  responseBlocks: [resultBlock],
                  status: 'completed' as const,
                }
              : msg,
          ),
        );

        chatHistory.current = [
          ...chatHistory.current,
          ['human', message],
          // Fix B5: store a concise plain-text summary in chatHistory rather
          // than the full markdown results dump. When the user later switches
          // to Agent mode, the classifier and researcher see a clean history
          // entry instead of a markdown link list that looks like a prior AI
          // answer and causes it to skip search on follow-up questions.
          [
            'assistant',
            results.length > 0
              ? `Showed ${results.length} search results for "${message}": ${results.map((r: any) => r.title).join(', ')}.`
              : `No search results found for "${message}".`,
          ],
        ];

        setMessageAppeared(true);
        setResearchEnded(true);
        setLoading(false);
        return;
      } catch (err: any) {
        toast.error(err.message || 'Results search failed');
        setMessages((prev) =>
          prev.map((msg) =>
            msg.messageId === messageId
              ? { ...msg, status: 'error' as const }
              : msg,
          ),
        );
        setLoading(false);
        return;
      }
    }

    // Fix #1: wrap the entire agent fetch+stream path in try/catch so that
    // any failure (400, network error, bad JSON) shows a toast and resets
    // state cleanly instead of leaving the UI frozen in a loading state.
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
          message: {
            messageId: messageId,
            chatId: chatId!,
            content: message,
          },
          chatId: chatId!,
          files: fileIds,
          sources: sources,
          optimizationMode: optimizationMode,
          history: rewrite
            ? chatHistory.current.slice(
                0,
                messageIndex === -1 ? undefined : messageIndex,
              )
            : chatHistory.current,
          chatModel: {
            key: chatModelProvider.key,
            providerId: chatModelProvider.providerId,
          },
          embeddingModel: {
            key: embeddingModelProvider.key,
            providerId: embeddingModelProvider.providerId,
          },
          systemInstructions: systemInstructions,
          spaceId: spaceId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.message || `Server error ${res.status}`,
        );
      }

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');

      let partialChunk = '';

      const messageHandler = getMessageHandler(newMessage);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // Fix: accumulate the new chunk, then split on newlines keeping any
        // incomplete last line as the partial tail for the next iteration.
        // This prevents valid events from being silently dropped when a TCP
        // packet boundary falls mid-line.
        partialChunk += decoder.decode(value, { stream: true });
        const lines = partialChunk.split('\n');
        partialChunk = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            messageHandler(json);
          } catch {
            console.warn('Malformed event line, skipping:', line);
          }
        }
      }

      const captureFinalAgentOutput = () => {
        const outputIdToCapture =
          typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('outputId') ??
              initialOutputId
            : initialOutputId;

        if (!outputIdToCapture) return;

        const completedMessage = messagesRef.current.find(
          (msg) => msg.messageId === messageId,
        );

        const finalText =
          completedMessage?.responseBlocks
            ?.filter((block) => block.type === 'text')
            .map((block) => String(block.data ?? ''))
            .filter(Boolean)
            .join('\n\n')
            .trim() ?? '';

        captureAutomationOutputContent(outputIdToCapture, finalText);
      };

      captureFinalAgentOutput();

      if (typeof window !== 'undefined') {
        window.setTimeout(captureFinalAgentOutput, 300);
      }
    } catch (err: any) {
      console.error('Agent request failed:', err);
      toast.error(err.message || 'Agent request failed. Please try again.');
      setMessages((prev) =>
        prev.map((msg) =>
          msg.messageId === messageId
            ? { ...msg, status: 'error' as const }
            : msg,
        ),
      );
      setLoading(false);
    }
  };

  return (
    <chatContext.Provider
      value={{
        messages,
        sections,
        chatHistory: chatHistory.current,
        files,
        fileIds,
        sources,
        chatId,
        hasError,
        isMessagesLoaded,
        isReady,
        loading,
        messageAppeared,
        notFound,
        optimizationMode,
        searchMode,
        setSearchMode,
        setFileIds,
        setFiles,
        setSources,
        setOptimizationMode: (mode: string) => {
            if (mode === 'speed' || mode === 'balanced' || mode === 'quality') {
                setOptimizationMode(mode);
                localStorage.setItem('optimizationMode', mode);
            }
        },
        rewrite,
        sendMessage,
        setChatModelProvider,
        chatModelProvider,
        embeddingModelProvider,
        setEmbeddingModelProvider,
        researchEnded,
        setResearchEnded,
        systemInstructions,
        setSystemInstructions,
        spaceId,
        setSpaceId,
      }}
    >
      {children}
    </chatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(chatContext);
  return ctx;
};