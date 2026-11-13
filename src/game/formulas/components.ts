import { runGpuBenchmarks } from "./benchmark";
import { estimateSiliconDie } from "./market";
import {
  createDefaultComponentConfiguration,
  type AiAcceleratorConfiguration,
  type ComponentConfiguration,
  type ComponentType,
  type GpuConfiguration,
  type MotherboardConfiguration,
  type NetworkingConfiguration,
  type RamConfiguration,
  type SsdConfiguration,
} from "../models/components";
import { daysBetween } from "../models/date";

export interface ComponentMarketProfile {
  type: ComponentType;
  baseDailyUnits: number;
  annualGrowthRate: number;
  referencePriceUsd: number;
  referencePerformanceScore: number;
  priceElasticity: number;
  performanceElasticity: number;
  competitorAppeal: number;
}

export const COMPONENT_MARKET_PROFILES: readonly ComponentMarketProfile[] = [
  {
    type: "gpu",
    baseDailyUnits: 1_800,
    annualGrowthRate: 0.065,
    referencePriceUsd: 300,
    referencePerformanceScore: 1,
    priceElasticity: 1.1,
    performanceElasticity: 0.55,
    competitorAppeal: 50,
  },
  {
    type: "ram",
    baseDailyUnits: 3_500,
    annualGrowthRate: 0.04,
    referencePriceUsd: 120,
    referencePerformanceScore: 1,
    priceElasticity: 1.2,
    performanceElasticity: 0.35,
    competitorAppeal: 45,
  },
  {
    type: "ssd",
    baseDailyUnits: 1_600,
    annualGrowthRate: 0.08,
    referencePriceUsd: 180,
    referencePerformanceScore: 1,
    priceElasticity: 1.15,
    performanceElasticity: 0.45,
    competitorAppeal: 40,
  },
  {
    type: "motherboard",
    baseDailyUnits: 1_400,
    annualGrowthRate: 0.04,
    referencePriceUsd: 160,
    referencePerformanceScore: 1,
    priceElasticity: 1.05,
    performanceElasticity: 0.4,
    competitorAppeal: 35,
  },
  {
    type: "ai-accelerator",
    baseDailyUnits: 200,
    annualGrowthRate: 0.12,
    referencePriceUsd: 4_000,
    referencePerformanceScore: 1,
    priceElasticity: 0.8,
    performanceElasticity: 0.7,
    competitorAppeal: 30,
  },
  {
    type: "networking",
    baseDailyUnits: 700,
    annualGrowthRate: 0.06,
    referencePriceUsd: 240,
    referencePerformanceScore: 1,
    priceElasticity: 0.95,
    performanceElasticity: 0.45,
    competitorAppeal: 25,
  },
];

export interface ComponentManufacturingEstimate {
  unitCostUsd: number;
  siliconUsd: number;
  memoryUsd: number;
  boardUsd: number;
  packagingUsd: number;
  testUsd: number;
  logisticsUsd: number;
  dieYield: number;
  grossDiesPerWafer: number;
}

const COMPONENT_MANUFACTURING = {
  logisticsUsd: 1.2,
  minimumUnitCostUsd: 5,
  gpuMemoryUsdPerGb: 1.2,
  aiMemoryUsdPerGb: 9.5,
  gpuBoardUsd: 15,
  aiBoardUsd: 40,
  gpuPackagingUsd: 5,
  aiPackagingUsd: 18,
  ramBaseUsd: 8,
  ramMemoryUsdPerGb: 1.4,
  ramSpeedCostFactor: 0.0004,
  ramChannelUsd: 2,
  ssdBaseUsd: 10,
  ssdCapacityUsdPerGb: 0.03,
  ssdControllerUsd: 6,
  ssdSataUsd: 4,
  ssdNvmeUsd: 12,
  motherboardBaseUsd: 18,
  motherboardLaneUsd: 0.45,
  motherboardPcieGenerationUsd: 5,
  motherboardM2Usd: 2,
  motherboardSataUsd: 0.5,
  motherboardSlotUsd: 1.2,
  motherboardNetworkUsd: 0.4,
  networkingBaseUsd: 12,
  networkingPortSpeedUsd: 0.8,
  networkingFiberUsd: 8,
  networkingInfinibandUsd: 35,
  networkingSpeedUsd: 0.3,
} as const;

export function calculateComponentPerformanceScore(configuration: ComponentConfiguration): number {
  return roundScore(rawPerformanceScore(configuration) / referenceRawScore(configuration.type));
}

export function estimateComponentManufacturingCost(
  configuration: ComponentConfiguration,
): ComponentManufacturingEstimate {
  switch (configuration.type) {
    case "gpu":
    case "ai-accelerator": {
      const silicon = estimateSiliconDie(configuration.processNodeNm, configuration.dieAreaMm2);
      const memoryUsd = configuration.memoryCapacityGb * (
        configuration.type === "gpu"
          ? COMPONENT_MANUFACTURING.gpuMemoryUsdPerGb
          : COMPONENT_MANUFACTURING.aiMemoryUsdPerGb
      );
      const boardUsd =
        configuration.type === "gpu"
          ? COMPONENT_MANUFACTURING.gpuBoardUsd
          : COMPONENT_MANUFACTURING.aiBoardUsd;
      const packagingUsd =
        configuration.type === "gpu"
          ? COMPONENT_MANUFACTURING.gpuPackagingUsd
          : COMPONENT_MANUFACTURING.aiPackagingUsd;
      const testUsd = 1 + configuration.dieAreaMm2 * 0.015;
      const unitCostUsd = roundUsd(Math.max(
        COMPONENT_MANUFACTURING.minimumUnitCostUsd,
        silicon.dieCostUsd + memoryUsd + boardUsd + packagingUsd + testUsd
          + COMPONENT_MANUFACTURING.logisticsUsd,
      ));

      return {
        unitCostUsd,
        siliconUsd: roundUsd(silicon.dieCostUsd),
        memoryUsd: roundUsd(memoryUsd),
        boardUsd,
        packagingUsd,
        testUsd: roundUsd(testUsd),
        logisticsUsd: COMPONENT_MANUFACTURING.logisticsUsd,
        dieYield: silicon.dieYield,
        grossDiesPerWafer: silicon.grossDiesPerWafer,
      };
    }
    case "ram": {
      const memoryUsd = configuration.capacityGb * COMPONENT_MANUFACTURING.ramMemoryUsdPerGb
        + configuration.capacityGb * configuration.speedMTs * COMPONENT_MANUFACTURING.ramSpeedCostFactor;
      const boardUsd = COMPONENT_MANUFACTURING.ramBaseUsd
        + configuration.channels * COMPONENT_MANUFACTURING.ramChannelUsd;
      const testUsd = 0.8 + configuration.capacityGb * 0.02;
      const unitCostUsd = roundUsd(Math.max(
        COMPONENT_MANUFACTURING.minimumUnitCostUsd,
        memoryUsd + boardUsd + testUsd + COMPONENT_MANUFACTURING.logisticsUsd,
      ));

      return {
        unitCostUsd,
        siliconUsd: 0,
        memoryUsd: roundUsd(memoryUsd),
        boardUsd: roundUsd(boardUsd),
        packagingUsd: 0,
        testUsd: roundUsd(testUsd),
        logisticsUsd: COMPONENT_MANUFACTURING.logisticsUsd,
        dieYield: 0,
        grossDiesPerWafer: 0,
      };
    }
    case "ssd": {
      const memoryUsd = configuration.capacityGb * COMPONENT_MANUFACTURING.ssdCapacityUsdPerGb;
      const controllerUsd = COMPONENT_MANUFACTURING.ssdControllerUsd
        + (configuration.interface === "nvme" ? 6 : 0);
      const boardUsd = COMPONENT_MANUFACTURING.ssdBaseUsd
        + (configuration.interface === "nvme"
          ? COMPONENT_MANUFACTURING.ssdNvmeUsd
          : COMPONENT_MANUFACTURING.ssdSataUsd);
      const testUsd = 1 + configuration.capacityGb * 0.001;
      const unitCostUsd = roundUsd(Math.max(
        COMPONENT_MANUFACTURING.minimumUnitCostUsd,
        memoryUsd + controllerUsd + boardUsd + testUsd + COMPONENT_MANUFACTURING.logisticsUsd,
      ));

      return {
        unitCostUsd,
        siliconUsd: roundUsd(controllerUsd),
        memoryUsd: roundUsd(memoryUsd),
        boardUsd: roundUsd(boardUsd),
        packagingUsd: 0,
        testUsd: roundUsd(testUsd),
        logisticsUsd: COMPONENT_MANUFACTURING.logisticsUsd,
        dieYield: 0,
        grossDiesPerWafer: 0,
      };
    }
    case "motherboard": {
      const boardUsd = COMPONENT_MANUFACTURING.motherboardBaseUsd
        + configuration.pcieLanes * COMPONENT_MANUFACTURING.motherboardLaneUsd
        + configuration.pcieGeneration * COMPONENT_MANUFACTURING.motherboardPcieGenerationUsd
        + configuration.m2Slots * COMPONENT_MANUFACTURING.motherboardM2Usd
        + configuration.sataPorts * COMPONENT_MANUFACTURING.motherboardSataUsd
        + configuration.memorySlots * COMPONENT_MANUFACTURING.motherboardSlotUsd
        + configuration.networkGbps * COMPONENT_MANUFACTURING.motherboardNetworkUsd;
      const testUsd = 1.5 + configuration.pcieLanes * 0.02;
      const unitCostUsd = roundUsd(Math.max(
        COMPONENT_MANUFACTURING.minimumUnitCostUsd,
        boardUsd + testUsd + COMPONENT_MANUFACTURING.logisticsUsd,
      ));

      return {
        unitCostUsd,
        siliconUsd: 0,
        memoryUsd: 0,
        boardUsd: roundUsd(boardUsd),
        packagingUsd: 0,
        testUsd: roundUsd(testUsd),
        logisticsUsd: COMPONENT_MANUFACTURING.logisticsUsd,
        dieYield: 0,
        grossDiesPerWafer: 0,
      };
    }
    case "networking": {
      const boardUsd = COMPONENT_MANUFACTURING.networkingBaseUsd
        + configuration.ports * configuration.speedGbps
          * COMPONENT_MANUFACTURING.networkingPortSpeedUsd
        + configuration.speedGbps * COMPONENT_MANUFACTURING.networkingSpeedUsd
        + (configuration.medium === "fiber" ? COMPONENT_MANUFACTURING.networkingFiberUsd : 0)
        + (configuration.standard === "infiniband" ? COMPONENT_MANUFACTURING.networkingInfinibandUsd : 0);
      const testUsd = 0.8 + configuration.ports * 0.15;
      const unitCostUsd = roundUsd(Math.max(
        COMPONENT_MANUFACTURING.minimumUnitCostUsd,
        boardUsd + testUsd + COMPONENT_MANUFACTURING.logisticsUsd,
      ));

      return {
        unitCostUsd,
        siliconUsd: 0,
        memoryUsd: 0,
        boardUsd: roundUsd(boardUsd),
        packagingUsd: 0,
        testUsd: roundUsd(testUsd),
        logisticsUsd: COMPONENT_MANUFACTURING.logisticsUsd,
        dieYield: 0,
        grossDiesPerWafer: 0,
      };
    }
  }
}

export function calculateSuggestedComponentPrice(
  unitCostUsd: number,
  profile: ComponentMarketProfile,
): number {
  const target = Math.max(unitCostUsd * 2.5, profile.referencePriceUsd * 0.9);
  return Math.max(5, Math.round(target / 5) * 5);
}

export function calculateComponentGrossMargin(priceUsd: number, unitCostUsd: number): number {
  if (priceUsd <= 0) {
    return 0;
  }
  return (priceUsd - unitCostUsd) / priceUsd;
}

export function getComponentMarketProfile(type: ComponentType): ComponentMarketProfile {
  const profile = COMPONENT_MARKET_PROFILES.find((candidate) => candidate.type === type);
  if (!profile) {
    throw new Error(`Unknown component market profile: ${type}`);
  }
  return profile;
}

export function getComponentDailyDemand(profile: ComponentMarketProfile, date: string): number {
  const elapsedDays = Math.max(0, daysBetween("1995-01-01", date));
  return Math.max(0, Math.round(
    profile.baseDailyUnits * Math.pow(1 + profile.annualGrowthRate, elapsedDays / 365.25),
  ));
}

export function calculateComponentPriceAppealFactor(
  priceUsd: number,
  profile: ComponentMarketProfile,
): number {
  return clamp(
    Math.pow(profile.referencePriceUsd / Math.max(priceUsd, 1), profile.priceElasticity),
    0.08,
    5,
  );
}

export function calculateComponentPerformanceAppealFactor(
  performanceScore: number,
  profile: ComponentMarketProfile,
): number {
  return clamp(
    Math.pow(performanceScore / profile.referencePerformanceScore, profile.performanceElasticity),
    0.15,
    3,
  );
}

export function calculateComponentAppeal(input: {
  configuration: ComponentConfiguration;
  performanceScore: number;
  priceUsd: number;
  releaseDate: string;
  date: string;
  reputation: number;
  marketingBudgetUsdPerDay: number;
}): number {
  const profile = getComponentMarketProfile(input.configuration.type);
  const days = Math.max(0, daysBetween(input.releaseDate, input.date));
  const launchRamp = 0.2 + 0.8 * Math.min(1, days / 45);
  const freshness = clamp(1.1 - days / 2_000, 0.6, 1.1);
  const reputation = clamp(0.5 + input.reputation / 100, 0.5, 1.5);
  const marketing = 1 + Math.min(
    0.6,
    Math.sqrt(Math.max(0, input.marketingBudgetUsdPerDay) / 1_000) * 0.3,
  );

  return 0.35
    * calculateComponentPriceAppealFactor(input.priceUsd, profile)
    * calculateComponentPerformanceAppealFactor(input.performanceScore, profile)
    * reputation
    * marketing
    * launchRamp
    * freshness;
}

export interface ComponentMarketEstimate {
  marketDemandUnits: number;
  unitsPerDay: number;
  share: number;
  unitCostUsd: number;
  margin: number;
  revenuePerDayUsd: number;
}

export function estimateComponentMarket(input: {
  configuration: ComponentConfiguration;
  priceUsd: number;
  releaseDate: string;
  date: string;
  reputation: number;
  marketingBudgetUsdPerDay: number;
  siblingAppeals?: number;
}): ComponentMarketEstimate {
  const profile = getComponentMarketProfile(input.configuration.type);
  const appeal = calculateComponentAppeal({
    configuration: input.configuration,
    performanceScore: calculateComponentPerformanceScore(input.configuration),
    priceUsd: input.priceUsd,
    releaseDate: input.releaseDate,
    date: input.date,
    reputation: input.reputation,
    marketingBudgetUsdPerDay: input.marketingBudgetUsdPerDay,
  });
  const totalAppeal = appeal + profile.competitorAppeal + (input.siblingAppeals ?? 0);
  const marketDemandUnits = getComponentDailyDemand(profile, input.date);
  const share = totalAppeal > 0 ? appeal / totalAppeal : 0;
  const unitsPerDay = Math.floor(marketDemandUnits * share);
  const manufacturingCost = estimateComponentManufacturingCost(input.configuration);

  return {
    marketDemandUnits,
    unitsPerDay,
    share,
    unitCostUsd: manufacturingCost.unitCostUsd,
    margin: calculateComponentGrossMargin(input.priceUsd, manufacturingCost.unitCostUsd),
    revenuePerDayUsd: roundUsd(unitsPerDay * input.priceUsd),
  };
}

function rawPerformanceScore(configuration: ComponentConfiguration): number {
  switch (configuration.type) {
    case "gpu":
      return gpuCompositeScore(configuration);
    case "ram":
      return ramScore(configuration);
    case "ssd":
      return ssdScore(configuration);
    case "motherboard":
      return motherboardScore(configuration);
    case "ai-accelerator":
      return aiScore(configuration);
    case "networking":
      return networkingScore(configuration);
  }
}

function gpuCompositeScore(configuration: GpuConfiguration): number {
  const benchmarks = runGpuBenchmarks(configuration);
  const get = (workloadId: (typeof benchmarks)[number]["workloadId"]) =>
    benchmarks.find((benchmark) => benchmark.workloadId === workloadId)?.tasksPerSecond ?? 0;

  return get("gaming") * 0.35
    + get("rendering") * 0.3
    + get("compute") * 0.2
    + get("ai") * 0.15;
}

function ramScore(configuration: RamConfiguration): number {
  return configuration.capacityGb
    * (configuration.speedMTs / 100)
    * configuration.channels
    / Math.max(1, configuration.latencyCl);
}

function ssdScore(configuration: SsdConfiguration): number {
  const sequential = (configuration.sequentialReadMbps + configuration.sequentialWriteMbps) / 2;
  return sequential
    + (configuration.randomReadIops / 1_000) * 2
    + configuration.capacityGb * 0.05
    + configuration.enduranceTbw * 0.2;
}

function motherboardScore(configuration: MotherboardConfiguration): number {
  return configuration.maxMemoryGb * 2
    + configuration.memorySlots * 4
    + configuration.pcieLanes * 3
    + configuration.pcieGeneration * 10
    + configuration.m2Slots * 15
    + configuration.sataPorts * 2
    + configuration.networkGbps * 3;
}

function aiScore(configuration: AiAcceleratorConfiguration): number {
  const benchmarks = runGpuBenchmarks(configuration);
  const aiTasks = benchmarks.find((benchmark) => benchmark.workloadId === "ai")?.tasksPerSecond ?? 0;
  const precisionMultiplier = 1 + Math.max(0, configuration.precisions.length - 1) * 0.15;
  return aiTasks * precisionMultiplier;
}

function networkingScore(configuration: NetworkingConfiguration): number {
  return configuration.ports
    * configuration.speedGbps
    * (configuration.standard === "infiniband" ? 4 : 1)
    * (configuration.medium === "fiber" ? 1.2 : 1);
}

const REFERENCE_RAW_SCORES: Record<ComponentType, number> = {
  gpu: Math.max(1e-9, rawPerformanceScore(createDefaultComponentConfiguration("gpu"))),
  ram: Math.max(1e-9, rawPerformanceScore(createDefaultComponentConfiguration("ram"))),
  ssd: Math.max(1e-9, rawPerformanceScore(createDefaultComponentConfiguration("ssd"))),
  motherboard: Math.max(1e-9, rawPerformanceScore(createDefaultComponentConfiguration("motherboard"))),
  "ai-accelerator": Math.max(1e-9, rawPerformanceScore(createDefaultComponentConfiguration("ai-accelerator"))),
  networking: Math.max(1e-9, rawPerformanceScore(createDefaultComponentConfiguration("networking"))),
};

function referenceRawScore(type: ComponentType): number {
  return REFERENCE_RAW_SCORES[type];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundUsd(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundScore(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}
