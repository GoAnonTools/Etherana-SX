import z from 'zod';
import { ClassifierInput } from './types';
import { classifierPrompt } from '@/lib/prompts/search/classifier';
import formatChatHistoryAsString from '@/lib/utils/formatHistory';

const schema = z.object({
  classification: z.object({
    skipSearch: z
      .boolean()
      .describe('Indicates whether to skip the search step.'),
    personalSearch: z
      .boolean()
      .describe('Indicates whether to perform a personal search.'),
    academicSearch: z
      .boolean()
      .describe('Indicates whether to perform an academic search.'),
    discussionSearch: z
      .boolean()
      .describe('Indicates whether to perform a discussion search.'),
    showWeatherWidget: z
      .boolean()
      .describe('Indicates whether to show the weather widget.'),
    showStockWidget: z
      .boolean()
      .describe('Indicates whether to show the stock widget.'),
    showCalculationWidget: z
      .boolean()
      .describe('Indicates whether to show the calculation widget.'),
  }),
  standaloneFollowUp: z
    .string()
    .describe(
      "A self-contained, context-independent reformulation of the user's question.",
    ),
});

export const classify = async (input: ClassifierInput) => {
  try {
    const output = await input.llm.generateObject<typeof schema>({
      messages: [
        {
          role: 'system',
          content: classifierPrompt,
        },
        {
          role: 'user',
          content: `<conversation_history>\n${formatChatHistoryAsString(input.chatHistory)}\n</conversation_history>\n<user_query>\n${input.query}\n</user_query>`,
        },
      ],
      schema,
    });

    return output;
  } catch (err: any) {
    console.warn('[Etherana classifier] Falling back after generateObject failure:', {
      status: err?.status,
      code: err?.code,
      message: err?.message,
    });

    const q = input.query.trim();
    const qLower = q.toLowerCase();

    const hasUrlOrDomain =
      /https?:\/\//i.test(q) ||
      /\b[a-z0-9-]+\.(com|fr|net|org|io|ai|app|dev|pro|co|uk|de|es|it|nl|be|eu)\b/i.test(q);

    const looksLikeGreeting =
      /^(hi|hello|hey|yo|salut|bonjour|coucou|ça va|ca va)[!.?\s]*$/i.test(q);

    const asksForFreshInfo =
      /\b(find|search|look up|source|sources|website|site|url|link|latest|recent|today|news|verify|check|cherche|recherche|trouve|sources?|site|lien|actualité|actu|vérifie|verifie)\b/i.test(qLower);

    const shouldSearch = hasUrlOrDomain || asksForFreshInfo;

    return {
      classification: {
        // If the classifier fails, do NOT blindly disable search.
        // Direct URLs/domains like clameo.fr must go through search/retrieval.
        skipSearch: !shouldSearch || looksLikeGreeting,
        personalSearch: false,
        academicSearch: false,
        discussionSearch: false,
        showWeatherWidget: false,
        showStockWidget: false,
        showCalculationWidget: false,
      },
      standaloneFollowUp: input.query,
    };
  }
};
