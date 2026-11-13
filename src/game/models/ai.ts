import { isValidDateOnly } from "./date";
import { isProjectVersionLimitReached } from "./project-limits";

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
  trainingJobs: AiTrainingJob[];
  deployments: AiDeployment[];
}

export const AI_OPTIMIZATION_OPTIONS = [
  "quantization",
  "pruning",
  "distillation",
  "fine-tuning",
] as const;

export type AiOptimizationType = (typeof AI_OPTIMIZATION_OPTIONS)[number];

export type AiTrainingStage = "training" | "completed";

export interface AiOptimization {
  type: AiOptimizationType;
  appliedOn: string;
  costUsd: number;
}

export interface AiTrainingJob {
  id: string;
  version: number;
  seed: number;
  hardwareProjectId: string | null;
  hardwareName: string;
  hardwareTflops: number;
  hardwareVramGb: number;
  totalDays: number;
  progressDays: number;
  costPerDayUsd: number;
  totalCostUsd: number;
  stage: AiTrainingStage;
  loss: number;
  validationScore: number;
  startedOn: string;
  completedOn: string | null;
  configuration: AiConfiguration;
  datasets: AiDataset[];
  optimizations: AiOptimization[];
}

export interface AiDeployment {
  id: string;
  trainingJobId: string;
  version: number;
  deployedOn: string;
  qualityScore: number;
  appealScore: number;
  costUsd: number;
  optimizationTypes: AiOptimizationType[];
}

export const AI_OPTIMIZATION_COSTS_USD: Record<AiOptimizationType, number> = {
  quantization: 12_000,
  pruning: 18_000,
  distillation: 30_000,
  "fine-tuning": 22_000,
};

export const AI_DEPLOYMENT_COST_USD = 15_000;

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
  trainingSeed: { min: 0, max: 2_147_483_647 },
  maxTrainingJobs: 20,
  maxDeployments: 20,
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

export function isAiOptimizationType(value: unknown): value is AiOptimizationType {
  return typeof value === "string" && (AI_OPTIMIZATION_OPTIONS as readonly string[]).includes(value);
}

export function isAiTrainingStage(value: unknown): value is AiTrainingStage {
  return value === "training" || value === "completed";
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
    trainingJobs: [],
    deployments: [],
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
  if (isProjectVersionLimitReached(project.versions)) {
    throw new InvalidAiDataError("AI project version limit reached.");
  }
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

function parseAiOptimizationValue(value: unknown): AiOptimization {
  if (!isRecord(value) || !isAiOptimizationType(value.type)) {
    throw new InvalidAiDataError("AI optimization is invalid.");
  }
  const appliedOn = requireString(value.appliedOn, "AI optimization date is invalid.");
  assertDate(appliedOn);
  const costUsd = requireNumber(value.costUsd, "AI optimization cost is invalid.");
  if (costUsd < 0) {
    throw new InvalidAiDataError("AI optimization cost is invalid.");
  }
  return { type: value.type, appliedOn, costUsd };
}

function parseAiTrainingJobValue(value: unknown, currentYear: number): AiTrainingJob {
  if (!isRecord(value)) {
    throw new InvalidAiDataError("AI training job is invalid.");
  }
  const id = requireString(value.id, "AI training job ID is invalid.");
  const version = requireNumber(value.version, "AI training job version is invalid.");
  if (!Number.isInteger(version) || version < 1) {
    throw new InvalidAiDataError("AI training job version is invalid.");
  }
  const seed = requireNumber(value.seed, "AI training seed is invalid.");
  if (!Number.isInteger(seed) || seed < AI_LIMITS.trainingSeed.min || seed > AI_LIMITS.trainingSeed.max) {
    throw new InvalidAiDataError("AI training seed is invalid.");
  }
  const hardwareProjectId = value.hardwareProjectId === null
    ? null
    : requireString(value.hardwareProjectId, "AI training hardware ID is invalid.");
  const hardwareName = requireString(value.hardwareName, "AI training hardware name is invalid.");
  const hardwareTflops = requireNumber(value.hardwareTflops, "AI training hardware compute is invalid.");
  const hardwareVramGb = requireNumber(value.hardwareVramGb, "AI training hardware memory is invalid.");
  if (hardwareTflops <= 0 || hardwareVramGb <= 0) {
    throw new InvalidAiDataError("AI training hardware specifications are invalid.");
  }
  const totalDays = requireNumber(value.totalDays, "AI training duration is invalid.");
  const progressDays = requireNumber(value.progressDays, "AI training progress is invalid.");
  if (!Number.isInteger(totalDays) || totalDays < 1 || totalDays > 60) {
    throw new InvalidAiDataError("AI training duration is invalid.");
  }
  if (!Number.isInteger(progressDays) || progressDays < 0 || progressDays > totalDays) {
    throw new InvalidAiDataError("AI training progress is invalid.");
  }
  const costPerDayUsd = requireNumber(value.costPerDayUsd, "AI training daily cost is invalid.");
  const totalCostUsd = requireNumber(value.totalCostUsd, "AI training total cost is invalid.");
  if (costPerDayUsd < 0 || totalCostUsd < 0) {
    throw new InvalidAiDataError("AI training cost is invalid.");
  }
  if (!isAiTrainingStage(value.stage)) {
    throw new InvalidAiDataError("AI training stage is invalid.");
  }
  const loss = requireNumber(value.loss, "AI training loss is invalid.");
  const validationScore = requireNumber(value.validationScore, "AI validation score is invalid.");
  if (loss < 0 || loss > 100 || validationScore < 0 || validationScore > 100) {
    throw new InvalidAiDataError("AI training metrics are invalid.");
  }
  const startedOn = requireString(value.startedOn, "AI training start date is invalid.");
  assertDate(startedOn);
  const completedOn = value.completedOn === null
    ? null
    : requireString(value.completedOn, "AI training completion date is invalid.");
  if (completedOn !== null) {
    assertDate(completedOn);
  }
  if (value.stage === "completed") {
    if (completedOn === null || progressDays !== totalDays) {
      throw new InvalidAiDataError("Completed AI training job is inconsistent.");
    }
  } else if (completedOn !== null || progressDays >= totalDays) {
    throw new InvalidAiDataError("Active AI training job is inconsistent.");
  }

  const configuration = parseAiConfigurationValue(value.configuration);
  assertConfiguration(configuration, currentYear);
  const datasets = parseAiDatasetsValue(value.datasets);
  assertDatasets(datasets, currentYear);

  if (!Array.isArray(value.optimizations)) {
    throw new InvalidAiDataError("AI training optimizations are invalid.");
  }
  const optimizations = value.optimizations.map(parseAiOptimizationValue);
  if (new Set(optimizations.map((optimization) => optimization.type)).size !== optimizations.length) {
    throw new InvalidAiDataError("AI training optimizations must be unique.");
  }

  return {
    id,
    version,
    seed,
    hardwareProjectId,
    hardwareName,
    hardwareTflops,
    hardwareVramGb,
    totalDays,
    progressDays,
    costPerDayUsd,
    totalCostUsd,
    stage: value.stage,
    loss,
    validationScore,
    startedOn,
    completedOn,
    configuration,
    datasets,
    optimizations,
  };
}

function parseAiDeploymentValue(value: unknown): AiDeployment {
  if (!isRecord(value)) {
    throw new InvalidAiDataError("AI deployment is invalid.");
  }
  const id = requireString(value.id, "AI deployment ID is invalid.");
  const trainingJobId = requireString(value.trainingJobId, "AI deployment training job is invalid.");
  const version = requireNumber(value.version, "AI deployment version is invalid.");
  if (!Number.isInteger(version) || version < 1) {
    throw new InvalidAiDataError("AI deployment version is invalid.");
  }
  const deployedOn = requireString(value.deployedOn, "AI deployment date is invalid.");
  assertDate(deployedOn);
  const qualityScore = requireNumber(value.qualityScore, "AI deployment quality is invalid.");
  const appealScore = requireNumber(value.appealScore, "AI deployment appeal is invalid.");
  if (qualityScore < 0 || qualityScore > 100 || appealScore < 0 || appealScore > 100) {
    throw new InvalidAiDataError("AI deployment metrics are invalid.");
  }
  const costUsd = requireNumber(value.costUsd, "AI deployment cost is invalid.");
  if (costUsd < 0) {
    throw new InvalidAiDataError("AI deployment cost is invalid.");
  }
  if (!Array.isArray(value.optimizationTypes) || !value.optimizationTypes.every(isAiOptimizationType)) {
    throw new InvalidAiDataError("AI deployment optimizations are invalid.");
  }
  const optimizationTypes = value.optimizationTypes as AiOptimizationType[];
  if (new Set(optimizationTypes).size !== optimizationTypes.length) {
    throw new InvalidAiDataError("AI deployment optimizations must be unique.");
  }
  return { id, trainingJobId, version, deployedOn, qualityScore, appealScore, costUsd, optimizationTypes };
}

export interface AiProjectParseOptions {
  allowMissingTraining?: boolean;
}

export function parseAiProject(
  value: unknown,
  currentDate: string,
  options: AiProjectParseOptions = {},
): AiProject {
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

  const trainingJobs = value.trainingJobs === undefined && options.allowMissingTraining === true
    ? []
    : Array.isArray(value.trainingJobs)
      ? value.trainingJobs.map((job) => parseAiTrainingJobValue(job, year))
      : (() => { throw new InvalidAiDataError("AI training jobs are invalid."); })();
  if (trainingJobs.length > AI_LIMITS.maxTrainingJobs) {
    throw new InvalidAiDataError("Too many AI training jobs.");
  }
  if (new Set(trainingJobs.map((job) => job.id)).size !== trainingJobs.length) {
    throw new InvalidAiDataError("AI training job IDs must be unique.");
  }
  if (trainingJobs.filter((job) => job.stage === "training").length > 1) {
    throw new InvalidAiDataError("Only one AI training job can be active.");
  }

  const deployments = value.deployments === undefined && options.allowMissingTraining === true
    ? []
    : Array.isArray(value.deployments)
      ? value.deployments.map(parseAiDeploymentValue)
      : (() => { throw new InvalidAiDataError("AI deployments are invalid."); })();
  if (deployments.length > AI_LIMITS.maxDeployments) {
    throw new InvalidAiDataError("Too many AI deployments.");
  }
  if (new Set(deployments.map((deployment) => deployment.id)).size !== deployments.length) {
    throw new InvalidAiDataError("AI deployment IDs must be unique.");
  }
  for (const deployment of deployments) {
    const job = trainingJobs.find((candidate) => candidate.id === deployment.trainingJobId);
    if (job === undefined || job.stage !== "completed" || job.version !== deployment.version) {
      throw new InvalidAiDataError("AI deployment must reference a completed training job.");
    }
    const jobOptimizations = new Set(job.optimizations.map((optimization) => optimization.type));
    if (deployment.optimizationTypes.some((type) => !jobOptimizations.has(type))) {
      throw new InvalidAiDataError("AI deployment optimizations must match its training job.");
    }
  }

  return {
    id,
    name: name.trim(),
    configuration: cloneAiConfiguration(configuration),
    datasets: cloneAiDatasets(datasets),
    versions,
    trainingJobs,
    deployments,
  };
}
