'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Discover } from '@/app/discover/page';
import { useI18n } from '@/lib/i18n/useI18n';

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

    return `/api/discover/image?url=${encodeURIComponent(parsedUrl.href)}`;
  } catch {
    return null;
  }
};

const getSourceLabel = (url?: string | null, fallback = 'Discover') => {
  if (!url || typeof url !== 'string') {
    return fallback;
  }

  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');

    return hostname || fallback;
  } catch {
    return fallback;
  }
};

const SmallNewsCard = ({ item }: { item: Discover }) => {
  const { t } = useI18n();
  const [imageFailed, setImageFailed] = useState(false);

  const thumbnail = useMemo(
    () => getSafeThumbnailUrl(item.thumbnail),
    [item.thumbnail],
  );

  const sourceLabel = useMemo(
    () => getSourceLabel(item.url, t('discoverPage.fallbackLabel')),
    [item.url, t],
  );
  const imageUrl = imageFailed ? null : thumbnail;
  const initial = item.title?.trim()?.charAt(0)?.toUpperCase() || 'E';

  useEffect(() => {
    setImageFailed(false);
  }, [thumbnail]);

  return (
    <Link
      href={`/?q=${encodeURIComponent(`Summary: ${item.url}`)}`}
      className="group flex flex-col overflow-hidden rounded-3xl bg-light-secondary shadow-sm shadow-light-200/10 dark:bg-dark-secondary dark:shadow-black/25"
      target="_blank"
    >
      <div className="relative aspect-video overflow-hidden bg-light-200 dark:bg-dark-200">
        {imageUrl ? (
          <Image
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            src={imageUrl}
            alt={item.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cyan-500/15 via-light-200 to-purple-500/15 dark:from-cyan-400/15 dark:via-dark-200 dark:to-purple-400/15">
            <div className="flex max-w-[80%] flex-col items-center rounded-2xl border border-black/10 bg-white/35 px-5 py-4 text-center shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/50 text-2xl font-bold text-black/30 shadow-sm dark:bg-white/10 dark:text-white/30">
                {initial}
              </span>

              <span className="mt-3 max-w-full truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-black/40 dark:text-white/40">
                {sourceLabel}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="mb-2 line-clamp-2 text-sm font-semibold leading-tight transition duration-200 group-hover:text-cyan-500 dark:group-hover:text-cyan-300">
          {item.title}
        </h3>

        <p className="line-clamp-2 text-xs leading-relaxed text-black/60 dark:text-white/60">
          {item.content}
        </p>
      </div>
    </Link>
  );
};

export default SmallNewsCard;
