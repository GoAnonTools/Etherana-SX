import {
  BookOpen,
  BriefcaseBusiness,
  Calendar,
  ClipboardList,
  FileText,
  Newspaper,
  RadioTower,
  Repeat,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type AutomationMode = 'manual' | 'auto';
export type AutomationStatus = 'active' | 'paused';

export type AutomationCategory =
  | 'Research'
  | 'Business / Operations'
  | 'Content'
  | 'Personal / Project';

export type AutomationSource =
  | 'web'
  | 'saved-links'
  | 'space-notes'
  | 'space-files'
  | 'previous-outputs'
  | 'manual-instructions';

export type AutomationOutputType =
  | 'Article'
  | 'Report'
  | 'Summary'
  | 'Task list'
  | 'Research brief'
  | 'Newsletter'
  | 'Content calendar'
  | 'Action plan'
  | 'Review';

export interface AutomationTemplate {
  id: string;
  name: string;
  icon: LucideIcon;
  category: AutomationCategory;
  description: string;
  defaultFrequency: string;
  defaultMode: AutomationMode;
  sources: AutomationSource[];
  outputType: AutomationOutputType;
  outputDescription: string;
  saveDestination: 'library' | 'space' | 'library-and-space';
  goodFor: string[];
  prompt: string;
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: 'weekly-ai-news-article',
    name: 'Weekly AI News Article',
    icon: Newspaper,
    category: 'Research',
    description:
      'Scans important AI news and turns the best updates into a clear weekly article draft.',
    defaultFrequency: 'Weekly',
    defaultMode: 'manual',
    sources: ['web', 'saved-links', 'manual-instructions'],
    outputType: 'Article',
    outputDescription:
      'A structured article with headline, intro, key updates, analysis, and practical implications.',
    saveDestination: 'library-and-space',
    goodFor: ['AI research', 'Content creation', 'Market awareness'],
    prompt:
      'Find the most important AI news from this week. Select the updates that matter most for entrepreneurs and project builders, then write a clear article draft with practical implications.',
  },
  {
    id: 'competitor-monitoring',
    name: 'Competitor Monitoring',
    icon: Search,
    category: 'Research',
    description:
      'Reviews competitor activity and summarizes notable changes, launches, positioning, and risks.',
    defaultFrequency: 'Weekly',
    defaultMode: 'manual',
    sources: ['web', 'saved-links', 'space-notes'],
    outputType: 'Research brief',
    outputDescription:
      'A competitor brief with changes, signals, risks, and recommended actions.',
    saveDestination: 'library-and-space',
    goodFor: ['Competitive intelligence', 'Strategy', 'Positioning'],
    prompt:
      'Monitor the selected competitors or market category. Summarize recent changes, new offers, positioning shifts, pricing signals, and opportunities for my project.',
  },
  {
    id: 'market-trend-digest',
    name: 'Market Trend Digest',
    icon: TrendingUp,
    category: 'Research',
    description:
      'Summarizes market movements and trend signals that could affect a project or business.',
    defaultFrequency: 'Weekly',
    defaultMode: 'manual',
    sources: ['web', 'saved-links', 'previous-outputs'],
    outputType: 'Research brief',
    outputDescription:
      'A digest of trends, why they matter, and what to do next.',
    saveDestination: 'library-and-space',
    goodFor: ['Market research', 'Planning', 'Opportunity spotting'],
    prompt:
      'Research current market trends related to my selected project or industry. Explain what changed, why it matters, and what actions I should consider.',
  },
  {
    id: 'funding-startup-news-scan',
    name: 'Funding / Startup News Scan',
    icon: RadioTower,
    category: 'Research',
    description:
      'Tracks startup funding, launches, acquisitions, and ecosystem signals.',
    defaultFrequency: 'Weekly',
    defaultMode: 'manual',
    sources: ['web', 'saved-links'],
    outputType: 'Summary',
    outputDescription:
      'A startup news scan with key deals, market signals, and lessons.',
    saveDestination: 'library',
    goodFor: ['Startup research', 'Investment signals', 'Business ideas'],
    prompt:
      'Scan recent startup and funding news in the chosen market. Summarize the most relevant funding rounds, launches, acquisitions, and strategic lessons.',
  },
  {
    id: 'regulatory-watch',
    name: 'Regulatory Watch',
    icon: ClipboardList,
    category: 'Research',
    description:
      'Watches for regulatory, compliance, or policy changes relevant to a project.',
    defaultFrequency: 'Weekly',
    defaultMode: 'manual',
    sources: ['web', 'saved-links', 'space-notes'],
    outputType: 'Research brief',
    outputDescription:
      'A regulatory brief with changes, impact, risks, and recommended next steps.',
    saveDestination: 'library-and-space',
    goodFor: ['Compliance', 'Risk monitoring', 'Operations'],
    prompt:
      'Monitor regulatory or compliance updates related to my selected project, market, or business area. Summarize changes, risks, and recommended next actions.',
  },

  {
    id: 'weekly-priorities',
    name: 'Weekly Priorities',
    icon: Calendar,
    category: 'Business / Operations',
    description:
      'Turns current projects, open work, and goals into a simple weekly priority plan.',
    defaultFrequency: 'Weekly',
    defaultMode: 'manual',
    sources: ['space-notes', 'previous-outputs', 'manual-instructions'],
    outputType: 'Task list',
    outputDescription:
      'A focused weekly priority list with rationale and execution order.',
    saveDestination: 'library-and-space',
    goodFor: ['Planning', 'Focus', 'Execution'],
    prompt:
      'Review my current project context, recent outputs, and notes. Create a focused weekly priority plan with the most important actions first.',
  },
  {
    id: 'project-status-summary',
    name: 'Project Status Summary',
    icon: BriefcaseBusiness,
    category: 'Business / Operations',
    description:
      'Summarizes the current status of a selected Space or project.',
    defaultFrequency: 'Weekly',
    defaultMode: 'manual',
    sources: ['space-notes', 'space-files', 'previous-outputs'],
    outputType: 'Report',
    outputDescription:
      'A project status report with progress, blockers, risks, and next actions.',
    saveDestination: 'library-and-space',
    goodFor: ['Project management', 'Client updates', 'Clarity'],
    prompt:
      'Review the selected project Space. Summarize what has progressed, what is blocked, what decisions are needed, and what should happen next.',
  },
  {
    id: 'client-follow-up-summary',
    name: 'Client Follow-up Summary',
    icon: Users,
    category: 'Business / Operations',
    description:
      'Finds client follow-up opportunities and prepares useful next steps.',
    defaultFrequency: 'Twice a week',
    defaultMode: 'manual',
    sources: ['space-notes', 'previous-outputs', 'manual-instructions'],
    outputType: 'Action plan',
    outputDescription:
      'A client follow-up list with suggested messages and priorities.',
    saveDestination: 'library-and-space',
    goodFor: ['Client management', 'Follow-ups', 'Retention'],
    prompt:
      'Review client-related notes and outputs. Identify who needs a follow-up, why, and draft a short professional message for each situation.',
  },
  {
    id: 'monthly-business-review',
    name: 'Monthly Business Review',
    icon: Target,
    category: 'Business / Operations',
    description:
      'Reviews the last month and creates a simple business health report.',
    defaultFrequency: 'Monthly',
    defaultMode: 'manual',
    sources: ['space-notes', 'previous-outputs', 'manual-instructions'],
    outputType: 'Review',
    outputDescription:
      'A monthly review with wins, problems, risks, opportunities, and next priorities.',
    saveDestination: 'library-and-space',
    goodFor: ['Strategy', 'Reflection', 'Business decisions'],
    prompt:
      'Review the last 30 days of work. Summarize wins, problems, risks, opportunities, and the most important priorities for next month.',
  },

  {
    id: 'weekly-linkedin-post-batch',
    name: 'Weekly LinkedIn Post Batch',
    icon: Sparkles,
    category: 'Content',
    description:
      'Creates a weekly batch of LinkedIn post drafts from project context or selected topics.',
    defaultFrequency: 'Weekly',
    defaultMode: 'manual',
    sources: ['space-notes', 'saved-links', 'previous-outputs'],
    outputType: 'Summary',
    outputDescription:
      'A batch of LinkedIn posts with hooks, body text, and CTA ideas.',
    saveDestination: 'library-and-space',
    goodFor: ['Content creation', 'Personal brand', 'Marketing'],
    prompt:
      'Create a weekly batch of LinkedIn posts based on my recent notes, saved links, outputs, and project direction. Include hooks, post drafts, and CTA ideas.',
  },
  {
    id: 'newsletter-draft',
    name: 'Newsletter Draft',
    icon: FileText,
    category: 'Content',
    description:
      'Creates a recurring newsletter draft from saved links, notes, or recent outputs.',
    defaultFrequency: 'Weekly',
    defaultMode: 'manual',
    sources: ['saved-links', 'space-notes', 'previous-outputs'],
    outputType: 'Newsletter',
    outputDescription:
      'A newsletter draft with subject line, intro, sections, and conclusion.',
    saveDestination: 'library-and-space',
    goodFor: ['Audience building', 'Content marketing', 'Publishing'],
    prompt:
      'Prepare a newsletter draft from my recent saved links, notes, and outputs. Make it clear, useful, and ready to edit before publishing.',
  },
  {
    id: 'content-calendar-update',
    name: 'Content Calendar Update',
    icon: Repeat,
    category: 'Content',
    description:
      'Updates a simple content calendar based on goals, ideas, and previous outputs.',
    defaultFrequency: 'Weekly',
    defaultMode: 'manual',
    sources: ['space-notes', 'previous-outputs', 'manual-instructions'],
    outputType: 'Content calendar',
    outputDescription:
      'A content calendar with topics, formats, channels, and suggested dates.',
    saveDestination: 'library-and-space',
    goodFor: ['Planning', 'Publishing', 'Marketing consistency'],
    prompt:
      'Review my content ideas, previous outputs, and current goals. Create or update a simple content calendar for the next week.',
  },

  {
    id: 'weekly-project-review',
    name: 'Weekly Project Review',
    icon: BriefcaseBusiness,
    category: 'Personal / Project',
    description:
      'Reviews a selected project Space and summarizes progress, next steps, and risks.',
    defaultFrequency: 'Weekly',
    defaultMode: 'manual',
    sources: ['space-notes', 'space-files', 'previous-outputs'],
    outputType: 'Review',
    outputDescription:
      'A project review with progress, decisions, blockers, and next actions.',
    saveDestination: 'library-and-space',
    goodFor: ['Project clarity', 'Reflection', 'Execution'],
    prompt:
      'Review this project Space. Summarize progress, open questions, blockers, decisions, and the best next actions.',
  },
  {
    id: 'learning-summary',
    name: 'Learning Summary',
    icon: BookOpen,
    category: 'Personal / Project',
    description:
      'Summarizes what the user has learned from notes, files, links, or outputs.',
    defaultFrequency: 'Weekly',
    defaultMode: 'manual',
    sources: ['space-notes', 'space-files', 'saved-links', 'previous-outputs'],
    outputType: 'Summary',
    outputDescription:
      'A learning summary with key points, gaps, and suggested next study actions.',
    saveDestination: 'library-and-space',
    goodFor: ['Learning', 'Study', 'Knowledge review'],
    prompt:
      'Review my learning materials, notes, saved links, and recent outputs. Summarize what I learned, what is still unclear, and what I should review next.',
  },
  {
    id: 'saved-links-summary',
    name: 'Saved Links Summary',
    icon: FileText,
    category: 'Personal / Project',
    description:
      'Turns saved links into a useful summary with themes and next actions.',
    defaultFrequency: 'Weekly',
    defaultMode: 'manual',
    sources: ['saved-links'],
    outputType: 'Summary',
    outputDescription:
      'A digest of saved links grouped by theme, with useful takeaways.',
    saveDestination: 'library-and-space',
    goodFor: ['Reading list', 'Research', 'Knowledge organization'],
    prompt:
      'Review my saved links for the selected Space or Library. Group them by theme, summarize the key takeaways, and suggest what to read or use next.',
  },
];