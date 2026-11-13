import type { CloudConfiguration, CloudReferenceContext } from "../models/cloud";
import { calculateDeviceMetrics, type DeviceMetrics } from "./devices";

export interface CloudMetrics {
  computeUnits: number;
  memoryTb: number;
  storageTb: number;
  aiTflops: number;
  networkGbps: number;
  availability: number;
  efficiency: number;
  operatingCostPerDayUsd: number;
  capexUsd: number;
  capacityScore: number;
  overallScore: number;
  serverMetrics: DeviceMetrics;
}

export function calculateCloudMetrics(
  configuration: CloudConfiguration,
  context: CloudReferenceContext,
): CloudMetrics {
  const project = context.deviceProjects.find((candidate) => candidate.id === configuration.serverDeviceProjectId);
  const version = project?.versions.find((candidate) => candidate.version === configuration.serverDeviceVersion);
  const serverMetrics = version
    ? calculateDeviceMetrics(version.configuration, context)
    : emptyDeviceMetrics();

  const serverCount = configuration.dataCenters * configuration.serversPerCenter;
  const computeUnits = round(serverCount * (serverMetrics.performanceScore / 100), 1);
  const memoryTb = round((serverCount * serverMetrics.memoryGb) / 1_024, 2);
  const aiTflops = round(
    configuration.aiAcceleratorUnits * (5 + serverMetrics.aiCapabilityScore * 0.1)
    + computeUnits * (serverMetrics.aiCapabilityScore / 100) * 0.5,
    1,
  );
  const availability = round(clamp(
    95 + configuration.redundancy * 1.5 + serverMetrics.reliabilityScore * 0.03,
    0,
    99.99,
  ), 2);
  const efficiency = round(clamp(
    serverMetrics.efficiencyScore - (configuration.redundancy - 1) * 2,
    0,
    100,
  ), 1);
  const operatingCostPerDayUsd = round(
    computeUnits * serverMetrics.powerW * 0.003_744
    + configuration.storageTb * 0.015
    + configuration.networkGbps * 0.002
    + configuration.aiAcceleratorUnits * 1.1,
    2,
  );
  const capexUsd = round(
    computeUnits * (serverMetrics.unitCostUsd + 250)
    + configuration.storageTb * 100
    + configuration.networkGbps * 12
    + configuration.aiAcceleratorUnits * 7_000,
    2,
  );
  const capacityScore = round(clamp(
    20 * Math.log10(1 + computeUnits)
    + 5 * Math.log10(1 + configuration.storageTb)
    + 3 * Math.log10(1 + configuration.networkGbps)
    + 2 * Math.log10(1 + aiTflops),
    0,
    100,
  ), 1);
  const overallScore = round(clamp(
    capacityScore * 0.45 + availability * 0.3 + efficiency * 0.25,
    0,
    100,
  ), 1);

  return {
    computeUnits,
    memoryTb,
    storageTb: configuration.storageTb,
    aiTflops,
    networkGbps: configuration.networkGbps,
    availability,
    efficiency,
    operatingCostPerDayUsd,
    capexUsd,
    capacityScore,
    overallScore,
    serverMetrics,
  };
}

function emptyDeviceMetrics(): DeviceMetrics {
  return {
    performanceScore: 0,
    gamingScore: 0,
    productivityScore: 0,
    efficiencyScore: 0,
    compatibilityScore: 0,
    reliabilityScore: 0,
    osIntegrationScore: 0,
    aiCapabilityScore: 0,
    ecosystemSynergyScore: 0,
    appealScore: 0,
    unitCostUsd: 0,
    powerW: 0,
    thermalLoad: 0,
    memoryGb: 0,
    storageGb: 0,
    overallScore: 0,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
