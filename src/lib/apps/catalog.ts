import {
  BarChart3,
  Car,
  FileQuestion,
  FileText,
  GraduationCap,
  LayoutTemplate,
  Mail,
  Megaphone,
  MessageSquareText,
  PenLine,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

export type SmallAppCategory =
  | 'Business'
  | 'Content'
  | 'Client Work'
  | 'Study'
  | 'Personal';

export interface SmallAppInput {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

export interface SmallAppTemplate {
  id: string;
  name: string;
  icon: LucideIcon;
  category: SmallAppCategory;
  description: string;
  inputs: SmallAppInput[];
  outputType: string;
  promptTemplate: string;
  goodFor: string[];
}

export const SMALL_APP_TEMPLATES: SmallAppTemplate[] = [
  {
    id: 'invoice-email-writer',
    name: 'Invoice Email Writer',
    icon: Mail,
    category: 'Business',
    description:
      'Writes a polite invoice or payment reminder email from simple details.',
    outputType: 'Email draft',
    goodFor: ['Invoices', 'Client communication', 'Admin'],
    inputs: [
      {
        id: 'clientName',
        label: 'Client name',
        type: 'text',
        placeholder: 'Acme Studio',
        required: true,
      },
      {
        id: 'invoiceDetails',
        label: 'Invoice details',
        type: 'textarea',
        placeholder: 'Amount, invoice number, due date, context...',
        required: true,
      },
      {
        id: 'tone',
        label: 'Tone',
        type: 'select',
        options: ['Friendly', 'Professional', 'Firm but polite'],
        required: true,
      },
    ],
    promptTemplate:
      'Write an invoice email for {{clientName}}. Details: {{invoiceDetails}}. Tone: {{tone}}. Make it clear, polite, and ready to send.',
  },
  {
    id: 'client-proposal-generator',
    name: 'Client Proposal Generator',
    icon: FileText,
    category: 'Client Work',
    description:
      'Turns a client need into a structured proposal draft.',
    outputType: 'Proposal',
    goodFor: ['Freelance work', 'Client projects', 'Sales'],
    inputs: [
      {
        id: 'clientNeed',
        label: 'Client need',
        type: 'textarea',
        placeholder: 'Describe what the client wants...',
        required: true,
      },
      {
        id: 'offer',
        label: 'Your offer',
        type: 'textarea',
        placeholder: 'Describe your service, package, or solution...',
        required: true,
      },
      {
        id: 'tone',
        label: 'Tone',
        type: 'select',
        options: ['Simple', 'Premium', 'Consultative'],
        required: true,
      },
    ],
    promptTemplate:
      'Create a client proposal. Client need: {{clientNeed}}. My offer: {{offer}}. Tone: {{tone}}. Include scope, deliverables, timeline, value, and next step.',
  },
  {
    id: 'swot-analyzer',
    name: 'SWOT Analyzer',
    icon: BarChart3,
    category: 'Business',
    description:
      'Analyzes a business, idea, project, or competitor using SWOT.',
    outputType: 'Analysis',
    goodFor: ['Strategy', 'Business ideas', 'Competitor analysis'],
    inputs: [
      {
        id: 'subject',
        label: 'What should be analyzed?',
        type: 'textarea',
        placeholder: 'Business idea, company, project, offer...',
        required: true,
      },
    ],
    promptTemplate:
      'Create a SWOT analysis for: {{subject}}. Include strengths, weaknesses, opportunities, threats, and recommended next actions.',
  },
  {
    id: 'landing-page-copy-generator',
    name: 'Landing Page Copy Generator',
    icon: LayoutTemplate,
    category: 'Content',
    description:
      'Creates landing page copy from an offer and target audience.',
    outputType: 'Landing page copy',
    goodFor: ['Marketing', 'Offers', 'Web pages'],
    inputs: [
      {
        id: 'audience',
        label: 'Target audience',
        type: 'text',
        placeholder: 'Solo entrepreneurs, students, agencies...',
        required: true,
      },
      {
        id: 'offer',
        label: 'Offer',
        type: 'textarea',
        placeholder: 'Describe the product or service...',
        required: true,
      },
    ],
    promptTemplate:
      'Write landing page copy for this audience: {{audience}}. Offer: {{offer}}. Include headline, subheadline, benefits, sections, proof ideas, FAQ, and CTA.',
  },
  {
    id: 'meeting-summary-formatter',
    name: 'Meeting Summary Formatter',
    icon: MessageSquareText,
    category: 'Business',
    description:
      'Turns raw meeting notes into a clean summary and action plan.',
    outputType: 'Meeting summary',
    goodFor: ['Meetings', 'Action plans', 'Client work'],
    inputs: [
      {
        id: 'notes',
        label: 'Meeting notes',
        type: 'textarea',
        placeholder: 'Paste raw notes here...',
        required: true,
      },
    ],
    promptTemplate:
      'Format these meeting notes into a clear summary: {{notes}}. Include decisions, action items, owners if mentioned, deadlines if mentioned, and open questions.',
  },
  {
    id: 'business-idea-evaluator',
    name: 'Business Idea Evaluator',
    icon: Sparkles,
    category: 'Business',
    description:
      'Evaluates a business idea and gives practical next steps.',
    outputType: 'Evaluation',
    goodFor: ['Ideas', 'Validation', 'Strategy'],
    inputs: [
      {
        id: 'idea',
        label: 'Business idea',
        type: 'textarea',
        placeholder: 'Describe the idea...',
        required: true,
      },
    ],
    promptTemplate:
      'Evaluate this business idea: {{idea}}. Analyze target market, value proposition, risks, monetization, validation steps, and first MVP.',
  },
  {
    id: 'car-purchase-comparison',
    name: 'Car Purchase Comparison',
    icon: Car,
    category: 'Personal',
    description:
      'Compares car options using reliability, price, mileage, and risk.',
    outputType: 'Comparison',
    goodFor: ['Car buying', 'Decision support', 'Budget planning'],
    inputs: [
      {
        id: 'cars',
        label: 'Cars to compare',
        type: 'textarea',
        placeholder: 'Paste car models, years, mileage, prices, engines...',
        required: true,
      },
      {
        id: 'budget',
        label: 'Budget',
        type: 'text',
        placeholder: '5000 €',
      },
    ],
    promptTemplate:
      'Compare these cars: {{cars}}. Budget: {{budget}}. Rank them by reliability, risk, value, maintenance cost, and resale. Give a clear recommendation.',
  },
  {
    id: 'study-quiz-generator',
    name: 'Study Quiz Generator',
    icon: GraduationCap,
    category: 'Study',
    description:
      'Turns course notes into quiz questions for revision.',
    outputType: 'Quiz',
    goodFor: ['Study', 'Revision', 'Exams'],
    inputs: [
      {
        id: 'courseContent',
        label: 'Course content',
        type: 'textarea',
        placeholder: 'Paste course notes or topic...',
        required: true,
      },
      {
        id: 'difficulty',
        label: 'Difficulty',
        type: 'select',
        options: ['Easy', 'Medium', 'Exam level'],
        required: true,
      },
    ],
    promptTemplate:
      'Create a study quiz from this content: {{courseContent}}. Difficulty: {{difficulty}}. Include questions, answers, and traps to avoid.',
  },
  {
    id: 'linkedin-post-formatter',
    name: 'LinkedIn Post Formatter',
    icon: PenLine,
    category: 'Content',
    description:
      'Formats a rough idea into a polished LinkedIn post.',
    outputType: 'LinkedIn post',
    goodFor: ['Content', 'Personal brand', 'Writing'],
    inputs: [
      {
        id: 'idea',
        label: 'Post idea or draft',
        type: 'textarea',
        placeholder: 'Paste your idea...',
        required: true,
      },
      {
        id: 'style',
        label: 'Style',
        type: 'select',
        options: ['Professional', 'Personal story', 'Educational', 'Bold'],
        required: true,
      },
    ],
    promptTemplate:
      'Turn this idea into a LinkedIn post: {{idea}}. Style: {{style}}. Include a strong hook, readable structure, and a natural ending.',
  },
  {
    id: 'content-repurposer',
    name: 'Content Repurposer',
    icon: Megaphone,
    category: 'Content',
    description:
      'Turns one piece of content into several useful formats.',
    outputType: 'Content batch',
    goodFor: ['Repurposing', 'Marketing', 'Content systems'],
    inputs: [
      {
        id: 'content',
        label: 'Original content',
        type: 'textarea',
        placeholder: 'Paste article, notes, transcript, or output...',
        required: true,
      },
    ],
    promptTemplate:
      'Repurpose this content into multiple formats: {{content}}. Create LinkedIn post, newsletter section, short summary, thread outline, and content ideas.',
  },
  {
    id: 'question-answer-builder',
    name: 'Q&A Builder',
    icon: FileQuestion,
    category: 'Study',
    description:
      'Transforms notes into question-and-answer revision material.',
    outputType: 'Q&A sheet',
    goodFor: ['Learning', 'Revision', 'Memorization'],
    inputs: [
      {
        id: 'material',
        label: 'Material',
        type: 'textarea',
        placeholder: 'Paste notes or lesson content...',
        required: true,
      },
    ],
    promptTemplate:
      'Turn this material into a clear Q&A revision sheet: {{material}}. Include direct questions, answers, and common mistakes.',
  },
];