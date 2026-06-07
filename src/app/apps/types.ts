import type { SmallAppInput, SmallAppTemplate } from '@/lib/apps/catalog';

export type AppInputValues = Record<string, string>;

export type AppSpace = {
  id: string;
  name: string;
  description?: string;
};

export type CustomAppRecord = {
  id: string;
  name: string;
  category: string;
  description: string;
  outputType: string;
  promptTemplate: string;
  inputs: SmallAppInput[];
  goodFor: string[];
  createdAt: string;
  updatedAt: string;
};

export type AppCatalogItem = SmallAppTemplate & {
  isCustom?: boolean;
  updatedAt?: string;
};

export type BuilderFieldDraft = SmallAppInput & {
  optionsText?: string;
};

export type CustomAppBuilderForm = {
  name: string;
  category: SmallAppTemplate['category'];
  description: string;
  outputType: string;
  promptTemplate: string;
  inputs: BuilderFieldDraft[];
  goodForText: string;
};
