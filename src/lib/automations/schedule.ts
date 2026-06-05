export type AutomationMode = 'manual' | 'auto';
export type AutomationStatus = 'active' | 'paused';
export type AutomationScheduleType = 'manual' | 'daily' | 'weekly' | 'monthly';

export interface AutomationScheduleConfig {
  mode?: AutomationMode;
  status?: AutomationStatus;
  scheduleType?: AutomationScheduleType;
  scheduleTime?: string;
  scheduleDays?: string[];
  scheduleDayOfMonth?: number;
}

const WEEK_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

const getTimeParts = (time?: string) => {
  const [hourRaw, minuteRaw] = (time || '09:00').split(':');

  return {
    hour: Number(hourRaw || 9),
    minute: Number(minuteRaw || 0),
  };
};

const setLocalTime = (date: Date, time?: string) => {
  const { hour, minute } = getTimeParts(time);
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next;
};

const getLastDayOfMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

export const computeNextRunAt = (
  automation: AutomationScheduleConfig,
  from = new Date(),
): string | undefined => {
  if (automation.mode !== 'auto') return undefined;
  if (automation.status === 'paused') return undefined;

  const scheduleType = automation.scheduleType || 'manual';

  if (scheduleType === 'manual') return undefined;

  if (scheduleType === 'daily') {
    const candidate = setLocalTime(from, automation.scheduleTime);

    if (candidate <= from) {
      candidate.setDate(candidate.getDate() + 1);
    }

    return candidate.toISOString();
  }

  if (scheduleType === 'weekly') {
    const selectedDays =
      automation.scheduleDays && automation.scheduleDays.length > 0
        ? automation.scheduleDays
        : ['MO'];

    for (let offset = 0; offset <= 7; offset += 1) {
      const candidate = setLocalTime(from, automation.scheduleTime);
      candidate.setDate(candidate.getDate() + offset);

      const dayCode = WEEK_DAYS[candidate.getDay()];

      if (selectedDays.includes(dayCode) && candidate > from) {
        return candidate.toISOString();
      }
    }

    return undefined;
  }

  if (scheduleType === 'monthly') {
    const selectedDay = automation.scheduleDayOfMonth || 1;

    for (let monthOffset = 0; monthOffset <= 2; monthOffset += 1) {
      const base = new Date(from);
      base.setMonth(base.getMonth() + monthOffset);

      const safeDay = Math.min(
        selectedDay,
        getLastDayOfMonth(base.getFullYear(), base.getMonth()),
      );

      const candidate = setLocalTime(
        new Date(base.getFullYear(), base.getMonth(), safeDay),
        automation.scheduleTime,
      );

      if (candidate > from) {
        return candidate.toISOString();
      }
    }
  }

  return undefined;
};

export const isAutomationDue = (nextRunAt?: string, now = new Date()) => {
  if (!nextRunAt) return false;
  return new Date(nextRunAt).getTime() <= now.getTime();
};
