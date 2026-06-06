'use client';

import DeleteChat from '@/components/DeleteChat';
import { formatTimeDifference } from '@/lib/utils';
import {
  BookOpenText,
  CheckSquare,
  ClockIcon,
  FileText,
  Globe2Icon,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n/useI18n';

export interface Chat {
  id: string;
  title: string;
  createdAt: string;
  sources: string[];
  files: { fileId: string; name: string }[];
}

const Page = () => {
  const { t } = useI18n();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const selectedCount = selectedChatIds.length;
  const allSelected = chats.length > 0 && selectedCount === chats.length;

  const selectedChatIdsSet = useMemo(
    () => new Set(selectedChatIds),
    [selectedChatIds],
  );

  const getChatLabel = (count: number) =>
    count === 1 ? t('libraryPage.chatSingular') : t('libraryPage.chatPlural');

  const getFileLabel = (count: number) =>
    count === 1 ? t('libraryPage.fileSingular') : t('libraryPage.filePlural');

  useEffect(() => {
    const fetchChats = async () => {
      setLoading(true);

      const res = await fetch('/api/chats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      setChats(Array.isArray(data.chats) ? data.chats : []);
      setLoading(false);
    };

    fetchChats();
  }, []);

  const toggleChatSelection = (chatId: string) => {
    setSelectedChatIds((prev) =>
      prev.includes(chatId)
        ? prev.filter((id) => id !== chatId)
        : [...prev, chatId],
    );
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedChatIds([]);
      return;
    }

    setSelectedChatIds(chats.map((chat) => chat.id));
  };

  const deleteSelectedChats = async () => {
    if (selectedChatIds.length === 0 || bulkDeleting) return;

    const confirmed = window.confirm(
      `${t('libraryPage.deleteSelected')} ${selectedChatIds.length} ${getChatLabel(
        selectedChatIds.length,
      )}? ${t('libraryPage.deleteConfirmSuffix')}`,
    );

    if (!confirmed) return;

    setBulkDeleting(true);

    try {
      const results = await Promise.allSettled(
        selectedChatIds.map((chatId) =>
          fetch(`/api/chats/${chatId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          }),
        ),
      );

      const failed = results.filter(
        (result) =>
          result.status === 'rejected' ||
          (result.status === 'fulfilled' && result.value.status !== 200),
      );

      if (failed.length > 0) {
        throw new Error(
          `${t('libraryPage.failedDeleteSelected')} (${failed.length})`,
        );
      }

      setChats((prev) =>
        prev.filter((chat) => !selectedChatIds.includes(chat.id)),
      );
      setSelectedChatIds([]);

      toast.success(
        `${selectedChatIds.length} ${getChatLabel(selectedChatIds.length)} ${t(
          'libraryPage.deleted',
        )}`,
      );
    } catch (err: any) {
      toast.error(err.message || t('libraryPage.failedDeleteSelected'));
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col border-b border-light-200/20 px-2 pb-6 pt-10 dark:border-dark-200/20">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center justify-center">
            <BookOpenText size={45} className="mb-2.5" />
            <div className="flex flex-col">
              <h1
                className="p-2 pb-0 text-5xl font-normal"
                style={{ fontFamily: 'PP Editorial, serif' }}
              >
                {t('libraryPage.title')}
              </h1>
              <div className="px-2 text-center text-sm text-black/60 dark:text-white/60 lg:text-left">
                {t('libraryPage.subtitle')}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-black/60 dark:text-white/60 lg:justify-end">
            <span className="inline-flex items-center gap-1 rounded-full border border-black/20 px-2 py-0.5 dark:border-white/20">
              <BookOpenText size={14} />
              {loading
                ? t('libraryPage.loading')
                : `${chats.length} ${getChatLabel(chats.length)}`}
            </span>

            {!loading && chats.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-1 rounded-full border border-black/20 px-2 py-0.5 transition hover:text-black dark:border-white/20 dark:hover:text-white"
              >
                {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                {allSelected
                  ? t('libraryPage.unselectAll')
                  : t('libraryPage.selectAll')}
              </button>
            )}
          </div>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="sticky top-0 z-30 mx-2 mt-4 flex flex-col gap-3 rounded-2xl border border-red-400/30 bg-red-50/95 px-4 py-3 backdrop-blur dark:bg-red-950/30 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-red-700 dark:text-red-200">
            {selectedCount}{' '}
            {selectedCount === 1
              ? t('libraryPage.chatSelected')
              : t('libraryPage.chatsSelected')}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedChatIds([])}
              disabled={bulkDeleting}
              className="inline-flex items-center gap-1 rounded-full border border-red-300/50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100 disabled:opacity-60 dark:text-red-200 dark:hover:bg-red-900/40"
            >
              <X size={14} />
              {t('libraryPage.clear')}
            </button>

            <button
              type="button"
              onClick={deleteSelectedChats}
              disabled={bulkDeleting}
              className="inline-flex items-center gap-1 rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-60"
            >
              <Trash2 size={14} />
              {bulkDeleting
                ? t('libraryPage.deleting')
                : t('libraryPage.deleteSelected')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[60vh] flex-row items-center justify-center">
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
      ) : chats.length === 0 ? (
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-light-200 bg-light-secondary dark:border-dark-200 dark:bg-dark-secondary">
            <BookOpenText className="text-black/70 dark:text-white/70" />
          </div>
          <p className="mt-2 text-sm text-black/70 dark:text-white/70">
            {t('libraryPage.noChatsFound')}
          </p>
          <p className="mt-1 text-sm text-black/70 dark:text-white/70">
            <Link href="/" className="text-sky-400">
              {t('libraryPage.startNewChat')}
            </Link>{' '}
            {t('libraryPage.emptySuffix')}
          </p>
        </div>
      ) : (
        <div className="px-2 pb-28 pt-6">
          <div className="overflow-hidden rounded-2xl border border-light-200 bg-light-primary dark:border-dark-200 dark:bg-dark-primary">
            {chats.map((chat, index) => {
              const isSelected = selectedChatIdsSet.has(chat.id);

              const sourcesLabel =
                chat.sources.length === 0
                  ? null
                  : chat.sources.length <= 2
                    ? chat.sources
                        .map((source) =>
                          source.charAt(0).toUpperCase() + source.slice(1),
                        )
                        .join(', ')
                    : `${chat.sources
                        .slice(0, 2)
                        .map((source) =>
                          source.charAt(0).toUpperCase() + source.slice(1),
                        )
                        .join(', ')} + ${chat.sources.length - 2}`;

              return (
                <div
                  key={chat.id}
                  className={
                    'group flex flex-col gap-2 p-4 transition-colors duration-200 ' +
                    (isSelected
                      ? 'bg-sky-500/10 dark:bg-sky-500/10'
                      : 'hover:bg-light-secondary dark:hover:bg-dark-secondary') +
                    (index !== chats.length - 1
                      ? ' border-b border-light-200 dark:border-dark-200'
                      : '')
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleChatSelection(chat.id)}
                      className="mt-1 shrink-0 text-black/50 transition hover:text-sky-500 dark:text-white/50"
                      aria-label={
                        isSelected
                          ? t('libraryPage.unselectChat')
                          : t('libraryPage.selectChat')
                      }
                    >
                      {isSelected ? (
                        <CheckSquare size={18} className="text-sky-500" />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>

                    <Link
                      href={`/c/${chat.id}`}
                      className="line-clamp-2 flex-1 text-base font-medium leading-snug text-black transition duration-200 group-hover:text-[#24A0ED] dark:text-white lg:text-lg"
                      title={chat.title}
                    >
                      {chat.title}
                    </Link>

                    <div className="shrink-0 pt-0.5">
                      <DeleteChat
                        chatId={chat.id}
                        chats={chats}
                        setChats={setChats}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pl-7 text-black/70 dark:text-white/70">
                    <span className="inline-flex items-center gap-1 text-xs">
                      <ClockIcon size={14} />
                      {formatTimeDifference(new Date(), chat.createdAt)}{' '}
                      {t('libraryPage.ago')}
                    </span>

                    {sourcesLabel && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-black/20 px-2 py-0.5 text-xs dark:border-white/20">
                        <Globe2Icon size={14} />
                        {sourcesLabel}
                      </span>
                    )}

                    {chat.files.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-black/20 px-2 py-0.5 text-xs dark:border-white/20">
                        <FileText size={14} />
                        {chat.files.length} {getFileLabel(chat.files.length)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;
