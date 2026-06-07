import { LayoutTemplate } from 'lucide-react';
import type { SmallAppCategory } from '@/lib/apps/catalog';
import type {
  AppCatalogItem,
  BuilderFieldDraft,
  CustomAppBuilderForm,
  CustomAppRecord,
} from './types';

export const SMALL_APP_CATEGORIES: SmallAppCategory[] = [
  'Business',
  'Content',
  'Client Work',
  'Study',
  'Personal',
];

export const normalizeSmallAppCategory = (category: string): SmallAppCategory => {
  return SMALL_APP_CATEGORIES.includes(category as SmallAppCategory)
    ? (category as SmallAppCategory)
    : 'Business';
};

export const mapCustomAppToTemplate = (app: CustomAppRecord): AppCatalogItem => ({
  id: app.id,
  name: app.name,
  icon: LayoutTemplate,
  category: normalizeSmallAppCategory(app.category),
  description: app.description,
  inputs: Array.isArray(app.inputs) ? app.inputs : [],
  outputType: app.outputType || 'Document',
  promptTemplate: app.promptTemplate,
  goodFor: Array.isArray(app.goodFor) ? app.goodFor : [],
  isCustom: true,
  updatedAt: app.updatedAt,
});

export const getExportFilename = (name: string) => {
  const slug =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'custom-app';

  return `${slug}.etherana-app.json`;
};

export const unwrapImportedCustomApp = (value: unknown) => {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid custom app JSON.');
  }

  const raw = value as Record<string, any>;
  const app = raw.app || raw.customApp || raw;

  if (!app || typeof app !== 'object') {
    throw new Error('Invalid custom app JSON.');
  }

  if (
    typeof app.name !== 'string' ||
    typeof app.description !== 'string' ||
    typeof app.promptTemplate !== 'string' ||
    !Array.isArray(app.inputs)
  ) {
    throw new Error('Invalid custom app JSON.');
  }

  return {
    name: app.name,
    category: app.category || 'Business',
    description: app.description,
    outputType: app.outputType || 'Document',
    promptTemplate: app.promptTemplate,
    inputs: app.inputs,
    goodFor: Array.isArray(app.goodFor) ? app.goodFor : [],
  };
};

export const slugifyFieldId = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

export const createBlankBuilderField = (): BuilderFieldDraft => ({
  id: `field-${Date.now()}`,
  label: '',
  type: 'text',
  placeholder: '',
  required: false,
  options: [],
  optionsText: '',
});

export const createBlankCustomAppForm = (): CustomAppBuilderForm => ({
  name: '',
  category: 'Business',
  description: '',
  outputType: 'Document',
  promptTemplate: '',
  inputs: [createBlankBuilderField()],
  goodForText: '',
});

export const customAppRecordToBuilderForm = (
  app: CustomAppRecord,
): CustomAppBuilderForm => ({
  name: app.name,
  category: normalizeSmallAppCategory(app.category),
  description: app.description,
  outputType: app.outputType,
  promptTemplate: app.promptTemplate,
  inputs:
    app.inputs.length > 0
      ? app.inputs.map((input) => ({
          ...input,
          optionsText: input.options?.join('\n') || '',
        }))
      : [createBlankBuilderField()],
  goodForText: app.goodFor.join(', '),
});

export const splitListText = (value: string) =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

export const getFieldVariableName = (field: BuilderFieldDraft, index: number) => {
  return (
    slugifyFieldId(field.id) ||
    slugifyFieldId(field.label) ||
    `field-${index + 1}`
  );
};
