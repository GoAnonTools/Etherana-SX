'use client';

import { useI18n } from '@/lib/i18n/useI18n';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import MessageInput from './MessageInput';
import MessageBox from './MessageBox';
import MessageBoxLoading from './MessageBoxLoading';
import { useChat } from '@/lib/hooks/useChat';

const Chat = () => {
  const { t } = useI18n();
  const { sections, loading, messageAppeared, messages } = useChat();

  const [dividerWidth, setDividerWidth] = useState(0);
  const dividerRef = useRef<HTMLDivElement | null>(null);
  const messageEnd = useRef<HTMLDivElement | null>(null);
  const lastScrolledRef = useRef<number>(0);

  useEffect(() => {
    const updateDividerWidth = () => {
      if (dividerRef.current) {
        setDividerWidth(dividerRef.current.offsetWidth);
      }
    };

    updateDividerWidth();

    const resizeObserver = new ResizeObserver(() => {
      updateDividerWidth();
    });

    const currentRef = dividerRef.current;
    if (currentRef) {
      resizeObserver.observe(currentRef);
    }

    window.addEventListener('resize', updateDividerWidth);

    return () => {
      if (currentRef) {
        resizeObserver.unobserve(currentRef);
      }
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDividerWidth);
    };
  }, [sections.length]);

  useEffect(() => {
    const scroll = () => {
      messageEnd.current?.scrollIntoView({ behavior: 'auto' });
    };

    if (messages.length === 1) {
      document.title = `${messages[0].query.substring(0, 30)} - Etherana SX`;
    }

    if (sections.length > lastScrolledRef.current) {
      scroll();
      lastScrolledRef.current = sections.length;
    }
  }, [messages]);

  return (
    <div className="flex flex-col space-y-6 pt-8 pb-44 lg:pb-28 sm:mx-4 md:mx-8">
      {sections.map((section, i) => {
        const isLast = i === sections.length - 1;

        return (
          <Fragment key={section.message.messageId}>
            <MessageBox
              section={section}
              sectionIndex={i}
              dividerRef={isLast ? dividerRef : undefined}
              isLast={isLast}
            />
            {!isLast && (
              <div className="h-px w-full bg-light-secondary dark:bg-dark-secondary" />
            )}
          </Fragment>
        );
      })}
      {loading && !messageAppeared && <MessageBoxLoading />}
      <div ref={messageEnd} className="h-0" />
      {dividerWidth > 0 && (
        <div
          className="fixed z-40 bottom-24 lg:bottom-6"
          style={{ width: dividerWidth }}
        >
          <div
            className="pointer-events-none absolute -bottom-6 left-0 right-0 h-[calc(100%+24px+24px)] dark:hidden"
            style={{
              background:
                'linear-gradient(to top, #ffffff 0%, #ffffff 35%, rgba(255,255,255,0.95) 45%, rgba(255,255,255,0.85) 55%, rgba(255,255,255,0.7) 65%, rgba(255,255,255,0.5) 75%, rgba(255,255,255,0.3) 85%, rgba(255,255,255,0.1) 92%, transparent 100%)',
            }}
          />
          <div
            className="pointer-events-none absolute -bottom-6 left-0 right-0 h-[calc(100%+24px+24px)] hidden dark:block"
            style={{
              background:
                'linear-gradient(to top, #0d1117 0%, #0d1117 35%, rgba(13,17,23,0.95) 45%, rgba(13,17,23,0.85) 55%, rgba(13,17,23,0.7) 65%, rgba(13,17,23,0.5) 75%, rgba(13,17,23,0.3) 85%, rgba(13,17,23,0.1) 92%, transparent 100%)',
            }}
          />
          <div className="relative z-10 flex flex-col gap-2">
            <div className="flex justify-end">
              <button
                type="button"
                aria-label={t('sharedUi.newChat')}
                title={t('sharedUi.newChat')}
                onClick={() => {
                  window.location.assign('/');
                }}
                className="inline-flex items-center gap-2 rounded-full border border-light-200 dark:border-dark-200 bg-light-secondary/95 dark:bg-dark-secondary/95 px-3 py-1.5 text-xs font-semibold text-black/70 dark:text-white/70 shadow-sm shadow-light-200/10 dark:shadow-black/20 backdrop-blur transition hover:text-black dark:hover:text-white hover:border-sky-400/60 active:scale-95"
              >
                <Plus size={14} />
                <span>{t('sharedUi.newChat')}</span>
              </button>
            </div>
            <MessageInput />
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
