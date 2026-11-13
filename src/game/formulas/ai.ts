import type {
  AiArchitecture,
  AiConfiguration,
  AiDataset,
  AiDatasetLicense,
  AiDatasetModality,
  AiOptimizationType,
} from "../models/ai";
import type { ComponentProject } from "../models/components";
import { calculateComponentPerformanceScore } from "./components";

export interface AiArchitectureProfile {
  quality: number;
  trainingFactor: number;
  inferenceFactor: number;
  memoryFactor: number;
}

export interface AiDatasetLicenseProfile {
  compliance: number;
}

export interface AiModalityProfile {
  qualityFactor: number;
}

export interface AiModelMetrics {
  modelSizeGb: number;
  datasetSizeGb: number;
  datasetQualityScore: number;
  datasetDiversityScore: number;
  licenseComplianceScore: number;
  qualityScore: number;
  trainingReadinessScore: number;
  inferenceEfficiencyScore: number;
  commercialReadinessScore: number;
  appealScore: number;
  minimumGpuTflops: number;
  trainingVramGb: number;
  inferenceVramGb: number;
  systemRamGb: number;
  storageGb: number;
  recommendedGpuVramGb: number;
}

export interface AiHardwareRequirements {
  minimumGpuTflops: number;
  trainingVramGb: number;
  inferenceVramGb: number;
  systemRamGb: number;
  storageGb: number;
  recommendedGpuVramGb: number;
}

export interface AiTrainingHardware {
  id: string | null;
  name: string;
  kind: "reference" | "gpu" | "ai-accelerator";
  tflops: number;
  vramGb: number;
}

export interface AiTrainingPlan {
  hardware: AiTrainingHardware;
  minimumTflops: number;
  requiredVramGb: number;
  totalDays: number;
  costPerDayUsd: number;
  totalCostUsd: number;
  compatible: boolean;
  issues: Array<"insufficient-compute" | "insufficient-vram">;
}

export interface AiTrainingProgress {
  loss: number;
  validationScore: number;
  progressRatio: number;
  completed: boolean;
}

const AI_ARCHITECTURE_PROFILES: Record<AiArchitecture, AiArchitectureProfile> = {
  transformer: { quality: 80, trainingFactor: 1.15, inferenceFactor: 1, memoryFactor: 1 },
  rnn: { quality: 58, trainingFactor: 0.75, inferenceFactor: 0.9, memoryFactor: 0.85 },
  cnn: { quality: 62, trainingFactor: 0.8, inferenceFactor: 0.95, memoryFactor: 0.9 },
  diffusion: { quality: 72, trainingFactor: 1.25, inferenceFactor: 1.3, memoryFactor: 1.2 },
  moe: { quality: 86, trainingFactor: 1.35, inferenceFactor: 1.1, memoryFactor: 1.3 },
  multimodal: { quality: 82, trainingFactor: 1.3, inferenceFactor: 1.2, memoryFactor: 1.15 },
  custom: { quality: 65, trainingFactor: 1, inferenceFactor: 1, memoryFactor: 1 },
};

const AI_LICENSE_PROFILES: Record<AiDatasetLicense, AiDatasetLicenseProfile> = {
  proprietary: { compliance: 1 },
  permissive: { compliance: 0.98 },
  research: { compliance: 0.65 },
  restricted: { compliance: 0.35 },
};

const AI_MODALITY_PROFILES: Record<AiDatasetModality, AiModalityProfile> = {
  text: { qualityFactor: 1 },
  code: { qualityFactor: 1.05 },
  images: { qualityFactor: 0.95 },
  video: { qualityFactor: 1.1 },
  audio: { qualityFactor: 0.9 },
  scientific: { qualityFactor: 0.95 },
  multimodal: { qualityFactor: 1.15 },
};

const PRECISION_INFERENCE_BYTES = {
  fp32: 4,
  fp16: 2,
  bf16: 2,
  fp8: 1,
} as const;

const PRECISION_TRAINING_BYTES = {
  fp32: 4,
  fp16: 2,
  bf16: 2,
  fp8: 2,
} as const;

const PRECISION_QUALITY_FACTORS = {
  fp32: 1,
  fp16: 1.02,
  bf16: 1.03,
  fp8: 1.04,
} as const;

const PRECISION_TRAINING_SCORES = {
  fp32: 55,
  fp16: 65,
  bf16: 70,
  fp8: 80,
} as const;

const QUANTIZATION_INFERENCE_BYTES = {
  none: null,
  int8: 1,
  int4: 0.5,
} as const;

const QUANTIZATION_EFFICIENCY_BONUS = {
  none: 0,
  int8: 8,
  int4: 14,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, fractionDigits = 1): number {
  const factor = 10 ** fractionDigits;
  return Math.round(value * factor) / factor;
}

export function getAiArchitectureProfile(architecture: AiArchitecture): AiArchitectureProfile {
  return AI_ARCHITECTURE_PROFILES[architecture];
}

export function getAiDatasetLicenseProfile(license: AiDatasetLicense): AiDatasetLicenseProfile {
  return AI_LICENSE_PROFILES[license];
}

export function getAiModalityProfile(modality: AiDatasetModality): AiModalityProfile {
  return AI_MODALITY_PROFILES[modality];
}

function getInferenceBytes(configuration: AiConfiguration): number {
  const quantizedBytes = QUANTIZATION_INFERENCE_BYTES[configuration.quantization];
  return quantizedBytes ?? PRECISION_INFERENCE_BYTES[configuration.precision];
}

interface DatasetSummary {
  sizeGb: number;
  quality: number;
  diversity: number;
  licenseCompliance: number;
}

function summarizeDatasets(datasets: readonly AiDataset[]): DatasetSummary {
  if (datasets.length === 0) {
    return { sizeGb: 0, quality: 0, diversity: 0, licenseCompliance: 1 };
  }

  let totalSize = 0;
  let weightedQuality = 0;
  let weightedDiversity = 0;
  let weightedLicense = 0;

  for (const dataset of datasets) {
    const size = Math.max(0, dataset.sizeGb);
    const modality = getAiModalityProfile(dataset.modality);
    const license = getAiDatasetLicenseProfile(dataset.license);
    totalSize += size;
    weightedQuality += size * dataset.qualityScore * modality.qualityFactor;
    weightedDiversity += size * dataset.diversityScore;
    weightedLicense += size * license.compliance;
  }

  if (totalSize <= 0) {
    return { sizeGb: 0, quality: 0, diversity: 0, licenseCompliance: 1 };
  }

  return {
    sizeGb: totalSize,
    quality: weightedQuality / totalSize,
    diversity: weightedDiversity / totalSize,
    licenseCompliance: weightedLicense / totalSize,
  };
}

export function calculateAiModelMetrics(
  configuration: AiConfiguration,
  datasets: readonly AiDataset[],
  optimizations: readonly AiOptimizationType[] = [],
): AiModelMetrics {
  const architecture = getAiArchitectureProfile(configuration.architecture);
  const inferenceBytes = getInferenceBytes(configuration);
  const trainingBytes = PRECISION_TRAINING_BYTES[configuration.precision];
  const dataset = summarizeDatasets(datasets);

  const modelSizeGb = (configuration.parameterCountM * inferenceBytes) / 1000;
  const scaleFactor = clamp(
    0.6 + 0.2 * Math.log10(Math.max(1, configuration.parameterCountM / 10)),
    0.55,
    1.3,
  );
  const dataFactor = 0.55 + 0.45 * (dataset.quality / 100);
  const diversityFactor = 0.9 + 0.2 * (dataset.diversity / 100);
  const contextFactor = clamp(
    0.9 + Math.log10(Math.max(1, configuration.contextWindow / 512)) * 0.03,
    0.9,
    1.1,
  );
  const baseQuality = clamp(
    architecture.quality *
      scaleFactor *
      dataFactor *
      diversityFactor *
      contextFactor *
      PRECISION_QUALITY_FACTORS[configuration.precision],
    0,
    100,
  );

  const requiredDataGb = Math.max(1, configuration.parameterCountM * 0.02);
  const volumeFactor = clamp(dataset.sizeGb / requiredDataGb, 0, 1);
  const trainingReadinessScore = clamp(
    dataset.quality * 0.35 +
      dataset.diversity * 0.2 +
      volumeFactor * 100 * 0.2 +
      architecture.trainingFactor * 50 * 0.15 +
      PRECISION_TRAINING_SCORES[configuration.precision] * 0.1,
    0,
    100,
  );

  let optimizedModelSizeGb = modelSizeGb;
  let qualityScore = baseQuality;
  let inferenceEfficiencyScore = clamp(
    96 -
      modelSizeGb * 0.45 +
      QUANTIZATION_EFFICIENCY_BONUS[configuration.quantization] -
      (1 - architecture.inferenceFactor) * 20,
    10,
    99,
  );
  let commercialReadinessScore = clamp(
    baseQuality * 0.6 + dataset.licenseCompliance * 100 * 0.25 + dataset.diversity * 0.15,
    0,
    100,
  );

  for (const optimization of new Set(optimizations)) {
    switch (optimization) {
      case "quantization":
        optimizedModelSizeGb *= 0.55;
        inferenceEfficiencyScore += 8;
        qualityScore -= 1.5;
        break;
      case "pruning":
        optimizedModelSizeGb *= 0.75;
        inferenceEfficiencyScore += 5;
        qualityScore -= 2.5;
        break;
      case "distillation":
        optimizedModelSizeGb *= 0.7;
        inferenceEfficiencyScore += 10;
        qualityScore -= 3.5;
        break;
      case "fine-tuning":
        qualityScore += 4;
        commercialReadinessScore += 3;
        break;
    }
  }

  qualityScore = clamp(qualityScore, 0, 100);
  inferenceEfficiencyScore = clamp(inferenceEfficiencyScore, 10, 99);
  commercialReadinessScore = clamp(commercialReadinessScore, 0, 100);
  const appealScore = clamp(
    qualityScore * 0.55 + commercialReadinessScore * 0.25 + inferenceEfficiencyScore * 0.2,
    0,
    100,
  );

  const weightsTrainingGb = (configuration.parameterCountM * trainingBytes * 4) / 1000;
  const activationGb =
    (configuration.layers *
      configuration.contextWindow *
      configuration.hiddenDimension *
      8 *
      PRECISION_INFERENCE_BYTES[configuration.precision]) /
    1e9 *
    0.25;
  const trainingVramGb = (weightsTrainingGb + activationGb + 2) * architecture.memoryFactor;
  const kvCacheGb =
    (configuration.layers *
      configuration.contextWindow *
      configuration.hiddenDimension *
      2 *
      inferenceBytes) /
    1e9;
  const inferenceVramGb = optimizedModelSizeGb + kvCacheGb + 1.5;
  const systemRamGb = 16 + dataset.sizeGb * 0.2 + weightsTrainingGb * 0.5;
  const storageGb = 20 + dataset.sizeGb * 1.2 + weightsTrainingGb * 4;
  const recommendedGpuVramGb = trainingVramGb * 1.25;
  const minimumGpuTflops = clamp(
    5 + configuration.parameterCountM * 0.02 + (configuration.contextWindow / 4096) * 5,
    5,
    1000,
  );

  return {
    modelSizeGb: round(optimizedModelSizeGb, 3),
    datasetSizeGb: round(dataset.sizeGb, 1),
    datasetQualityScore: round(dataset.quality, 1),
    datasetDiversityScore: round(dataset.diversity, 1),
    licenseComplianceScore: round(dataset.licenseCompliance * 100, 1),
    qualityScore: round(qualityScore, 1),
    trainingReadinessScore: round(trainingReadinessScore, 1),
    inferenceEfficiencyScore: round(inferenceEfficiencyScore, 1),
    commercialReadinessScore: round(commercialReadinessScore, 1),
    appealScore: round(appealScore, 1),
    minimumGpuTflops: round(minimumGpuTflops, 1),
    trainingVramGb: round(trainingVramGb, 1),
    inferenceVramGb: round(inferenceVramGb, 1),
    systemRamGb: round(systemRamGb, 1),
    storageGb: round(storageGb, 1),
    recommendedGpuVramGb: round(recommendedGpuVramGb, 1),
  };
}

export function getAiTrainingHardwareOptions(
  projects: readonly ComponentProject[],
): AiTrainingHardware[] {
  const reference: AiTrainingHardware = {
    id: null,
    name: "Reference training cluster",
    kind: "reference",
    tflops: 20,
    vramGb: 16,
  };
  const hardware = projects
    .filter((project) => project.configuration.type === "gpu" || project.configuration.type === "ai-accelerator")
    .map((project) => {
      const configuration = project.configuration;
      const performanceScore = calculateComponentPerformanceScore(configuration);
      const vramGb = configuration.type === "gpu" || configuration.type === "ai-accelerator"
        ? configuration.memoryCapacityGb
        : 0;
      return {
        id: project.id,
        name: project.name,
        kind: configuration.type as "gpu" | "ai-accelerator",
        tflops: round(5 + performanceScore * 15, 1),
        vramGb: round(vramGb, 1),
      } satisfies AiTrainingHardware;
    });
  return [reference, ...hardware];
}

export function calculateAiTrainingPlan(
  configuration: AiConfiguration,
  datasets: readonly AiDataset[],
  hardware: AiTrainingHardware,
): AiTrainingPlan {
  const metrics = calculateAiModelMetrics(configuration, datasets);
  const issues: AiTrainingPlan["issues"] = [];
  if (hardware.tflops < metrics.minimumGpuTflops) {
    issues.push("insufficient-compute");
  }
  if (hardware.vramGb < metrics.trainingVramGb) {
    issues.push("insufficient-vram");
  }
  const totalDays = Math.max(1, Math.min(60, Math.ceil(
    2 +
    configuration.parameterCountM / 1000 +
    metrics.trainingVramGb / 8 +
    metrics.datasetSizeGb / 100,
  )));
  const costPerDayUsd = Math.round(120 + hardware.tflops * 6 + hardware.vramGb * 9);
  return {
    hardware,
    minimumTflops: metrics.minimumGpuTflops,
    requiredVramGb: metrics.trainingVramGb,
    totalDays,
    costPerDayUsd,
    totalCostUsd: totalDays * costPerDayUsd,
    compatible: issues.length === 0,
    issues,
  };
}

function seededUnit(seed: number, day: number, salt: number): number {
  let value = (seed ^ Math.imul(day + 1, 374_761_393) ^ salt) >>> 0;
  value = Math.imul(value ^ (value >>> 15), 2_246_822_519);
  value = Math.imul(value ^ (value >>> 13), 3_266_489_917);
  return ((value ^ (value >>> 16)) >>> 0) / 4_294_967_295;
}

export function simulateAiTrainingProgress(
  configuration: AiConfiguration,
  datasets: readonly AiDataset[],
  seed: number,
  totalDays: number,
  progressDays: number,
  optimizations: readonly AiOptimizationType[] = [],
): AiTrainingProgress {
  const safeTotalDays = Math.max(1, Math.round(totalDays));
  const safeProgress = Math.max(0, Math.min(safeTotalDays, Math.round(progressDays)));
  const progressRatio = safeProgress / safeTotalDays;
  const noise = seededUnit(seed, safeProgress, 0x9e3779b9);
  const loss = Math.max(0.05, 4.8 * Math.exp(-3.4 * progressRatio) + noise * 0.18);
  const metrics = calculateAiModelMetrics(configuration, datasets, optimizations);
  const validationScore = clamp(
    metrics.qualityScore * (0.55 + 0.45 * progressRatio) + (100 - loss * 20) * 0.25,
    0,
    100,
  );
  return {
    loss: round(loss, 3),
    validationScore: round(validationScore, 1),
    progressRatio: round(progressRatio, 3),
    completed: safeProgress >= safeTotalDays,
  };
}

export function calculateAiDeploymentMetrics(job: {
  configuration: AiConfiguration;
  datasets: readonly AiDataset[];
  optimizations: readonly { type: AiOptimizationType }[];
  validationScore: number;
}): { qualityScore: number; appealScore: number } {
  const metrics = calculateAiModelMetrics(
    job.configuration,
    job.datasets,
    job.optimizations.map((optimization) => optimization.type),
  );
  const qualityScore = clamp(metrics.qualityScore * 0.65 + job.validationScore * 0.35, 0, 100);
  const appealScore = clamp(metrics.appealScore * 0.7 + qualityScore * 0.3, 0, 100);
  return { qualityScore: round(qualityScore, 1), appealScore: round(appealScore, 1) };
}

export function evaluateAiHardwareRequirements(
  configuration: AiConfiguration,
  datasets: readonly AiDataset[],
): AiHardwareRequirements {
  const metrics = calculateAiModelMetrics(configuration, datasets);
  return {
    minimumGpuTflops: metrics.minimumGpuTflops,
    trainingVramGb: metrics.trainingVramGb,
    inferenceVramGb: metrics.inferenceVramGb,
    systemRamGb: metrics.systemRamGb,
    storageGb: metrics.storageGb,
    recommendedGpuVramGb: metrics.recommendedGpuVramGb,
  };
}
