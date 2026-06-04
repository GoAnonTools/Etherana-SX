'use client';

import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  PencilLine,
  Save,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

interface AutomationOutputItem {
  id: string;
  automationId: string;
  automationName: string;
  title: string;
  outputType: string;
  outputDestination: string;
  outputDestinationLabel: string;
  status: 'drafting' | 'ready';
  createdAt: string;
  runId: string;
  prompt: string;
  expectedOutput: string;
  content?: string;
}

const AUTOMATION_OUTPUTS_STORAGE_KEY = 'etherana.automationOutputs.v1';

const readAutomationOutputs = (): AutomationOutputItem[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(AUTOMATION_OUTPUTS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is AutomationOutputItem => {
      return (
        typeof item?.id === 'string' &&
        typeof item?.automationId === 'string' &&
        typeof item?.automationName === 'string' &&
        typeof item?.title === 'string' &&
        typeof item?.createdAt === 'string'
      );
    });
  } catch {
    return [];
  }
};

const writeAutomationOutputs = (outputs: AutomationOutputItem[]) => {
  if (typeof window === 'undefined') return;

  localStorage.setItem(
    AUTOMATION_OUTPUTS_STORAGE_KEY,
    JSON.stringify(outputs.slice(0, 100)),
  );
};

const OutputDetailPage = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [outputs, setOutputs] = useState<AutomationOutputItem[]>([]);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const storedOutputs = readAutomationOutputs();
    const output = storedOutputs.find((item) => item.id === params.id);

    setOutputs(storedOutputs);

    if (output) {
      setTitle(output.title);
      setContent(output.content ?? '');
    }
  }, [params.id]);

  const output = useMemo(() => {
    return outputs.find((item) => item.id === params.id);
  }, [outputs, params.id]);

  const saveOutput = () => {
    if (!output) return;

    const updatedOutput: AutomationOutputItem = {
      ...output,
      title: title.trim() || output.title,
      content,
      status: content.trim().length > 0 ? 'ready' : 'drafting',
    };

    const nextOutputs = outputs.map((item) =>
      item.id === output.id ? updatedOutput : item,
    );

    setOutputs(nextOutputs);
    writeAutomationOutputs(nextOutputs);
    setIsEditing(false);
  };

  const deleteOutput = () => {
    if (!output) return;

    const confirmed = window.confirm(
      `Delete "${output.title}"? This cannot be undone.`,
    );

    if (!confirmed) return;

    const nextOutputs = outputs.filter((item) => item.id !== output.id);
    writeAutomationOutputs(nextOutputs);
    router.push('/tasks');
  };

  if (!output) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-10">
        <Link
          href="/tasks"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-black/55 transition hover:text-black dark:text-white/55 dark:hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to Automations
        </Link>

        <div className="rounded-3xl border border-light-200 bg-light-secondary p-8 dark:border-dark-200 dark:bg-dark-secondary">
          <h1 className="text-3xl font-bold text-black dark:text-white">
            Output not found
          </h1>

          <p className="mt-3 text-black/60 dark:text-white/60">
            This output may have been deleted or created in another browser.
          </p>
        </div>
      </div>
    );
  }

  const spaceId = output.outputDestination.startsWith('space:')
    ? output.outputDestination.replace('space:', '')
    : null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 lg:px-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-medium text-black/55 transition hover:text-black dark:text-white/55 dark:hover:text-white"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="flex flex-wrap gap-3">
          {spaceId && (
            <Link
              href={`/spaces/${spaceId}`}
              className="inline-flex items-center gap-2 rounded-full border border-light-200 px-4 py-2 text-sm font-semibold text-black/65 transition hover:bg-light-secondary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-secondary dark:hover:text-white"
            >
              <ExternalLink size={15} />
              Open Space
            </Link>
          )}

          <Link
            href={`/tasks?automation=${output.automationId}`}
            className="inline-flex items-center gap-2 rounded-full border border-light-200 px-4 py-2 text-sm font-semibold text-black/65 transition hover:bg-light-secondary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-secondary dark:hover:text-white"
          >
            <ExternalLink size={15} />
            Open Automation
          </Link>

          <button
            type="button"
            onClick={deleteOutput}
            className="inline-flex items-center gap-2 rounded-full border border-red-500/20 px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-500/10"
          >
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      </div>

      <header className="rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-light-primary px-3 py-1 text-xs font-semibold text-black/50 dark:bg-dark-primary dark:text-white/50">
            <FileText size={14} />
            {output.outputType}
          </span>

          <span className="rounded-full bg-light-primary px-3 py-1 text-xs font-semibold capitalize text-black/50 dark:bg-dark-primary dark:text-white/50">
            {output.status}
          </span>

          <span className="rounded-full bg-light-primary px-3 py-1 text-xs font-semibold text-black/50 dark:bg-dark-primary dark:text-white/50">
            Save to {output.outputDestinationLabel}
          </span>
        </div>

        {isEditing ? (
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-3xl font-bold tracking-tight text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
          />
        ) : (
          <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white">
            {output.title}
          </h1>
        )}

        <p className="mt-4 text-sm leading-relaxed text-black/55 dark:text-white/55">
          Created from <strong>{output.automationName}</strong> on{' '}
          {new Date(output.createdAt).toLocaleString()}.
        </p>
      </header>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <main className="rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40">
                Output content
              </p>

              <h2 className="text-xl font-semibold text-black dark:text-white">
                {output.outputType}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setIsEditing((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full border border-light-200 px-4 py-2 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
            >
              <PencilLine size={15} />
              {isEditing ? 'Preview' : 'Edit'}
            </button>
          </div>

          {isEditing ? (
            <div>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Paste or write the final generated article/report here..."
                rows={18}
                className="w-full resize-none rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm leading-relaxed text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
              />

              <button
                type="button"
                onClick={saveOutput}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.01] active:scale-[0.99] dark:bg-white dark:text-black"
              >
                <Save size={16} />
                Save Output
              </button>
            </div>
          ) : content.trim().length > 0 ? (
            <article className="prose prose-neutral max-w-none whitespace-pre-wrap dark:prose-invert">
              {content}
            </article>
          ) : (
            <div className="rounded-2xl border border-dashed border-light-200 bg-light-primary p-10 text-center dark:border-dark-200 dark:bg-dark-primary">
              <CheckCircle2
                size={36}
                className="mx-auto mb-4 text-black/25 dark:text-white/25"
              />

              <h3 className="text-lg font-semibold text-black dark:text-white">
                Output draft created
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-black/55 dark:text-white/55">
                Etherana created the output record and sent the automation to
                Agent mode. Automatic capture of the final agent answer comes
                next. For now, paste the generated article here and save it.
              </p>

              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.01] active:scale-[0.99] dark:bg-white dark:text-black"
              >
                <PencilLine size={16} />
                Add content
              </button>
            </div>
          )}
        </main>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40">
              Expected output
            </p>

            <p className="text-sm leading-relaxed text-black/65 dark:text-white/65">
              {output.expectedOutput}
            </p>
          </section>

          <section className="rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40">
              Original agent prompt
            </p>

            <p className="max-h-[420px] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-black/65 dark:text-white/65">
              {output.prompt}
            </p>
          </section>
        </aside>
      </section>
    </div>
  );
};

export default OutputDetailPage;
