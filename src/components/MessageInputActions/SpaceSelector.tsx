'use client';

import { LayoutGrid, Loader2, Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { useEffect, useState } from 'react';
import { useChat } from '@/lib/hooks/useChat';
import { AnimatePresence, motion } from 'motion/react';

interface Space {
  id: string;
  name: string;
}

const SpaceSelector = () => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const { spaceId, setSpaceId } = useChat();

  useEffect(() => {
    const loadSpaces = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/spaces');
        if (!res.ok) throw new Error('Failed to fetch spaces');
        const data = await res.json();
        setSpaces(data);
      } catch (error) {
        console.error('Error loading spaces:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSpaces();
  }, []);

  const selectedSpace = spaces.find((s) => s.id === spaceId);

  const filteredSpaces = spaces.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <PopoverButton
            type="button"
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg transition duration-200 focus:outline-none h-8",
              open ? "bg-light-200 dark:bg-dark-200 text-black dark:text-white" : "text-black/50 dark:text-white/50 hover:bg-light-200 hover:dark:bg-dark-200 hover:text-black dark:hover:text-white"
            )}
          >
            <LayoutGrid size={16} className={cn(spaceId ? "text-blue-500" : "text-black/50 dark:text-white/50")} />
            {spaceId && selectedSpace && (
              <span className="text-xs font-medium truncate max-w-[80px]">
                {selectedSpace.name}
              </span>
            )}
          </PopoverButton>
          
          <AnimatePresence>
            {open && (
              <PopoverPanel
                className="absolute z-[100] w-[240px] right-0 bottom-full mb-2 bottom-full mb-2"
                static
              >
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="bg-light-primary dark:bg-dark-primary border rounded-2xl border-light-200 dark:border-dark-200 shadow-2xl overflow-hidden"
                >
                  <div className="p-3 border-b border-light-200 dark:border-dark-200">
                    <div className="relative">
                      <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"
                      />
                      <input
                        type="text"
                        placeholder="Search spaces..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-light-secondary dark:bg-dark-secondary rounded-xl text-xs text-black dark:text-white focus:outline-none border border-transparent transition"
                      />
                    </div>
                  </div>

                  <div className="max-h-[280px] overflow-y-auto scrollbar-hide py-2">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="animate-spin text-blue-500" size={20} />
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setSpaceId(null)}
                          className={cn(
                            "w-full px-4 py-2.5 flex items-center justify-between text-left transition text-xs",
                            !spaceId ? "bg-blue-500/10 text-blue-500 font-bold" : "hover:bg-light-secondary dark:hover:bg-dark-secondary text-black/70 dark:text-white/70"
                          )}
                        >
                          <span>No Space (Default)</span>
                          {!spaceId && <Check size={14} />}
                        </button>
                        
                        {filteredSpaces.map((space) => (
                          <button
                            key={space.id}
                            type="button"
                            onClick={() => setSpaceId(space.id)}
                            className={cn(
                              "w-full px-4 py-2.5 flex items-center justify-between text-left transition text-xs",
                              spaceId === space.id ? "bg-blue-500/10 text-blue-500 font-bold" : "hover:bg-light-secondary dark:hover:bg-dark-secondary text-black/70 dark:text-white/70"
                            )}
                          >
                            <span className="truncate pr-4">{space.name}</span>
                            {spaceId === space.id && <Check size={14} />}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                  
                  <div className="p-2 border-t border-light-200 dark:border-dark-200 bg-light-secondary/30 dark:bg-dark-secondary/30">
                    <button 
                      type="button"
                      onClick={() => window.location.href = '/spaces'}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-500/20"
                    >
                      Manage Spaces
                    </button>
                  </div>
                </motion.div>
              </PopoverPanel>
            )}
          </AnimatePresence>
        </>
      )}
    </Popover>
  );
};

export default SpaceSelector;