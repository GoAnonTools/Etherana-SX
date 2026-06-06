import { searchSearxng } from '@/lib/searxng';
import { getSearxngURL } from '@/lib/config/serverRegistry';

const websitesForTopic = {
  tech: {
    queries: ['technology news', 'artificial intelligence news', 'consumer technology news'],
    links: ['techcrunch.com', 'wired.com', 'theverge.com'],
  },
  finance: {
    queries: ['finance news', 'stock market news', 'economy news'],
    links: ['bloomberg.com', 'cnbc.com', 'marketwatch.com'],
  },
  art: {
    queries: ['art culture news', 'museum exhibition news', 'modern art news'],
    links: ['artnews.com', 'hyperallergic.com', 'theartnewspaper.com'],
  },
  sports: {
    queries: ['sports news', 'football news', 'basketball news'],
    links: ['espn.com', 'bbc.com/sport', 'skysports.com'],
  },
  entertainment: {
    queries: ['movie news', 'tv news', 'streaming entertainment news'],
    links: ['hollywoodreporter.com', 'variety.com', 'deadline.com'],
  },
};

type Topic = keyof typeof websitesForTopic;

type DiscoverApiItem = {
  title: string;
  content: string;
  url: string;
  thumbnail: string;
};

type DiscoverCacheEntry = {
  createdAt: number;
  items: DiscoverApiItem[];
};

const DISCOVER_CACHE_TTL_MS = 10 * 60 * 1000;
const discoverCache = new Map<string, DiscoverCacheEntry>();

const getDiscoverCacheKey = (topic: Topic, mode: 'normal' | 'preview') =>
  `${topic}:${mode}`;

const getCachedDiscoverItems = (key: string, allowStale = false) => {
  const entry = discoverCache.get(key);

  if (!entry || entry.items.length === 0) {
    return null;
  }

  const isFresh = Date.now() - entry.createdAt < DISCOVER_CACHE_TTL_MS;

  if (!allowStale && !isFresh) {
    return null;
  }

  return entry.items;
};

const setCachedDiscoverItems = (key: string, items: DiscoverApiItem[]) => {
  if (items.length === 0) {
    return;
  }

  discoverCache.set(key, {
    createdAt: Date.now(),
    items,
  });
};

const countItemsWithImages = (items: DiscoverApiItem[]) =>
  items.filter((item) => Boolean(item.thumbnail)).length;

const mergeUniqueDiscoverItems = (
  primary: DiscoverApiItem[],
  fallback: DiscoverApiItem[],
) => {
  const seenUrls = new Set<string>();
  const merged: DiscoverApiItem[] = [];

  for (const item of [...primary, ...fallback]) {
    const url = item.url.toLowerCase();

    if (seenUrls.has(url)) {
      continue;
    }

    seenUrls.add(url);
    merged.push(item);
  }

  return merged;
};

const isWeakDiscoverResult = (items: DiscoverApiItem[]) => {
  if (items.length < 12) {
    return true;
  }

  if (countItemsWithImages(items) < 6) {
    return true;
  }

  return false;
};

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const isProbablyBadImageUrl = (url: string) => {
  const lower = url.toLowerCase();

  return (
    lower.endsWith('.svg') ||
    lower.endsWith('.gif') ||
    lower.includes('cdn.jsdelivr.net') ||
    lower.includes('devicon') ||
    lower.includes('lucide-static') ||
    lower.includes('hoodamath.com') ||
    lower.includes('/favicon') ||
    lower.includes('apple-touch-icon') ||
    lower.includes('logo') ||
    lower.includes('placeholder') ||
    lower.includes('wired_bug') ||
    lower.includes('tc-backlight')
  );
};

const normalizeThumbnailUrl = (raw: unknown, baseUrl?: string) => {
  if (!raw || typeof raw !== 'string') {
    return '';
  }

  const value = decodeHtmlEntities(raw.trim());

  if (!value) {
    return '';
  }

  try {
    let url: URL;

    if (value.startsWith('/')) {
      url = new URL(value, baseUrl || getSearxngURL());
    } else if (value.startsWith('//')) {
      url = new URL(`https:${value}`);
    } else {
      url = new URL(value);
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return '';
    }

    if (isProbablyBadImageUrl(url.href)) {
      return '';
    }

    return `/api/discover/image?url=${encodeURIComponent(url.href)}`;
  } catch {
    return '';
  }
};

const normalizeDiscoverResult = (item: any): DiscoverApiItem | null => {
  const title = String(item?.title || '').trim();
  const url = String(item?.url || '').trim();

  if (!title || !url) return null;

  const rawThumbnail =
    item?.thumbnail || item?.thumbnail_src || item?.img_src || item?.img_src_url;

  return {
    title,
    content: String(
      item?.content || item?.snippet || 'No summary available.',
    ).trim(),
    url,
    thumbnail: normalizeThumbnailUrl(rawThumbnail),
  };
};

const isBadDiscoverResult = (item: DiscoverApiItem) => {
  const title = item.title.toLowerCase();
  const content = item.content.toLowerCase();

  const badTitlePatterns = [
    'rss feeds',
    'archives',
    'archive',
    'latest news, photos',
    'latest news -',
    'photos & videos',
    'startup and technology news',
    'latest gadget news',
    'latest in technology',
    'page ',
    'author:',
    'tag:',
  ];

  if (badTitlePatterns.some((pattern) => title.includes(pattern))) {
    return true;
  }

  if (
    title.includes('coronavirus') ||
    title.includes('covid-19') ||
    content.includes('coronavirus') ||
    content.includes('covid-19')
  ) {
    return true;
  }

  try {
    const parsedUrl = new URL(item.url);
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    const lowerPath = parsedUrl.pathname.toLowerCase();

    const badPathPatterns = [
      '/rss',
      '/feed',
      '/feeds',
      '/archive',
      '/archives',
      '/category/',
      '/categories/',
      '/tag/',
      '/tags/',
      '/topic/',
      '/topics/',
      '/author/',
      '/page/',
      '/latest',
      '/newsletters',
    ];

    if (badPathPatterns.some((pattern) => lowerPath.includes(pattern))) {
      return true;
    }

    if (pathParts.length === 0) {
      return true;
    }

    if (
      pathParts.length <= 1 &&
      !title.includes(':') &&
      !title.includes("'") &&
      !title.includes('says') &&
      !title.includes('announces') &&
      !title.includes('launches')
    ) {
      return true;
    }

    return false;
  } catch {
    return true;
  }
};

const extractImageFromJsonLdValue = (value: any): string => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const image = extractImageFromJsonLdValue(item);

      if (image) {
        return image;
      }
    }

    return '';
  }

  if (typeof value === 'object') {
    if (typeof value.url === 'string') {
      return value.url;
    }

    if (typeof value.contentUrl === 'string') {
      return value.contentUrl;
    }

    if (value.image) {
      return extractImageFromJsonLdValue(value.image);
    }

    if (value.thumbnailUrl) {
      return extractImageFromJsonLdValue(value.thumbnailUrl);
    }
  }

  return '';
};

const extractJsonLdImage = (html: string) => {
  const scripts = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
  );

  if (!scripts) {
    return '';
  }

  for (const script of scripts) {
    const jsonText = script
      .replace(/<script[^>]*>/i, '')
      .replace(/<\/script>/i, '')
      .trim();

    if (!jsonText) {
      continue;
    }

    try {
      const parsed = JSON.parse(decodeHtmlEntities(jsonText));
      const image = extractImageFromJsonLdValue(parsed);

      if (image) {
        return image;
      }
    } catch {
      continue;
    }
  }

  return '';
};

const extractMetaImage = (html: string) => {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i,
    /<meta[^>]+property=["']og:image:url["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image:url["'][^>]*>/i,
    /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image:secure_url["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:image:src["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image:src["'][^>]*>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const image = match?.[1]?.trim();

    if (image) {
      return image;
    }
  }

  return extractJsonLdImage(html);
};

const findArticleImage = async (item: DiscoverApiItem) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(item.url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!res.ok) {
      return '';
    }

    const html = await res.text();
    const rawImage = extractMetaImage(html.slice(0, 500000));

    return normalizeThumbnailUrl(rawImage, item.url);
  } catch {
    return '';
  } finally {
    clearTimeout(timeoutId);
  }
};

const enrichMissingThumbnails = async (
  items: DiscoverApiItem[],
  limit = 16,
) => {
  const targets = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !item.thumbnail)
    .slice(0, limit);

  const enriched = await Promise.allSettled(
    targets.map(async ({ item, index }) => ({
      index,
      thumbnail: await findArticleImage(item),
    })),
  );

  const nextItems = [...items];

  for (const result of enriched) {
    if (result.status !== 'fulfilled') continue;

    const { index, thumbnail } = result.value;

    if (thumbnail) {
      nextItems[index] = {
        ...nextItems[index],
        thumbnail,
      };
    }
  }

  return nextItems;
};

const normalizeFilterAndDedupe = (results: any[]) => {
  const seenUrls = new Set<string>();

  return results
    .filter((item) => {
      const url = String(item?.url || '').toLowerCase().trim();

      if (!url || seenUrls.has(url)) {
        return false;
      }

      seenUrls.add(url);
      return true;
    })
    .map(normalizeDiscoverResult)
    .filter(Boolean)
    .filter((item) => !isBadDiscoverResult(item as DiscoverApiItem)) as DiscoverApiItem[];
};

const normalizeAndDedupeSoft = (results: any[]) => {
  const seenUrls = new Set<string>();

  return results
    .filter((item) => {
      const url = String(item?.url || '').toLowerCase().trim();

      if (!url || seenUrls.has(url)) {
        return false;
      }

      seenUrls.add(url);
      return true;
    })
    .map(normalizeDiscoverResult)
    .filter(Boolean) as DiscoverApiItem[];
};

const mergeUniqueItems = (items: DiscoverApiItem[]) => {
  const seenUrls = new Set<string>();

  return items.filter((item) => {
    const url = item.url.toLowerCase();

    if (seenUrls.has(url)) {
      return false;
    }

    seenUrls.add(url);
    return true;
  });
};


const sortBestFirst = (items: DiscoverApiItem[]) =>
  [...items].sort((a, b) => {
    if (a.thumbnail && !b.thumbnail) return -1;
    if (!a.thumbnail && b.thumbnail) return 1;

    return 0;
  });

export const GET = async (req: Request) => {
  try {
    const params = new URL(req.url).searchParams;

    const mode: 'normal' | 'preview' =
      (params.get('mode') as 'normal' | 'preview') || 'normal';
    const topicParam = (params.get('topic') as Topic) || 'tech';
    const topic: Topic = websitesForTopic[topicParam] ? topicParam : 'tech';

    const selectedTopic = websitesForTopic[topic];
    const cacheKey = getDiscoverCacheKey(topic, mode);
    const freshCachedData = getCachedDiscoverItems(cacheKey);

    if (freshCachedData) {
      return Response.json(
        {
          blogs: freshCachedData,
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store',
          },
        },
      );
    }

    let data: DiscoverApiItem[] = [];

    if (mode === 'normal') {
      const allResults: any[] = [];

      for (const query of selectedTopic.queries) {
        const batchResults = await Promise.allSettled(
          selectedTopic.links.map((link) =>
            searchSearxng(`site:${link} ${query}`, {
              pageno: 1,
              language: 'en',
              time_range: 'month',
            }).catch(() => ({ results: [], suggestions: [] })),
          ),
        );

        for (const result of batchResults) {
          if (result.status === 'fulfilled' && result.value?.results) {
            allResults.push(...result.value.results);
          }
        }
      }

      data = normalizeFilterAndDedupe(allResults);

      if (data.length < 8) {
        const fallback = await searchSearxng(selectedTopic.queries[0], {
          pageno: 1,
          language: 'en',
          time_range: 'month',
        }).catch(() => ({ results: [], suggestions: [] }));

        data = [
          ...data,
          ...normalizeFilterAndDedupe(fallback.results || []),
        ];

        data = mergeUniqueItems(data);
      }

      if (data.length < 8) {
        const relaxedResults: any[] = [];

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
              relaxedResults.push(...result.value.results);
            }
          }
        }

        data = [
          ...data,
          ...normalizeFilterAndDedupe(relaxedResults),
        ];

        data = mergeUniqueItems(data);
      }
    } else {
      const result = await searchSearxng(
        `site:${
          selectedTopic.links[
            Math.floor(Math.random() * selectedTopic.links.length)
          ]
        } ${
          selectedTopic.queries[
            Math.floor(Math.random() * selectedTopic.queries.length)
          ]
        }`,
        {
          pageno: 1,
          language: 'en',
          time_range: 'month',
        },
      ).catch(() => ({ results: [], suggestions: [] }));

      data = normalizeFilterAndDedupe(result.results || []);
    }

    if (data.length < 8) {
      const broadQuery =
        topic === 'entertainment'
          ? 'movie tv streaming entertainment news'
          : selectedTopic.queries[0];

      const broadFallback = await searchSearxng(broadQuery, {
        pageno: 1,
        language: 'en',
      }).catch(() => ({ results: [], suggestions: [] }));

      data = mergeUniqueItems([
        ...data,
        ...normalizeAndDedupeSoft(broadFallback.results || []),
      ]).slice(0, 18);
    }

    data = await enrichMissingThumbnails(data, 16);
    data = sortBestFirst(data).slice(0, 18);

    const staleCachedData = getCachedDiscoverItems(cacheKey, true);

    if (staleCachedData && data.length === 0) {
      return Response.json(
        {
          blogs: staleCachedData,
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store',
          },
        },
      );
    }

    if (staleCachedData && isWeakDiscoverResult(data)) {
      data = sortBestFirst(
        mergeUniqueDiscoverItems(data, staleCachedData),
      ).slice(0, 18);
    }

    setCachedDiscoverItems(cacheKey, data);

    return Response.json(
      {
        blogs: data,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
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
