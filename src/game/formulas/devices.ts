import type { ComponentProject } from "../models/components";
import {
  resolveAiDeployment,
  resolveComponentProject,
  resolveCpuVersion,
  resolveOsRelease,
  type DeviceConfiguration,
  type DeviceReferenceContext,
  type DeviceType,
  validateDeviceConfiguration,
} from "../models/devices";
import type { OsEcosystemMetrics, OsKernelMetrics } from "./os";
import { calculateOsEcosystemMetrics, calculateOsKernelMetrics } from "./os";
import { calculateComponentPerformanceScore, estimateComponentManufacturingCost } from "./components";
import { calculateCpuMarketPerformanceScore, estimateManufacturingCost } from "./market";

export interface DeviceMetrics {
  performanceScore: number;
  gamingScore: number;
  productivityScore: number;
  efficiencyScore: number;
  compatibilityScore: number;
  reliabilityScore: number;
  osIntegrationScore: number;
  aiCapabilityScore: number;
  ecosystemSynergyScore: number;
  appealScore: number;
  unitCostUsd: number;
  powerW: number;
  thermalLoad: number;
  memoryGb: number;
  storageGb: number;
  overallScore: number;
}

interface DeviceTypeWeights {
  cpu: number;
  gpu: number;
  ram: number;
  storage: number;
  os: number;
  network: number;
  ai: number;
  reliability: number;
  compatibility: number;
}

const DEVICE_TYPE_WEIGHTS: Record<DeviceType, DeviceTypeWeights> = {
  desktop: { cpu: 0.3, gpu: 0.1, ram: 0.12, storage: 0.08, os: 0.2, network: 0.05, ai: 0.05, reliability: 0.05, compatibility: 0.05 },
  laptop: { cpu: 0.25, gpu: 0.08, ram: 0.12, storage: 0.1, os: 0.2, network: 0.05, ai: 0.02, reliability: 0.13, compatibility: 0.05 },
  smartphone: { cpu: 0.25, gpu: 0.08, ram: 0.12, storage: 0.1, os: 0.25, network: 0.05, ai: 0.02, reliability: 0.08, compatibility: 0.05 },
  tablet: { cpu: 0.25, gpu: 0.1, ram: 0.1, storage: 0.1, os: 0.22, network: 0.05, ai: 0.03, reliability: 0.1, compatibility: 0.05 },
  workstation: { cpu: 0.32, gpu: 0.2, ram: 0.12, storage: 0.08, os: 0.1, network: 0.03, ai: 0.05, reliability: 0.05, compatibility: 0.05 },
  server: { cpu: 0.2, gpu: 0.05, ram: 0.15, storage: 0.08, os: 0.12, network: 0.2, ai: 0.05, reliability: 0.1, compatibility: 0.05 },
  gaming: { cpu: 0.22, gpu: 0.38, ram: 0.08, storage: 0.08, os: 0.12, network: 0.02, ai: 0.02, reliability: 0.05, compatibility: 0.03 },
  "ai-device": { cpu: 0.15, gpu: 0.15, ram: 0.1, storage: 0.07, os: 0.12, network: 0.03, ai: 0.23, reliability: 0.1, compatibility: 0.05 },
};

const DEVICE_THERMAL_CAPACITY_W: Record<DeviceType, number> = {
  desktop: 300,
  laptop: 120,
  smartphone: 15,
  tablet: 20,
  workstation: 500,
  server: 800,
  gaming: 400,
  "ai-device": 700,
};

const DEVICE_POWER_OVERHEAD_W: Record<DeviceType, number> = {
  desktop: 25,
  laptop: 15,
  smartphone: 2,
  tablet: 3,
  workstation: 35,
  server: 80,
  gaming: 40,
  "ai-device": 70,
};

const DEVICE_ASSEMBLY_COST_USD: Record<DeviceType, number> = {
  desktop: 120,
  laptop: 180,
  smartphone: 90,
  tablet: 110,
  workstation: 220,
  server: 600,
  gaming: 200,
  "ai-device": 500,
};

export interface EcosystemSynergyInput {
  cpuScore: number;
  gpuScore: number;
  aiCapabilityScore: number;
  osIntegrationScore: number;
  applicationCoverage: number;
  networkScore: number;
  platformMatch: boolean;
}

export function calculateEcosystemSynergy(input: EcosystemSynergyInput): number {
  const platformScore = input.platformMatch ? 100 : 30;
  return round(clamp(
    input.cpuScore * 0.15
    + input.gpuScore * 0.1
    + input.aiCapabilityScore * 0.2
    + input.osIntegrationScore * 0.2
    + input.applicationCoverage * 0.2
    + input.networkScore * 0.05
    + platformScore * 0.1,
    0,
    100,
  ), 1);
}

export function calculateDeviceMetrics(
  configuration: DeviceConfiguration,
  context: DeviceReferenceContext,
): DeviceMetrics {
  const validation = validateDeviceConfiguration(configuration, context);
  const cpu = resolveCpuVersion(context, configuration);
  const motherboard = resolveComponentProject(context, configuration.motherboardProjectId, "motherboard");
  const ram = resolveComponentProject(context, configuration.ramProjectId, "ram");
  const storage = resolveComponentProject(context, configuration.storageProjectId, "ssd");
  const gpu = resolveComponentProject(context, configuration.gpuProjectId, "gpu");
  const networking = resolveComponentProject(context, configuration.networkingProjectId, "networking");
  const aiAccelerator = resolveComponentProject(context, configuration.aiAcceleratorProjectId, "ai-accelerator");
  const release = resolveOsRelease(context, configuration);
  const deployment = resolveAiDeployment(context, configuration);

  const cpuScore = cpu ? clamp(35 + calculateCpuMarketPerformanceScore(cpu) * 25, 0, 100) : 0;
  const gpuScore = gpu ? clamp(35 + calculateComponentPerformanceScore(gpu.configuration) * 25, 0, 100) : 0;
  const ramScore = ram ? clamp(40 + calculateComponentPerformanceScore(ram.configuration) * 20, 0, 100) : 0;
  const storageScore = storage ? clamp(40 + calculateComponentPerformanceScore(storage.configuration) * 20, 0, 100) : 0;
  const networkScore = networking ? clamp(30 + calculateComponentPerformanceScore(networking.configuration) * 30, 0, 100) : 0;
  const acceleratorScore = aiAccelerator ? clamp(30 + calculateComponentPerformanceScore(aiAccelerator.configuration) * 30, 0, 100) : 0;

  let kernel: OsKernelMetrics | null = null;
  let ecosystem: OsEcosystemMetrics | null = null;
  if (release) {
    kernel = calculateOsKernelMetrics(release.configuration);
    ecosystem = calculateOsEcosystemMetrics(release.configuration, kernel);
  }

  const osQuality = release?.qualityScore ?? 0;
  const platformMatch = release
    ? release.configuration.targetPlatform === getExpectedPlatform(configuration.type)
      || release.configuration.targetPlatform === "universal"
    : false;
  const osIntegrationScore = release && ecosystem
    ? round(clamp(osQuality * 0.5 + ecosystem.ecosystemScore * 0.3 + (platformMatch ? 20 : 4), 0, 100), 1)
    : 0;
  const applicationCoverage = ecosystem?.applicationCoverage ?? 0;
  const aiCapabilityScore = deployment
    ? round(clamp(deployment.qualityScore * 0.65 + acceleratorScore * 0.35, 0, 100), 1)
    : 0;

  const powerW = round(
    (cpu?.tdpW ?? 0)
    + (gpu?.configuration.tdpW ?? 0)
    + (ram?.configuration.tdpW ?? 0)
    + (storage?.configuration.tdpW ?? 0)
    + (motherboard?.configuration.tdpW ?? 0)
    + (networking?.configuration.tdpW ?? 0)
    + (aiAccelerator?.configuration.tdpW ?? 0)
    + DEVICE_POWER_OVERHEAD_W[configuration.type],
    1,
  );
  const thermalLoad = round(clamp((powerW / DEVICE_THERMAL_CAPACITY_W[configuration.type]) * 100, 0, 100), 1);
  const efficiencyScore = round(clamp(100 - thermalLoad * 0.55 - powerW * 0.03, 0, 100), 1);
  const compatibilityScore = round(clamp(100 - validation.issues.length * 12, 0, 100), 1);

  const stageReliabilityBonus = release
    ? { alpha: 0, beta: 2, rc: 4, stable: 7 }[release.stage]
    : 0;
  const reliabilityScore = round(clamp(
    (kernel?.stabilityScore ?? 0) * 0.6
    + (100 - thermalLoad) * 0.25
    + stageReliabilityBonus,
    0,
    100,
  ), 1);

  const performanceScore = weightedScore({
    cpu: cpuScore,
    gpu: gpuScore,
    ram: ramScore,
    storage: storageScore,
    os: osQuality,
    network: networkScore,
  }, {
    cpu: 0.34,
    gpu: 0.2,
    ram: 0.14,
    storage: 0.1,
    os: 0.17,
    network: 0.05,
  });

  const gamingScore = weightedScore({
    cpu: cpuScore,
    gpu: gpuScore,
    ram: ramScore,
    storage: storageScore,
    os: osQuality,
  }, {
    cpu: 0.25,
    gpu: 0.45,
    ram: 0.1,
    storage: 0.08,
    os: 0.12,
  });

  const productivityScore = weightedScore({
    cpu: cpuScore,
    gpu: gpuScore,
    ram: ramScore,
    storage: storageScore,
    os: osQuality,
    network: networkScore,
  }, {
    cpu: 0.4,
    gpu: 0.08,
    ram: 0.2,
    storage: 0.15,
    os: 0.12,
    network: 0.05,
  });

  const synergyScore = calculateEcosystemSynergy({
    cpuScore,
    gpuScore,
    aiCapabilityScore,
    osIntegrationScore,
    applicationCoverage,
    networkScore,
    platformMatch,
  });

  const weights = DEVICE_TYPE_WEIGHTS[configuration.type];
  const overallScore = weightedScore({
    cpu: cpuScore,
    gpu: gpuScore,
    ram: ramScore,
    storage: storageScore,
    os: osQuality,
    network: networkScore,
    ai: aiCapabilityScore,
    reliability: reliabilityScore,
    compatibility: compatibilityScore,
  }, weights);

  const appealScore = round(clamp(
    overallScore * 0.5
    + synergyScore * 0.2
    + osIntegrationScore * 0.15
    + aiCapabilityScore * 0.1
    + compatibilityScore * 0.05,
    0,
    100,
  ), 1);

  const unitCostUsd = round(
    (cpu ? estimateManufacturingCost(cpu).unitCostUsd : 0)
    + componentCost(motherboard)
    + componentCost(ram)
    + componentCost(storage)
    + componentCost(gpu)
    + componentCost(networking)
    + componentCost(aiAccelerator)
    + DEVICE_ASSEMBLY_COST_USD[configuration.type],
    2,
  );

  return {
    performanceScore: round(performanceScore, 1),
    gamingScore: round(gamingScore, 1),
    productivityScore: round(productivityScore, 1),
    efficiencyScore,
    compatibilityScore,
    reliabilityScore,
    osIntegrationScore,
    aiCapabilityScore,
    ecosystemSynergyScore: synergyScore,
    appealScore,
    unitCostUsd,
    powerW,
    thermalLoad,
    memoryGb: ram?.configuration.type === "ram" ? ram.configuration.capacityGb : 0,
    storageGb: storage?.configuration.type === "ssd" ? storage.configuration.capacityGb : 0,
    overallScore: round(overallScore, 1),
  };
}

function getExpectedPlatform(type: DeviceType): "desktop" | "mobile" | "server" | "gaming" | "universal" {
  switch (type) {
    case "smartphone":
    case "tablet":
      return "mobile";
    case "server":
      return "server";
    case "gaming":
      return "gaming";
    case "ai-device":
      return "universal";
    default:
      return "desktop";
  }
}

function componentCost(project: ComponentProject | null): number {
  return project ? estimateComponentManufacturingCost(project.configuration).unitCostUsd : 0;
}

function weightedScore(
  scores: Record<string, number>,
  weights: object,
): number {
  let total = 0;
  let weightTotal = 0;
  for (const [key, weight] of Object.entries(weights as Record<string, number>)) {
    total += (scores[key] ?? 0) * weight;
    weightTotal += weight;
  }
  return weightTotal === 0 ? 0 : clamp(total / weightTotal, 0, 100);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
