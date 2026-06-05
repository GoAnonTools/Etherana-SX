import db from '@/lib/db';
import { chats, messages } from '@/lib/db/schema';
import crypto from 'crypto';
import { desc, eq } from 'drizzle-orm';
import { Block } from '@/lib/types';
import { SearchSources } from '@/lib/agents/search/types';

interface VaultConversationMessage {
  messageId: string;
  backendId: string;
  query: string;
  createdAt: string;
  responseBlocks: Block[];
  status: 'answering' | 'completed' | 'error' | null;
}

interface VaultConversationChat {
  id: string;
  title: string;
  createdAt: string;
  sources: SearchSources[];
  files: { name: string; fileId: string }[];
  spaceId: string | null;
  messages: VaultConversationMessage[];
}

interface ImportPayload {
  conversations: VaultConversationChat[];
  spaceIdMap: Record<string, string>;
}

const generateId = () => crypto.randomBytes(20).toString('hex');

const safeSources = (sources: unknown): SearchSources[] => {
  return Array.isArray(sources) ? (sources as SearchSources[]) : [];
};

const safeFiles = (files: unknown): { name: string; fileId: string }[] => {
  if (!Array.isArray(files)) return [];

  return files.filter(
    (file): file is { name: string; fileId: string } =>
      typeof file?.name === 'string' && typeof file?.fileId === 'string',
  );
};

const safeBlocks = (blocks: unknown): Block[] => {
  return Array.isArray(blocks) ? (blocks as Block[]) : [];
};

export const GET = async () => {
  try {
    const allChats = await db.query.chats.findMany({
      orderBy: desc(chats.createdAt),
    });

    const conversations = await Promise.all(
      allChats.map(async (chat) => {
        const chatMessages = await db.query.messages.findMany({
          where: eq(messages.chatId, chat.id),
          orderBy: (messagesTable, { asc }) => [asc(messagesTable.id)],
        });

        return {
          id: chat.id,
          title: chat.title,
          createdAt: chat.createdAt,
          sources: safeSources(chat.sources),
          files: safeFiles(chat.files),
          spaceId: chat.spaceId ?? null,
          messages: chatMessages.map((message) => ({
            messageId: message.messageId,
            backendId: message.backendId,
            query: message.query,
            createdAt: message.createdAt,
            responseBlocks: safeBlocks(message.responseBlocks),
            status: message.status,
          })),
        };
      }),
    );

    return Response.json({ conversations });
  } catch (error) {
    console.error('Failed to export vault conversations:', error);

    return Response.json(
      { message: 'Failed to export conversations' },
      { status: 500 },
    );
  }
};

export const POST = async (req: Request) => {
  try {
    const body = (await req.json()) as ImportPayload;
    const conversations = Array.isArray(body.conversations)
      ? body.conversations
      : [];
    const spaceIdMap = body.spaceIdMap ?? {};

    let importedChats = 0;
    let importedMessages = 0;

    for (const conversation of conversations) {
      const newChatId = generateId();
      const newSpaceId = conversation.spaceId
        ? spaceIdMap[conversation.spaceId] ?? null
        : null;

      await db.insert(chats).values({
        id: newChatId,
        title: conversation.title || 'Imported conversation',
        createdAt: conversation.createdAt || new Date().toISOString(),
        sources: safeSources(conversation.sources),
        files: safeFiles(conversation.files),
        spaceId: newSpaceId,
      });

      importedChats += 1;

      for (const message of conversation.messages ?? []) {
        await db.insert(messages).values({
          messageId: message.messageId || generateId(),
          chatId: newChatId,
          backendId: message.backendId || generateId(),
          query: message.query || '',
          createdAt: message.createdAt || new Date().toISOString(),
          responseBlocks: safeBlocks(message.responseBlocks),
          status: message.status ?? 'completed',
        });

        importedMessages += 1;
      }
    }

    return Response.json({
      importedChats,
      importedMessages,
    });
  } catch (error) {
    console.error('Failed to import vault conversations:', error);

    return Response.json(
      { message: 'Failed to import conversations' },
      { status: 500 },
    );
  }
};
