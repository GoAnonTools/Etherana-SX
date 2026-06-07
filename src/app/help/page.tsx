'use client';

import {
  Bot,
  Boxes,
  Compass,
  FileText,
  LayoutGrid,
  Library,
  Lock,
  PlayCircle,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/useI18n';
import type { TranslationKey } from '@/lib/i18n/dictionaries';

type CardItem = {
  icon: LucideIcon;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  href?: string;
};

const foundationCards: CardItem[] = [
  {
    icon: Bot,
    titleKey: 'helpPage.startIncludedTitle',
    descriptionKey: 'helpPage.startIncludedDescription',
  },
  {
    icon: Sparkles,
    titleKey: 'helpPage.optionalProviderTitle',
    descriptionKey: 'helpPage.optionalProviderDescription',
    href: '/settings',
  },
  {
    icon: Boxes,
    titleKey: 'helpPage.workspaceFirstTitle',
    descriptionKey: 'helpPage.workspaceFirstDescription',
  },
  {
    icon: PlayCircle,
    titleKey: 'helpPage.reusableToolsTitle',
    descriptionKey: 'helpPage.reusableToolsDescription',
  },
  {
    icon: Lock,
    titleKey: 'helpPage.privateDesignTitle',
    descriptionKey: 'helpPage.privateDesignDescription',
  },
];

const organizationCards: CardItem[] = [
  {
    icon: Search,
    titleKey: 'helpPage.searchTitle',
    descriptionKey: 'helpPage.searchDescription',
    href: '/search',
  },
  {
    icon: Compass,
    titleKey: 'helpPage.discoverTitle',
    descriptionKey: 'helpPage.discoverDescription',
    href: '/discover',
  },
  {
    icon: LayoutGrid,
    titleKey: 'helpPage.spacesTitle',
    descriptionKey: 'helpPage.spacesDescription',
    href: '/spaces',
  },
  {
    icon: Rocket,
    titleKey: 'helpPage.appsTitle',
    descriptionKey: 'helpPage.appsDescription',
    href: '/apps',
  },
  {
    icon: Boxes,
    titleKey: 'helpPage.automationsTitle',
    descriptionKey: 'helpPage.automationsDescription',
    href: '/tasks',
  },
  {
    icon: FileText,
    titleKey: 'helpPage.outputsTitle',
    descriptionKey: 'helpPage.outputsDescription',
    href: '/outputs',
  },
  {
    icon: ShieldCheck,
    titleKey: 'helpPage.vaultTitle',
    descriptionKey: 'helpPage.vaultDescription',
    href: '/vault',
  },
];

const workflowCards: CardItem[] = [
  {
    icon: Search,
    titleKey: 'helpPage.researchWorkflowTitle',
    descriptionKey: 'helpPage.researchWorkflowDescription',
  },
  {
    icon: Library,
    titleKey: 'helpPage.clientWorkflowTitle',
    descriptionKey: 'helpPage.clientWorkflowDescription',
  },
  {
    icon: Rocket,
    titleKey: 'helpPage.learningWorkflowTitle',
    descriptionKey: 'helpPage.learningWorkflowDescription',
  },
  {
    icon: Boxes,
    titleKey: 'helpPage.automationWorkflowTitle',
    descriptionKey: 'helpPage.automationWorkflowDescription',
  },
];

const firstStepKeys: TranslationKey[] = [
  'helpPage.firstStep1',
  'helpPage.firstStep2',
  'helpPage.firstStep3',
  'helpPage.firstStep4',
  'helpPage.firstStep5',
  'helpPage.firstStep6',
  'helpPage.firstStep7',
];

const Card = ({ item }: { item: CardItem }) => {
  const { t } = useI18n();
  const Icon = item.icon;

  const content = (
    <article className="h-full rounded-3xl border border-light-200 bg-light-secondary p-6 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-dark-200 dark:bg-dark-secondary">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white dark:bg-white dark:text-black">
        <Icon size={22} />
      </div>

      <h3 className="mt-5 text-lg font-semibold text-black dark:text-white">
        {t(item.titleKey)}
      </h3>

      <p className="mt-2 text-sm leading-relaxed text-black/60 dark:text-white/60">
        {t(item.descriptionKey)}
      </p>
    </article>
  );

  if (!item.href) {
    return content;
  }

  return (
    <Link href={item.href} className="block h-full">
      {content}
    </Link>
  );
};

export default function HelpPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
      <header className="mb-10 rounded-[2rem] border border-light-200 bg-light-secondary p-8 dark:border-dark-200 dark:bg-dark-secondary">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-light-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-black/45 dark:border-dark-200 dark:text-white/45">
          <Sparkles size={14} />
          {t('helpPage.badge')}
        </div>

        <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-black dark:text-white md:text-6xl">
          {t('helpPage.title')}
        </h1>

        <p className="mt-5 max-w-3xl text-base leading-relaxed text-black/60 dark:text-white/60 md:text-lg">
          {t('helpPage.subtitle')}
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/search"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] dark:bg-white dark:text-black"
          >
            <Search size={16} />
            {t('helpPage.openSearch')}
          </Link>

          <Link
            href="/spaces"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-light-200 px-5 py-3 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
          >
            <LayoutGrid size={16} />
            {t('helpPage.openSpaces')}
          </Link>

          <Link
            href="/apps"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-light-200 px-5 py-3 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
          >
            <Rocket size={16} />
            {t('helpPage.openApps')}
          </Link>
        </div>
      </header>

      <section className="mb-12 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {foundationCards.map((item) => (
          <Card key={item.titleKey} item={item} />
        ))}
      </section>

      <section className="mb-12">
        <div className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight text-black dark:text-white">
            {t('helpPage.organizationTitle')}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-black/55 dark:text-white/55 md:text-base">
            {t('helpPage.organizationSubtitle')}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {organizationCards.map((item) => (
            <Card key={item.titleKey} item={item} />
          ))}
        </div>
      </section>

      <section className="mb-12 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
          <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">
            {t('helpPage.firstStepsTitle')}
          </h2>

          <div className="mt-6 space-y-3">
            {firstStepKeys.map((key, index) => (
              <div
                key={key}
                className="flex gap-3 rounded-2xl bg-light-primary p-4 dark:bg-dark-primary"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black text-xs font-bold text-white dark:bg-white dark:text-black">
                  {index + 1}
                </div>

                <p className="text-sm leading-relaxed text-black/65 dark:text-white/65">
                  {t(key)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
          <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">
            {t('helpPage.workflowsTitle')}
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {workflowCards.map((item) => (
              <Card key={item.titleKey} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">
              {t('helpPage.localReminderTitle')}
            </h2>

            <p className="mt-3 max-w-4xl text-sm leading-relaxed text-black/60 dark:text-white/60 md:text-base">
              {t('helpPage.localReminderDescription')}
            </p>
          </div>

          <Link
            href="/vault"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-light-200 px-5 py-3 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
          >
            <ShieldCheck size={16} />
            {t('helpPage.openVault')}
          </Link>
        </div>
      </section>
    </div>
  );
}
