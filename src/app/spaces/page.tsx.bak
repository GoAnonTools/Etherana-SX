'use client';

import React, { useEffect, useState } from 'react';
import { Plus, LayoutGrid, MessageSquare, FileText, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Space {
  id: string;
  name: string;
  description: string;
  instruction?: string;
  createdAt: string;
}

const CATEGORIES = [
  {
    id: 'operations',
    name: 'Operations',
    description: 'Manage day-to-day tasks, business structure, and efficiency.',
    examples: 'Daily to-do lists, SOPs (Standard Operating Procedures), software stack management, business registration details.',
    questions: ['What should I focus on today?', 'How can I automate my invoicing process?', 'Review my business structure for tax efficiency.'],
    instruction: 'Be organized, concise, and focus on actionable efficiency. Help the user prioritize and streamline.'
  },
  {
    id: 'sales',
    name: 'Sales',
    description: 'Track leads, conversion strategies, and revenue generation.',
    examples: 'CRM notes, sales scripts, pricing strategy, follow-up templates.',
    questions: ['How should I respond to this pricing objection?', 'Give me a follow-up email template for a warm lead.', 'How can I increase my conversion rate?'],
    instruction: 'Be persuasive yet professional. Focus on value proposition and clear call-to-actions.'
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Build brand awareness and attract new customers.',
    examples: 'Social media content calendar, ad copy, SEO keywords, brand voice guidelines.',
    questions: ['Generate 5 LinkedIn post ideas for this week.', 'Optimize this meta description for better SEO.', 'What is a good lead magnet for my target audience?'],
    instruction: 'Be creative, brand-aware, and growth-oriented. Focus on engagement and reach.'
  },
  {
    id: 'client-work',
    name: 'Client work',
    description: 'Manage project delivery and client communications.',
    examples: 'Project timelines, client feedback, meeting notes, deliverables checklist.',
    questions: ['What is the next step for Project X?', 'Draft a polite response to this client request for out-of-scope work.', 'Summarize these meeting notes.'],
    instruction: 'Be professional, detail-oriented, and client-centric. Focus on clarity and boundary setting.'
  },
  {
    id: 'development',
    name: 'Product or service development',
    description: 'Innovate and improve what you sell.',
    examples: 'Product roadmap, feature ideas, feedback summaries, competitor analysis.',
    questions: ['What is the most requested feature from my feedback logs?', 'Analyze this competitor new offering.', 'How can I turn this service into a productized offering?'],
    instruction: 'Be analytical, innovative, and market-focused. Encourage high-level thinking.'
  },
  {
    id: 'research',
    name: 'Research and ideas',
    description: 'Brainstorm and stay ahead of trends.',
    examples: 'Industry news, raw brainstorms, future project ideas, learning notes.',
    questions: ['What are the latest trends in my industry?', 'Brainstorm 10 ways to use AI in my business.', 'Synthesize these three articles into key takeaways.'],
    instruction: 'Be explorative, curious, and synthesizing. Help connect dots between disparate ideas.'
  },
  {
    id: 'references',
    name: 'Sources, links, and saved references',
    description: 'A repository for external knowledge and bookmarks.',
    examples: 'Tool links, course logins (names), reference articles, inspiring websites.',
    questions: ['Where is the documentation for my tools?', 'Find the link I saved last week about growth hacks.', 'List all my saved references about competitive analysis.'],
    instruction: 'Be organized and librarian-like. Focus on retrieval and categorization.'
  }
];

const SpacesPage = () => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newInstruction, setNewInstruction] = useState('');
  const [activeTab, setActiveTab] = useState<'my-spaces' | 'templates'>('my-spaces');

  const fetchSpaces = async () => {
    try {
      const res = await fetch('/api/spaces');
      const data = await res.json();
      setSpaces(data);
      if (data.length === 0) {
        setActiveTab('templates');
      }
    } catch (err) {
      console.error('Failed to fetch spaces:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  const handleCreateSpace = async (e?: React.FormEvent, customData?: { name: string, description: string, instruction: string }) => {
    if (e) e.preventDefault();
    
    const name = customData?.name || newName;
    const description = customData?.description || newDescription;
    const instruction = customData?.instruction || newInstruction;

    if (!name) return;

    try {
      const res = await fetch('/api/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, instruction }),
      });

      if (res.ok) {
        setNewName('');
        setNewDescription('');
        setNewInstruction('');
        setIsModalOpen(false);
        fetchSpaces();
        setActiveTab('my-spaces');
      }
    } catch (err) {
      console.error('Failed to create space:', err);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-y-auto bg-light-primary dark:bg-dark-primary p-6 lg:p-12">
      <div className="max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-black/80 dark:text-white/90 flex items-center gap-3">
              <LayoutGrid className="text-blue-500" /> Spaces
            </h1>
            <p className="text-black/50 dark:text-white/50 mt-2">
              Organize your research and conversations into projects
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition duration-300 font-medium shadow-lg shadow-blue-500/20"
          >
            <Plus size={18} /> New Space
          </button>
        </div>

        <div className="flex border-b border-light-200 dark:border-dark-200 mb-8">
          <button
            onClick={() => setActiveTab('my-spaces')}
            className={`px-6 py-3 font-medium transition duration-200 border-b-2 ${
              activeTab === 'my-spaces'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
            }`}
          >
            My Spaces
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-6 py-3 font-medium transition duration-200 border-b-2 ${
              activeTab === 'templates'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
            }`}
          >
            Templates
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : activeTab === 'my-spaces' ? (
          spaces.length === 0 ? (
            <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl p-16 text-center border border-light-200 dark:border-dark-200">
              <div className="bg-blue-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <LayoutGrid size={40} className="text-blue-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No active Spaces</h2>
              <p className="text-black/50 dark:text-white/50 max-w-sm mx-auto mb-8">
                Spaces help you organize your entrepreneur journey. Start with a template or create a custom one.
              </p>
              <button
                onClick={() => setActiveTab('templates')}
                className="text-blue-500 hover:underline font-medium"
              >
                Browse Templates
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {spaces.map((space) => (
                <Link
                  key={space.id}
                  href={`/spaces/${space.id}`}
                  className="group bg-light-secondary dark:bg-dark-secondary rounded-2xl p-6 border border-light-200 dark:border-dark-200 hover:border-blue-500/50 hover:shadow-xl transition duration-300 relative overflow-hidden flex flex-col"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={20} className="text-black/30 dark:text-white/30" />
                  </div>
                  <h3 className="text-xl font-bold text-black/80 dark:text-white/90 mb-2 truncate">
                    {space.name}
                  </h3>
                  <p className="text-black/50 dark:text-white/50 text-sm mb-6 line-clamp-3 flex-grow">
                    {space.description || 'No description provided.'}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-black/40 dark:text-white/40 mt-auto pt-4 border-t border-light-200/50 dark:border-dark-200/50">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare size={14} /> Chats
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileText size={14} /> Files
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-12 pb-20">
            <div className="grid grid-cols-1 gap-8">
              {CATEGORIES.map((cat) => (
                <div 
                  key={cat.id}
                  className="bg-light-secondary dark:bg-dark-secondary rounded-3xl p-8 border border-light-200 dark:border-dark-200 shadow-sm"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
                    <div className="flex-1 max-w-2xl">
                      <h3 className="text-2xl font-bold mb-3">{cat.name}</h3>
                      <p className="text-black/70 dark:text-white/70 mb-6 text-lg">
                        {cat.description}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500 mb-3">What to store</h4>
                          <p className="text-sm text-black/50 dark:text-white/50 leading-relaxed italic">
                            {cat.examples}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500 mb-3">Questions to ask</h4>
                          <ul className="space-y-2">
                            {cat.questions.map((q, i) => (
                              <li key={i} className="text-sm text-black/60 dark:text-white/60 flex items-start gap-2">
                                <span className="text-blue-500 font-bold">•</span> {q}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="bg-light-100 dark:bg-dark-primary/50 rounded-2xl p-4 border border-light-200 dark:border-dark-200/50">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-black/30 dark:text-white/30 mb-2">AI Reply Behavior</h4>
                        <p className="text-xs text-black/60 dark:text-white/60 leading-relaxed font-mono">
                          {cat.instruction}
                        </p>
                      </div>
                    </div>
                    
                    <div className="lg:w-48 flex shrink-0">
                      <button
                        onClick={() => handleCreateSpace(undefined, { name: cat.name, description: cat.description, instruction: cat.instruction })}
                        className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition duration-200 shadow-xl"
                      >
                        Launch Space
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-light-primary dark:bg-dark-secondary rounded-3xl w-full max-w-lg p-8 border border-light-200 dark:border-dark-200 shadow-2xl animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-bold mb-6">Create a New Space</h2>
            <form onSubmit={handleCreateSpace}>
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium mb-1.5 opacity-70">Space Name</label>
                  <input
                    autoFocus
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-light-secondary dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition duration-200"
                    placeholder="e.g., Marketing Project, Research..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 opacity-70">Description (Optional)</label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full bg-light-secondary dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition duration-200 min-h-[80px] resize-none"
                    placeholder="What is this space for?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 opacity-70">AI Instruction (Optional)</label>
                  <textarea
                    value={newInstruction}
                    onChange={(e) => setNewInstruction(e.target.value)}
                    className="w-full bg-light-secondary dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition duration-200 min-h-[80px] resize-none"
                    placeholder="How should the AI behave in this space?"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 rounded-full hover:bg-light-200 dark:hover:bg-dark-200 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition duration-300 font-medium shadow-lg shadow-blue-500/20"
                >
                  Create Space
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpacesPage;
