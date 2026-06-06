'use client';

import { Globe2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import SmallNewsCard from '@/components/Discover/SmallNewsCard';
import MajorNewsCard from '@/components/Discover/MajorNewsCard';
import { useI18n } from '@/lib/i18n/useI18n';
import type { TranslationKey } from '@/lib/i18n/dictionaries';

export interface Discover {
  title: string;
  content: string;
  url: string;
  thumbnail: string;
}

const topics: { key: string; labelKey: TranslationKey }[] = [
  {
    labelKey: 'discoverPage.tech',
    key: 'tech',
  },
  {
    labelKey: 'discoverPage.finance',
    key: 'finance',
  },
  {
    labelKey: 'discoverPage.art',
    key: 'art',
  },
  {
    labelKey: 'discoverPage.sports',
    key: 'sports',
  },
  {
    labelKey: 'discoverPage.entertainment',
    key: 'entertainment',
  },
];

const Page = () => {
  const { t } = useI18n();
  const [discover, setDiscover] = useState<Discover[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTopic, setActiveTopic] = useState<string>(topics[0].key);

  const fetchArticles = async (topic: string) => {
    setLoading(true);

    try {
      const res = await fetch(`/api/discover?topic=${topic}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message);
      }

      setDiscover(Array.isArray(data.blogs) ? data.blogs : []);
    } catch (err: any) {
      console.error('Error fetching data:', err.message);
      toast.error(t('discoverPage.errorFetching'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles(activeTopic);
  }, [activeTopic]);

  return (
    <>
      <div>
        <div className="flex flex-col border-b border-light-200/20 px-2 pb-6 pt-10 dark:border-dark-200/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-center">
              <Globe2Icon size={45} className="mb-2.5" />
              <h1
                className="p-2 text-5xl font-normal"
                style={{ fontFamily: 'PP Editorial, serif' }}
              >
                {t('discoverPage.title')}
              </h1>
            </div>

            <div className="flex flex-row items-center space-x-2 overflow-x-auto">
              {topics.map((topic) => (
                <div
                  key={topic.key}
                  className={cn(
                    'cursor-pointer text-nowrap rounded-full border-[0.1px] px-3 py-1 text-sm transition duration-200',
                    activeTopic === topic.key
                      ? 'border-cyan-700/60 bg-cyan-300/20 text-cyan-700 dark:border-cyan-300/40 dark:bg-cyan-300/30 dark:text-cyan-300'
                      : 'border-black/30 text-black/70 hover:border-black/40 hover:bg-black/5 hover:text-black dark:border-white/30 dark:text-white/70 dark:hover:border-white/40 dark:hover:bg-white/5 dark:hover:text-white',
                  )}
                  onClick={() => setActiveTopic(topic.key)}
                >
                  <span>{t(topic.labelKey)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-screen flex-row items-center justify-center">
            <svg
              aria-hidden="true"
              className="h-8 w-8 animate-spin fill-light-secondary text-light-200 dark:fill-[#ffffff3b] dark:text-[#202020]"
              viewBox="0 0 100 101"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M100 50.5908C100.003 78.2051 78.1951 100.003 50.5908 100C22.9765 99.9972 0.997224 78.018 1 50.4037C1.00281 22.7993 22.8108 0.997224 50.4251 1C78.0395 1.00281 100.018 22.8108 100 50.4251ZM9.08164 50.594C9.06312 73.3997 27.7909 92.1272 50.5966 92.1457C73.4023 92.1642 92.1298 73.4365 92.1483 50.6308C92.1669 27.8251 73.4392 9.0973 50.6335 9.07878C27.8278 9.06026 9.10003 27.787 9.08164 50.594Z"
                fill="currentColor"
              />
              <path
                d="M93.9676 39.0409C96.393 38.4037 97.8624 35.9116 96.9801 33.5533C95.1945 28.8227 92.871 24.3692 90.0681 20.348C85.6237 14.1775 79.4473 9.36872 72.0454 6.45794C64.6435 3.54717 56.3134 2.65431 48.3133 3.89319C45.869 4.27179 44.3768 6.77534 45.014 9.20079C45.6512 11.6262 48.1343 13.0956 50.5786 12.717C56.5073 11.8281 62.5542 12.5399 68.0406 14.7911C73.527 17.0422 78.2187 20.7487 81.5841 25.4923C83.7976 28.5886 85.4467 32.059 86.4416 35.7474C87.1273 38.1189 89.5423 39.6781 91.9676 39.0409Z"
                fill="currentFill"
              />
            </svg>
          </div>
        ) : discover && discover.length === 0 ? (
          <div className="flex min-h-[55vh] flex-col items-center justify-center px-6 text-center">
            <div className="rounded-3xl border border-light-200 bg-light-secondary p-8 dark:border-dark-200 dark:bg-dark-secondary">
              <h2 className="text-2xl font-semibold text-black dark:text-white">
                {t('discoverPage.noArticlesTitle')}
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-relaxed text-black/55 dark:text-white/55">
                {t('discoverPage.noArticlesDescription')}
              </p>

              <button
                type="button"
                onClick={() => fetchArticles(activeTopic)}
                className="mt-6 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.01] dark:bg-white dark:text-black"
              >
                {t('discoverPage.tryAgain')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-4 pb-28 pt-5 lg:pb-8">
            <div className="block lg:hidden">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {discover?.map((item, i) => (
                  <SmallNewsCard key={`mobile-${i}`} item={item} />
                ))}
              </div>
            </div>

            <div className="hidden lg:block">
              {discover &&
                discover.length > 0 &&
                (() => {
                  const sections = [];
                  let index = 0;

                  while (index < discover.length) {
                    if (sections.length > 0) {
                      sections.push(
                        <hr
                          key={`sep-${index}`}
                          className="my-3 w-full border-t border-light-200/20 dark:border-dark-200/20"
                        />,
                      );
                    }

                    if (index < discover.length) {
                      sections.push(
                        <MajorNewsCard
                          key={`major-${index}`}
                          item={discover[index]}
                          isLeft={false}
                        />,
                      );
                      index++;
                    }

                    if (index < discover.length) {
                      sections.push(
                        <hr
                          key={`sep-${index}-after`}
                          className="my-3 w-full border-t border-light-200/20 dark:border-dark-200/20"
                        />,
                      );
                    }

                    if (index < discover.length) {
                      const smallCards = discover.slice(index, index + 3);
                      sections.push(
                        <div
                          key={`small-group-${index}`}
                          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                        >
                          {smallCards.map((item, i) => (
                            <SmallNewsCard
                              key={`small-${index + i}`}
                              item={item}
                            />
                          ))}
                        </div>,
                      );
                      index += 3;
                    }

                    if (index < discover.length) {
                      sections.push(
                        <hr
                          key={`sep-${index}-after-small`}
                          className="my-3 w-full border-t border-light-200/20 dark:border-dark-200/20"
                        />,
                      );
                    }

                    if (index < discover.length - 1) {
                      const twoMajorCards = discover.slice(index, index + 2);
                      twoMajorCards.forEach((item, i) => {
                        sections.push(
                          <MajorNewsCard
                            key={`double-${index + i}`}
                            item={item}
                            isLeft={i === 0}
                          />,
                        );

                        if (i === 0) {
                          sections.push(
                            <hr
                              key={`sep-double-${index + i}`}
                              className="my-3 w-full border-t border-light-200/20 dark:border-dark-200/20"
                            />,
                          );
                        }
                      });
                      index += 2;
                    } else if (index < discover.length) {
                      sections.push(
                        <MajorNewsCard
                          key={`final-major-${index}`}
                          item={discover[index]}
                          isLeft={true}
                        />,
                      );
                      index++;
                    }

                    if (index < discover.length) {
                      sections.push(
                        <hr
                          key={`sep-${index}-after-major`}
                          className="my-3 w-full border-t border-light-200/20 dark:border-dark-200/20"
                        />,
                      );
                    }

                    if (index < discover.length) {
                      const smallCards = discover.slice(index, index + 3);
                      sections.push(
                        <div
                          key={`small-group-2-${index}`}
                          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                        >
                          {smallCards.map((item, i) => (
                            <SmallNewsCard
                              key={`small-2-${index + i}`}
                              item={item}
                            />
                          ))}
                        </div>,
                      );
                      index += 3;
                    }
                  }

                  return sections;
                })()}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Page;
