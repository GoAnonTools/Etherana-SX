import { Bot, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChat } from '@/lib/hooks/useChat';
import { useI18n } from '@/lib/i18n/useI18n';

const SearchModeToggle = () => {
  const { t } = useI18n();
  const { searchMode, setSearchMode } = useChat();

  return (
    <div className="flex items-center rounded-full bg-light-primary dark:bg-dark-primary border border-light-200 dark:border-dark-200 p-0.5">
      <button
        type="button"
        onClick={() => setSearchMode('results')}
        className={cn(
          'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition',
          searchMode === 'results'
            ? 'bg-sky-500 text-white shadow-sm etherana-search-mode-active'
            : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white',
        )}
        title={t('searchPage.resultsTitle')}
      >
        <Search size={13} />
        Results
      </button>

      <button
        type="button"
        onClick={() => setSearchMode('agent')}
        className={cn(
          'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition',
          searchMode === 'agent'
            ? 'bg-sky-500 text-white shadow-sm etherana-search-mode-active'
            : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white',
        )}
        title={t('searchPage.agentTitle')}
      >
        <Bot size={13} />
        Agent
      </button>
    </div>
  );
};

export default SearchModeToggle;
