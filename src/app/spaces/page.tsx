'use client';

import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Compass,
  FileText,
  GraduationCap,
  LayoutGrid,
  Lightbulb,
  Link as LinkIcon,
  Loader2,
  Plus,
  Rocket,
  Search,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/useI18n';
import { useEffect, useMemo, useState } from 'react';

interface Space {
  id: string;
  name: string;
  description?: string;
  instruction?: string;
  createdAt: string;
  files?: { name: string; fileId: string }[];
}

interface StarterNote {
  title: string;
  content: string;
}

interface StarterLink {
  title: string;
  url: string;
  description?: string;
}

interface SpaceTemplate {
  id: string;
  name: string;
  description: string;
  instruction: string;
  icon: LucideIcon;
  tags: string[];
  starterNotes: StarterNote[];
  starterLinks: StarterLink[];
}

type ActiveTab = 'spaces' | 'archived' | 'templates';

const SPACE_TEMPLATES: SpaceTemplate[] = [
  {
    id: 'client-project',
    name: 'Client Project',
    description:
      'Centralize client context, notes, links, deliverables, conversations, and automation outputs.',
    instruction:
      'Use this Space as a client project hub. Prioritize client-specific documents, notes, links, conversations, outputs, and project history. When answering, help turn scattered context into clear decisions, deliverables, and next actions.',
    icon: Briefcase,
    tags: ['Client work', 'Deliverables', 'Follow-up'],
    starterNotes: [
      {
        title: 'Client goals',
        content:
          'Write the client’s main goals, success criteria, constraints, and important deadlines here.',
      },
      {
        title: 'Open questions',
        content:
          'List unresolved questions, missing information, risks, and points to clarify with the client.',
      },
      {
        title: 'Next actions',
        content:
          'Keep the next concrete actions here so this Space stays execution-focused.',
      },
    ],
    starterLinks: [],
  },
  {
    id: 'startup-idea',
    name: 'Startup Idea',
    description:
      'Develop a business idea with research, strategy, positioning, product notes, and execution plans.',
    instruction:
      'Use this Space to develop a startup or business idea. Help evaluate the market, clarify the customer problem, define positioning, generate experiments, track assumptions, and turn ideas into concrete next steps.',
    icon: Rocket,
    tags: ['Business idea', 'Strategy', 'Validation'],
    starterNotes: [
      {
        title: 'Problem statement',
        content:
          'Describe the problem, who has it, how painful it is, and how they currently solve it.',
      },
      {
        title: 'Target users',
        content:
          'Describe the ideal customer, their context, buying triggers, and objections.',
      },
      {
        title: 'Validation experiments',
        content:
          'List small tests that can validate demand before building too much.',
      },
    ],
    starterLinks: [],
  },
  {
    id: 'market-research',
    name: 'Market Research',
    description:
      'Collect competitors, references, trends, notes, sources, and analysis in one research hub.',
    instruction:
      'Use this Space as a research hub. Prioritize saved links, notes, documents, and conversation history. Summarize sources clearly, compare options, identify patterns, and produce actionable insights.',
    icon: Search,
    tags: ['Research', 'Competitors', 'Trends'],
    starterNotes: [
      {
        title: 'Research questions',
        content:
          'List the questions this research should answer. Keep them specific and decision-oriented.',
      },
      {
        title: 'Competitor notes',
        content:
          'Capture competitor positioning, pricing, features, strengths, weaknesses, and opportunities.',
      },
      {
        title: 'Key findings',
        content:
          'Summarize the most important findings and what they mean for the project.',
      },
    ],
    starterLinks: [],
  },
  {
    id: 'content-calendar',
    name: 'Content Calendar',
    description:
      'Plan content ideas, sources, article drafts, social posts, newsletters, and publishing actions.',
    instruction:
      'Use this Space to plan and produce content. Help organize ideas, references, outlines, drafts, publishing calendars, repurposing opportunities, and content automation outputs.',
    icon: FileText,
    tags: ['Content', 'Publishing', 'Ideas'],
    starterNotes: [
      {
        title: 'Content pillars',
        content:
          'List the main themes this project should talk about regularly.',
      },
      {
        title: 'Ideas backlog',
        content:
          'Collect raw content ideas here before turning them into outlines or drafts.',
      },
      {
        title: 'Publishing checklist',
        content:
          'Define the checklist to review before publishing: title, hook, CTA, links, visuals, SEO, and distribution.',
      },
    ],
    starterLinks: [],
  },
  {
    id: 'personal-project',
    name: 'Personal Project',
    description:
      'Organize a personal goal, learning plan, side project, move, purchase, or life admin project.',
    instruction:
      'Use this Space to organize a personal project. Help clarify the goal, collect notes and links, break the work into steps, track progress, and keep decisions easy to review.',
    icon: Lightbulb,
    tags: ['Personal', 'Planning', 'Progress'],
    starterNotes: [
      {
        title: 'Goal',
        content:
          'Write the goal, why it matters, and what “done” looks like.',
      },
      {
        title: 'Plan',
        content:
          'Break the project into simple phases, actions, and deadlines.',
      },
      {
        title: 'Useful references',
        content:
          'Save important reminders, decisions, links, and constraints here.',
      },
    ],
    starterLinks: [],
  },
  {
    id: 'learning-notes',
    name: 'Learning / Course Notes',
    description:
      'Collect course notes, links, documents, summaries, explanations, and revision outputs.',
    instruction:
      'Use this Space as a learning hub. Explain difficult concepts simply, connect ideas, create summaries, generate quizzes, organize notes, and help prepare revision plans from the saved material.',
    icon: GraduationCap,
    tags: ['Learning', 'Notes', 'Revision'],
    starterNotes: [
      {
        title: 'Course objectives',
        content:
          'List what you need to understand, memorize, practice, or produce.',
      },
      {
        title: 'Difficult concepts',
        content:
          'Collect confusing concepts here so Etherana can explain them later.',
      },
      {
        title: 'Revision plan',
        content:
          'Create a study plan with priorities, exercises, and checkpoints.',
      },
    ],
    starterLinks: [],
  },
  {
    id: 'operations-hub',
    name: 'Operations Hub',
    description:
      'Track recurring tasks, processes, SOPs, links, decisions, automations, and internal workflows.',
    instruction:
      'Use this Space as an operations hub. Help document processes, improve workflows, track recurring tasks, summarize decisions, and generate practical operating procedures.',
    icon: Users,
    tags: ['Operations', 'Processes', 'SOPs'],
    starterNotes: [
      {
        title: 'Recurring tasks',
        content:
          'List weekly or monthly tasks that need to be tracked or automated.',
      },
      {
        title: 'Processes to document',
        content:
          'List processes that should become checklists, SOPs, or automations.',
      },
      {
        title: 'Important links',
        content:
          'Add links to tools, dashboards, documents, folders, or references.',
      },
    ],
    starterLinks: [],
  },
];

const getSpaceInitials = (name: string) => {
  const words = name.trim().split(/\s+/).slice(0, 2);

  return words.map((word) => word[0]?.toUpperCase()).join('') || 'S';
};

const formatDate = (date: string, unknownDateLabel: string) => {
  try {
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return unknownDateLabel;
  }
};

const SpacesPage = () => {
  const router = useRouter();
  const { t } = useI18n();

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [archivedSpaces, setArchivedSpaces] = useState<Space[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('spaces');
  const [loading, setLoading] = useState(true);
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(
    null,
  );
  const [creatingSpace, setCreatingSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceDescription, setNewSpaceDescription] = useState('');

  const sortedSpaces = useMemo(() => {
    return [...spaces].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [spaces]);

  const sortedArchivedSpaces = useMemo(() => {
    return [...archivedSpaces].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [archivedSpaces]);

  const fetchSpaces = async () => {
    try {
      const [activeRes, archivedRes] = await Promise.all([
        fetch('/api/spaces'),
        fetch('/api/spaces?archived=true'),
      ]);

      if (activeRes.ok) {
        const activeData = await activeRes.json();
        setSpaces(Array.isArray(activeData) ? activeData : activeData.spaces ?? []);
      }

      if (archivedRes.ok) {
        const archivedData = await archivedRes.json();
        setArchivedSpaces(
          Array.isArray(archivedData) ? archivedData : archivedData.spaces ?? [],
        );
      }
    } catch (error) {
      console.error('Failed to fetch Spaces:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  const createSpace = async ({
    name,
    description,
    instruction,
  }: {
    name: string;
    description?: string;
    instruction?: string;
  }) => {
    const res = await fetch('/api/spaces', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        description: description ?? '',
        instruction: instruction ?? '',
      }),
    });

    if (!res.ok) {
      throw new Error('Could not create Space.');
    }

    const created = await res.json();
    const createdId = String(created.id ?? created.space?.id ?? '');

    if (!createdId) {
      throw new Error('Space created but no id was returned.');
    }

    return createdId;
  };

  const createCapture = async (
    spaceId: string,
    payload:
      | {
          kind: 'note';
          title: string;
          content: string;
        }
      | {
          kind: 'link';
          title: string;
          url: string;
          description?: string;
        },
  ) => {
    await fetch(`/api/spaces/${spaceId}/captures`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  };

  const handleCreateBlankSpace = async () => {
    if (!newSpaceName.trim()) return;

    setCreatingSpace(true);

    try {
      const spaceId = await createSpace({
        name: newSpaceName.trim(),
        description: newSpaceDescription.trim(),
        instruction:
          'Use this Space to organize conversations, knowledge, notes, links, outputs, and automations for this project.',
      });

      setNewSpaceName('');
      setNewSpaceDescription('');
      router.push(`/spaces/${spaceId}`);
    } catch (error) {
      console.error('Failed to create Space:', error);
      alert(t('spacesPage.couldNotCreateSpace'));
    } finally {
      setCreatingSpace(false);
    }
  };

  const handleUseTemplate = async (template: SpaceTemplate) => {
    setCreatingTemplateId(template.id);

    try {
      const spaceId = await createSpace({
        name: template.name,
        description: template.description,
        instruction: template.instruction,
      });

      await Promise.all([
        ...template.starterNotes.map((note) =>
          createCapture(spaceId, {
            kind: 'note',
            title: note.title,
            content: note.content,
          }),
        ),
        ...template.starterLinks.map((link) =>
          createCapture(spaceId, {
            kind: 'link',
            title: link.title,
            url: link.url,
            description: link.description,
          }),
        ),
      ]);

      router.push(`/spaces/${spaceId}`);
    } catch (error) {
      console.error('Failed to use Space template:', error);
      alert(t('spacesPage.couldNotCreateFromTemplate'));
    } finally {
      setCreatingTemplateId(null);
    }
  };

  return (
    <main className="min-h-screen bg-light-primary px-6 py-10 dark:bg-dark-primary lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-light-200 bg-light-secondary p-7 shadow-sm dark:border-dark-200 dark:bg-dark-secondary">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-light-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-black/45 dark:border-dark-200 dark:text-white/45">
            <LayoutGrid size={14} />
            {t('spacesPage.badge')}
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white md:text-5xl">
                {t('spacesPage.title')}
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-relaxed text-black/60 dark:text-white/60">
                {t('spacesPage.subtitle')}
              </p>
            </div>

            <div className="rounded-3xl bg-light-primary p-4 dark:bg-dark-primary lg:w-[360px]">
              <p className="mb-3 text-sm font-semibold text-black dark:text-white">
                {t('spacesPage.createBlankSpace')}
              </p>

              <div className="space-y-3">
                <input
                  value={newSpaceName}
                  onChange={(event) => setNewSpaceName(event.target.value)}
                  placeholder={t('spacesPage.spaceName')}
                  className="w-full rounded-2xl border border-light-200 bg-light-secondary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-secondary dark:text-white dark:focus:border-white"
                />

                <input
                  value={newSpaceDescription}
                  onChange={(event) =>
                    setNewSpaceDescription(event.target.value)
                  }
                  placeholder={t('spacesPage.shortDescription')}
                  className="w-full rounded-2xl border border-light-200 bg-light-secondary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-secondary dark:text-white dark:focus:border-white"
                />

                <button
                  type="button"
                  onClick={handleCreateBlankSpace}
                  disabled={creatingSpace || !newSpaceName.trim()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:opacity-40 dark:bg-white dark:text-black"
                >
                  {creatingSpace ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  {t('spacesPage.createSpace')}
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('spaces')}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === 'spaces'
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-light-secondary text-black/55 hover:text-black dark:bg-dark-secondary dark:text-white/55 dark:hover:text-white'
            }`}
          >
            {t('spacesPage.mySpaces')} · {spaces.length}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('archived')}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === 'archived'
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-light-secondary text-black/55 hover:text-black dark:bg-dark-secondary dark:text-white/55 dark:hover:text-white'
            }`}
          >
            {t('spacesPage.archived')} · {archivedSpaces.length}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === 'templates'
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-light-secondary text-black/55 hover:text-black dark:bg-dark-secondary dark:text-white/55 dark:hover:text-white'
            }`}
          >
            {t('spacesPage.templates')} · {SPACE_TEMPLATES.length}
          </button>
        </div>

        {activeTab === 'spaces' && (
          <section className="mt-8">
            {loading ? (
              <div className="flex min-h-[240px] items-center justify-center rounded-[2rem] border border-light-200 bg-light-secondary dark:border-dark-200 dark:bg-dark-secondary">
                <Loader2 className="animate-spin text-black/40 dark:text-white/40" />
              </div>
            ) : sortedSpaces.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-light-200 bg-light-secondary p-10 text-center dark:border-dark-200 dark:bg-dark-secondary">
                <Sparkles
                  size={32}
                  className="mx-auto mb-4 text-black/35 dark:text-white/35"
                />

                <h2 className="text-xl font-semibold text-black dark:text-white">
                  {t('spacesPage.noSpacesYet')}
                </h2>

                <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-black/55 dark:text-white/55">
                  {t('spacesPage.noSpacesDescription')}
                </p>

                <button
                  type="button"
                  onClick={() => setActiveTab('templates')}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] dark:bg-white dark:text-black"
                >
                  {t('spacesPage.browseTemplates')}
                  <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {sortedSpaces.map((space) => (
                  <Link
                    key={space.id}
                    href={`/spaces/${space.id}`}
                    className="group flex min-h-[260px] flex-col rounded-[2rem] border border-light-200 bg-light-secondary p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-dark-200 dark:bg-dark-secondary"
                  >
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-light-primary text-sm font-bold text-black dark:bg-dark-primary dark:text-white">
                        {getSpaceInitials(space.name)}
                      </div>

                      <span className="rounded-full bg-light-primary px-3 py-1 text-xs font-medium text-black/45 dark:bg-dark-primary dark:text-white/45">
                        {formatDate(space.createdAt, t('spacesPage.unknownDate'))}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-black dark:text-white">
                      {space.name}
                    </h2>

                    <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-black/55 dark:text-white/55">
                      {space.description ||
                        t('spacesPage.defaultSpaceDescription')}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-light-primary px-3 py-1 text-xs text-black/45 dark:bg-dark-primary dark:text-white/45">
                        <BookOpen size={12} />
                        {space.files?.length ?? 0} {(space.files?.length ?? 0) === 1 ? t('spacesPage.fileSingular') : t('spacesPage.filePlural')}
                      </span>
                    </div>

                    <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-black dark:text-white">
                      {t('spacesPage.openSpace')}
                      <ArrowRight
                        size={16}
                        className="transition group-hover:translate-x-1"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'archived' && (
          <section className="mt-8">
            {sortedArchivedSpaces.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-light-200 bg-light-secondary p-10 text-center dark:border-dark-200 dark:bg-dark-secondary">
                <h2 className="text-xl font-semibold text-black dark:text-white">
                  {t('spacesPage.noArchivedSpaces')}
                </h2>

                <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-black/55 dark:text-white/55">
                  {t('spacesPage.noArchivedDescription')}
                </p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {sortedArchivedSpaces.map((space) => (
                  <Link
                    key={space.id}
                    href={`/spaces/${space.id}`}
                    className="group flex min-h-[260px] flex-col rounded-[2rem] border border-light-200 bg-light-secondary p-6 opacity-80 shadow-sm transition hover:-translate-y-0.5 hover:opacity-100 hover:shadow-md dark:border-dark-200 dark:bg-dark-secondary"
                  >
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-light-primary text-sm font-bold text-black dark:bg-dark-primary dark:text-white">
                        {getSpaceInitials(space.name)}
                      </div>

                      <span className="rounded-full bg-light-primary px-3 py-1 text-xs font-medium text-black/45 dark:bg-dark-primary dark:text-white/45">
                        {t('spacesPage.archived')}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-black dark:text-white">
                      {space.name}
                    </h2>

                    <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-black/55 dark:text-white/55">
                      {space.description ||
                        t('spacesPage.archivedProjectSpace')}
                    </p>

                    <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-black dark:text-white">
                      {t('spacesPage.openArchivedSpace')}
                      <ArrowRight
                        size={16}
                        className="transition group-hover:translate-x-1"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'templates' && (
          <section className="mt-8">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-black dark:text-white">
                {t('spacesPage.spaceTemplates')}
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-black/55 dark:text-white/55">
                {t('spacesPage.templatesDescription')}
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {SPACE_TEMPLATES.map((template) => {
                const Icon = template.icon;
                const isCreating = creatingTemplateId === template.id;

                return (
                  <article
                    key={template.id}
                    className="flex min-h-[300px] flex-col rounded-[2rem] border border-light-200 bg-light-secondary p-6 shadow-sm dark:border-dark-200 dark:bg-dark-secondary"
                  >
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-light-primary text-black dark:bg-dark-primary dark:text-white">
                        <Icon size={22} />
                      </div>

                      <span className="rounded-full bg-light-primary px-3 py-1 text-xs font-medium text-black/45 dark:bg-dark-primary dark:text-white/45">
                        {t('spacesPage.template')}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-black dark:text-white">
                      {template.name}
                    </h3>

                    <p className="mt-3 flex-1 text-sm leading-relaxed text-black/55 dark:text-white/55">
                      {template.description}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {template.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-light-primary px-3 py-1 text-xs text-black/45 dark:bg-dark-primary dark:text-white/45"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-black/45 dark:text-white/45">
                      <span className="inline-flex items-center gap-1 rounded-full bg-light-primary px-3 py-2 dark:bg-dark-primary">
                        <FileText size={12} />
                        {template.starterNotes.length} {template.starterNotes.length === 1 ? t('spacesPage.noteSingular') : t('spacesPage.notePlural')}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-full bg-light-primary px-3 py-2 dark:bg-dark-primary">
                        <LinkIcon size={12} />
                        {template.starterLinks.length} {template.starterLinks.length === 1 ? t('spacesPage.linkSingular') : t('spacesPage.linkPlural')}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUseTemplate(template)}
                      disabled={Boolean(creatingTemplateId)}
                      className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:opacity-40 dark:bg-white dark:text-black"
                    >
                      {isCreating ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Compass size={16} />
                      )}
                      {isCreating ? t('spacesPage.creatingSpace') : t('spacesPage.useTemplate')}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

export default SpacesPage;
