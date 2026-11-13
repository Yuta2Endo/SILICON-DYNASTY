import { isValidDateOnly } from "./date";

export const AI_ARCHITECTURE_OPTIONS = [
  "transformer",
  "rnn",
  "cnn",
  "diffusion",
  "moe",
  "multimodal",
  "custom",
] as const;
export type AiArchitecture = (typeof AI_ARCHITECTURE_OPTIONS)[number];

export const AI_PRECISION_OPTIONS = ["fp32", "fp16", "bf16", "fp8"] as const;
export type AiPrecision = (typeof AI_PRECISION_OPTIONS)[number];

export const AI_QUANTIZATION_OPTIONS = ["none", "int8", "int4"] as const;
export type AiQuantization = (typeof AI_QUANTIZATION_OPTIONS)[number];

export const AI_DATASET_MODALITY_OPTIONS = [
  "text",
  "code",
  "images",
  "video",
  "audio",
  "scientific",
  "multimodal",
] as const;
export type AiDatasetModality = (typeof AI_DATASET_MODALITY_OPTIONS)[number];

export const AI_DATASET_LICENSE_OPTIONS = [
  "proprietary",
  "permissive",
  "research",
  "restricted",
] as const;
export type AiDatasetLicense = (typeof AI_DATASET_LICENSE_OPTIONS)[number];

export interface AiConfiguration {
  architecture: AiArchitecture;
  parameterCountM: number;
  layers: number;
  hiddenDimension: number;
  attentionHeads: number;
  contextWindow: number;
  vocabularySize: number;
  experts: number;
  precision: AiPrecision;
  quantization: AiQuantization;
}

export type AiConfigurationField = keyof AiConfiguration;

export interface AiDataset {
  id: string;
  name: string;
  modality: AiDatasetModality;
  sizeGb: number;
  qualityScore: number;
  diversityScore: number;
  license: AiDatasetLicense;
  processingCostUsd: number;
}

export interface AiDesignVersion {
  version: number;
  savedOn: string;
  configuration: AiConfiguration;
  datasets: AiDataset[];
}

export interface AiProject {
  id: string;
  name: string;
  configuration: AiConfiguration;
  datasets: AiDataset[];
  versions: AiDesignVersion[];
}

export const AI_LIMITS = {
  projectName: { min: 2, max: 40 },
  datasetName: { min: 2, max: 40 },
  parameterCountM: { min: 1, max: 1_000_000 },
  layers: { min: 1, max: 512 },
  hiddenDimension: { min: 64, max: 32_768 },
  attentionHeads: { min: 1, max: 256 },
  contextWindow: { min: 128, max: 10_000_000 },
  vocabularySize: { min: 1_000, max: 1_000_000 },
  experts: { min: 1, max: 128 },
  datasetSizeGb: { min: 0.1, max: 1_000_000 },
  datasetQualityScore: { min: 0, max: 100 },
  datasetDiversityScore: { min: 0, max: 100 },
  datasetProcessingCostUsd: { min: 0, max: 1_000_000_000 },
  maxDatasets: 20,
} as const;

export const AI_MINIMUM_YEARS = {
  transformer: 2017,
  moe: 2019,
  diffusion: 2020,
  multimodal: 2021,
  fp16: 2008,
  bf16: 2018,
  fp8: 2022,
  int8: 2015,
  int4: 2022,
} as const;

export type AiValidationIssueCode =
  | "invalid-option"
  | "integer"
  | "number-range"
  | "attention-heads-divisible"
  | "experts-only-moe"
  | "moe-requires-experts"
  | "future-technology"
  | "dataset-name"
  | "dataset-size"
  | "dataset-quality"
  | "dataset-diversity"
  | "dataset-cost"
  | "dataset-limit"
  | "duplicate-dataset-id";

export interface AiValidationIssue {
  code: AiValidationIssueCode;
  min?: number;
  max?: number;
  year?: number;
}

export type AiConfigurationErrors = Partial<Record<keyof AiConfiguration, AiValidationIssue>>;

export interface AiConfigurationValidationResult {
  valid: boolean;
  errors: AiConfigurationErrors;
}

export type AiDatasetErrors = Partial<Record<keyof AiDataset, AiValidationIssue>>;

export interface AiDatasetValidationResult {
  valid: boolean;
  errors: AiDatasetErrors;
}

export interface AiDatasetsValidationResult {
  valid: boolean;
  errors: AiValidationIssue[];
  datasetErrors: Record<string, AiDatasetErrors>;
}

export interface AiProjectNameIssue {
  code: "required" | "length";
  min?: number;
  max?: number;
}

export class InvalidAiDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAiDataError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function getYear(date: string): number {
  return Number.parseInt(date.slice(0, 4), 10);
}

export function isAiArchitecture(value: unknown): value is AiArchitecture {
  return typeof value === "string" && (AI_ARCHITECTURE_OPTIONS as readonly string[]).includes(value);
}

export function isAiPrecision(value: unknown): value is AiPrecision {
  return typeof value === "string" && (AI_PRECISION_OPTIONS as readonly string[]).includes(value);
}

export function isAiQuantization(value: unknown): value is AiQuantization {
  return typeof value === "string" && (AI_QUANTIZATION_OPTIONS as readonly string[]).includes(value);
}

export function isAiDatasetModality(value: unknown): value is AiDatasetModality {
  return typeof value === "string" && (AI_DATASET_MODALITY_OPTIONS as readonly string[]).includes(value);
}

export function isAiDatasetLicense(value: unknown): value is AiDatasetLicense {
  return typeof value === "string" && (AI_DATASET_LICENSE_OPTIONS as readonly string[]).includes(value);
}

export function createDefaultAiConfiguration(): AiConfiguration {
  return {
    architecture: "rnn",
    parameterCountM: 10,
    layers: 2,
    hiddenDimension: 256,
    attentionHeads: 4,
    contextWindow: 512,
    vocabularySize: 10_000,
    experts: 1,
    precision: "fp32",
    quantization: "none",
  };
}

export function createDefaultAiDataset(id: string): AiDataset {
  return {
    id,
    name: "Text corpus",
    modality: "text",
    sizeGb: 5,
    qualityScore: 70,
    diversityScore: 60,
    license: "permissive",
    processingCostUsd: 250,
  };
}

export function validateAiProjectName(name: string): AiProjectNameIssue | null {
  const normalizedName = name.trim();
  if (normalizedName.length === 0) {
    return { code: "required" };
  }

  if (normalizedName.length < AI_LIMITS.projectName.min || normalizedName.length > AI_LIMITS.projectName.max) {
    return {
      code: "length",
      min: AI_LIMITS.projectName.min,
      max: AI_LIMITS.projectName.max,
    };
  }

  return null;
}

function integerError(
  value: number,
  limits: { min: number; max: number },
): AiValidationIssue | null {
  if (!Number.isInteger(value)) {
    return { code: "integer", min: limits.min, max: limits.max };
  }
  if (value < limits.min || value > limits.max) {
    return { code: "number-range", min: limits.min, max: limits.max };
  }
  return null;
}

export function validateAiConfiguration(
  configuration: AiConfiguration,
  options: { currentYear?: number } = {},
): AiConfigurationValidationResult {
  const errors: AiConfigurationErrors = {};

  if (!isAiArchitecture(configuration.architecture)) {
    errors.architecture = { code: "invalid-option" };
  }
  if (!isAiPrecision(configuration.precision)) {
    errors.precision = { code: "invalid-option" };
  }
  if (!isAiQuantization(configuration.quantization)) {
    errors.quantization = { code: "invalid-option" };
  }

  const integerFields: Array<{
    key: keyof Pick<
      AiConfiguration,
      "parameterCountM" | "layers" | "hiddenDimension" | "attentionHeads" | "contextWindow" | "vocabularySize" | "experts"
    >;
    limits: { min: number; max: number };
  }> = [
    { key: "parameterCountM", limits: AI_LIMITS.parameterCountM },
    { key: "layers", limits: AI_LIMITS.layers },
    { key: "hiddenDimension", limits: AI_LIMITS.hiddenDimension },
    { key: "attentionHeads", limits: AI_LIMITS.attentionHeads },
    { key: "contextWindow", limits: AI_LIMITS.contextWindow },
    { key: "vocabularySize", limits: AI_LIMITS.vocabularySize },
    { key: "experts", limits: AI_LIMITS.experts },
  ];

  for (const field of integerFields) {
    const issue = integerError(configuration[field.key], field.limits);
    if (issue !== null) {
      errors[field.key] = issue;
    }
  }

  if (
    (configuration.architecture === "transformer" ||
      configuration.architecture === "moe" ||
      configuration.architecture === "multimodal") &&
    Number.isInteger(configuration.hiddenDimension) &&
    Number.isInteger(configuration.attentionHeads) &&
    configuration.attentionHeads > 0 &&
    configuration.hiddenDimension % configuration.attentionHeads !== 0
  ) {
    errors.attentionHeads = { code: "attention-heads-divisible" };
  }

  if (configuration.architecture !== "moe" && configuration.experts !== 1) {
    errors.experts = { code: "experts-only-moe" };
  }
  if (configuration.architecture === "moe" && configuration.experts < 2) {
    errors.experts = { code: "moe-requires-experts" };
  }

  const currentYear = options.currentYear;
  if (currentYear !== undefined) {
    const architectureYear = AI_MINIMUM_YEARS[configuration.architecture as keyof typeof AI_MINIMUM_YEARS];
    if (architectureYear !== undefined && currentYear < architectureYear) {
      errors.architecture = { code: "future-technology", year: architectureYear };
    }
    const precisionYear = AI_MINIMUM_YEARS[configuration.precision as keyof typeof AI_MINIMUM_YEARS];
    if (precisionYear !== undefined && currentYear < precisionYear) {
      errors.precision = { code: "future-technology", year: precisionYear };
    }
    const quantizationYear = AI_MINIMUM_YEARS[configuration.quantization as keyof typeof AI_MINIMUM_YEARS];
    if (quantizationYear !== undefined && currentYear < quantizationYear) {
      errors.quantization = { code: "future-technology", year: quantizationYear };
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateAiDataset(
  dataset: AiDataset,
  options: { currentYear?: number } = {},
): AiDatasetValidationResult {
  void options;
  const errors: AiDatasetErrors = {};
  const normalizedName = dataset.name.trim();
  if (
    normalizedName.length < AI_LIMITS.datasetName.min ||
    normalizedName.length > AI_LIMITS.datasetName.max
  ) {
    errors.name = {
      code: "dataset-name",
      min: AI_LIMITS.datasetName.min,
      max: AI_LIMITS.datasetName.max,
    };
  }

  if (!isAiDatasetModality(dataset.modality)) {
    errors.modality = { code: "invalid-option" };
  }
  if (!isAiDatasetLicense(dataset.license)) {
    errors.license = { code: "invalid-option" };
  }

  if (!isFiniteNumber(dataset.sizeGb) || dataset.sizeGb < AI_LIMITS.datasetSizeGb.min || dataset.sizeGb > AI_LIMITS.datasetSizeGb.max) {
    errors.sizeGb = {
      code: "dataset-size",
      min: AI_LIMITS.datasetSizeGb.min,
      max: AI_LIMITS.datasetSizeGb.max,
    };
  }

  const qualityIssue = integerError(dataset.qualityScore, AI_LIMITS.datasetQualityScore);
  if (qualityIssue !== null) {
    errors.qualityScore = { ...qualityIssue, code: "dataset-quality" };
  }

  const diversityIssue = integerError(dataset.diversityScore, AI_LIMITS.datasetDiversityScore);
  if (diversityIssue !== null) {
    errors.diversityScore = { ...diversityIssue, code: "dataset-diversity" };
  }

  if (
    !isFiniteNumber(dataset.processingCostUsd) ||
    dataset.processingCostUsd < AI_LIMITS.datasetProcessingCostUsd.min ||
    dataset.processingCostUsd > AI_LIMITS.datasetProcessingCostUsd.max
  ) {
    errors.processingCostUsd = {
      code: "dataset-cost",
      min: AI_LIMITS.datasetProcessingCostUsd.min,
      max: AI_LIMITS.datasetProcessingCostUsd.max,
    };
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateAiDatasets(
  datasets: readonly AiDataset[],
  options: { currentYear?: number } = {},
): AiDatasetsValidationResult {
  const errors: AiValidationIssue[] = [];
  const datasetErrors: Record<string, AiDatasetErrors> = {};

  if (datasets.length > AI_LIMITS.maxDatasets) {
    errors.push({ code: "dataset-limit", max: AI_LIMITS.maxDatasets });
  }

  const seenIds = new Set<string>();
  for (const dataset of datasets) {
    if (dataset.id.trim().length === 0 || seenIds.has(dataset.id)) {
      errors.push({ code: "duplicate-dataset-id" });
    }
    seenIds.add(dataset.id);
    const result = validateAiDataset(dataset, options);
    if (!result.valid) {
      datasetErrors[dataset.id] = result.errors;
    }
  }

  return {
    valid: errors.length === 0 && Object.keys(datasetErrors).length === 0,
    errors,
    datasetErrors,
  };
}

function assertName(name: string): void {
  const issue = validateAiProjectName(name);
  if (issue !== null) {
    throw new InvalidAiDataError("AI project name is invalid.");
  }
}

function assertDate(date: string): void {
  if (!isValidDateOnly(date)) {
    throw new InvalidAiDataError("AI project date is invalid.");
  }
}

function assertConfiguration(configuration: AiConfiguration, currentYear?: number): void {
  const result = validateAiConfiguration(configuration, currentYear === undefined ? {} : { currentYear });
  if (!result.valid) {
    throw new InvalidAiDataError("AI configuration is invalid.");
  }
}

function assertDatasets(datasets: readonly AiDataset[], currentYear?: number): void {
  const result = validateAiDatasets(datasets, currentYear === undefined ? {} : { currentYear });
  if (!result.valid) {
    throw new InvalidAiDataError("AI dataset is invalid.");
  }
}

export function cloneAiConfiguration(configuration: AiConfiguration): AiConfiguration {
  return { ...configuration };
}

export function cloneAiDatasets(datasets: readonly AiDataset[]): AiDataset[] {
  return datasets.map((dataset) => ({ ...dataset }));
}

export function aiConfigurationsEqual(left: AiConfiguration, right: AiConfiguration): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function aiDatasetsEqual(left: readonly AiDataset[], right: readonly AiDataset[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function createAiProject(
  id: string,
  name: string,
  configuration: AiConfiguration,
  savedOn: string,
): AiProject {
  const normalizedId = id.trim();
  if (normalizedId.length === 0) {
    throw new InvalidAiDataError("AI project ID is required.");
  }
  assertName(name);
  assertDate(savedOn);
  assertConfiguration(configuration, getYear(savedOn));

  return {
    id: normalizedId,
    name: name.trim(),
    configuration: cloneAiConfiguration(configuration),
    datasets: [],
    versions: [{
      version: 1,
      savedOn,
      configuration: cloneAiConfiguration(configuration),
      datasets: [],
    }],
  };
}

export function saveAiVersion(
  project: AiProject,
  name: string,
  configuration: AiConfiguration,
  datasets: readonly AiDataset[],
  savedOn: string,
): AiProject {
  assertName(name);
  assertDate(savedOn);
  const year = getYear(savedOn);
  assertConfiguration(configuration, year);
  assertDatasets(datasets, year);
  const nextVersion = Math.max(0, ...project.versions.map((version) => version.version)) + 1;

  return {
    ...project,
    name: name.trim(),
    configuration: cloneAiConfiguration(configuration),
    datasets: cloneAiDatasets(datasets),
    versions: [
      ...project.versions,
      {
        version: nextVersion,
        savedOn,
        configuration: cloneAiConfiguration(configuration),
        datasets: cloneAiDatasets(datasets),
      },
    ],
  };
}

function requireString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InvalidAiDataError(message);
  }
  return value;
}

function requireNumber(value: unknown, message: string): number {
  if (!isFiniteNumber(value)) {
    throw new InvalidAiDataError(message);
  }
  return value;
}

function parseAiConfigurationValue(value: unknown): AiConfiguration {
  if (!isRecord(value)) {
    throw new InvalidAiDataError("AI configuration is invalid.");
  }

  const configuration: AiConfiguration = {
    architecture: value.architecture as AiArchitecture,
    parameterCountM: requireNumber(value.parameterCountM, "AI parameter count is invalid."),
    layers: requireNumber(value.layers, "AI layer count is invalid."),
    hiddenDimension: requireNumber(value.hiddenDimension, "AI hidden dimension is invalid."),
    attentionHeads: requireNumber(value.attentionHeads, "AI attention head count is invalid."),
    contextWindow: requireNumber(value.contextWindow, "AI context window is invalid."),
    vocabularySize: requireNumber(value.vocabularySize, "AI vocabulary size is invalid."),
    experts: requireNumber(value.experts, "AI expert count is invalid."),
    precision: value.precision as AiPrecision,
    quantization: value.quantization as AiQuantization,
  };

  assertConfiguration(configuration);
  return cloneAiConfiguration(configuration);
}

export function parseAiConfiguration(value: unknown): AiConfiguration {
  return parseAiConfigurationValue(value);
}

function parseAiDatasetValue(value: unknown): AiDataset {
  if (!isRecord(value)) {
    throw new InvalidAiDataError("AI dataset is invalid.");
  }

  const dataset: AiDataset = {
    id: requireString(value.id, "AI dataset ID is invalid."),
    name: requireString(value.name, "AI dataset name is invalid."),
    modality: value.modality as AiDatasetModality,
    sizeGb: requireNumber(value.sizeGb, "AI dataset size is invalid."),
    qualityScore: requireNumber(value.qualityScore, "AI dataset quality is invalid."),
    diversityScore: requireNumber(value.diversityScore, "AI dataset diversity is invalid."),
    license: value.license as AiDatasetLicense,
    processingCostUsd: requireNumber(value.processingCostUsd, "AI dataset processing cost is invalid."),
  };

  assertDatasets([dataset]);
  return { ...dataset };
}

export function parseAiDataset(value: unknown): AiDataset {
  return parseAiDatasetValue(value);
}

function parseAiDatasetsValue(value: unknown): AiDataset[] {
  if (!Array.isArray(value)) {
    throw new InvalidAiDataError("AI datasets are invalid.");
  }
  const datasets = value.map(parseAiDatasetValue);
  assertDatasets(datasets);
  return datasets;
}

export function parseAiProject(value: unknown, currentDate: string): AiProject {
  if (!isRecord(value)) {
    throw new InvalidAiDataError("AI project is invalid.");
  }

  const id = requireString(value.id, "AI project ID is invalid.");
  const name = requireString(value.name, "AI project name is invalid.");
  assertName(name);
  if (!isValidDateOnly(currentDate)) {
    throw new InvalidAiDataError("AI project date is invalid.");
  }
  const year = getYear(currentDate);

  const configuration = parseAiConfigurationValue(value.configuration);
  assertConfiguration(configuration, year);
  const datasets = parseAiDatasetsValue(value.datasets);
  assertDatasets(datasets, year);

  if (!Array.isArray(value.versions) || value.versions.length === 0) {
    throw new InvalidAiDataError("AI project versions are invalid.");
  }

  const versions: AiDesignVersion[] = value.versions.map((entry) => {
    if (!isRecord(entry)) {
      throw new InvalidAiDataError("AI project version is invalid.");
    }
    const version = requireNumber(entry.version, "AI project version number is invalid.");
    if (!Number.isInteger(version) || version < 1) {
      throw new InvalidAiDataError("AI project version number is invalid.");
    }
    const savedOn = requireString(entry.savedOn, "AI project version date is invalid.");
    assertDate(savedOn);
    const versionConfiguration = parseAiConfigurationValue(entry.configuration);
    assertConfiguration(versionConfiguration, year);
    const versionDatasets = parseAiDatasetsValue(entry.datasets);
    assertDatasets(versionDatasets, year);
    return {
      version,
      savedOn,
      configuration: versionConfiguration,
      datasets: versionDatasets,
    };
  });

  versions.sort((left, right) => left.version - right.version);
  if (versions[0]?.version !== 1) {
    throw new InvalidAiDataError("AI project versions must start at 1.");
  }
  if (new Set(versions.map((version) => version.version)).size !== versions.length) {
    throw new InvalidAiDataError("AI project versions must be unique.");
  }

  const latest = versions[versions.length - 1];
  if (
    latest === undefined ||
    !aiConfigurationsEqual(latest.configuration, configuration) ||
    !aiDatasetsEqual(latest.datasets, datasets)
  ) {
    throw new InvalidAiDataError("AI project latest version must match the project.");
  }

  return {
    id,
    name: name.trim(),
    configuration: cloneAiConfiguration(configuration),
    datasets: cloneAiDatasets(datasets),
    versions,
  };
}
