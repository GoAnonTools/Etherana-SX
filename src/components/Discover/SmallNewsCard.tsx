import { Discover } from '@/app/discover/page';
import Link from 'next/link';

const getSafeThumbnailUrl = (thumbnail?: string | null) => {
  if (!thumbnail || typeof thumbnail !== 'string') {
    return '';
  }

  try {
    const parsedUrl = new URL(thumbnail);
    const id = parsedUrl.searchParams.get('id');

    if (id) {
      return `${parsedUrl.origin}${parsedUrl.pathname}?id=${id}`;
    }

    return `${parsedUrl.origin}${parsedUrl.pathname}`;
  } catch {
    if (thumbnail.startsWith('/')) {
      return thumbnail;
    }

    return '';
  }
};

const SmallNewsCard = ({ item }: { item: Discover }) => {
  const thumbnail = getSafeThumbnailUrl(item.thumbnail);

  return (
    <Link
      href={`/?q=${encodeURIComponent(`Summary: ${item.url}`)}`}
      className="group flex flex-col overflow-hidden rounded-3xl bg-light-secondary shadow-sm shadow-light-200/10 dark:bg-dark-secondary dark:shadow-black/25"
      target="_blank"
    >
      <div className="relative aspect-video overflow-hidden bg-light-200 dark:bg-dark-200">
        {thumbnail ? (
          <img
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            src={thumbnail}
            alt={item.title}
            onError={(event) => {
              const target = event.currentTarget;
              target.style.display = 'none';

              const placeholder = target.nextElementSibling as HTMLDivElement | null;

              if (placeholder) {
                placeholder.style.display = 'flex';
              }
            }}
          />
        ) : null}

        <div
          className="absolute inset-0 items-center justify-center bg-gradient-to-br from-cyan-500/15 via-light-200 to-purple-500/15 dark:from-cyan-400/15 dark:via-dark-200 dark:to-purple-400/15"
          style={{ display: thumbnail ? 'none' : 'flex' }}
        >
          <div className="rounded-2xl border border-black/10 bg-white/20 px-4 py-3 text-center backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
            <span className="block text-3xl font-bold text-black/25 dark:text-white/25">
              {item.title?.charAt(0)?.toUpperCase() || '?'}
            </span>
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-black/35 dark:text-white/35">
              Discover
            </span>
          </div>
        </div>
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
