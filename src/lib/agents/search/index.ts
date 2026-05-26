import { ResearcherOutput, SearchAgentInput } from './types';
import SessionManager from '@/lib/session';
import { classify } from './classifier';
import Researcher from './researcher';
import { getWriterPrompt } from '@/lib/prompts/search/writer';
import { WidgetExecutor } from './widgets';
import db from '@/lib/db';
import { messages, spaces, chats } from '@/lib/db/schema';
import { and, eq, gt } from 'drizzle-orm';
import { TextBlock } from '@/lib/types';
import { getTokenCount } from '@/lib/utils/splitText';

class SearchAgent {
  async searchAsync(session: SessionManager, input: SearchAgentInput) {
    try {
      const exists = await db.query.messages.findFirst({
        where: and(
          eq(messages.chatId, input.chatId),
          eq(messages.messageId, input.messageId),
        ),
      });

      if (!exists) {
        await db.insert(messages).values({
          chatId: input.chatId,
          messageId: input.messageId,
          backendId: session.id,
          query: input.followUp,
          createdAt: new Date().toISOString(),
          status: 'answering',
          responseBlocks: [],
        });
      } else {
        await db
          .delete(messages)
          .where(
            and(eq(messages.chatId, input.chatId), gt(messages.id, exists.id)),
          )
          .execute();
        await db
          .update(messages)
          .set({
            status: 'answering',
            backendId: session.id,
            responseBlocks: [],
          })
          .where(
            and(
              eq(messages.chatId, input.chatId),
              eq(messages.messageId, input.messageId),
            ),
          )
          .execute();
      }

      const explicitResearchIntent =
        /\b(research|sources|cite|citation|compare|latest|news|find|search|report|analyse|analyze|deep dive|with sources)\b/i.test(
          input.followUp,
        );

      const shouldUseDirectSpeedAnswer =
        input.config.mode === 'speed' &&
        input.config.fileIds.length === 0 &&
        !input.spaceId &&
        !explicitResearchIntent;

      if (shouldUseDirectSpeedAnswer) {
        session.emit('data', {
          type: 'researchComplete',
        });

        const directPrompt = `
You are Etherana SX, a private local AI assistant.

The user selected Speed mode.
Answer directly and briefly.
Do not perform research.
Do not mention sources unless the user explicitly asks.
Do not add citations.

If the user enters only a product, website, app, company, or service name, treat it as a quick lookup request:
- give the most likely official link if you are confident
- add a one-sentence description
- keep the answer short

If you are not confident about an official link, say so instead of inventing one.
`.trim();

        const answerStream = input.config.llm.streamText({
          messages: [
            {
              role: 'system',
              content: directPrompt,
            },
            ...input.chatHistory.slice(-10),
            {
              role: 'user',
              content: input.followUp,
            },
          ],
        });

        let responseBlockId = '';

        for await (const chunk of answerStream) {
          if (!responseBlockId) {
            const block: TextBlock = {
              id: crypto.randomUUID(),
              type: 'text',
              data: chunk.contentChunk,
            };

            session.emitBlock(block);
            responseBlockId = block.id;
          } else {
            const block = session.getBlock(responseBlockId) as TextBlock | null;

            if (!block) {
              continue;
            }

            block.data += chunk.contentChunk;

            session.updateBlock(block.id, [
              {
                op: 'replace',
                path: '/data',
                value: block.data,
              },
            ]);
          }
        }

        session.emit('end', {});

        await db
          .update(messages)
          .set({
            status: 'completed',
            responseBlocks: session.getAllBlocks(),
          })
          .where(
            and(
              eq(messages.chatId, input.chatId),
              eq(messages.messageId, input.messageId),
            ),
          )
          .execute();

        return;
      }

      const classification = await classify({
        chatHistory: input.chatHistory,
        enabledSources: input.config.sources,
        query: input.followUp,
        llm: input.config.llm,
      });

      const widgetPromise = WidgetExecutor.executeAll({
        classification,
        chatHistory: input.chatHistory,
        followUp: input.followUp,
        llm: input.config.llm,
      }).then((widgetOutputs) => {
        widgetOutputs.forEach((o) => {
          session.emitBlock({
            id: crypto.randomUUID(),
            type: 'widget',
            data: {
              widgetType: o.type,
              params: o.data,
            },
          });
        });
        return widgetOutputs;
      });

      let searchPromise: Promise<ResearcherOutput> | null = null;
      let effectiveFileIds = [...input.config.fileIds];
      let effectiveSystemInstructions = input.config.systemInstructions;

      if (input.spaceId) {
        const space = await db.query.spaces.findFirst({
          where: eq(spaces.id, input.spaceId),
        });

        if (space) {
          if (space.files) {
            const spaceFileIds = space.files.map((f) => f.fileId);
            effectiveFileIds = Array.from(
              new Set([...effectiveFileIds, ...spaceFileIds]),
            );
          }

          if (space.instruction) {
            effectiveSystemInstructions = `${space.instruction}\n\n${effectiveSystemInstructions}`;
          }
        }
      }

      if (!classification.classification.skipSearch) {
        const researcher = new Researcher();
        searchPromise = researcher.research(session, {
          chatHistory: input.chatHistory,
          followUp: input.followUp,
          classification: classification,
          config: {
            ...input.config,
            fileIds: effectiveFileIds,
            systemInstructions: effectiveSystemInstructions,
          },
        });
      }

      const [widgetOutputs, searchResults] = await Promise.all([
        widgetPromise,
        searchPromise,
      ]);

      session.emit('data', {
        type: 'researchComplete',
      });

      let finalContext =
        '<Query to be answered without searching; Search not made>';

      if (searchResults) {
        finalContext = searchResults?.searchFindings
          .map(
            (f, index) =>
              `<result index=${index + 1} title=${f.metadata.title}>${f.content}</result>`,
          )
          .join('\n');
      }

      const widgetContext = widgetOutputs
        .map((o) => {
          return `<result>${o.llmContext}</result>`;
        })
        .join('\n-------------\n');

      const finalContextWithWidgets = `<search_results note="These are the search results and assistant can cite these">\n${finalContext}\n</search_results>\n<widgets_result noteForAssistant="Its output is already showed to the user, assistant can use this information to answer the query but do not CITE this as a souce">\n${widgetContext}\n</widgets_result>`;

      const writerPrompt = getWriterPrompt(
        finalContextWithWidgets,
        effectiveSystemInstructions,
        input.config.mode,
      );

      const answerStream = input.config.llm.streamText({
        messages: [
          {
            role: 'system',
            content: writerPrompt,
          },
          ...input.chatHistory.slice(-10),
          {
            role: 'user',
            content:
              input.followUp === classification.standaloneFollowUp
                ? input.followUp
                : `${input.followUp} (Note: This is a follow-up to the conversation. Specifically: ${classification.standaloneFollowUp})`,
          },
        ],
      });

      let responseBlockId = '';

      for await (const chunk of answerStream) {
        if (!responseBlockId) {
          const block: TextBlock = {
            id: crypto.randomUUID(),
            type: 'text',
            data: chunk.contentChunk,
          };

          session.emitBlock(block);

          responseBlockId = block.id;
        } else {
          const block = session.getBlock(responseBlockId) as TextBlock | null;

          if (!block) {
            continue;
          }

          block.data += chunk.contentChunk;

          session.updateBlock(block.id, [
            {
              op: 'replace',
              path: '/data',
              value: block.data,
            },
          ]);
        }
      }

      session.emit('end', {});

      await db
        .update(messages)
        .set({
          status: 'completed',
          responseBlocks: session.getAllBlocks(),
        })
        .where(
          and(
            eq(messages.chatId, input.chatId),
            eq(messages.messageId, input.messageId),
          ),
        )
        .execute();
    } catch (err: any) {
      console.error('Error in SearchAgent.searchAsync:', err);
      session.emit('error', { data: err.message || 'An internal error occurred' });
    }
  }
}

export default SearchAgent;
