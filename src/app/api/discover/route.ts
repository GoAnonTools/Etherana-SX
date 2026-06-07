import { searchSearxng } from '@/lib/searxng';
import { getSearxngURL } from '@/lib/config/serverRegistry';

const websitesForTopic = {
  tech: {
    queries: [
      'technology news',
      'artificial intelligence news',
      'consumer technology startup news',
    ],
    broadQuery:
      'technology artificial intelligence startups cybersecurity consumer technology news',
    relevanceKeywords: [
      'technology',
      'tech',
      'artificial intelligence',
      'ai',
      'startup',
      'software',
      'cybersecurity',
      'consumer technology',
      'gadgets',
      'apps',
    ],
    links: ['techcrunch.com', 'wired.com', 'theverge.com', 'arstechnica.com'],
  },
  finance: {
    queries: ['finance news', 'stock market news', 'economy business news'],
    broadQuery: 'finance markets economy stocks business banking news',
    relevanceKeywords: [
      'finance',
      'market',
      'markets',
      'stocks',
      'economy',
      'inflation',
      'bank',
      'banking',
      'earnings',
      'business',
      'investors',
    ],
    links: ['bloomberg.com', 'cnbc.com', 'marketwatch.com', 'reuters.com'],
  },
  art: {
    queries: [
      'art exhibition museum news',
      'contemporary art gallery news',
      'artist museum culture news',
    ],
    broadQuery:
      'art exhibition museum gallery artist contemporary art culture news',
    relevanceKeywords: [
      'art',
      'artist',
      'artists',
      'museum',
      'exhibition',
      'gallery',
      'galleries',
      'painting',
      'sculpture',
      'contemporary',
      'curator',
      'biennale',
      'auction',
      'culture',
    ],
    links: [
      'artnews.com',
      'hyperallergic.com',
      'theartnewspaper.com',
      'artforum.com',
      'artsy.net',
    ],
  },
  sports: {
    queries: [
      'sports news today',
      'football basketball tennis sports news',
      'sports match team player news',
    ],
    broadQuery:
      'sports football basketball tennis match team player league news',
    relevanceKeywords: [
      'sports',
      'sport',
      'football',
      'soccer',
      'basketball',
      'tennis',
      'match',
      'game',
      'team',
      'player',
      'league',
      'season',
      'coach',
      'club',
      'wins',
      'final',
    ],
    links: [
      'espn.com',
      'bbc.com/sport',
      'skysports.com',
      'theguardian.com/sport',
      'sports.yahoo.com',
    ],
  },
  entertainment: {
    queries: ['movie news', 'tv news', 'streaming entertainment news'],
    broadQuery: 'movie tv streaming entertainment hollywood celebrity news',
    relevanceKeywords: [
      'movie',
      'film',
      'tv',
      'series',
      'streaming',
      'entertainment',
      'hollywood',
      'actor',
      'actress',
      'director',
      'netflix',
      'trailer',
      'box office',
    ],
    links: ['hollywoodreporter.com', 'variety.com', 'deadline.com', 'thewrap.com'],
  },
};

type Topic = keyof typeof websitesForTopic;
type DiscoverLanguage = 'en' | 'fr' | 'auto';

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

const getDiscoverCacheKey = (
  topic: Topic,
  mode: 'normal' | 'preview',
  language: DiscoverLanguage,
) => `${topic}:${mode}:${language}`;

const getSearchLanguage = (language: DiscoverLanguage) =>
  language === 'fr' ? 'fr' : 'en';

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

const isBadDiscoverResult = (item: DiscoverApiItem, topic?: Topic) => {
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
    'sign in',
    'subscribe',
    'newsletter',
    'privacy policy',
    'terms of service',
    'home page',
    'front pages',
    'push notifications faq',
    'latest news, results',
    'results, stats & transfers',
  ];

  const sportsUtilityPatterns = [
    'quiz',
    'scores',
    'scoreboard',
    'standings',
    'table and standings',
    'fixtures',
    'kick-off times',
    'tv channel',
    'fantasy premier league',
    'practice session',
    'live football today',
    'push notifications',
    'latest news, results',
    'results, stats',
    'order of play',
    'draw and results',
    'final score',
    'premier league live',
    'build-up, commentary',
    'latest news & gossip',
    'sports live',
    'indian sports live',
    'fpl stats',
  ];

  if (
    topic === 'sports' &&
    (sportsUtilityPatterns.some((pattern) => title.includes(pattern)) ||
      title.startsWith('live '))
  ) {
    return true;
  }

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
      '/search',
      '/privacy',
      '/terms',
      '/about',
      '/contact',
      '/video/',
      '/videos/',
      '/live-blog/',
      '/faq',
    ];

    if (badPathPatterns.some((pattern) => lowerPath.includes(pattern))) {
      return true;
    }

    if (
      topic === 'sports' &&
      (pathParts.length <= 2 ||
        lowerPath.endsWith('/all') ||
        lowerPath.includes('/live/') ||
        lowerPath.includes('/match/_/') ||
        lowerPath.includes('/scoreboard') ||
        lowerPath.includes('/scores'))
    ) {
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

const normalizeFilterAndDedupe = (results: any[], topic?: Topic) => {
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
    .filter(
      (item) => !isBadDiscoverResult(item as DiscoverApiItem, topic),
    ) as DiscoverApiItem[];
};

const normalizeAndDedupeSoft = (results: any[], topic?: Topic) => {
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
    .filter(
      (item) => !isBadDiscoverResult(item as DiscoverApiItem, topic),
    ) as DiscoverApiItem[];
};

const normalizeTitleKey = (title: string) =>
  title
    .toLowerCase()
    .replace(/\s+-\s+[^-]+$/g, '')
    .replace(/\s+\|\s+[^|]+$/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const mergeUniqueItems = (items: DiscoverApiItem[]) => {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();

  return items.filter((item) => {
    const url = item.url.toLowerCase();
    const titleKey = normalizeTitleKey(item.title);

    if (seenUrls.has(url)) {
      return false;
    }

    if (titleKey.length > 24 && seenTitles.has(titleKey)) {
      return false;
    }

    seenUrls.add(url);

    if (titleKey.length > 24) {
      seenTitles.add(titleKey);
    }

    return true;
  });
};


const getHostname = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
};

const getPathDepth = (url: string) => {
  try {
    return new URL(url).pathname.split('/').filter(Boolean).length;
  } catch {
    return 0;
  }
};

const getSourceScore = (item: DiscoverApiItem, topic: Topic) => {
  const hostname = getHostname(item.url);

  if (!hostname) {
    return 0;
  }

  const isKnownSource = websitesForTopic[topic].links.some((link) => {
    const sourceHost = link.split('/')[0].replace(/^www\./, '').toLowerCase();

    return hostname === sourceHost || hostname.endsWith(`.${sourceHost}`);
  });

  return isKnownSource ? 8 : 0;
};

const countKeywordHits = (value: string, keywords: string[]) =>
  keywords.reduce((score, keyword) => {
    const normalizedKeyword = keyword.toLowerCase();

    if (!normalizedKeyword) {
      return score;
    }

    return value.includes(normalizedKeyword) ? score + 1 : score;
  }, 0);

const getDiscoverItemScore = (item: DiscoverApiItem, topic: Topic) => {
  const title = item.title.toLowerCase();
  const content = item.content.toLowerCase();
  const url = item.url.toLowerCase();
  const keywords = websitesForTopic[topic].relevanceKeywords;
  const pathDepth = getPathDepth(item.url);

  let score = 0;

  score += countKeywordHits(title, keywords) * 10;
  score += countKeywordHits(content, keywords) * 3;
  score += countKeywordHits(url, keywords) * 2;
  score += getSourceScore(item, topic);

  if (item.thumbnail) {
    score += 4;
  }

  if (item.title.length >= 24) {
    score += 2;
  }

  if (item.content.length >= 80) {
    score += 2;
  }

  if (pathDepth >= 2) {
    score += 2;
  }

  if (pathDepth <= 1) {
    score -= 10;
  }

  if (
    title.includes('latest') ||
    title.includes('news, photos') ||
    title.includes('videos') ||
    title.includes('archive')
  ) {
    score -= 12;
  }

  if (url.includes('/search') || url.includes('/tag/') || url.includes('/author/')) {
    score -= 15;
  }

  return score;
};

const keepRelevantItems = (items: DiscoverApiItem[], topic: Topic) => {
  const filtered = items.filter((item) => getDiscoverItemScore(item, topic) >= 6);

  return filtered.length >= 8 ? filtered : items;
};

const sortBestFirst = (items: DiscoverApiItem[], topic: Topic) =>
  [...items].sort((a, b) => {
    const scoreDelta =
      getDiscoverItemScore(b, topic) - getDiscoverItemScore(a, topic);

    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    if (a.thumbnail && !b.thumbnail) return -1;
    if (!a.thumbnail && b.thumbnail) return 1;
    return 0;
  });

export const GET = async (req: Request) => {
  try {
    const params = new URL(req.url).searchParams;

    const mode: 'normal' | 'preview' =
      (params.get('mode') as 'normal' | 'preview') || 'normal';
    const languageParam = params.get('language') as DiscoverLanguage | null;
    const language: DiscoverLanguage =
      languageParam === 'fr' || languageParam === 'auto' ? languageParam : 'en';
    const searchLanguage = getSearchLanguage(language);
    const topicParam = (params.get('topic') as Topic) || 'tech';
    const topic: Topic = websitesForTopic[topicParam] ? topicParam : 'tech';

    const selectedTopic = websitesForTopic[topic];
    const cacheKey = getDiscoverCacheKey(topic, mode, language);
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
              language: searchLanguage,
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

      data = normalizeFilterAndDedupe(allResults, topic);

      if (data.length < 8) {
        const fallback = await searchSearxng(selectedTopic.queries[0], {
          pageno: 1,
          language: searchLanguage,
          time_range: 'month',
        }).catch(() => ({ results: [], suggestions: [] }));

        data = [
          ...data,
          ...normalizeFilterAndDedupe(fallback.results || [], topic),
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
                language: searchLanguage,
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
          ...normalizeFilterAndDedupe(relaxedResults, topic),
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
          language: searchLanguage,
          time_range: 'month',
        },
      ).catch(() => ({ results: [], suggestions: [] }));

      data = normalizeFilterAndDedupe(result.results || [], topic);
    }

    if (data.length < 8) {
      const broadQuery = selectedTopic.broadQuery;

      const broadFallback = await searchSearxng(broadQuery, {
        pageno: 1,
        language: searchLanguage,
      }).catch(() => ({ results: [], suggestions: [] }));

      data = mergeUniqueItems([
        ...data,
        ...normalizeAndDedupeSoft(broadFallback.results || [], topic),
      ]).slice(0, 18);
    }

    if (data.length === 0) {
      const rescueFallback = await searchSearxng(
        selectedTopic.broadQuery || selectedTopic.queries[0],
        {
          pageno: 1,
          language: searchLanguage,
          time_range: 'month',
        },
      ).catch(() => ({ results: [], suggestions: [] }));

      data = mergeUniqueItems(
        normalizeAndDedupeSoft(rescueFallback.results || []),
      ).slice(0, 18);
    }

    data = keepRelevantItems(data, topic);
    data = sortBestFirst(data, topic);
    data = await enrichMissingThumbnails(data, 16);
    data = sortBestFirst(data, topic).slice(0, 18);

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
        topic,
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
