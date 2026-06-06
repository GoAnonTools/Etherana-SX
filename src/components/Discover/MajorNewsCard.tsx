import { Discover } from '@/app/discover/page';
import Link from 'next/link';

const ThumbnailImage = ({ thumbnail, title }: { thumbnail: string; title: string }) => {
  // Try to use the thumbnail directly — avoid URL parsing that breaks on
  // non-standard thumbnail URLs returned by SearXNG engines.
  return (
    <img
      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
      src={thumbnail}
      alt={title}
      onError={(e) => {
        // If the image fails to load, replace with a placeholder
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        const placeholder = target.nextElementSibling as HTMLDivElement;
        if (placeholder) placeholder.style.display = 'flex';
      }}
    />
  );
};

const MajorNewsCard = ({
  item,
  isLeft = true,
}: {
  item: Discover;
  isLeft?: boolean;
}) => (
  <Link
    href={`/?q=Summary: ${item.url}`}
    className="w-full group flex flex-row items-stretch gap-6 h-60 py-3"
    target="_blank"
  >
    {isLeft ? (
      <>
        <div className="relative w-80 h-full overflow-hidden rounded-2xl flex-shrink-0">
          {item.thumbnail ? (
            <ThumbnailImage thumbnail={item.thumbnail} title={item.title} />
          ) : null}
          <div
            className="absolute inset-0 bg-gradient-to-br from-cyan-500/15 via-light-200 to-purple-500/15 dark:from-cyan-400/15 dark:via-dark-200 dark:to-purple-400/15 items-center justify-center"
            style={{ display: item.thumbnail ? 'none' : 'flex' }}
          >
            <div className="rounded-3xl border border-black/10 bg-white/20 px-5 py-4 text-center backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <span className="block text-4xl font-bold text-black/25 dark:text-white/25">
                {item.title?.charAt(0)?.toUpperCase() || '?'}
              </span>
              <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.18em] text-black/35 dark:text-white/35">
                Discover
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center flex-1 py-4">
          <h2
            className="text-3xl font-light mb-3 leading-tight line-clamp-3 group-hover:text-cyan-500 dark:group-hover:text-cyan-300 transition duration-200"
            style={{ fontFamily: 'PP Editorial, serif' }}
          >
            {item.title}
          </h2>
          <p className="text-black/60 dark:text-white/60 text-base leading-relaxed line-clamp-4">
            {item.content}
          </p>
        </div>
      </>
    ) : (
      <>
        <div className="flex flex-col justify-center flex-1 py-4">
          <h2
            className="text-3xl font-light mb-3 leading-tight line-clamp-3 group-hover:text-cyan-500 dark:group-hover:text-cyan-300 transition duration-200"
            style={{ fontFamily: 'PP Editorial, serif' }}
          >
            {item.title}
          </h2>
          <p className="text-black/60 dark:text-white/60 text-base leading-relaxed line-clamp-4">
            {item.content}
          </p>
        </div>
        <div className="relative w-80 h-full overflow-hidden rounded-2xl flex-shrink-0">
          {item.thumbnail ? (
            <ThumbnailImage thumbnail={item.thumbnail} title={item.title} />
          ) : null}
          <div
            className="absolute inset-0 bg-gradient-to-br from-cyan-500/15 via-light-200 to-purple-500/15 dark:from-cyan-400/15 dark:via-dark-200 dark:to-purple-400/15 items-center justify-center"
            style={{ display: item.thumbnail ? 'none' : 'flex' }}
          >
            <div className="rounded-3xl border border-black/10 bg-white/20 px-5 py-4 text-center backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <span className="block text-4xl font-bold text-black/25 dark:text-white/25">
                {item.title?.charAt(0)?.toUpperCase() || '?'}
              </span>
              <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.18em] text-black/35 dark:text-white/35">
                Discover
              </span>
            </div>
          </div>
        </div>
      </>
    )}
  </Link>
);

export default MajorNewsCard;