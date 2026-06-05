'use client';

import {
  ArrowLeft,
  Copy,
  LayoutTemplate,
  Play,
  Save,
  Sparkles,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  SMALL_APP_TEMPLATES,
  type SmallAppTemplate,
} from '@/lib/apps/catalog';

type AppInputValues = Record<string, string>;

const buildPromptFromTemplate = (
  app: SmallAppTemplate,
  values: AppInputValues,
) => {
  return app.promptTemplate.replace(/\{\{(.*?)\}\}/g, (_, key: string) => {
    return values[key.trim()] || '';
  });
};

const AppCard = ({
  app,
  onSelect,
}: {
  app: SmallAppTemplate;
  onSelect: (app: SmallAppTemplate) => void;
}) => {
  const Icon = app.icon;

  return (
    <button type="button" onClick={() => onSelect(app)} className="group h-full text-left">
      <article className="h-full rounded-3xl border border-light-200 bg-light-secondary p-6 shadow-sm transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg dark:border-dark-200 dark:bg-dark-secondary">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white dark:bg-white dark:text-black">
            <Icon size={22} />
          </div>

          <span className="rounded-full border border-light-200 px-3 py-1 text-xs font-medium text-black/55 dark:border-dark-200 dark:text-white/55">
            {app.category}
          </span>
        </div>

        <h2 className="mt-5 text-xl font-semibold text-black dark:text-white">
          {app.name}
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-black/60 dark:text-white/60">
          {app.description}
        </p>

        <div className="mt-5 rounded-2xl bg-light-primary p-4 dark:bg-dark-primary">
          <p className="text-xs font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
            Output
          </p>
          <p className="mt-1 text-sm text-black/75 dark:text-white/75">
            {app.outputType}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {app.goodFor.slice(0, 3).map((item) => (
            <span
              key={item}
              className="rounded-full bg-light-primary px-3 py-1 text-xs text-black/50 dark:bg-dark-primary dark:text-white/50"
            >
              {item}
            </span>
          ))}
        </div>
      </article>
    </button>
  );
};

const AppRunner = ({
  app,
  onBack,
}: {
  app: SmallAppTemplate;
  onBack: () => void;
}) => {
  const Icon = app.icon;
  const [values, setValues] = useState<AppInputValues>({});
  const [preparedPrompt, setPreparedPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  const canRun = useMemo(() => {
    return app.inputs.every((input) => {
      if (!input.required) return true;
      return values[input.id]?.trim().length > 0;
    });
  }, [app.inputs, values]);

  const handlePrepare = () => {
    if (!canRun) return;
    setPreparedPrompt(buildPromptFromTemplate(app, values));
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!preparedPrompt) return;
    await navigator.clipboard.writeText(preparedPrompt);
    setCopied(true);
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 lg:px-10">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-black/55 transition hover:text-black dark:text-white/55 dark:hover:text-white"
      >
        <ArrowLeft size={16} />
        Back to Apps
      </button>

      <header className="mb-8 rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black text-white dark:bg-white dark:text-black">
            <Icon size={26} />
          </div>

          <div>
            <div className="mb-2 inline-flex rounded-full border border-light-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-black/45 dark:border-dark-200 dark:text-white/45">
              {app.category} App
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white">
              {app.name}
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-black/60 dark:text-white/60 md:text-base">
              {app.description}
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <form
          className="rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary"
          onSubmit={(event) => {
            event.preventDefault();
            handlePrepare();
          }}
        >
          <h2 className="text-xl font-semibold text-black dark:text-white">
            Inputs
          </h2>

          <p className="mt-2 text-sm text-black/55 dark:text-white/55">
            Fill the fields, then prepare the app output instructions.
          </p>

          <div className="mt-6 space-y-5">
            {app.inputs.map((input) => (
              <label key={input.id} className="block space-y-2">
                <span className="text-sm font-medium text-black dark:text-white">
                  {input.label}
                  {input.required ? ' *' : ''}
                </span>

                {input.type === 'textarea' ? (
                  <textarea
                    value={values[input.id] || ''}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [input.id]: event.target.value,
                      }))
                    }
                    placeholder={input.placeholder}
                    rows={6}
                    className="w-full resize-none rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
                  />
                ) : input.type === 'select' ? (
                  <select
                    value={values[input.id] || ''}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [input.id]: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
                  >
                    <option value="">Choose...</option>
                    {input.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={values[input.id] || ''}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [input.id]: event.target.value,
                      }))
                    }
                    placeholder={input.placeholder}
                    className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
                  />
                )}
              </label>
            ))}
          </div>

          <button
            type="submit"
            disabled={!canRun}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black"
          >
            <Play size={16} />
            Prepare App
          </button>
        </form>

        <aside className="space-y-5">
          <div className="rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
            <h2 className="text-sm font-semibold text-black dark:text-white">
              How Apps work
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-black/55 dark:text-white/55">
              Apps are reusable mini-tools. They are not scheduled. You open one,
              fill the inputs, run it, then save the result if useful.
            </p>
          </div>

          <div className="rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
            <p className="text-xs font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
              Output type
            </p>
            <p className="mt-1 text-sm font-medium text-black/75 dark:text-white/75">
              {app.outputType}
            </p>
          </div>
        </aside>
      </section>

      {preparedPrompt && (
        <section className="mt-6 rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-black dark:text-white">
                Prepared App Instructions
              </h2>
              <p className="mt-1 text-sm text-black/55 dark:text-white/55">
                This is the clean instruction that will later be sent directly to
                the app runner.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-light-200 px-5 py-2.5 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
              >
                <Copy size={16} />
                {copied ? 'Copied' : 'Copy'}
              </button>

              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-light-200 px-5 py-2.5 text-sm font-semibold text-black/45 dark:border-dark-200 dark:text-white/45"
                title="Saving app outputs will be connected in the next implementation step."
              >
                <Save size={16} />
                Save later
              </button>
            </div>
          </div>

          <pre className="mt-5 whitespace-pre-wrap rounded-2xl bg-light-primary p-4 text-sm leading-relaxed text-black/75 dark:bg-dark-primary dark:text-white/75">
            {preparedPrompt}
          </pre>
        </section>
      )}
    </div>
  );
};

export default function AppsPage() {
  const [selectedApp, setSelectedApp] = useState<SmallAppTemplate | null>(null);

  if (selectedApp) {
    return <AppRunner app={selectedApp} onBack={() => setSelectedApp(null)} />;
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
      <header className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-light-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-black/45 dark:border-dark-200 dark:text-white/45">
            <Sparkles size={14} />
            Small Apps
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white md:text-5xl">
            Apps
          </h1>

          <p className="mt-4 text-base leading-relaxed text-black/60 dark:text-white/60 md:text-lg">
            Reusable mini-tools you open when you need them. Apps are not
            scheduled; they help you transform inputs into useful outputs.
          </p>
        </div>
      </header>

      <section className="mb-10 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-light-200 bg-light-secondary p-5 dark:border-dark-200 dark:bg-dark-secondary">
          <p className="text-sm font-semibold text-black dark:text-white">
            Open
          </p>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">
            Choose a reusable mini-tool.
          </p>
        </div>

        <div className="rounded-3xl border border-light-200 bg-light-secondary p-5 dark:border-dark-200 dark:bg-dark-secondary">
          <p className="text-sm font-semibold text-black dark:text-white">
            Fill
          </p>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">
            Add the inputs the app needs.
          </p>
        </div>

        <div className="rounded-3xl border border-light-200 bg-light-secondary p-5 dark:border-dark-200 dark:bg-dark-secondary">
          <p className="text-sm font-semibold text-black dark:text-white">
            Produce
          </p>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">
            Generate a reusable output.
          </p>
        </div>
      </section>

      <section className="mb-8 flex flex-wrap items-center gap-3 text-sm text-black/45 dark:text-white/45">
        <span className="inline-flex items-center gap-2">
          <LayoutTemplate size={16} />
          {SMALL_APP_TEMPLATES.length} app templates
        </span>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {SMALL_APP_TEMPLATES.map((app) => (
          <AppCard key={app.id} app={app} onSelect={setSelectedApp} />
        ))}
      </section>
    </div>
  );
}
