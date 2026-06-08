'use client';

// SELF_CONTAINED_AUTOMATIONS_PAGE_PATCH_6_CUSTOM_AUTOMATIONS

import {
  AlertCircle,
  ArrowRight,
  Calendar,
  ClipboardList,
  DollarSign,
  LayoutTemplate,
  Lightbulb,
  Plus,
  Repeat,
  Save,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Workflow,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  getAutomationStorageChangedEventName,
  pullAutomationStorageFromDatabase,
} from '@/lib/vault/localVault';
import { useI18n } from '@/lib/i18n/useI18n';
import {
  AUTOMATIONS,
  DEFAULT_OUTPUT_DESTINATION,
  DEFAULT_OUTPUT_DESTINATION_LABEL,
  DEFAULT_OUTPUT_TYPE,
  NEW_SPACE_DESTINATION,
  OUTPUT_TYPES,
  WEEKDAY_OPTIONS,
  buildAutomationRunPrompt,
  getAutomationDisplayKey,
  getAutomationFromUrl,
  getDefaultScheduleType,
  getAutomationMode,
  getAutomationModeLabel,
  getAutomationOutputDestination,
  getAutomationOutputDestinationLabel,
  getAutomationOutputType,
  getAutomationScheduleLabel,
  getAutomationScheduleType,
  getAutomationStatus,
  getAutomationStatusLabel,
  getNextRunLabel,
  isAutomationPaused,
  normalizeScheduleType,
  normalizeStoredAutomationForRuntime,
  readAutomationOutputs,
  readAutomationRunHistory,
  readCustomAutomations,
  readHiddenTemplateIds,
  toAutomationTemplate,
  writeAutomationOutputs,
  writeAutomationRunHistory,
  writeCustomAutomations,
  writeHiddenTemplateIds,
} from './helpers';
import { AutomationModeStatusPills } from './AutomationModeStatusPills';
import { AutomationCard } from './AutomationCard';
import { AutomationBuilder } from './AutomationBuilder';
import { AutomationsList } from './AutomationsList';
import { AutomationDetail } from './AutomationDetail';
import type {
  AutomationMode,
  AutomationOutputItem,
  AutomationRunHistoryItem,
  AutomationScheduleType,
  AutomationSpace,
  AutomationStatus,
  AutomationTemplate,
  StoredAutomation,
} from './types';


const AutomationsPage = () => {
  const { t } = useI18n();

  const refreshAutomationStorageFromCache = () => {
    setCustomAutomations(readCustomAutomations());
    setHiddenTemplateIds(readHiddenTemplateIds());
    setRunHistory(readAutomationRunHistory());
    setAutomationOutputs(readAutomationOutputs());
  };

  useEffect(() => {
    const automationStorageChangedEvent = getAutomationStorageChangedEventName();

    const hydrateAutomationStorage = async () => {
      try {
        await pullAutomationStorageFromDatabase();
      } catch (err) {
        console.warn('Could not hydrate automation storage from database:', err);
      } finally {
        refreshAutomationStorageFromCache();
      }
    };

    hydrateAutomationStorage();

    window.addEventListener(
      automationStorageChangedEvent,
      refreshAutomationStorageFromCache,
    );
    window.addEventListener('focus', refreshAutomationStorageFromCache);

    return () => {
      window.removeEventListener(
        automationStorageChangedEvent,
        refreshAutomationStorageFromCache,
      );
      window.removeEventListener('focus', refreshAutomationStorageFromCache);
    };
  }, []);

  const [selectedAutomationId, setSelectedAutomationId] = useState<
    string | undefined
  >(undefined);
  const [customAutomations, setCustomAutomations] = useState<
    StoredAutomation[]
  >([]);
  const [spaces, setSpaces] = useState<AutomationSpace[]>([]);
  const [hiddenTemplateIds, setHiddenTemplateIds] = useState<string[]>([]);
  const [runHistory, setRunHistory] = useState<AutomationRunHistoryItem[]>([]);
  const [automationOutputs, setAutomationOutputs] = useState<
    AutomationOutputItem[]
  >([]);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] =
    useState<StoredAutomation | null>(null);

  const customTemplates = useMemo(() => {
    return customAutomations.map(toAutomationTemplate);
  }, [customAutomations]);

  const visibleTemplates = useMemo(() => {
    return AUTOMATIONS.filter(
      (automation) => !hiddenTemplateIds.includes(automation.id),
    );
  }, [hiddenTemplateIds]);

  const allAutomations = useMemo(() => {
    const customByName = new Map<string, AutomationTemplate>();

    customAutomations
      .map(toAutomationTemplate)
      .sort((a, b) => {
        const aCreatedAt =
          typeof (a as { createdAt?: unknown }).createdAt === 'string'
            ? ((a as unknown) as { createdAt: string }).createdAt
            : '';
        const bCreatedAt =
          typeof (b as { createdAt?: unknown }).createdAt === 'string'
            ? ((b as unknown) as { createdAt: string }).createdAt
            : '';

        return bCreatedAt.localeCompare(aCreatedAt);
      })
      .forEach((automation) => {
        const key = automation.name
          .replace(/\s+Copy$/i, '')
          .replace(/\s+Custom$/i, '')
          .trim()
          .toLowerCase();

        if (!customByName.has(key)) {
          customByName.set(key, automation);
        }
      });

    const customTemplates = Array.from(customByName.values());

    const customizedTemplateKeys = new Set(
      customTemplates.map((automation) =>
        automation.name
          .replace(/\s+Copy$/i, '')
          .replace(/\s+Custom$/i, '')
          .trim()
          .toLowerCase(),
      ),
    );

    const visibleTemplates = AUTOMATIONS.filter((automation) => {
      if (hiddenTemplateIds.includes(automation.id)) return false;

      const templateKey = automation.name.trim().toLowerCase();

      return !customizedTemplateKeys.has(templateKey);
    });

    return [...customTemplates, ...visibleTemplates];
  }, [customAutomations, hiddenTemplateIds]);

  useEffect(() => {
    setCustomAutomations(readCustomAutomations());
    setHiddenTemplateIds(readHiddenTemplateIds());
    setRunHistory(readAutomationRunHistory());
    setAutomationOutputs(readAutomationOutputs());
    setSelectedAutomationId(getAutomationFromUrl());

    fetch('/api/spaces')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setSpaces(Array.isArray(data) ? data : []);
      })
      .catch(() => setSpaces([]));

    const handlePopState = () => {
      setSelectedAutomationId(getAutomationFromUrl());
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const selectedAutomation = selectedAutomationId
    ? allAutomations.find((automation) => automation.id === selectedAutomationId)
    : undefined;

  const selectAutomation = (id: string) => {
    const url = new URL(window.location.href);
    url.pathname = '/tasks';
    url.searchParams.set('automation', id);

    window.history.pushState({}, '', url.toString());
    setSelectedAutomationId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const createSpaceForAutomation = async (
    name: string,
  ): Promise<AutomationSpace | null> => {
    const cleanName = name.trim();

    if (!cleanName) return null;

    try {
      const res = await fetch('/api/spaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: cleanName,
          description: t('automationsPage.automationOutputs'),
        }),
      });

      if (!res.ok) {
        throw new Error('Could not create Space.');
      }

      const data = await res.json();
      const createdSpace = data?.space ?? data;

      if (
        !createdSpace ||
        typeof createdSpace.id !== 'string' ||
        typeof createdSpace.name !== 'string'
      ) {
        throw new Error('Invalid Space response.');
      }

      setSpaces((current) => {
        const exists = current.some((space) => space.id === createdSpace.id);

        if (exists) return current;

        return [createdSpace, ...current];
      });

      return createdSpace;
    } catch (error) {
      console.error('Failed to create Space from automation:', error);
      window.alert(t('automationsPage.couldNotCreateSpace'));
      return null;
    }
  };

  const saveAutomation = (automation: StoredAutomation) => {
    automation = normalizeStoredAutomationForRuntime(automation);
    setCustomAutomations((current) => {
      const exists = current.some((item) => item.id === automation.id);
      const next = exists
        ? current.map((item) => (item.id === automation.id ? automation : item))
        : [automation, ...current];

      writeCustomAutomations(next);
      return next;
    });

    setIsBuilderOpen(false);
    setEditingAutomation(null);

    const url = new URL(window.location.href);
    url.pathname = '/tasks';
    url.searchParams.set('automation', automation.id);

    window.history.pushState({}, '', url.toString());
    setSelectedAutomationId(automation.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const backToAutomations = () => {
    const url = new URL(window.location.href);
    url.pathname = '/tasks';
    url.search = '';

    window.history.pushState({}, '', url.toString());
    setSelectedAutomationId(undefined);
    setEditingAutomation(null);
    setIsBuilderOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const editAutomation = (automation: AutomationTemplate) => {
    const automationToEdit: StoredAutomation | undefined = automation.isCustom
      ? customAutomations.find((item) => item.id === automation.id)
      : {
          id: `custom-${Date.now()}`,
          name: `${automation.name} ${t('automationsPage.customSuffix')}`,
          category: automation.category,
          purpose: automation.purpose,
          frequency: automation.frequency,
          mode: getAutomationMode(automation),
          status: getAutomationStatus(automation),
          scheduleType: getAutomationScheduleType(automation),
          scheduleTime: automation.scheduleTime ?? '09:00',
          scheduleDays: automation.scheduleDays ?? ['MO'],
          scheduleDayOfMonth: automation.scheduleDayOfMonth ?? 1,
          nextRunAt: automation.nextRunAt,
          lastRunAt: automation.lastRunAt,
          prompt: automation.prompt,
          output: automation.output,
          outputType: getAutomationOutputType(automation),
          outputDestination: getAutomationOutputDestination(automation),
          outputDestinationLabel: getAutomationOutputDestinationLabel(automation),
          goodFor: automation.goodFor,
          createdAt: new Date().toISOString(),
        };

    if (!automationToEdit) return;

    const url = new URL(window.location.href);
    url.pathname = '/tasks';
    url.search = '';

    window.history.pushState({}, '', url.toString());
    setSelectedAutomationId(undefined);
    setEditingAutomation(automationToEdit);
    setIsBuilderOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cleanDuplicateAutomations = () => {
    const newestByKey = new Map<string, StoredAutomation>();

    [...customAutomations]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .forEach((automation) => {
        const key = getAutomationDisplayKey(automation.name);

        if (!newestByKey.has(key)) {
          newestByKey.set(key, automation);
        }
      });

    const cleanedAutomations = Array.from(newestByKey.values());
    const removedCount = customAutomations.length - cleanedAutomations.length;

    if (removedCount <= 0) {
      window.alert(t('automationsPage.noDuplicatesFound'));
      return;
    }

    const confirmed = window.confirm(
      `${t('automationsPage.cleanDuplicateConfirmPrefix')} ${removedCount} ${
        removedCount > 1
          ? t('automationsPage.duplicateAutomationPlural')
          : t('automationsPage.duplicateAutomationSingular')
      }? ${t('automationsPage.cleanDuplicateConfirmSuffix')}`,
    );

    if (!confirmed) return;

    setCustomAutomations(cleanedAutomations);
    writeCustomAutomations(cleanedAutomations);

    const selectedStillExists =
      selectedAutomationId &&
      cleanedAutomations.some((automation) => automation.id === selectedAutomationId);

    if (selectedAutomationId && !selectedStillExists) {
      setSelectedAutomationId(undefined);

      const url = new URL(window.location.href);
      url.pathname = '/tasks';
      url.search = '';
      window.history.pushState({}, '', url.toString());
    }

    window.alert(
      `${t('automationsPage.cleaned')} ${removedCount} ${
        removedCount > 1
          ? t('automationsPage.duplicateAutomationPlural')
          : t('automationsPage.duplicateAutomationSingular')
      }.`,
    );
  };

  const duplicateAutomation = (automation: AutomationTemplate) => {
    const duplicated: StoredAutomation = {
      id: `custom-${Date.now()}`,
      name: `${automation.name} ${t('automationsPage.copySuffix')}`,
      category: automation.category,
      purpose: automation.purpose,
      frequency: automation.frequency,
      prompt: automation.prompt,
      output: automation.output,
      outputType: getAutomationOutputType(automation),
      outputDestination: getAutomationOutputDestination(automation),
      outputDestinationLabel: getAutomationOutputDestinationLabel(automation),
      goodFor: automation.goodFor,
      mode: getAutomationMode(automation),
      status: getAutomationStatus(automation),
      scheduleType: getAutomationScheduleType(automation),
      scheduleTime: automation.scheduleTime ?? '09:00',
      scheduleDays: automation.scheduleDays ?? ['MO'],
      scheduleDayOfMonth: automation.scheduleDayOfMonth ?? 1,
      nextRunAt: automation.nextRunAt,
      lastRunAt: automation.lastRunAt,
      createdAt: new Date().toISOString(),
    };

    setCustomAutomations((current) => {
      const next = [duplicated, ...current];
      writeCustomAutomations(next);
      return next;
    });

    const url = new URL(window.location.href);
    url.pathname = '/tasks';
    url.searchParams.set('automation', duplicated.id);

    window.history.pushState({}, '', url.toString());
    setSelectedAutomationId(duplicated.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteAutomation = (automation: AutomationTemplate) => {
    if (automation.isCustom) {
      const confirmed = window.confirm(
        `${t('automationsPage.delete')} "${automation.name}"? ${t('automationsPage.deleteConfirmSuffix')}`,
      );

      if (!confirmed) return;

      setCustomAutomations((current) => {
        const next = current.filter((item) => item.id !== automation.id);
        writeCustomAutomations(next);
        return next;
      });
    } else {
      const confirmed = window.confirm(
        `${t('automationsPage.removeTemplateConfirmPrefix')} "${automation.name}" ${t('automationsPage.removeTemplateConfirmSuffix')}`,
      );

      if (!confirmed) return;

      setHiddenTemplateIds((current) => {
        const next = Array.from(new Set([...current, automation.id]));
        writeHiddenTemplateIds(next);
        return next;
      });
    }

    const url = new URL(window.location.href);
    url.pathname = '/tasks';
    url.search = '';

    window.history.pushState({}, '', url.toString());
    setSelectedAutomationId(undefined);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const restoreTemplates = () => {
    writeHiddenTemplateIds([]);
    setHiddenTemplateIds([]);
  };

  const runAutomation = (automation: AutomationTemplate) => {
    if (isAutomationPaused(automation)) {
      window.alert('This automation is paused. Resume it before running.');
      return;
    }
    const prompt = buildAutomationRunPrompt(automation);
    const timestamp = Date.now();
    const runId = `run-${timestamp}`;
    const outputId = `output-${timestamp}`;
    const outputType = getAutomationOutputType(automation);
    const outputDestination = getAutomationOutputDestination(automation);
    const outputDestinationLabel =
      getAutomationOutputDestinationLabel(automation);

    const output: AutomationOutputItem = {
      id: outputId,
      automationId: automation.id,
      automationName: automation.name,
      title: `${automation.name} — ${outputType}`,
      outputType,
      outputDestination,
      outputDestinationLabel,
      status: 'drafting',
      createdAt: new Date().toISOString(),
      runId,
      prompt,
      expectedOutput: automation.output,
      content: '',
    };

    const run: AutomationRunHistoryItem = {
      id: runId,
      automationId: automation.id,
      automationName: automation.name,
      startedAt: output.createdAt,
      mode: 'manual',
      status: 'started',
      prompt,
      expectedOutput: automation.output,
      outputType,
      outputDestination,
      outputDestinationLabel,
      outputId,
    };

    setAutomationOutputs((current) => {
      const next = [output, ...current];
      writeAutomationOutputs(next);
      return next;
    });

    setRunHistory((current) => {
      const next = [run, ...current];
      writeAutomationRunHistory(next);
      return next;
    });

    window.location.href = `/search?mode=agent&outputId=${encodeURIComponent(
      outputId,
    )}&q=${encodeURIComponent(prompt)}`;
  };

  if (selectedAutomation) {
    return (
      <AutomationDetail
        automation={selectedAutomation}
        runHistory={runHistory.filter(
          (run) => run.automationId === selectedAutomation.id,
        )}
        outputs={automationOutputs.filter(
          (output) => output.automationId === selectedAutomation.id,
        )}
        onBack={backToAutomations}
        onRunAutomation={runAutomation}
        onEdit={editAutomation}
        onDuplicate={duplicateAutomation}
        onDelete={deleteAutomation}
      />
    );
  }

  return (
    <AutomationsList
      automations={allAutomations}
      customCount={customAutomations.length}
      hiddenTemplateCount={hiddenTemplateIds.length}
      isBuilderOpen={isBuilderOpen}
      editingAutomation={editingAutomation}
      spaces={spaces}
      onOpenBuilder={() => {
        setEditingAutomation(null);
        setIsBuilderOpen(true);
      }}
      onCloseBuilder={() => {
        setEditingAutomation(null);
        setIsBuilderOpen(false);
      }}
      onSaveAutomation={saveAutomation}
      onCleanDuplicateAutomations={cleanDuplicateAutomations}
      onCreateSpace={createSpaceForAutomation}
      onRestoreTemplates={restoreTemplates}
      onSelect={selectAutomation}
    />
  );
};

export default AutomationsPage;
