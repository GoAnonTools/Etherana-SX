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

const MajorThumbnail = ({ item }: { item: Discover }) => {
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
    <div className="relative h-full w-80 flex-shrink-0 overflow-hidden rounded-2xl bg-light-200 dark:bg-dark-200">
      {imageUrl ? (
        <Image
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          src={imageUrl}
          alt={item.title}
          fill
          sizes="320px"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cyan-500/15 via-light-200 to-purple-500/15 dark:from-cyan-400/15 dark:via-dark-200 dark:to-purple-400/15">
          <div className="flex max-w-[80%] flex-col items-center rounded-3xl border border-black/10 bg-white/35 px-6 py-5 text-center shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/50 text-4xl font-bold text-black/30 shadow-sm dark:bg-white/10 dark:text-white/30">
              {initial}
            </span>

            <span className="mt-4 max-w-full truncate text-xs font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40">
              {sourceLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const MajorText = ({ item }: { item: Discover }) => (
  <div className="flex flex-1 flex-col justify-center py-4">
    <h2
      className="mb-3 line-clamp-3 text-3xl font-light leading-tight transition duration-200 group-hover:text-cyan-500 dark:group-hover:text-cyan-300"
      style={{ fontFamily: 'PP Editorial, serif' }}
    >
      {item.title}
    </h2>

    <p className="line-clamp-4 text-base leading-relaxed text-black/60 dark:text-white/60">
      {item.content}
    </p>
  </div>
);

const MajorNewsCard = ({
  item,
  isLeft = true,
}: {
  item: Discover;
  isLeft?: boolean;
}) => (
  <Link
    href={`/?q=${encodeURIComponent(`Summary: ${item.url}`)}`}
    className="group flex h-60 w-full flex-row items-stretch gap-6 py-3"
    target="_blank"
  >
    {isLeft ? (
      <>
        <MajorThumbnail item={item} />
        <MajorText item={item} />
      </>
    ) : (
      <>
        <MajorText item={item} />
        <MajorThumbnail item={item} />
      </>
    )}
  </Link>
);

export default MajorNewsCard;
