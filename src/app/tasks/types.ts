import type { LucideIcon } from 'lucide-react';

export type AutomationMode = 'manual' | 'auto';
export type AutomationStatus = 'active' | 'paused';
export type AutomationScheduleType = 'manual' | 'daily' | 'weekly' | 'monthly';

export interface AutomationTemplate {
  id: string;
  name: string;
  icon: LucideIcon;
  category: string;
  purpose: string;
  frequency: string;
  prompt: string;
  output: string;
  outputType?: string;
  outputDestination?: string;
  outputDestinationLabel?: string;
  goodFor: string[];
  mode?: AutomationMode;
  status?: AutomationStatus;
  scheduleType?: AutomationScheduleType;
  scheduleTime?: string;
  scheduleDays?: string[];
  scheduleDayOfMonth?: number;
  nextRunAt?: string;
  lastRunAt?: string;
  isCustom?: boolean;
}

export interface StoredAutomation {
  id: string;
  name: string;
  category: string;
  purpose: string;
  frequency: string;
  prompt: string;
  output: string;
  outputType?: string;
  outputDestination?: string;
  outputDestinationLabel?: string;
  goodFor: string[];
  mode?: AutomationMode;
  status?: AutomationStatus;
  scheduleType?: AutomationScheduleType;
  scheduleTime?: string;
  scheduleDays?: string[];
  scheduleDayOfMonth?: number;
  nextRunAt?: string;
  lastRunAt?: string;
  createdAt: string;
}

export interface AutomationRunHistoryItem {
  id: string;
  automationId: string;
  automationName: string;
  startedAt: string;
  mode: AutomationMode;
  status: 'started';
  prompt: string;
  expectedOutput: string;
  outputType?: string;
  outputDestination?: string;
  outputDestinationLabel?: string;
  outputId?: string;
}

export interface AutomationSpace {
  id: string;
  name: string;
  description?: string;
}

export interface AutomationOutputItem {
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
