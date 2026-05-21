'use client';

import React from 'react';
import { 
  CheckSquare, 
  Calendar, 
  Play, 
  Clock, 
  ArrowRight,
  TrendingUp,
  Users,
  Lightbulb,
  DollarSign,
  ClipboardList,
  Search,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

const TASKS = [
  {
    id: 'daily-priorities',
    name: 'Daily priorities',
    icon: <ClipboardList className="text-blue-500" />,
    purpose: 'Start the day with clarity and focus on what matters most.',
    schedule: 'Every morning at 8:00 AM',
    prompt: 'What are my top 3 high-impact priorities for today? Review my recent client work and operations spaces to suggest them.',
    result: 'A prioritized list of 3 tasks with rationales based on your ongoing projects.'
  },
  {
    id: 'weekly-planning',
    name: 'Weekly planning',
    icon: <Calendar className="text-purple-500" />,
    purpose: 'Set the strategy for the week and review past progress.',
    schedule: 'Monday mornings',
    prompt: 'Let\'s plan my week. Review last week\'s client work and sales goals. What are the key milestones I should hit this week?',
    result: 'A structured weekly roadmap with specific focus areas for each day.'
  },
  {
    id: 'client-followups',
    name: 'Client follow-ups',
    icon: <Users className="text-green-500" />,
    purpose: 'Ensure no client communications fall through the cracks.',
    schedule: 'Tuesdays and Thursdays',
    prompt: 'Scan my client work space. Who haven\'t I heard from in 3 days? Draft a short, professional follow-up message for each.',
    result: 'A list of clients requiring attention and ready-to-send draft communications.'
  },
  {
    id: 'content-ideas',
    name: 'Content ideas',
    icon: <Lightbulb className="text-yellow-500" />,
    purpose: 'Maintain a consistent marketing and social media presence.',
    schedule: 'Wednesdays',
    prompt: 'Based on my recent research in the "Research and ideas" space, suggest 3 content pillars and 5 specific post ideas for this week.',
    result: 'Fresh content topics with headlines and brief outlines to fuel your marketing.'
  },
  {
    id: 'sales-checkins',
    name: 'Sales check-ins',
    icon: <DollarSign className="text-emerald-500" />,
    purpose: 'Keep the pipeline moving and identify revenue bottlenecks.',
    schedule: 'Friday afternoons',
    prompt: 'Review my Sales space. Which leads are stuck or cold? Give me a strategy to move each one to the next stage or re-engage them.',
    result: 'An actionable status report of your sales pipeline with re-engagement strategies.'
  },
  {
    id: 'business-review',
    name: 'Business review',
    icon: <TrendingUp className="text-rose-500" />,
    purpose: 'High-level check on business health and long-term goals.',
    schedule: 'First Monday of every month',
    prompt: 'Conduct a monthly business review. Compare my "Operations" and "Sales" data from the last 30 days. What\'s working and what should I change?',
    result: 'A SWOT analysis of the past month and strategic goals for the month ahead.'
  },
  {
    id: 'research-updates',
    name: 'Research updates',
    icon: <Search className="text-sky-500" />,
    purpose: 'Stay informed about industry trends and competitor moves.',
    schedule: 'Thursday afternoons',
    prompt: 'Search for the latest 3 trends in my industry. How do they impact my current roadmap in the "Product development" space?',
    result: 'A briefing on industry shifts and recommendations on how to adapt your offerings.'
  },
  {
    id: 'important-reminders',
    name: 'Important reminders',
    icon: <AlertCircle className="text-orange-500" />,
    purpose: 'Handle administrative tasks like taxes, renewals, and legal obligations.',
    schedule: 'Varies by deadline (e.g., Quarterly)',
    prompt: 'Check my "Operations" space for any upcoming administrative deadlines (taxes, renewals, invoices) for the next 14 days.',
    result: 'A checklist of critical administrative tasks with clear deadlines and priority levels.'
  }
];

const TasksPage = () => {
  return (
    <div className="flex flex-col h-screen overflow-y-auto bg-light-primary dark:bg-dark-primary p-6 lg:p-12 scrollbar-hide">
      <div className="max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-black/80 dark:text-white/90 flex items-center gap-3">
              <CheckSquare className="text-blue-600" /> Recurring Tasks
            </h1>
            <p className="text-black/50 dark:text-white/50 mt-2">
              Stay organized and grow your business with regular AI-powered check-ins
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 pb-20">
          {TASKS.map((task) => (
            <div 
              key={task.id}
              className="bg-light-secondary dark:bg-dark-secondary rounded-3xl p-8 border border-light-200 dark:border-dark-200 shadow-sm hover:shadow-md transition-all duration-300 group"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-light-primary dark:bg-dark-primary rounded-2xl border border-light-200 dark:border-dark-200 shadow-sm">
                      {React.cloneElement(task.icon as React.ReactElement, { size: 24 })}
                    </div>
                    <h2 className="text-2xl font-bold text-black/80 dark:text-white/90">{task.name}</h2>
                  </div>
                  
                  <p className="text-lg text-black/70 dark:text-white/70 mb-6 leading-relaxed">
                    {task.purpose}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-2.5 flex items-center gap-1.5">
                          <Clock size={12} /> Suggested Schedule
                        </h4>
                        <p className="text-sm text-black/60 dark:text-white/60 font-medium bg-blue-500/5 dark:bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/10 inline-block">
                          {task.schedule}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-2 flex items-center gap-1.5">
                          <ArrowRight size={12} /> Expected Result
                        </h4>
                        <p className="text-sm text-black/50 dark:text-white/50 leading-relaxed">
                          {task.result}
                        </p>
                      </div>
                    </div>

                    <div className="bg-light-100 dark:bg-dark-primary/30 rounded-2xl p-5 border border-light-200 dark:border-dark-200/50">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40 mb-3">Example Prompt</h4>
                      <p className="text-xs text-black/70 dark:text-white/80 leading-relaxed font-mono italic">
                        "{task.prompt}"
                      </p>
                    </div>
                  </div>
                </div>

                <div className="lg:w-48 shrink-0">
                  <Link
                    href={`/?q=${encodeURIComponent(task.prompt)}`}
                    className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition duration-200 shadow-xl shadow-blue-500/20 group-hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Play size={18} fill="currentColor" /> Run Task
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

export default TasksPage;
