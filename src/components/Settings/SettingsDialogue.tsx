import { Dialog, DialogPanel } from '@headlessui/react';
import {
  ArrowLeft,
  BrainCog,
  ChevronLeft,
  Search,
  Sliders,
  ToggleRight,
} from 'lucide-react';
import Preferences from './Sections/Preferences';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import Loader from '../ui/Loader';
import { cn } from '@/lib/utils';
import Models from './Sections/Models/Section';
import SearchSection from './Sections/Search';
import Select from '@/components/ui/Select';
import Personalization from './Sections/Personalization';
import { useI18n } from '@/lib/i18n/useI18n';
import type { TranslationKey } from '@/lib/i18n/dictionaries';

const sections = [
  {
    key: 'preferences',
    nameKey: 'settings.preferences',
    descriptionKey: 'settings.preferencesDescription',
    icon: Sliders,
    component: Preferences,
    dataAdd: 'preferences',
  },
  {
    key: 'personalization',
    nameKey: 'settings.personalization',
    descriptionKey: 'settings.personalizationDescription',
    icon: ToggleRight,
    component: Personalization,
    dataAdd: 'personalization',
  },
  {
    key: 'models',
    nameKey: 'settings.models',
    descriptionKey: 'settings.modelsDescription',
    icon: BrainCog,
    component: Models,
    dataAdd: 'modelProviders',
  },
  {
    key: 'search',
    nameKey: 'settings.search',
    descriptionKey: 'settings.searchDescription',
    icon: Search,
    component: SearchSection,
    dataAdd: 'search',
  },
] as const;

const SettingsDialogue = ({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (active: boolean) => void;
}) => {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<string>(sections[0].key);

  const selectedSection = useMemo(
    () => sections.find((section) => section.key === activeSection) ?? sections[0],
    [activeSection],
  );

  useEffect(() => {
    if (isOpen) {
      const fetchConfig = async () => {
        setIsLoading(true);

        try {
          const res = await fetch('/api/config', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          const data = await res.json();

          setConfig(data);
        } catch (error) {
          console.error('Error fetching config:', error);
          toast.error('Failed to load configuration.');
        } finally {
          setIsLoading(false);
        }
      };

      fetchConfig();
    }
  }, [isOpen]);

  return (
    <Dialog
      open={isOpen}
      onClose={() => setIsOpen(false)}
      className="relative z-50"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.1 }}
        className="fixed inset-0 flex h-screen w-screen items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      >
        <DialogPanel className="flex h-[calc(100vh-2%)] w-[calc(100vw-2%)] flex-col overflow-hidden rounded-xl border border-light-200 bg-light-primary backdrop-blur-lg dark:border-dark-200 dark:bg-dark-primary md:h-[calc(100vh-7%)] md:w-[calc(100vw-7%)] lg:h-[calc(100vh-20%)] lg:w-[calc(100vw-30%)]">
          {isLoading || !config ? (
            <div className="flex h-full w-full items-center justify-center">
              <Loader />
            </div>
          ) : (
            <div className="flex h-full flex-1 overflow-hidden">
              <div className="hidden h-full w-[240px] flex-col justify-between overflow-y-auto border-r border-light-200 px-3 pt-3 dark:border-dark-200 lg:flex">
                <div className="flex flex-col">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="group flex flex-row items-center rounded-lg p-2 hover:bg-light-200 hover:dark:bg-dark-200"
                  >
                    <ChevronLeft
                      size={18}
                      className="text-black/50 group-hover:text-black/70 dark:text-white/50 group-hover:dark:text-white/70"
                    />
                    <p className="text-[14px] text-black/50 group-hover:text-black/70 dark:text-white/50 group-hover:dark:text-white/70">
                      {t('common.back')}
                    </p>
                  </button>

                  <div className="mt-8 flex flex-col items-start space-y-1">
                    {sections.map((section) => (
                      <button
                        key={section.dataAdd}
                        className={cn(
                          'flex w-full flex-row items-center space-x-2 rounded-lg px-2 py-1.5 text-sm transition duration-200 active:scale-95 hover:bg-light-200 hover:dark:bg-dark-200',
                          activeSection === section.key
                            ? 'bg-light-200 text-black/90 dark:bg-dark-200 dark:text-white/90'
                            : 'text-black/70 dark:text-white/70',
                        )}
                        onClick={() => setActiveSection(section.key)}
                      >
                        <section.icon size={17} />
                        <p>{t(section.nameKey as TranslationKey)}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col space-y-1 px-2 py-[18px]">
                  <p className="text-xs text-black/70 dark:text-white/70">
                    {t('common.version')}: {process.env.NEXT_PUBLIC_VERSION}
                  </p>
                  <p className="text-xs text-black/45 dark:text-white/45">
                    {t('common.localWorkspace')}
                  </p>
                </div>
              </div>

              <div className="flex w-full flex-col overflow-hidden">
                <div className="my-4 flex w-full flex-shrink-0 flex-row justify-between px-[20px] lg:hidden">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="group mr-[40%] flex flex-row items-center rounded-lg hover:bg-light-200 hover:dark:bg-dark-200"
                  >
                    <ArrowLeft
                      size={18}
                      className="text-black/50 group-hover:text-black/70 dark:text-white/50 group-hover:dark:text-white/70"
                    />
                  </button>

                  <Select
                    options={sections.map((section) => ({
                      value: section.key,
                      key: section.key,
                      label: t(section.nameKey as TranslationKey),
                    }))}
                    value={activeSection}
                    onChange={(e) => {
                      setActiveSection(e.target.value);
                    }}
                    className="!text-xs lg:!text-sm"
                  />
                </div>

                {selectedSection.component && (
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <div className="flex-shrink-0 border-b border-light-200/60 px-6 pb-6 dark:border-dark-200/60 lg:pt-6">
                      <div className="flex flex-col">
                        <h4 className="text-sm font-medium text-black dark:text-white lg:text-sm">
                          {t(selectedSection.nameKey as TranslationKey)}
                        </h4>
                        <p className="text-[11px] text-black/50 dark:text-white/50 lg:text-xs">
                          {t(selectedSection.descriptionKey as TranslationKey)}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      <selectedSection.component
                        fields={config.fields[selectedSection.dataAdd]}
                        values={config.values[selectedSection.dataAdd]}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogPanel>
      </motion.div>
    </Dialog>
  );
};

export default SettingsDialogue;
