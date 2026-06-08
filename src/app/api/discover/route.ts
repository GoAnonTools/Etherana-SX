import { searchSearxng } from '@/lib/searxng';
import { getSearxngURL } from '@/lib/config/serverRegistry';
import { eq } from 'drizzle-orm';
import db from '@/lib/db';
import { discoverCacheRecords } from '@/lib/db/schema';
import {
  type DiscoverApiItem,
  type DiscoverLanguage,
  type Topic,
  getSearchLanguage,
  getTopicConfig,
  isBadDiscoverResult,
  keepRelevantItems,
  mergeUniqueItems,
  sortBestFirst,
  websitesForTopic,
} from '@/lib/discover/helpers';

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

const isFreshDiscoverCacheEntry = (createdAt: number) =>
  Date.now() - createdAt < DISCOVER_CACHE_TTL_MS;

const parseCachedDiscoverItems = (itemsJson: string) => {
  try {
    const items = JSON.parse(itemsJson);

    return Array.isArray(items) ? (items as DiscoverApiItem[]) : null;
  } catch {
    return null;
  }
};

const getCachedDiscoverItems = (key: string, allowStale = false) => {
  const entry = discoverCache.get(key);

  if (!entry || entry.items.length === 0) {
    return null;
  }

  if (!allowStale && !isFreshDiscoverCacheEntry(entry.createdAt)) {
    return null;
  }

  return entry.items;
};

const getPersistentDiscoverItems = (key: string, allowStale = false) => {
  try {
    const row = db
      .select()
      .from(discoverCacheRecords)
      .where(eq(discoverCacheRecords.key, key))
      .get();

    if (!row) {
      return null;
    }

    if (!allowStale && !isFreshDiscoverCacheEntry(row.createdAt)) {
      return null;
    }

    const items = parseCachedDiscoverItems(row.itemsJson);

    if (!items || items.length === 0) {
      return null;
    }

    discoverCache.set(key, {
      createdAt: row.createdAt,
      items,
    });

    return items;
  } catch (error) {
    console.error('Failed to read Discover cache:', error);
    return null;
  }
};

const setCachedDiscoverItems = (
  key: string,
  items: DiscoverApiItem[],
  meta?: {
    topic: Topic;
    mode: 'normal' | 'preview';
    language: DiscoverLanguage;
  },
) => {
  if (items.length === 0) {
    return;
  }

  const createdAt = Date.now();

  discoverCache.set(key, {
    createdAt,
    items,
  });

  if (!meta) {
    return;
  }

  try {
    const itemsJson = JSON.stringify(items);

    db.insert(discoverCacheRecords)
      .values({
        key,
        topic: meta.topic,
        mode: meta.mode,
        language: meta.language,
        createdAt,
        itemsJson,
      })
      .onConflictDoUpdate({
        target: discoverCacheRecords.key,
        set: {
          topic: meta.topic,
          mode: meta.mode,
          language: meta.language,
          createdAt,
          itemsJson,
        },
      })
      .run();
  } catch (error) {
    console.error('Failed to write Discover cache:', error);
  }
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

const normalizeAndDedupe = (results: any[]) => {
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

const normalizeFilterAndDedupe = (results: any[], topic?: Topic) =>
  normalizeAndDedupe(results).filter(
    (item) => !isBadDiscoverResult(item, topic),
  );

// Soft fallback intentionally skips the stricter bad-result filter used by
// normalizeFilterAndDedupe. Broad/rescue searches are already fallback paths;
// keeping them softer helps avoid empty Discover topics when fresh SearXNG
// results are sparse or noisy.
const normalizeAndDedupeSoft = (results: any[]) => normalizeAndDedupe(results);

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

    const selectedTopic = getTopicConfig(topic, language);
    const cacheKey = getDiscoverCacheKey(topic, mode, language);
    const freshCachedData =
      getCachedDiscoverItems(cacheKey) || getPersistentDiscoverItems(cacheKey);

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
        ...normalizeAndDedupeSoft(broadFallback.results || []),
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

    data = keepRelevantItems(data, topic, language);
    data = sortBestFirst(data, topic, language);
    data = await enrichMissingThumbnails(data, 16);
    data = sortBestFirst(data, topic, language).slice(0, 18);

    const staleCachedData =
      getCachedDiscoverItems(cacheKey, true) ||
      getPersistentDiscoverItems(cacheKey, true);

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
        language,
      ).slice(0, 18);
    }

    setCachedDiscoverItems(cacheKey, data, {
      topic,
      mode,
      language,
    });

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
