import { searchSearxng } from '@/lib/searxng';

const websitesForTopic = {
  tech: {
    queries: ['technology news today', 'latest tech and AI news'],
    links: ['techcrunch.com', 'wired.com', 'theverge.com'],
  },
  finance: {
    queries: ['finance news today', 'stock market and economy news'],
    links: ['bloomberg.com', 'cnbc.com', 'marketwatch.com'],
  },
  art: {
    queries: ['art and culture news', 'modern art and cultural events'],
    links: ['artnews.com', 'hyperallergic.com', 'theartnewspaper.com'],
  },
  sports: {
    queries: ['sports news today', 'latest sports results'],
    links: ['espn.com', 'bbc.com/sport', 'skysports.com'],
  },
  entertainment: {
    queries: ['entertainment news', 'movies and TV shows news'],
    links: ['hollywoodreporter.com', 'variety.com', 'deadline.com'],
  },
};

type Topic = keyof typeof websitesForTopic;

export const GET = async (req: Request) => {
  try {
    const params = new URL(req.url).searchParams;

    const mode: 'normal' | 'preview' =
      (params.get('mode') as 'normal' | 'preview') || 'normal';
    const topic: Topic = (params.get('topic') as Topic) || 'tech';

    const selectedTopic = websitesForTopic[topic];

    let data = [];

    if (mode === 'normal') {
      const seenUrls = new Set();

      // Run searches in smaller batches to avoid overwhelming SearXNG.
      // Each batch = 1 query × all links (3 requests), processed sequentially.
      const allResults: any[] = [];

      for (const query of selectedTopic.queries) {
        const batchResults = await Promise.allSettled(
          selectedTopic.links.map((link) =>
            searchSearxng(`site:${link} ${query}`, {
              pageno: 1,
              language: 'en',
            }).catch(() => ({ results: [], suggestions: [] })),
          ),
        );

        for (const result of batchResults) {
          if (result.status === 'fulfilled' && result.value?.results) {
            allResults.push(...result.value.results);
          }
        }
      }

      data = allResults
        .filter((item) => {
          const url = item.url?.toLowerCase().trim();
          if (!url || seenUrls.has(url)) return false;
          seenUrls.add(url);
          return true;
        })
        .sort(() => Math.random() - 0.5);
    } else {
      const result = await searchSearxng(
        `site:${selectedTopic.links[Math.floor(Math.random() * selectedTopic.links.length)]} ${selectedTopic.queries[Math.floor(Math.random() * selectedTopic.queries.length)]}`,
        {
          pageno: 1,
          language: 'en',
        },
      ).catch(() => ({ results: [], suggestions: [] }));

      data = result.results;
    }

    return Response.json(
      {
        blogs: data,
      },
      {
        status: 200,
      },
    );
  } catch (err) {
    console.error(`An error occurred in discover route: ${err}`);
    return Response.json(
      {
        message: 'An error has occurred',
      },
      {
        status: 500,
      },
    );
  }
};