import { cn } from '@/lib/utils';
import { ArrowUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import AttachSmall from './MessageInputActions/AttachSmall';
import Sources from './MessageInputActions/Sources';
import Optimization from './MessageInputActions/Optimization';
import ModelSelector from './MessageInputActions/ChatModelSelector';
import SpaceSelector from './MessageInputActions/SpaceSelector';
import SearchModeToggle from './MessageInputActions/SearchModeToggle';
import { useChat } from '@/lib/hooks/useChat';
import { useI18n } from '@/lib/i18n/useI18n';

const MessageInput = () => {
  const { t } = useI18n();
  const { loading, sendMessage } = useChat();

  const [message, setMessage] = useState('');
  const [textareaRows, setTextareaRows] = useState(1);
  const [mode, setMode] = useState<'multi' | 'single'>('single');

  useEffect(() => {
    if (textareaRows >= 2 && message && mode === 'single') {
      setMode('multi');
    } else if (!message && mode === 'multi') {
      setMode('single');
    }
  }, [textareaRows, mode, message]);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;

      const isInputFocused =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.hasAttribute('contenteditable');

      if (e.key === '/' && !isInputFocused) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const submitMessage = () => {
    if (loading || message.trim().length === 0) return;

    sendMessage(message);
    setMessage('');
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();

        const submitter = (e.nativeEvent as SubmitEvent)
          .submitter as HTMLElement | null;

        if (submitter?.getAttribute('data-send-button') !== 'true') {
          return;
        }

        submitMessage();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey && !loading) {
          e.preventDefault();
          submitMessage();
        }
      }}
      className={cn(
        'relative bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 shadow-sm shadow-light-200/10 dark:shadow-black/20 transition-all duration-200 focus-within:border-light-300 dark:focus-within:border-dark-300 overflow-visible',
        mode === 'multi'
          ? 'flex flex-col rounded-2xl p-3'
          : 'flex flex-col rounded-2xl px-3 py-2',
      )}
    >
      <div className="flex flex-row items-end w-full gap-2">
        <TextareaAutosize
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onHeightChange={(height, props) => {
            setTextareaRows(Math.ceil(height / props.rowHeight));
          }}
          className="transition bg-transparent dark:placeholder:text-white/50 placeholder:text-black/50 placeholder:text-sm text-sm dark:text-white text-black resize-none focus:outline-none w-full px-2 max-h-24 lg:max-h-36 xl:max-h-48 flex-grow flex-shrink"
          placeholder={t('sharedUi.askFollowUp')}
        />

        <button
          type="submit"
          data-send-button="true"
          disabled={message.trim().length === 0 || loading}
          className="bg-[#24A0ED] text-white disabled:text-black/50 dark:disabled:text-white/50 hover:bg-opacity-85 transition duration-100 disabled:bg-[#e0e0dc79] dark:disabled:bg-[#ececec21] rounded-full p-2 shrink-0"
        >
          <ArrowUp className="bg-background" size={17} />
        </button>
      </div>

      <div className="flex flex-row items-center justify-between w-full pt-2 mt-2 border-t border-light-200/60 dark:border-dark-200/60">
        <div className="flex flex-row items-center gap-2">
          <SearchModeToggle />
          <Optimization />
        </div>

        <div className="flex flex-row items-center space-x-1">
          <Sources />
          <SpaceSelector />
          <ModelSelector />
          <AttachSmall />
        </div>
      </div>
    </form>
  );
};

export default MessageInput;
