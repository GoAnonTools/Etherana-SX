'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n/useI18n';
import AppErrorBoundary from '@/components/ErrorBoundary/AppErrorBoundary';

interface Article {
  title: string;
  content: string;
  url: string;
  thumbnail: string;
}

const getSafeThumbnailUrl = (thumbnail?: string | null) => {
  if (!thumbnail || typeof thumbnail !== 'string') {
    return null;
  }

  const value = thumbnail.trim();

  if (!value) {
    return null;
  }

  try {
    if (value.startsWith('/')) {
      return value;
    }

    const normalizedUrl = value.startsWith('//') ? `https:${value}` : value;
    const parsedUrl = new URL(normalizedUrl);

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return null;
    }

    return parsedUrl.href;
  } catch {
    return null;
  }
};

const getSourceLabel = (url?: string | null) => {
  if (!url || typeof url !== 'string') {
    return 'News';
  }

  try {
    return new URL(url).hostname.replace(/^www\./, '') || 'News';
  } catch {
    return 'News';
  }
};

const NewsArticleWidgetContent = () => {
  const { t, locale } = useI18n();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const thumbnail = useMemo(
    () => getSafeThumbnailUrl(article?.thumbnail),
    [article?.thumbnail],
  );

  const imageUrl = imageFailed ? null : thumbnail;
  const sourceLabel = useMemo(() => getSourceLabel(article?.url), [article?.url]);
  const initial = article?.title?.trim()?.charAt(0)?.toUpperCase() || 'E';

  useEffect(() => {
    const params = new URLSearchParams({
      mode: 'preview',
      language: locale,
    });

    fetch(`/api/discover?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        const articles = Array.isArray(data.blogs) ? data.blogs : [];
        const usableArticles = articles.filter((item: Article) =>
          Boolean(item?.title && item?.url),
        );

        if (usableArticles.length === 0) {
          setArticle(null);
          return;
        }

        setArticle(
          usableArticles[Math.floor(Math.random() * usableArticles.length)],
        );
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [locale]);

  useEffect(() => {
    setImageFailed(false);
  }, [thumbnail]);

  return (
    <div className="flex h-24 max-h-[96px] min-h-[96px] w-full flex-row items-stretch overflow-hidden rounded-2xl border border-light-200 bg-light-secondary p-0 shadow-sm shadow-light-200/10 dark:border-dark-200 dark:bg-dark-secondary dark:shadow-black/25">
      {loading ? (
        <div className="flex h-full w-full animate-pulse flex-row items-stretch">
          <div className="h-full w-24 min-w-24 max-w-24 bg-light-200 dark:bg-dark-200" />
          <div className="flex flex-1 flex-col justify-center gap-2 px-3 py-2">
            <div className="h-4 w-3/4 rounded bg-light-200 dark:bg-dark-200" />
            <div className="h-3 w-1/2 rounded bg-light-200 dark:bg-dark-200" />
          </div>
        </div>
      ) : error ? (
        <div className="flex w-full items-center px-4 text-xs text-red-400">
          {t('searchPage.couldNotLoadNews')}
        </div>
      ) : article ? (
        <a
          href={`/?q=${encodeURIComponent(`Summary: ${article.url}`)}`}
          className="group relative flex h-full w-full flex-row items-stretch overflow-hidden"
        >
          <div className="relative h-full w-24 min-w-24 max-w-24 overflow-hidden bg-light-200 dark:bg-dark-200">
            {imageUrl ? (
              <img
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                src={imageUrl}
                alt={article.title}
                loading="lazy"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-500/15 via-light-200 to-purple-500/15 dark:from-cyan-400/15 dark:via-dark-200 dark:to-purple-400/15">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/50 text-lg font-bold text-black/30 shadow-sm dark:bg-white/10 dark:text-white/30">
                  {initial}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col justify-center px-3 py-2">
            <div className="mb-1 line-clamp-2 text-xs font-semibold leading-tight text-black dark:text-white">
              {article.title}
            </div>

            <p className="line-clamp-2 text-[10px] leading-relaxed text-black/60 dark:text-white/60">
              {article.content || sourceLabel || t('searchPage.news')}
            </p>
          </div>
        </a>
      ) : (
        <div className="flex w-full items-center px-4 text-xs text-black/50 dark:text-white/50">
          {t('searchPage.noNewsPreview')}
        </div>
      )}
    </div>
  );
};

const NewsArticleWidget = () => (
  <AppErrorBoundary
    title="News preview could not be displayed"
    description="The rest of Etherana SX is still available. Try refreshing this preview or open Discover from the sidebar."
  >
    <NewsArticleWidgetContent />
  </AppErrorBoundary>
);

export default NewsArticleWidget;
