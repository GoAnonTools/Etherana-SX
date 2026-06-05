'use client';

import DeleteChat from '@/components/DeleteChat';
import { formatTimeDifference } from '@/lib/utils';
import {
  ArrowRight,
  BookOpen,
  Bot,
  ChevronLeft,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  LayoutGrid,
  Link as LinkIcon,
  MessageSquare,
  NotebookPen,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import {
  type AutomationOutputItem,
  type StoredAutomation,
  getAutomationStorageChangedEventName,
  readAutomationOutputs,
  readCustomAutomations,
} from '@/lib/vault/localVault';

interface Space {
  id: string;
  name: string;
  description: string;
  instruction?: string;
  createdAt: string;
  files: { name: string; fileId: string }[];
}

interface Chat {
  id: string;
  title: string;
  createdAt: string;
  sources: string[];
  files: { fileId: string; name: string }[];
}

interface SpaceNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface SpaceSavedLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  createdAt: string;
}

type SpaceSection = 'conversations' | 'knowledge' | 'outputs' | 'automations';


const EmptyState = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) => {
  return (
    <div className="rounded-3xl border border-dashed border-light-200 bg-light-secondary p-12 text-center dark:border-dark-200 dark:bg-dark-secondary">
      <p className="text-lg font-semibold text-black dark:text-white">
        {title}
      </p>

      <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-black/50 dark:text-white/50">
        {description}
      </p>

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};

const PBKDF2_ITERATIONS = 310_000;

const textEncoder = new TextEncoder();

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return window.btoa(binary);
};

const generateBytes = (length: number) => {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return bytes;
};

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(bytes.byteLength);
  const view = new Uint8Array(buffer);
  view.set(bytes);
  return buffer;
};

const deriveSpaceExportKey = async (
  recoveryPhrase: string,
  salt: Uint8Array,
) => {
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    toArrayBuffer(textEncoder.encode(recoveryPhrase)),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt'],
  );
};

const downloadJson = (filename: string, data: unknown) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
};

const slugify = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
};

const encryptSpaceVaultPayload = async (
  payload: any,
  recoveryPhrase: string,
) => {
  const salt = generateBytes(16);
  const iv = generateBytes(12);
  const key = await deriveSpaceExportKey(recoveryPhrase, salt);

  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
    },
    key,
    toArrayBuffer(textEncoder.encode(JSON.stringify(payload))),
  );

  return {
    version: 1,
    app: 'etherana-sx',
    vaultId: payload.vaultId,
    createdAt: new Date().toISOString(),
    kdf: {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: PBKDF2_ITERATIONS,
      salt: bytesToBase64(salt),
    },
    cipher: {
      name: 'AES-GCM',
      iv: bytesToBase64(iv),
    },
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
  };
};

const SpaceDetailPage = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const spaceId = params.id;

  const [space, setSpace] = useState<Space | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [notes, setNotes] = useState<SpaceNote[]>([]);
  const [savedLinks, setSavedLinks] = useState<SpaceSavedLink[]>([]);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkDescription, setLinkDescription] = useState('');
  const [outputs, setOutputs] = useState<AutomationOutputItem[]>([]);
  const [customAutomations, setCustomAutomations] = useState<
    StoredAutomation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [exportingSpace, setExportingSpace] = useState(false);
  const [activeSection, setActiveSection] =
    useState<SpaceSection>('outputs');

  const refreshLocalWorkspaceData = () => {
    setOutputs(readAutomationOutputs());
    setCustomAutomations(readCustomAutomations());
  };

  const fetchSpaceCaptures = async () => {
    try {
      const res = await fetch(`/api/spaces/${spaceId}/captures`);

      if (!res.ok) return;

      const data = await res.json();

      setNotes(Array.isArray(data.notes) ? data.notes : []);
      setSavedLinks(Array.isArray(data.links) ? data.links : []);
    } catch (err) {
      console.error('Failed to fetch Space captures:', err);
    }
  };

  const createNote = async () => {
    if (!noteContent.trim()) return;

    const res = await fetch(`/api/spaces/${spaceId}/captures`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        kind: 'note',
        title: noteTitle.trim() || 'Untitled note',
        content: noteContent.trim(),
      }),
    });

    if (!res.ok) return;

    setNoteTitle('');
    setNoteContent('');
    fetchSpaceCaptures();
  };

  const createLink = async () => {
    if (!linkUrl.trim()) return;

    const res = await fetch(`/api/spaces/${spaceId}/captures`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        kind: 'link',
        title: linkTitle.trim() || linkUrl.trim(),
        url: linkUrl.trim(),
        description: linkDescription.trim(),
      }),
    });

    if (!res.ok) return;

    setLinkTitle('');
    setLinkUrl('');
    setLinkDescription('');
    fetchSpaceCaptures();
  };

  const deleteCapture = async (kind: 'note' | 'link', id: string) => {
    await fetch(`/api/spaces/${spaceId}/captures?kind=${kind}&id=${id}`, {
      method: 'DELETE',
    });

    fetchSpaceCaptures();
  };

  const fetchSpaceDetails = async () => {
    try {
      const res = await fetch(`/api/spaces/${spaceId}`);

      if (!res.ok) {
        router.push('/spaces');
        return;
      }

      const data = await res.json();

      setSpace({
        ...data.space,
        files: data.space?.files ?? [],
      });

      setChats(
        (data.chats ?? []).map((chat: Chat) => ({
          ...chat,
          sources: chat.sources ?? [],
          files: chat.files ?? [],
        })),
      );

      refreshLocalWorkspaceData();
      fetchSpaceCaptures();
    } catch (err) {
      console.error('Failed to fetch space details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpaceDetails();
  }, [spaceId]);

  useEffect(() => {
    const refresh = () => refreshLocalWorkspaceData();

    const automationStorageChangedEvent = getAutomationStorageChangedEventName();

    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener(automationStorageChangedEvent, refresh);

    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener(automationStorageChangedEvent, refresh);
    };
  }, []);

  const handleExportSpace = async () => {
    if (!space) return;

    const recoveryPhrase = window.prompt(
      `Choose a recovery phrase to encrypt the "${space.name}" Space export. You will need it to import this Space later.`,
    );

    if (!recoveryPhrase?.trim()) return;

    setExportingSpace(true);

    try {
      const res = await fetch(`/api/vault/spaces/${space.id}`);

      if (!res.ok) {
        throw new Error('Could not prepare Space export.');
      }

      const payload = await res.json();
      const encryptedVault = await encryptSpaceVaultPayload(
        payload,
        recoveryPhrase.trim(),
      );

      const date = new Date().toISOString().slice(0, 10);
      const filename = `etherana-space-${slugify(space.name) || space.id}-${date}.json`;

      downloadJson(filename, encryptedVault);
    } catch (error) {
      console.error('Failed to export Space:', error);
      alert('Could not export this Space.');
    } finally {
      setExportingSpace(false);
    }
  };

  const handleDeleteSpace = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this space? Conversations will remain but won't be listed here.",
      )
    ) {
      return;
    }

    try {
      await fetch(`/api/spaces/${spaceId}`, { method: 'DELETE' });
      router.push('/spaces');
    } catch (err) {
      console.error('Failed to delete space:', err);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;

    if (!selectedFiles?.length || !space) return;

    setLoading(true);

    try {
      const data = new FormData();

      for (let index = 0; index < selectedFiles.length; index += 1) {
        data.append('files', selectedFiles[index]);
      }

      const embeddingModelProvider = localStorage.getItem(
        'embeddingModelProviderId',
      );
      const embeddingModel = localStorage.getItem('embeddingModelKey');

      if (!embeddingModelProvider || !embeddingModel) {
        alert('Please select an embedding model in settings before uploading.');
        return;
      }

      data.append('embedding_model_provider_id', embeddingModelProvider);
      data.append('embedding_model_key', embeddingModel);

      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: data,
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.message || 'Upload failed');
      }

      const uploadedFiles = resData.files.map((file: any) => ({
        name: file.fileName,
        fileId: file.fileId,
      }));

      const nextFiles = [...space.files, ...uploadedFiles];

      await fetch(`/api/spaces/${spaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: nextFiles }),
      });

      fetchSpaceDetails();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!space) return;

    const nextFiles = space.files.filter((file) => file.fileId !== fileId);

    try {
      await fetch(`/api/spaces/${spaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: nextFiles }),
      });

      fetchSpaceDetails();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const spaceOutputs = useMemo(() => {
    if (!space) return [];

    return outputs.filter(
      (output) => output.outputDestination === `space:${space.id}`,
    );
  }, [outputs, space]);

  const relatedAutomations = useMemo(() => {
    if (!space) return [];

    const outputAutomationIds = new Set(
      spaceOutputs.map((output) => output.automationId),
    );

    const customRelated = customAutomations
      .filter((automation) => {
        return (
          automation.outputDestination === `space:${space.id}` ||
          outputAutomationIds.has(automation.id)
        );
      })
      .map((automation) => ({
        id: automation.id,
        name: automation.name,
        category: automation.category || 'Custom',
        frequency: automation.frequency || 'Manual',
        outputType: automation.outputType || 'Document',
        runCount: spaceOutputs.filter(
          (output) => output.automationId === automation.id,
        ).length,
        isCustom: true,
      }));

    const outputOnlyAutomations = Array.from(outputAutomationIds)
      .filter((automationId) => {
        return !customRelated.some(
          (automation) => automation.id === automationId,
        );
      })
      .map((automationId) => {
        const firstOutput = spaceOutputs.find(
          (output) => output.automationId === automationId,
        );

        return {
          id: automationId,
          name: firstOutput?.automationName ?? 'Automation',
          category: 'Template',
          frequency: 'Manual',
          outputType: firstOutput?.outputType ?? 'Document',
          runCount: spaceOutputs.filter(
            (output) => output.automationId === automationId,
          ).length,
          isCustom: false,
        };
      });

    return [...customRelated, ...outputOnlyAutomations];
  }, [customAutomations, space, spaceOutputs]);

  const sections = [
    {
      id: 'conversations' as const,
      label: 'Conversations',
      icon: MessageSquare,
      count: chats.length,
    },
    {
      id: 'knowledge' as const,
      label: 'Knowledge',
      icon: BookOpen,
      count: (space?.files.length ?? 0) + notes.length + savedLinks.length,
    },
    {
      id: 'outputs' as const,
      label: 'Outputs',
      icon: FileText,
      count: spaceOutputs.length,
    },
    {
      id: 'automations' as const,
      label: 'Automations',
      icon: Bot,
      count: relatedAutomations.length,
    },
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-light-primary dark:bg-dark-primary">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!space) return null;

  return (
    <div className="min-h-screen overflow-y-auto bg-light-primary dark:bg-dark-primary">
      <header className="sticky top-0 z-10 border-b border-light-200 bg-light-secondary/95 backdrop-blur-md dark:border-dark-200 dark:bg-dark-secondary/80">
        <div className="mx-auto max-w-7xl px-6 py-6 lg:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <Link
                href="/spaces"
                className="rounded-full p-2 transition hover:bg-light-200 dark:hover:bg-dark-200"
              >
                <ChevronLeft size={24} />
              </Link>

              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-light-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-black/40 dark:border-dark-200 dark:text-white/40">
                  <LayoutGrid size={14} />
                  Space
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
                  {space.name}
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-black/50 dark:text-white/50">
                  {space.description || 'No description provided.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/search?spaceId=${space.id}`}
                className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.01] active:scale-[0.99] dark:bg-white dark:text-black"
              >
                <Plus size={18} />
                New Chat
              </Link>

              <button
                type="button"
                onClick={handleExportSpace}
                disabled={exportingSpace}
                className="inline-flex items-center gap-2 rounded-full border border-light-200 px-4 py-2.5 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black disabled:opacity-50 dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
              >
                <Download size={18} />
                {exportingSpace ? 'Exporting...' : 'Export Space'}
              </button>

              <button
                type="button"
                onClick={handleDeleteSpace}
                className="inline-flex items-center gap-2 rounded-full border border-red-500/20 px-4 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-500/10"
              >
                <Trash2 size={18} />
                Delete
              </button>
            </div>
          </div>

          <nav className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {sections.map((section) => {
              const Icon = section.icon;
              const active = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                    active
                      ? 'border-black bg-light-primary text-black dark:border-white dark:bg-dark-primary dark:text-white'
                      : 'border-light-200 text-black/55 hover:bg-light-primary hover:text-black dark:border-dark-200 dark:text-white/55 dark:hover:bg-dark-primary dark:hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Icon size={17} />
                    {section.label}
                  </span>

                  <span className="rounded-full bg-light-secondary px-2 py-0.5 text-xs text-black/45 dark:bg-dark-secondary dark:text-white/45">
                    {section.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1fr_340px] lg:px-10">
        <section>
          {activeSection === 'outputs' && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-2xl font-bold text-black dark:text-white">
                  <FileText size={22} className="text-purple-500" />
                  Outputs
                </h2>

                <span className="rounded-full bg-light-secondary px-3 py-1 text-sm text-black/45 dark:bg-dark-secondary dark:text-white/45">
                  {spaceOutputs.length}
                </span>
              </div>

              {spaceOutputs.length === 0 ? (
                <EmptyState
                  title="No outputs saved in this Space yet."
                  description="Run an automation and choose this Space as the save destination. Generated articles, reports, summaries, and other deliverables will appear here."
                  action={
                    <Link
                      href="/tasks"
                      className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.01] dark:bg-white dark:text-black"
                    >
                      Open Automations
                      <ArrowRight size={16} />
                    </Link>
                  }
                />
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  {spaceOutputs.map((output) => (
                    <article
                      key={output.id}
                      className="rounded-3xl border border-light-200 bg-light-secondary p-5 transition hover:-translate-y-0.5 hover:border-purple-500/40 hover:shadow-lg dark:border-dark-200 dark:bg-dark-secondary"
                    >
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-light-primary px-3 py-1 text-xs font-medium text-black/50 dark:bg-dark-primary dark:text-white/50">
                          {output.outputType}
                        </span>

                        <span className="rounded-full bg-light-primary px-3 py-1 text-xs font-medium capitalize text-black/50 dark:bg-dark-primary dark:text-white/50">
                          {output.status}
                        </span>
                      </div>

                      <h3 className="line-clamp-2 text-lg font-semibold text-black dark:text-white">
                        {output.title}
                      </h3>

                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-black/55 dark:text-white/55">
                        {output.content || output.expectedOutput}
                      </p>

                      <div className="mt-5 flex items-center justify-between gap-4">
                        <p className="text-xs text-black/40 dark:text-white/40">
                          {formatTimeDifference(new Date(), output.createdAt)} Ago
                        </p>

                        <Link
                          href={`/outputs/${output.id}`}
                          className="inline-flex items-center gap-2 text-sm font-semibold text-purple-500 hover:underline"
                        >
                          Open output
                          <ExternalLink size={14} />
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === 'conversations' && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-2xl font-bold text-black dark:text-white">
                  <MessageSquare size={22} className="text-blue-500" />
                  Conversations
                </h2>

                <span className="rounded-full bg-light-secondary px-3 py-1 text-sm text-black/45 dark:bg-dark-secondary dark:text-white/45">
                  {chats.length}
                </span>
              </div>

              {chats.length === 0 ? (
                <EmptyState
                  title="No conversations in this Space yet."
                  description="Start a Space conversation to keep research and decisions attached to this business context."
                  action={
                    <Link
                      href={`/search?spaceId=${space.id}`}
                      className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.01] dark:bg-white dark:text-black"
                    >
                      Start a conversation
                      <ArrowRight size={16} />
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-4">
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      className="group rounded-3xl border border-light-200 bg-light-secondary p-5 transition hover:border-blue-500/40 dark:border-dark-200 dark:bg-dark-secondary"
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <Link
                          href={`/c/${chat.id}`}
                          className="line-clamp-2 text-lg font-semibold text-black transition group-hover:text-blue-500 dark:text-white"
                        >
                          {chat.title}
                        </Link>

                        <DeleteChat
                          chatId={chat.id}
                          chats={chats}
                          setChats={setChats}
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-black/45 dark:text-white/45">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatTimeDifference(new Date(), chat.createdAt)} Ago
                        </span>

                        {chat.sources.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Globe2 size={12} />
                            {chat.sources.length} Sources
                          </span>
                        )}

                        {chat.files.length > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText size={12} />
                            {chat.files.length} Files
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === 'knowledge' && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-2xl font-bold text-black dark:text-white">
                  <BookOpen size={22} className="text-green-500" />
                  Knowledge
                </h2>

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.01] dark:bg-white dark:text-black">
                  <Upload size={16} />
                  Upload files
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    onChange={handleFileUpload}
                    accept=".pdf,.docx,.txt"
                  />
                </label>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <section className="rounded-3xl border border-light-200 bg-light-secondary p-5 dark:border-dark-200 dark:bg-dark-secondary">
                  <div className="mb-4 flex items-center gap-2">
                    <FileText size={18} className="text-green-500" />
                    <h3 className="font-semibold text-black dark:text-white">
                      Files
                    </h3>
                  </div>

                  {space.files.length === 0 ? (
                    <p className="text-sm text-black/45 dark:text-white/45">
                      No files yet. Upload documents that Etherana should use as
                      knowledge for this Space.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {space.files.map((file) => (
                        <div
                          key={file.fileId}
                          className="flex items-center justify-between gap-4 rounded-2xl bg-light-primary p-4 dark:bg-dark-primary"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-black dark:text-white">
                              {file.name}
                            </p>

                            <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                              Knowledge source
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteFile(file.fileId)}
                            className="rounded-full p-2 text-red-500 transition hover:bg-red-500/10"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-3xl border border-light-200 bg-light-secondary p-5 dark:border-dark-200 dark:bg-dark-secondary">
                  <div className="mb-4 flex items-center gap-2">
                    <NotebookPen size={18} className="text-blue-500" />
                    <h3 className="font-semibold text-black dark:text-white">
                      Personal notes
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <input
                      value={noteTitle}
                      onChange={(event) => setNoteTitle(event.target.value)}
                      placeholder="Note title"
                      className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none dark:border-dark-200 dark:bg-dark-primary dark:text-white"
                    />

                    <textarea
                      value={noteContent}
                      onChange={(event) => setNoteContent(event.target.value)}
                      placeholder="Write a quick note for this Space..."
                      rows={4}
                      className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none dark:border-dark-200 dark:bg-dark-primary dark:text-white"
                    />

                    <button
                      type="button"
                      onClick={createNote}
                      className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.01] dark:bg-white dark:text-black"
                    >
                      <Plus size={16} />
                      Save note
                    </button>
                  </div>

                  <div className="mt-5 space-y-3">
                    {notes.map((note) => (
                      <article
                        key={note.id}
                        className="rounded-2xl bg-light-primary p-4 dark:bg-dark-primary"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="font-semibold text-black dark:text-white">
                            {note.title}
                          </h4>

                          <button
                            type="button"
                            onClick={() => deleteCapture('note', note.id)}
                            className="rounded-full p-1.5 text-red-500 transition hover:bg-red-500/10"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-black/60 dark:text-white/60">
                          {note.content}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="rounded-3xl border border-light-200 bg-light-secondary p-5 dark:border-dark-200 dark:bg-dark-secondary lg:col-span-2">
                  <div className="mb-4 flex items-center gap-2">
                    <LinkIcon size={18} className="text-purple-500" />
                    <h3 className="font-semibold text-black dark:text-white">
                      Saved links
                    </h3>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <input
                      value={linkTitle}
                      onChange={(event) => setLinkTitle(event.target.value)}
                      placeholder="Link title"
                      className="rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none dark:border-dark-200 dark:bg-dark-primary dark:text-white"
                    />

                    <input
                      value={linkUrl}
                      onChange={(event) => setLinkUrl(event.target.value)}
                      placeholder="https://example.com"
                      className="rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none dark:border-dark-200 dark:bg-dark-primary dark:text-white"
                    />

                    <input
                      value={linkDescription}
                      onChange={(event) =>
                        setLinkDescription(event.target.value)
                      }
                      placeholder="Why this link matters"
                      className="rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm text-black outline-none dark:border-dark-200 dark:bg-dark-primary dark:text-white"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={createLink}
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.01] dark:bg-white dark:text-black"
                  >
                    <Plus size={16} />
                    Save link
                  </button>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {savedLinks.map((savedLink) => (
                      <article
                        key={savedLink.id}
                        className="rounded-2xl bg-light-primary p-4 dark:bg-dark-primary"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <a
                              href={savedLink.url}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate font-semibold text-purple-500 hover:underline"
                            >
                              {savedLink.title}
                            </a>

                            <p className="mt-1 truncate text-xs text-black/40 dark:text-white/40">
                              {savedLink.url}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => deleteCapture('link', savedLink.id)}
                            className="rounded-full p-1.5 text-red-500 transition hover:bg-red-500/10"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {savedLink.description && (
                          <p className="mt-2 text-sm leading-relaxed text-black/60 dark:text-white/60">
                            {savedLink.description}
                          </p>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeSection === 'automations' && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-2xl font-bold text-black dark:text-white">
                  <Bot size={22} className="text-orange-500" />
                  Automations
                </h2>

                <Link
                  href="/tasks"
                  className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.01] dark:bg-white dark:text-black"
                >
                  Manage Automations
                  <ArrowRight size={16} />
                </Link>
              </div>

              {relatedAutomations.length === 0 ? (
                <EmptyState
                  title="No automations connected to this Space yet."
                  description="Create an automation and choose this Space as the save destination. It will appear here once it creates an output."
                  action={
                    <Link
                      href="/tasks"
                      className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.01] dark:bg-white dark:text-black"
                    >
                      Create automation
                      <ArrowRight size={16} />
                    </Link>
                  }
                />
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  {relatedAutomations.map((automation) => (
                    <article
                      key={automation.id}
                      className="rounded-3xl border border-light-200 bg-light-secondary p-5 dark:border-dark-200 dark:bg-dark-secondary"
                    >
                      <div className="mb-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-light-primary px-3 py-1 text-xs font-medium text-black/50 dark:bg-dark-primary dark:text-white/50">
                          {automation.category}
                        </span>

                        <span className="rounded-full bg-light-primary px-3 py-1 text-xs font-medium text-black/50 dark:bg-dark-primary dark:text-white/50">
                          {automation.outputType}
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold text-black dark:text-white">
                        {automation.name}
                      </h3>

                      <p className="mt-2 text-sm text-black/50 dark:text-white/50">
                        {automation.frequency}
                      </p>

                      <div className="mt-5 flex items-center justify-between">
                        <p className="text-xs text-black/40 dark:text-white/40">
                          {automation.runCount} outputs
                        </p>

                        <Link
                          href={`/tasks?automation=${automation.id}`}
                          className="inline-flex items-center gap-2 text-sm font-semibold text-orange-500 hover:underline"
                        >
                          Open automation
                          <ExternalLink size={14} />
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40">
              Space summary
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-light-primary p-4 dark:bg-dark-primary">
                <p className="text-2xl font-bold text-black dark:text-white">
                  {chats.length}
                </p>
                <p className="text-xs text-black/45 dark:text-white/45">
                  Conversations
                </p>
              </div>

              <div className="rounded-2xl bg-light-primary p-4 dark:bg-dark-primary">
                <p className="text-2xl font-bold text-black dark:text-white">
                  {space.files.length}
                </p>
                <p className="text-xs text-black/45 dark:text-white/45">
                  Knowledge
                </p>
              </div>

              <div className="rounded-2xl bg-light-primary p-4 dark:bg-dark-primary">
                <p className="text-2xl font-bold text-black dark:text-white">
                  {spaceOutputs.length}
                </p>
                <p className="text-xs text-black/45 dark:text-white/45">
                  Outputs
                </p>
              </div>

              <div className="rounded-2xl bg-light-primary p-4 dark:bg-dark-primary">
                <p className="text-2xl font-bold text-black dark:text-white">
                  {relatedAutomations.length}
                </p>
                <p className="text-xs text-black/45 dark:text-white/45">
                  Automations
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-light-200 bg-light-secondary p-6 dark:border-dark-200 dark:bg-dark-secondary">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40">
              Quick actions
            </p>

            <div className="grid gap-3">
              <Link
                href={`/search?spaceId=${space.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.01] dark:bg-white dark:text-black"
              >
                <Plus size={16} />
                New Space Chat
              </Link>

              <Link
                href="/tasks"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-light-200 px-5 py-2.5 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
              >
                <Bot size={16} />
                Manage Automations
              </Link>
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
};

export default SpaceDetailPage;
