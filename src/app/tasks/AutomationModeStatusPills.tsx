'use client';

import { useI18n } from '@/lib/i18n/useI18n';
import {
  getAutomationModeLabel,
  getAutomationScheduleLabel,
  getAutomationStatusLabel,
} from './helpers';
import type { AutomationTemplate } from './types';

export const AutomationModeStatusPills = ({
  automation,
}: {
  automation: AutomationTemplate;
}) => {
  const { t } = useI18n();
  const modeLabel = getAutomationModeLabel(automation, t);
  const statusLabel = getAutomationStatusLabel(automation, t);

  return (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full bg-light-primary px-3 py-1 text-xs font-medium text-black/45 dark:bg-dark-primary dark:text-white/45">
        {modeLabel}
      </span>
      <span className="rounded-full bg-light-primary px-3 py-1 text-xs font-medium text-black/45 dark:bg-dark-primary dark:text-white/45">
        {statusLabel}
      </span>
      <span className="rounded-full bg-light-primary px-3 py-1 text-xs font-medium text-black/45 dark:bg-dark-primary dark:text-white/45">
        {getAutomationScheduleLabel(automation, t)}
      </span>
    </div>
  );
};
