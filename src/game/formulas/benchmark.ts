import {
  validateCpuConfiguration,
  type CpuConfiguration,
  type CpuMemoryStandard,
  type CpuSimdExtension,
} from "../models/cpu";

export type CpuBenchmarkWorkloadId = "integer" | "floating-point" | "memory";
export type GpuBenchmarkWorkloadId = "gaming" | "rendering" | "compute" | "ai";

export interface CpuBenchmarkWorkloadProfile {
  id: CpuBenchmarkWorkloadId;
  instructionsPerTaskMillions: number;
  dataPerTaskMb: number;
  workingSetGb: number;
  parallelFraction: number;
  vectorizableFraction: number;
  powerIntensity: number;
}

export interface CpuBenchmarkResult {
  workloadId: CpuBenchmarkWorkloadId;
  supported: boolean;
  requiredMemoryGb: number;
  availableMemoryGb: number;
  singleCoreInstructionThroughputMips: number;
  multiCoreInstructionThroughputMips: number;
  singleCoreTasksPerSecond: number;
  multiCoreTasksPerSecond: number;
  memoryBandwidthGbPerSecond: number;
  achievedMemoryBandwidthGbPerSecond: number;
  estimatedPowerW: number;
  estimatedTemperatureC: number;
  effectiveClockMHz: number;
  thermalThrottleFactor: number;
  thermallyThrottled: boolean;
}

export interface GpuBenchmarkConfiguration {
  computeUnits: number;
  clockMHz: number;
  operationsPerCyclePerUnit: number;
  memoryBandwidthGbPerSecond: number;
  memoryCapacityGb: number;
  tdpW: number;
}

export interface GpuBenchmarkWorkloadProfile {
  id: GpuBenchmarkWorkloadId;
  operationsPerTaskMillions: number;
  dataPerTaskMb: number;
  workingSetGb: number;
  computeUtilization: number;
  powerIntensity: number;
}

export interface GpuBenchmarkResult {
  workloadId: GpuBenchmarkWorkloadId;
  supported: boolean;
  requiredMemoryGb: number;
  availableMemoryGb: number;
  computeThroughputMops: number;
  tasksPerSecond: number;
  memoryBandwidthGbPerSecond: number;
  achievedMemoryBandwidthGbPerSecond: number;
  estimatedPowerW: number;
  estimatedTemperatureC: number;
  effectiveClockMHz: number;
  thermalThrottleFactor: number;
  thermallyThrottled: boolean;
}

export class InvalidBenchmarkInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidBenchmarkInputError";
  }
}

/** Nominal per-channel throughput assumptions, in decimal GB/s. */
export const CPU_MEMORY_BANDWIDTH_GB_PER_SECOND: Readonly<Record<CpuMemoryStandard, number>> = {
  sdr: 1.06,
  ddr: 2.13,
  ddr2: 4.26,
  ddr3: 8.53,
  ddr4: 17.07,
  ddr5: 38.4,
  lpddr: 25.6,
};

/** Synthetic, repeatable CPU tasks. Their assumptions are documented in `docs/BENCHMARK_ENGINE.md`. */
export const CPU_BENCHMARK_WORKLOADS = [
  {
    id: "integer",
    instructionsPerTaskMillions: 120,
    dataPerTaskMb: 8,
    workingSetGb: 0.25,
    parallelFraction: 0.65,
    vectorizableFraction: 0.15,
    powerIntensity: 0.55,
  },
  {
    id: "floating-point",
    instructionsPerTaskMillions: 240,
    dataPerTaskMb: 24,
    workingSetGb: 0.5,
    parallelFraction: 0.9,
    vectorizableFraction: 0.75,
    powerIntensity: 0.85,
  },
  {
    id: "memory",
    instructionsPerTaskMillions: 35,
    dataPerTaskMb: 256,
    workingSetGb: 1.5,
    parallelFraction: 0.75,
    vectorizableFraction: 0.05,
    powerIntensity: 0.45,
  },
] as const satisfies readonly CpuBenchmarkWorkloadProfile[];

/** Synthetic, repeatable GPU tasks. Their assumptions are documented in `docs/BENCHMARK_ENGINE.md`. */
export const GPU_BENCHMARK_WORKLOADS = [
  {
    id: "gaming",
    operationsPerTaskMillions: 750,
    dataPerTaskMb: 256,
    workingSetGb: 4,
    computeUtilization: 0.75,
    powerIntensity: 0.8,
  },
  {
    id: "rendering",
    operationsPerTaskMillions: 2_500,
    dataPerTaskMb: 512,
    workingSetGb: 6,
    computeUtilization: 0.9,
    powerIntensity: 0.9,
  },
  {
    id: "compute",
    operationsPerTaskMillions: 3_000,
    dataPerTaskMb: 128,
    workingSetGb: 2,
    computeUtilization: 0.95,
    powerIntensity: 0.85,
  },
  {
    id: "ai",
    operationsPerTaskMillions: 1_800,
    dataPerTaskMb: 128,
    workingSetGb: 8,
    computeUtilization: 0.95,
    powerIntensity: 0.95,
  },
] as const satisfies readonly GpuBenchmarkWorkloadProfile[];

export const GPU_BENCHMARK_LIMITS = {
  computeUnits: { min: 1, max: 4_096 },
  clockMHz: { min: 100, max: 6_000 },
  operationsPerCyclePerUnit: { min: 0.1, max: 512 },
  memoryBandwidthGbPerSecond: { min: 0.1, max: 100_000 },
  memoryCapacityGb: { min: 1, max: 4_096 },
  tdpW: { min: 1, max: 5_000 },
} as const;

export const BENCHMARK_THERMAL_MODEL = {
  ambientTemperatureC: 25,
  maximumTemperatureC: 100,
  thermalResistanceCPerW: 0.55,
} as const;

const SIMD_VECTOR_WIDTH: Readonly<Record<CpuSimdExtension, number>> = {
  mmx: 2,
  sse: 4,
  avx2: 8,
  avx512: 16,
  neon: 4,
  rvv: 8,
};

export function runCpuBenchmarks(configuration: CpuConfiguration): CpuBenchmarkResult[] {
  return CPU_BENCHMARK_WORKLOADS.map((workload) => runCpuBenchmark(configuration, workload.id));
}

export function runCpuBenchmark(
  configuration: CpuConfiguration,
  workloadId: CpuBenchmarkWorkloadId,
): CpuBenchmarkResult {
  if (!validateCpuConfiguration(configuration).valid) {
    throw new InvalidBenchmarkInputError("CPU configuration is invalid.");
  }

  const workload = CPU_BENCHMARK_WORKLOADS.find((candidate) => candidate.id === workloadId);
  if (!workload) {
    throw new InvalidBenchmarkInputError("CPU benchmark workload is unsupported.");
  }

  const memoryBandwidthGbPerSecond = CPU_MEMORY_BANDWIDTH_GB_PER_SECOND[configuration.memoryStandard]
    * configuration.memoryChannels;
  if (configuration.maxMemoryGb < workload.workingSetGb) {
    return {
      workloadId,
      supported: false,
      requiredMemoryGb: workload.workingSetGb,
      availableMemoryGb: configuration.maxMemoryGb,
      singleCoreInstructionThroughputMips: 0,
      multiCoreInstructionThroughputMips: 0,
      singleCoreTasksPerSecond: 0,
      multiCoreTasksPerSecond: 0,
      memoryBandwidthGbPerSecond: roundMetric(memoryBandwidthGbPerSecond),
      achievedMemoryBandwidthGbPerSecond: 0,
      estimatedPowerW: 0,
      estimatedTemperatureC: BENCHMARK_THERMAL_MODEL.ambientTemperatureC,
      effectiveClockMHz: configuration.clockMHz,
      thermalThrottleFactor: 1,
      thermallyThrottled: false,
    };
  }

  const thermal = estimateThermalState(configuration.tdpW, workload.powerIntensity);
  const effectiveCoreCount = configuration.coreCount + (configuration.threadCount - configuration.coreCount) * 0.25;
  const parallelFraction = workload.parallelFraction;
  const amdahlSpeedup = 1 / ((1 - parallelFraction) + parallelFraction / effectiveCoreCount);
  const vectorWidth = Math.max(1, ...configuration.simdExtensions.map((extension) => SIMD_VECTOR_WIDTH[extension]));
  const scalarInstructionFraction = 1 - workload.vectorizableFraction;
  const effectiveInstructionsPerTaskMillions = workload.instructionsPerTaskMillions
    * (scalarInstructionFraction + workload.vectorizableFraction / vectorWidth);
  const effectiveClockMHz = configuration.clockMHz * thermal.throttleFactor;
  const singleCoreInstructionThroughputMips = effectiveClockMHz * configuration.ipc;
  const multiCoreInstructionThroughputMips = singleCoreInstructionThroughputMips * amdahlSpeedup;
  const memoryLimitedTasksPerSecond = (memoryBandwidthGbPerSecond * 1_000) / workload.dataPerTaskMb;
  const singleCoreTasksPerSecond = Math.min(
    singleCoreInstructionThroughputMips / effectiveInstructionsPerTaskMillions,
    memoryLimitedTasksPerSecond,
  );
  const multiCoreTasksPerSecond = Math.min(
    multiCoreInstructionThroughputMips / effectiveInstructionsPerTaskMillions,
    memoryLimitedTasksPerSecond,
  );

  return {
    workloadId,
    supported: true,
    requiredMemoryGb: workload.workingSetGb,
    availableMemoryGb: configuration.maxMemoryGb,
    singleCoreInstructionThroughputMips: roundMetric(singleCoreInstructionThroughputMips),
    multiCoreInstructionThroughputMips: roundMetric(multiCoreInstructionThroughputMips),
    singleCoreTasksPerSecond: roundMetric(singleCoreTasksPerSecond),
    multiCoreTasksPerSecond: roundMetric(multiCoreTasksPerSecond),
    memoryBandwidthGbPerSecond: roundMetric(memoryBandwidthGbPerSecond),
    achievedMemoryBandwidthGbPerSecond: roundMetric((multiCoreTasksPerSecond * workload.dataPerTaskMb) / 1_000),
    estimatedPowerW: roundMetric(thermal.powerW),
    estimatedTemperatureC: roundMetric(thermal.temperatureC),
    effectiveClockMHz: roundMetric(effectiveClockMHz),
    thermalThrottleFactor: roundMetric(thermal.throttleFactor),
    thermallyThrottled: thermal.throttleFactor < 1,
  };
}

export function runGpuBenchmarks(configuration: GpuBenchmarkConfiguration): GpuBenchmarkResult[] {
  return GPU_BENCHMARK_WORKLOADS.map((workload) => runGpuBenchmark(configuration, workload.id));
}

export function runGpuBenchmark(
  configuration: GpuBenchmarkConfiguration,
  workloadId: GpuBenchmarkWorkloadId,
): GpuBenchmarkResult {
  assertValidGpuConfiguration(configuration);

  const workload = GPU_BENCHMARK_WORKLOADS.find((candidate) => candidate.id === workloadId);
  if (!workload) {
    throw new InvalidBenchmarkInputError("GPU benchmark workload is unsupported.");
  }

  if (configuration.memoryCapacityGb < workload.workingSetGb) {
    return {
      workloadId,
      supported: false,
      requiredMemoryGb: workload.workingSetGb,
      availableMemoryGb: configuration.memoryCapacityGb,
      computeThroughputMops: 0,
      tasksPerSecond: 0,
      memoryBandwidthGbPerSecond: roundMetric(configuration.memoryBandwidthGbPerSecond),
      achievedMemoryBandwidthGbPerSecond: 0,
      estimatedPowerW: 0,
      estimatedTemperatureC: BENCHMARK_THERMAL_MODEL.ambientTemperatureC,
      effectiveClockMHz: configuration.clockMHz,
      thermalThrottleFactor: 1,
      thermallyThrottled: false,
    };
  }

  const thermal = estimateThermalState(configuration.tdpW, workload.powerIntensity);
  const effectiveClockMHz = configuration.clockMHz * thermal.throttleFactor;
  const computeThroughputMops = configuration.computeUnits
    * effectiveClockMHz
    * configuration.operationsPerCyclePerUnit
    * workload.computeUtilization;
  const computeLimitedTasksPerSecond = computeThroughputMops / workload.operationsPerTaskMillions;
  const memoryLimitedTasksPerSecond = (configuration.memoryBandwidthGbPerSecond * 1_000) / workload.dataPerTaskMb;
  const tasksPerSecond = Math.min(computeLimitedTasksPerSecond, memoryLimitedTasksPerSecond);

  return {
    workloadId,
    supported: true,
    requiredMemoryGb: workload.workingSetGb,
    availableMemoryGb: configuration.memoryCapacityGb,
    computeThroughputMops: roundMetric(computeThroughputMops),
    tasksPerSecond: roundMetric(tasksPerSecond),
    memoryBandwidthGbPerSecond: roundMetric(configuration.memoryBandwidthGbPerSecond),
    achievedMemoryBandwidthGbPerSecond: roundMetric((tasksPerSecond * workload.dataPerTaskMb) / 1_000),
    estimatedPowerW: roundMetric(thermal.powerW),
    estimatedTemperatureC: roundMetric(thermal.temperatureC),
    effectiveClockMHz: roundMetric(effectiveClockMHz),
    thermalThrottleFactor: roundMetric(thermal.throttleFactor),
    thermallyThrottled: thermal.throttleFactor < 1,
  };
}

function estimateThermalState(tdpW: number, powerIntensity: number) {
  const demandedPowerW = tdpW * powerIntensity;
  const thermalPowerLimitW = (BENCHMARK_THERMAL_MODEL.maximumTemperatureC - BENCHMARK_THERMAL_MODEL.ambientTemperatureC)
    / BENCHMARK_THERMAL_MODEL.thermalResistanceCPerW;
  const throttleFactor = Math.min(1, thermalPowerLimitW / demandedPowerW);
  const powerW = demandedPowerW * throttleFactor;

  return {
    powerW,
    temperatureC: BENCHMARK_THERMAL_MODEL.ambientTemperatureC
      + powerW * BENCHMARK_THERMAL_MODEL.thermalResistanceCPerW,
    throttleFactor,
  };
}

function assertValidGpuConfiguration(configuration: GpuBenchmarkConfiguration): void {
  const isIntegerWithin = (value: number, min: number, max: number) =>
    Number.isInteger(value) && value >= min && value <= max;
  const isNumberWithin = (value: number, min: number, max: number) =>
    Number.isFinite(value) && value >= min && value <= max;

  if (
    !isIntegerWithin(configuration.computeUnits, GPU_BENCHMARK_LIMITS.computeUnits.min, GPU_BENCHMARK_LIMITS.computeUnits.max)
    || !isIntegerWithin(configuration.clockMHz, GPU_BENCHMARK_LIMITS.clockMHz.min, GPU_BENCHMARK_LIMITS.clockMHz.max)
    || !isNumberWithin(
      configuration.operationsPerCyclePerUnit,
      GPU_BENCHMARK_LIMITS.operationsPerCyclePerUnit.min,
      GPU_BENCHMARK_LIMITS.operationsPerCyclePerUnit.max,
    )
    || !isNumberWithin(
      configuration.memoryBandwidthGbPerSecond,
      GPU_BENCHMARK_LIMITS.memoryBandwidthGbPerSecond.min,
      GPU_BENCHMARK_LIMITS.memoryBandwidthGbPerSecond.max,
    )
    || !isNumberWithin(
      configuration.memoryCapacityGb,
      GPU_BENCHMARK_LIMITS.memoryCapacityGb.min,
      GPU_BENCHMARK_LIMITS.memoryCapacityGb.max,
    )
    || !isIntegerWithin(configuration.tdpW, GPU_BENCHMARK_LIMITS.tdpW.min, GPU_BENCHMARK_LIMITS.tdpW.max)
  ) {
    throw new InvalidBenchmarkInputError("GPU benchmark configuration is outside the supported limits.");
  }
}

function roundMetric(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
