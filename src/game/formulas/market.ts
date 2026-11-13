import {
  runCpuBenchmarks,
  type CpuBenchmarkResult,
} from "./benchmark";
import type { CpuConfiguration } from "../models/cpu";
import { createDefaultCpuConfiguration } from "../models/cpu";
import { daysBetween } from "../models/date";
import type {
  CompetitorMarketState,
  CompetitorProductDefinition,
  MarketSegmentDefinition,
} from "../models/market";

export const PLAYER_APPEAL_BASE = 0.35;

export const MANUFACTURING_MODEL = {
  referenceWaferCostUsd: 1_200,
  referenceProcessNodeNm: 350,
  waferCostExponent: 0.45,
  minimumWaferCostUsd: 300,
  maximumWaferCostUsd: 60_000,
  diesPerWaferUtilization: 0.9,
  baseDefectDensity: 0.006,
  advancedNodeDefectFactor: 1.15,
  packageBaseUsd: 5,
  packageAreaFactor: 0.18,
  testBaseUsd: 1,
  testAreaFactor: 0.015,
  logisticsUsd: 1.2,
  minimumUnitCostUsd: 3,
} as const;

export interface ManufacturingEstimate {
  unitCostUsd: number;
  waferCostUsd: number;
  waferDiameterMm: number;
  grossDiesPerWafer: number;
  dieYield: number;
  packageCostUsd: number;
  testCostUsd: number;
  logisticsCostUsd: number;
}

export interface SiliconDieEstimate {
  waferCostUsd: number;
  waferDiameterMm: number;
  grossDiesPerWafer: number;
  dieYield: number;
  dieCostUsd: number;
}

export interface ProductAppealInput {
  segment: MarketSegmentDefinition;
  configuration: CpuConfiguration;
  performanceScore: number;
  priceUsd: number;
  releaseDate: string;
  date: string;
  reputation: number;
  marketingBudgetUsdPerDay: number;
}

export function calculateCpuMarketPerformanceScore(configuration: CpuConfiguration): number {
  return roundScore(calculateRawPerformanceScore(configuration) / DEFAULT_CPU_RAW_SCORE);
}

export function estimateManufacturingCost(configuration: CpuConfiguration): ManufacturingEstimate {
  const silicon = estimateSiliconDie(configuration.processNodeNm, configuration.dieAreaMm2);
  const packageCostUsd = MANUFACTURING_MODEL.packageBaseUsd
    + Math.sqrt(configuration.dieAreaMm2) * MANUFACTURING_MODEL.packageAreaFactor;
  const testCostUsd = MANUFACTURING_MODEL.testBaseUsd
    + configuration.dieAreaMm2 * MANUFACTURING_MODEL.testAreaFactor;
  const unitCostUsd = roundUsd(Math.max(
    MANUFACTURING_MODEL.minimumUnitCostUsd,
    silicon.dieCostUsd + packageCostUsd + testCostUsd + MANUFACTURING_MODEL.logisticsUsd,
  ));

  return {
    unitCostUsd,
    waferCostUsd: roundUsd(silicon.waferCostUsd),
    waferDiameterMm: silicon.waferDiameterMm,
    grossDiesPerWafer: silicon.grossDiesPerWafer,
    dieYield: roundScore(silicon.dieYield),
    packageCostUsd: roundUsd(packageCostUsd),
    testCostUsd: roundUsd(testCostUsd),
    logisticsCostUsd: MANUFACTURING_MODEL.logisticsUsd,
  };
}

export function estimateSiliconDie(processNodeNm: number, dieAreaMm2: number): SiliconDieEstimate {
  const nodeNm = Math.max(processNodeNm, 1);
  const waferCostUsd = clamp(
    MANUFACTURING_MODEL.referenceWaferCostUsd
      * Math.pow(MANUFACTURING_MODEL.referenceProcessNodeNm / nodeNm, MANUFACTURING_MODEL.waferCostExponent),
    MANUFACTURING_MODEL.minimumWaferCostUsd,
    MANUFACTURING_MODEL.maximumWaferCostUsd,
  );
  const waferDiameterMm = nodeNm > 250 ? 150 : nodeNm > 90 ? 200 : 300;
  const waferAreaMm2 = Math.PI * Math.pow(waferDiameterMm / 2, 2);
  const grossDiesPerWafer = Math.max(1, Math.floor(
    (waferAreaMm2 / Math.max(dieAreaMm2, 1)) * MANUFACTURING_MODEL.diesPerWaferUtilization,
  ));
  const defectFactor = nodeNm <= 65 ? MANUFACTURING_MODEL.advancedNodeDefectFactor : 1;
  const dieYield = clamp(
    0.98 / (1 + dieAreaMm2 * MANUFACTURING_MODEL.baseDefectDensity * defectFactor),
    0.12,
    0.98,
  );

  return {
    waferCostUsd,
    waferDiameterMm,
    grossDiesPerWafer,
    dieYield,
    dieCostUsd: waferCostUsd / (grossDiesPerWafer * dieYield),
  };
}

export function calculateSuggestedPrice(
  unitCostUsd: number,
  segment: MarketSegmentDefinition,
): number {
  const target = Math.max(unitCostUsd * 2.5, segment.referencePriceUsd * 0.9);
  return Math.max(5, Math.round(target / 5) * 5);
}

export function calculateGrossMargin(priceUsd: number, unitCostUsd: number): number {
  if (priceUsd <= 0) {
    return 0;
  }
  return (priceUsd - unitCostUsd) / priceUsd;
}

export function getSegmentDailyDemand(segment: MarketSegmentDefinition, date: string): number {
  const elapsedDays = Math.max(0, daysBetween("1995-01-01", date));
  return Math.max(0, Math.round(
    segment.baseDailyUnits * Math.pow(1 + segment.annualGrowthRate, elapsedDays / 365.25),
  ));
}

export function calculatePriceAppealFactor(priceUsd: number, segment: MarketSegmentDefinition): number {
  return clamp(
    Math.pow(segment.referencePriceUsd / Math.max(priceUsd, 1), segment.priceElasticity),
    0.08,
    5,
  );
}

export function calculatePerformanceAppealFactor(
  performanceScore: number,
  segment: MarketSegmentDefinition,
): number {
  return clamp(
    Math.pow(performanceScore / segment.referencePerformanceScore, segment.performanceElasticity),
    0.15,
    3,
  );
}

export function calculateReputationAppealFactor(reputation: number): number {
  return clamp(0.5 + reputation / 100, 0.5, 1.5);
}

export function calculateMarketingAppealFactor(marketingBudgetUsdPerDay: number): number {
  return 1 + Math.min(0.6, Math.sqrt(Math.max(0, marketingBudgetUsdPerDay) / 1_000) * 0.3);
}

export function calculateLaunchRamp(releaseDate: string, date: string): number {
  const days = Math.max(0, daysBetween(releaseDate, date));
  return 0.15 + 0.85 * Math.min(1, days / 60);
}

export function calculateFreshnessFactor(releaseDate: string, date: string): number {
  const days = Math.max(0, daysBetween(releaseDate, date));
  return clamp(1.15 - days / 2_500, 0.55, 1.15);
}

export function calculateProductAppeal(input: ProductAppealInput): number {
  return PLAYER_APPEAL_BASE
    * calculatePriceAppealFactor(input.priceUsd, input.segment)
    * calculatePerformanceAppealFactor(input.performanceScore, input.segment)
    * calculateReputationAppealFactor(input.reputation)
    * calculateMarketingAppealFactor(input.marketingBudgetUsdPerDay)
    * input.segment.isaAppealMultipliers[input.configuration.isa]
    * calculateLaunchRamp(input.releaseDate, input.date)
    * calculateFreshnessFactor(input.releaseDate, input.date);
}

export function calculateCompetitorProductAppeal(
  segment: MarketSegmentDefinition,
  product: CompetitorProductDefinition,
  competitor: CompetitorMarketState,
): number {
  return product.appealStrength
    * calculatePriceAppealFactor(product.basePriceUsd * competitor.priceMultiplier, segment)
    * calculatePerformanceAppealFactor(
      product.basePerformanceScore * competitor.performanceMultiplier,
      segment,
    )
    * competitor.marketingMultiplier;
}

function calculateRawPerformanceScore(configuration: CpuConfiguration): number {
  const benchmarks = runCpuBenchmarks(configuration);
  const integer = getBenchmark(benchmarks, "integer");
  const floatingPoint = getBenchmark(benchmarks, "floating-point");
  const memory = getBenchmark(benchmarks, "memory");

  return integer * 0.35 + floatingPoint * 0.45 + memory * 0.2;
}

function getBenchmark(
  benchmarks: CpuBenchmarkResult[],
  workloadId: CpuBenchmarkResult["workloadId"],
): number {
  return benchmarks.find((benchmark) => benchmark.workloadId === workloadId)?.multiCoreTasksPerSecond ?? 0;
}

const DEFAULT_CPU_RAW_SCORE = Math.max(1e-9, calculateRawPerformanceScore(createDefaultCpuConfiguration()));

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundUsd(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundScore(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}
