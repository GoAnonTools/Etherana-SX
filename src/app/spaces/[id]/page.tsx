'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  MessageSquare, 
  FileText, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Upload, 
  Clock,
  Globe2,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { formatTimeDifference } from '@/lib/utils';
import DeleteChat from '@/components/DeleteChat';

interface Space {
  id: string;
  name: string;
  description: string;
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

const SpaceDetailPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [space, setSpace] = useState<Space | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [outputs, setOutputs] = useState<AutomationOutputItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSpaceDetails = async () => {
    try {
      const res = await fetch(`/api/spaces/${id}`);
      if (!res.ok) {
        router.push('/spaces');
        return;
      }
      const data = await res.json();
      setSpace(data.space);
      setChats(data.chats);
      setOutputs(readAutomationOutputs());
    } catch (err) {
      console.error('Failed to fetch space details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpaceDetails();
  }, [id]);

  useEffect(() => {
    const refreshOutputs = () => {
      setOutputs(readAutomationOutputs());
    };

    window.addEventListener('storage', refreshOutputs);
    window.addEventListener('focus', refreshOutputs);

    return () => {
      window.removeEventListener('storage', refreshOutputs);
      window.removeEventListener('focus', refreshOutputs);
    };
  }, []);

  const handleDeleteSpace = async () => {
    if (!confirm('Are you sure you want to delete this space? Conversations will remain but won\'t be listed here.')) return;

    try {
      await fetch(`/api/spaces/${id}`, { method: 'DELETE' });
      router.push('/spaces');
    } catch (err) {
      console.error('Failed to delete space:', err);
    }
  };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles?.length || !space) return;

    setLoading(true);

    try {
      const data = new FormData();
      for (let i = 0; i < selectedFiles.length; i++) {
        data.append('files', selectedFiles[i]);
      }

      const embeddingModelProvider = localStorage.getItem('embeddingModelProviderId');
      const embeddingModel = localStorage.getItem('embeddingModelKey');

      if (!embeddingModelProvider || !embeddingModel) {
        alert('Please select an embedding model in settings before uploading.');
        return;
      }

      data.append('embedding_model_provider_id', embeddingModelProvider);
      data.append('embedding_model_key', embeddingModel);

      const res = await fetch(`/api/uploads`, {
        method: 'POST',
        body: data,
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || 'Upload failed');

      const uploadedFiles = resData.files.map((f: any) => ({
        name: f.fileName,
        fileId: f.fileId
      }));

      const newFiles = [...space.files, ...uploadedFiles];

      await fetch(`/api/spaces/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: newFiles }),
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

    const newFiles = space.files.filter(f => f.fileId !== fileId);

    try {
      await fetch(`/api/spaces/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: newFiles }),
      });
      fetchSpaceDetails();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-light-primary dark:bg-dark-primary">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!space) return null;

  const spaceOutputs = outputs.filter(
    (output) => output.outputDestination === `space:${space.id}`,
  );

  return (
    <div className="flex flex-col h-screen overflow-y-auto bg-light-primary dark:bg-dark-primary scrollbar-hide">
      {/* Header */}
      <div className="border-b border-light-200 dark:border-dark-200 bg-light-secondary dark:bg-dark-secondary/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/spaces" className="p-2 hover:bg-light-200 dark:hover:bg-dark-200 rounded-full transition">
              <ChevronLeft size={24} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{space.name}</h1>
              <p className="text-sm opacity-50 truncate max-w-md">{space.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleDeleteSpace}
              className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-full transition"
              title="Delete Space"
            >
              <Trash2 size={20} />
            </button>
            <Link 
              href={`/search?spaceId=${space.id}`}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition font-medium shadow-lg shadow-blue-500/20"
            >
              <Plus size={18} /> New Chat
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Content: Outputs + Conversations */}
        <div className="lg:col-span-2">
          <section className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText size={20} className="text-purple-500" /> Outputs
              </h2>
              <span className="text-xs bg-light-200 dark:bg-dark-200 px-2 py-1 rounded-md opacity-60">
                {spaceOutputs.length}
              </span>
            </div>

            {spaceOutputs.length === 0 ? (
              <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl p-10 text-center border border-dashed border-light-200 dark:border-dark-200">
                <p className="opacity-50">
                  No outputs saved in this space yet.
                </p>
                <p className="text-sm opacity-40 mt-2">
                  Run an automation and choose this Space as the save destination.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {spaceOutputs.map((output) => (
                  <article
                    key={output.id}
                    className="group bg-light-secondary dark:bg-dark-secondary rounded-2xl p-5 border border-light-200 dark:border-dark-200 hover:border-purple-500/30 transition-all duration-300"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-xs rounded-full bg-light-200 dark:bg-dark-200 px-2 py-1 opacity-70">
                            {output.outputType}
                          </span>
                          <span className="text-xs rounded-full bg-light-200 dark:bg-dark-200 px-2 py-1 capitalize opacity-70">
                            {output.status}
                          </span>
                        </div>

                        <h3 className="text-lg font-semibold group-hover:text-purple-500 transition">
                          {output.title}
                        </h3>

                        <p className="text-sm opacity-50 mt-2 line-clamp-2">
                          {output.expectedOutput}
                        </p>
                      </div>

                      <Link
                        href={`/outputs/${output.id}`}
                        className="inline-flex items-center gap-2 text-sm text-purple-500 hover:underline"
                      >
                        Open output
                        <ExternalLink size={14} />
                      </Link>
                    </div>

                    <div className="flex items-center gap-4 text-xs opacity-50 mt-4">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {formatTimeDifference(new Date(), output.createdAt)} Ago
                      </span>
                      <span>
                        From {output.automationName}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MessageSquare size={20} className="text-blue-500" /> Conversations
            </h2>
            <span className="text-xs bg-light-200 dark:bg-dark-200 px-2 py-1 rounded-md opacity-60">
              {chats.length}
            </span>
          </div>

          {chats.length === 0 ? (
            <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl p-12 text-center border border-dashed border-light-200 dark:border-dark-200">
              <p className="opacity-50">No conversations in this space yet.</p>
              <Link href={`/search?spaceId=${space.id}`} className="text-blue-500 hover:underline mt-2 inline-block">
                Start a conversation
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {chats.map((chat) => (
                <div 
                  key={chat.id}
                  className="group bg-light-secondary dark:bg-dark-secondary rounded-2xl p-5 border border-light-200 dark:border-dark-200 hover:border-blue-500/30 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-3">
                    <Link 
                      href={`/c/${chat.id}`}
                      className="text-lg font-semibold group-hover:text-blue-500 transition line-clamp-2"
                    >
                      {chat.title}
                    </Link>
                    <DeleteChat chatId={chat.id} chats={chats} setChats={setChats} />
                  </div>
                  <div className="flex items-center gap-4 text-xs opacity-50">
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {formatTimeDifference(new Date(), chat.createdAt)} Ago
                    </span>
                    {chat.sources.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Globe2 size={12} /> {chat.sources.length} Sources
                      </span>
                    )}
                    {chat.files.length > 0 && (
                      <span className="flex items-center gap-1">
                        <FileText size={12} /> {chat.files.length} Files
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: Files/Attachments */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText size={20} className="text-green-500" /> Files
            </h2>
            <label className="p-1.5 hover:bg-light-200 dark:hover:bg-dark-200 rounded-md transition text-blue-500 cursor-pointer">
              <Upload size={18} />
              <input 
                type="file" 
                className="hidden" 
                multiple 
                onChange={handleFileUpload}
                accept=".pdf,.docx,.txt"
              />
            </label>
          </div>

          <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl border border-light-200 dark:border-dark-200 overflow-hidden">
            {space.files.length === 0 ? (
              <div className="p-10 text-center text-sm opacity-50">
                No files uploaded to this space.
              </div>
            ) : (
              <div className="divide-y divide-light-200 dark:divide-dark-200">
                {space.files.map((file, i) => (
                  <div key={i} className="p-4 flex items-center justify-between group hover:bg-light-200 dark:hover:bg-dark-200 transition">
                    <div className="flex items-center gap-3 truncate">
                      <div className="bg-green-500/10 p-2 rounded-lg text-green-500 shrink-0">
                        <FileText size={16} />
                      </div>
                      <span className="text-sm truncate font-medium">{file.name}</span>
                    </div>
                    <button 
                      onClick={() => handleDeleteFile(file.fileId)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-500/10 rounded transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="mt-8 bg-blue-600/10 dark:bg-blue-600/5 border border-blue-500/20 rounded-2xl p-6">
            <h3 className="font-bold mb-2">Space Context</h3>
            <p className="text-sm opacity-70 mb-4">
              All conversations and files in this space provide context for future research.
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span>Active Files</span>
                <span className="font-bold">{space.files.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Total Conversations</span>
                <span className="font-bold">{chats.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpaceDetailPage;
