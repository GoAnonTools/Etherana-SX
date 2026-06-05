export type AutomationMode = 'manual' | 'auto';
export type AutomationStatus = 'active' | 'paused';
export type AutomationScheduleType = 'manual' | 'daily' | 'weekly' | 'monthly';

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
  updatedAt?: string;
  runId: string;
  prompt: string;
  expectedOutput: string;
  content?: string;
}

export interface VaultMeta {
  vaultId: string;
  createdAt: string;
  lastExportAt?: string;
  lastImportAt?: string;
  encryptedDbSalt?: string;
  encryptedDbMigratedAt?: string;
  lastSyncPushAt?: string;
  lastSyncPullAt?: string;
}

export interface AutomationStorageSnapshot {
  automations: StoredAutomation[];
  hiddenTemplateIds: string[];
  runs: AutomationRunHistoryItem[];
  outputs: AutomationOutputItem[];
}

export const CUSTOM_AUTOMATIONS_STORAGE_KEY =
  'etherana.customAutomations.v1';

export const HIDDEN_TEMPLATE_AUTOMATION_IDS_STORAGE_KEY =
  'etherana.hiddenTemplateAutomationIds.v1';

export const AUTOMATION_RUN_HISTORY_STORAGE_KEY =
  'etherana.automationRunHistory.v1';

export const AUTOMATION_OUTPUTS_STORAGE_KEY =
  'etherana.automationOutputs.v1';

export const VAULT_META_STORAGE_KEY = 'etherana.privateVault.meta.v1';

export const VAULT_STORAGE_KEYS = [
  CUSTOM_AUTOMATIONS_STORAGE_KEY,
  HIDDEN_TEMPLATE_AUTOMATION_IDS_STORAGE_KEY,
  AUTOMATION_RUN_HISTORY_STORAGE_KEY,
  AUTOMATION_OUTPUTS_STORAGE_KEY,
];

const isBrowser = () => typeof window !== 'undefined';

const readJsonArray = <T>(
  key: string,
  predicate: (item: unknown) => item is T,
): T[] => {
  if (!isBrowser()) return [];

  try {
    const raw = localStorage.getItem(key);

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(predicate);
  } catch {
    return [];
  }
};

const writeJsonArray = <T>(key: string, value: T[], limit = 100) => {
  if (!isBrowser()) return;

  localStorage.setItem(key, JSON.stringify(value.slice(0, limit)));
};

export const isStoredAutomation = (
  item: unknown,
): item is StoredAutomation => {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof (item as StoredAutomation).id === 'string' &&
    typeof (item as StoredAutomation).name === 'string' &&
    typeof (item as StoredAutomation).prompt === 'string'
  );
};

export const isAutomationRunHistoryItem = (
  item: unknown,
): item is AutomationRunHistoryItem => {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof (item as AutomationRunHistoryItem).id === 'string' &&
    typeof (item as AutomationRunHistoryItem).automationId === 'string' &&
    typeof (item as AutomationRunHistoryItem).automationName === 'string' &&
    typeof (item as AutomationRunHistoryItem).startedAt === 'string'
  );
};

export const isAutomationOutputItem = (
  item: unknown,
): item is AutomationOutputItem => {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof (item as AutomationOutputItem).id === 'string' &&
    typeof (item as AutomationOutputItem).automationId === 'string' &&
    typeof (item as AutomationOutputItem).automationName === 'string' &&
    typeof (item as AutomationOutputItem).title === 'string' &&
    typeof (item as AutomationOutputItem).createdAt === 'string'
  );
};

export const readCustomAutomations = () => {
  return readJsonArray<StoredAutomation>(
    CUSTOM_AUTOMATIONS_STORAGE_KEY,
    isStoredAutomation,
  );
};

export const writeCustomAutomations = (
  automations: StoredAutomation[],
) => {
  writeJsonArray(CUSTOM_AUTOMATIONS_STORAGE_KEY, automations, 100);
  emitAutomationStorageChanged();
  scheduleAutomationStorageMirror();
};

export const readHiddenTemplateIds = () => {
  return readJsonArray<string>(
    HIDDEN_TEMPLATE_AUTOMATION_IDS_STORAGE_KEY,
    (item): item is string => typeof item === 'string',
  );
};

export const writeHiddenTemplateIds = (ids: string[]) => {
  writeJsonArray(HIDDEN_TEMPLATE_AUTOMATION_IDS_STORAGE_KEY, ids, 100);
  emitAutomationStorageChanged();
  scheduleAutomationStorageMirror();
};

export const readAutomationRunHistory = () => {
  return readJsonArray<AutomationRunHistoryItem>(
    AUTOMATION_RUN_HISTORY_STORAGE_KEY,
    isAutomationRunHistoryItem,
  );
};

export const writeAutomationRunHistory = (
  runs: AutomationRunHistoryItem[],
) => {
  writeJsonArray(AUTOMATION_RUN_HISTORY_STORAGE_KEY, runs, 50);
  emitAutomationStorageChanged();
  scheduleAutomationStorageMirror();
};

export const readAutomationOutputs = () => {
  return readJsonArray<AutomationOutputItem>(
    AUTOMATION_OUTPUTS_STORAGE_KEY,
    isAutomationOutputItem,
  );
};

export const writeAutomationOutputs = (
  outputs: AutomationOutputItem[],
) => {
  writeJsonArray(AUTOMATION_OUTPUTS_STORAGE_KEY, outputs, 100);
  emitAutomationStorageChanged();
  scheduleAutomationStorageMirror();
};

export const captureAutomationOutputContent = (
  outputId: string | null,
  content: string,
) => {
  if (!outputId || !content.trim()) return;

  const outputs = readAutomationOutputs();
  const outputExists = outputs.some((output) => output.id === outputId);

  if (!outputExists) return;

  const nextOutputs = outputs.map((output) => {
    if (output.id !== outputId) return output;

    return {
      ...output,
      content: content.trim(),
      status: 'ready' as const,
      updatedAt: new Date().toISOString(),
    };
  });

  writeAutomationOutputs(nextOutputs);
};

export const readVaultMeta = (): VaultMeta | null => {
  if (!isBrowser()) return null;

  try {
    const raw = localStorage.getItem(VAULT_META_STORAGE_KEY);

    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (
      typeof parsed?.vaultId !== 'string' ||
      typeof parsed?.createdAt !== 'string'
    ) {
      return null;
    }

    return parsed as VaultMeta;
  } catch {
    return null;
  }
};

export const writeVaultMeta = (meta: VaultMeta) => {
  if (!isBrowser()) return;

  localStorage.setItem(VAULT_META_STORAGE_KEY, JSON.stringify(meta));
};

export const readVaultStorageRecords = () => {
  if (!isBrowser()) return [];

  return VAULT_STORAGE_KEYS.flatMap((key) => {
    const value = localStorage.getItem(key);

    if (value === null) return [];

    return [{ key, value }];
  });
};

export const writeVaultStorageRecord = (key: string, value: string) => {
  if (!isBrowser()) return;

  localStorage.setItem(key, value);
};


const AUTOMATION_STORAGE_API_PATH = '/api/automations/storage';
const AUTOMATION_STORAGE_CHANGED_EVENT = 'etherana.automation-storage-changed';

let automationStorageMirrorTimer: ReturnType<typeof setTimeout> | null = null;

const hasAutomationStorageData = (snapshot: AutomationStorageSnapshot) => {
  return (
    snapshot.automations.length > 0 ||
    snapshot.hiddenTemplateIds.length > 0 ||
    snapshot.runs.length > 0 ||
    snapshot.outputs.length > 0
  );
};

export const emitAutomationStorageChanged = () => {
  if (!isBrowser()) return;

  window.dispatchEvent(new Event(AUTOMATION_STORAGE_CHANGED_EVENT));
};

export const getAutomationStorageChangedEventName = () => {
  return AUTOMATION_STORAGE_CHANGED_EVENT;
};

export const readAutomationStorageSnapshot = (): AutomationStorageSnapshot => {
  return {
    automations: readCustomAutomations(),
    hiddenTemplateIds: readHiddenTemplateIds(),
    runs: readAutomationRunHistory(),
    outputs: readAutomationOutputs(),
  };
};

export const writeAutomationStorageSnapshot = (
  snapshot: Partial<AutomationStorageSnapshot>,
) => {
  if (snapshot.automations) {
    writeJsonArray(CUSTOM_AUTOMATIONS_STORAGE_KEY, snapshot.automations, 100);
  }

  if (snapshot.hiddenTemplateIds) {
    writeJsonArray(
      HIDDEN_TEMPLATE_AUTOMATION_IDS_STORAGE_KEY,
      snapshot.hiddenTemplateIds,
      100,
    );
  }

  if (snapshot.runs) {
    writeJsonArray(AUTOMATION_RUN_HISTORY_STORAGE_KEY, snapshot.runs, 50);
  }

  if (snapshot.outputs) {
    writeJsonArray(AUTOMATION_OUTPUTS_STORAGE_KEY, snapshot.outputs, 100);
  }

  emitAutomationStorageChanged();
};

export const pushAutomationStorageToDatabase = async (
  snapshot: AutomationStorageSnapshot = readAutomationStorageSnapshot(),
) => {
  if (!isBrowser()) return null;

  const res = await fetch(AUTOMATION_STORAGE_API_PATH, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(snapshot),
  });

  if (!res.ok) {
    throw new Error('Could not save automation storage to database.');
  }

  return res.json();
};

export const pullAutomationStorageFromDatabase = async () => {
  if (!isBrowser()) return null;

  const res = await fetch(AUTOMATION_STORAGE_API_PATH);

  if (!res.ok) {
    throw new Error('Could not read automation storage from database.');
  }

  const remote = (await res.json()) as AutomationStorageSnapshot;
  const local = readAutomationStorageSnapshot();

  const normalizedRemote: AutomationStorageSnapshot = {
    automations: Array.isArray(remote.automations) ? remote.automations : [],
    hiddenTemplateIds: Array.isArray(remote.hiddenTemplateIds)
      ? remote.hiddenTemplateIds
      : [],
    runs: Array.isArray(remote.runs) ? remote.runs : [],
    outputs: Array.isArray(remote.outputs) ? remote.outputs : [],
  };

  if (hasAutomationStorageData(normalizedRemote)) {
    writeAutomationStorageSnapshot(normalizedRemote);
    return {
      source: 'database' as const,
      snapshot: normalizedRemote,
    };
  }

  if (hasAutomationStorageData(local)) {
    await pushAutomationStorageToDatabase(local);
    return {
      source: 'local-migrated-to-database' as const,
      snapshot: local,
    };
  }

  return {
    source: 'empty' as const,
    snapshot: normalizedRemote,
  };
};

function scheduleAutomationStorageMirror() {
  if (!isBrowser()) return;

  if (automationStorageMirrorTimer) {
    clearTimeout(automationStorageMirrorTimer);
  }

  automationStorageMirrorTimer = setTimeout(() => {
    automationStorageMirrorTimer = null;

    pushAutomationStorageToDatabase().catch((error) => {
      console.warn('Could not mirror automation storage to database:', error);
    });
  }, 250);
}
