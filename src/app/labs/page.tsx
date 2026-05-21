'use client';

import React from 'react';
import { 
  Beaker, 
  FileText, 
  Table, 
  Presentation, 
  BarChart3, 
  Zap, 
  Code2, 
  ChevronRight, 
  Wand2,
  Cpu,
  FileSpreadsheet,
  Monitor
} from 'lucide-react';
import Link from 'next/link';

const LABS = [
  {
    id: 'reports',
    name: 'Comprehensive Reports',
    icon: <FileText className="text-blue-500" />,
    description: 'Transform complex ideas or research data into professional, deep-dive business reports.',
    capabilities: ['In-depth analysis', 'PDF generation', 'Structured executive summaries', 'Industry insights'],
    prompt: 'Create a comprehensive business report on [Topic]. Include an executive summary, market analysis, and strategic recommendations.'
  },
  {
    id: 'data',
    name: 'Data & Spreadsheets',
    icon: <FileSpreadsheet className="text-emerald-500" />,
    description: 'Structure raw data into clean spreadsheets, perform calculations, and prepare for export.',
    capabilities: ['CSV/Excel formatting', 'Data cleanup', 'Calculation formulas', 'Tabular modeling'],
    prompt: 'Turn this raw data into a structured CSV table. Include columns for [Headers] and calculate the [Metric].'
  },
  {
    id: 'presentations',
    name: 'Visual Presentations',
    icon: <Presentation className="text-purple-500" />,
    description: 'Convert outlines or project notes into structured slide decks and visual presentation content.',
    capabilities: ['Slide-by-slide outlines', 'Visual descriptions', 'Key takeaways per slide', 'PPT structure'],
    prompt: 'Draft a 10-slide presentation for [Audience] about [Idea]. Provide titles, bullet points, and visual suggestions for each slide.'
  },
  {
    id: 'dashboards',
    name: 'Business Dashboards',
    icon: <BarChart3 className="text-rose-500" />,
    description: 'Visualize your business metrics and KPIs in a clean, dashboard-style overview.',
    capabilities: ['Metric visualization', 'KPI definition', 'Status tracking', 'Data summaries'],
    prompt: 'Design a business dashboard for tracking [Key Metrics]. Create a layout with charts for [Metric 1] and [Metric 2].'
  },
  {
    id: 'automations',
    name: 'Smart Automations',
    icon: <Zap className="text-yellow-500" />,
    description: 'Define logic for simple business automations and workflow scripts to save time.',
    capabilities: ['Workflow logic', 'Zapier-style flows', 'Python/JS scripts', 'Integration maps'],
    prompt: 'Write a simple automation script to [Action]. Output the logic as a clean Python script or flow diagram.'
  },
  {
    id: 'webapps',
    name: 'App Prototypes',
    icon: <Code2 className="text-sky-500" />,
    description: 'Generate functional code for simple web tools, calculators, or landing page prototypes.',
    capabilities: ['Single-page web apps', 'HTML/Tailwind tools', 'Interactive forms', 'Logic prototypes'],
    prompt: 'Build a simple web-based [Calculator/Tool] using HTML and Tailwind CSS. Ensure it has a polished, professional UI.'
  }
];

const LabsPage = () => {
  return (
    <div className="flex flex-col h-screen overflow-y-auto bg-light-primary dark:bg-dark-primary p-6 lg:p-12 scrollbar-hide">
      <div className="max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-12">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-600/10 dark:bg-blue-600/20 rounded-2xl border border-blue-500/20">
                <Beaker className="text-blue-600 dark:text-blue-400" size={32} />
              </div>
              <h1 className="text-4xl font-black tracking-tight text-black/80 dark:text-white/90 uppercase">Labs</h1>
            </div>
            <p className="text-xl text-black/50 dark:text-white/50 leading-relaxed font-medium">
              Experimental workbench for building professional business outputs from raw ideas.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
          {LABS.map((lab) => (
            <div 
              key={lab.id}
              className="group relative bg-light-secondary dark:bg-dark-secondary rounded-[2.5rem] p-10 border border-light-200 dark:border-dark-200 hover:border-blue-500/40 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 overflow-hidden flex flex-col"
            >
              {/* Subtle background decoration */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
              
              <div className="flex items-center gap-5 mb-8">
                <div className="p-4 bg-light-primary dark:bg-dark-primary rounded-3xl border border-light-200 dark:border-dark-200 shadow-sm group-hover:scale-110 transition-transform duration-500">
                  {React.cloneElement(lab.icon as React.ReactElement, { size: 32 })}
                </div>
                <h2 className="text-2xl font-bold text-black/90 dark:text-white/90 group-hover:text-blue-500 transition-colors">
                  {lab.name}
                </h2>
              </div>

              <p className="text-lg text-black/60 dark:text-white/60 mb-8 leading-relaxed flex-grow">
                {lab.description}
              </p>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500/80 mb-4 ml-1">Capabilities</h4>
                  <div className="flex flex-wrap gap-2">
                    {lab.capabilities.map((cap, i) => (
                      <span key={i} className="px-3 py-1.5 bg-light-200/50 dark:bg-dark-primary/50 text-[11px] font-bold text-black/60 dark:text-white/60 rounded-full border border-light-200/50 dark:border-dark-200/20">
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-8 mt-auto flex items-center justify-between">
                  <div className="flex -space-x-1">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <Cpu size={14} className="text-blue-500" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Wand2 size={14} className="text-emerald-500" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                      <Monitor size={14} className="text-purple-500" />
                    </div>
                  </div>
                  
                  <Link
                    href={`/?q=${encodeURIComponent(lab.prompt)}`}
                    className="flex items-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black text-sm transition-all duration-300 hover:gap-4 hover:shadow-xl active:scale-95"
                  >
                    Open Workbench <ChevronRight size={18} strokeWidth={3} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LabsPage;
