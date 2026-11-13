import { describe, expect, it } from "vitest";
import { createDefaultCpuConfiguration } from "../models/cpu";
import {
  BENCHMARK_THERMAL_MODEL,
  CPU_MEMORY_BANDWIDTH_GB_PER_SECOND,
  GPU_BENCHMARK_WORKLOADS,
  InvalidBenchmarkInputError,
  runCpuBenchmark,
  runCpuBenchmarks,
  runGpuBenchmark,
  runGpuBenchmarks,
  type GpuBenchmarkConfiguration,
} from "./benchmark";

const baselineGpu: GpuBenchmarkConfiguration = {
  computeUnits: 128,
  clockMHz: 1_200,
  operationsPerCyclePerUnit: 64,
  memoryBandwidthGbPerSecond: 1_000,
  memoryCapacityGb: 16,
  tdpW: 300,
};

describe("CPU benchmark formulas", () => {
  it("produce deterministic, type-specific results from one configuration", () => {
    const configuration = createDefaultCpuConfiguration();
    const firstRun = runCpuBenchmarks(configuration);
    const secondRun = runCpuBenchmarks(configuration);

    expect(secondRun).toEqual(firstRun);
    expect(firstRun.map((result) => result.workloadId)).toEqual([
      "integer",
      "floating-point",
      "memory",
    ]);
    expect(firstRun[0]?.singleCoreTasksPerSecond).toBeGreaterThan(
      firstRun[1]?.singleCoreTasksPerSecond ?? Number.POSITIVE_INFINITY,
    );
    expect(firstRun[2]).toMatchObject({
      supported: false,
      requiredMemoryGb: 1.5,
      availableMemoryGb: 1,
      multiCoreTasksPerSecond: 0,
    });
    expect(firstRun[0]?.memoryBandwidthGbPerSecond).toBe(CPU_MEMORY_BANDWIDTH_GB_PER_SECOND.sdr);
  });

  it("uses Amdahl scaling rather than multiplying linearly by core count", () => {
    const result = runCpuBenchmark({
      ...createDefaultCpuConfiguration(),
      coreCount: 4,
      threadCount: 4,
    }, "integer");
    const expectedSpeedup = 1 / ((1 - 0.65) + 0.65 / 4);

    expect(result.multiCoreInstructionThroughputMips / result.singleCoreInstructionThroughputMips)
      .toBeCloseTo(expectedSpeedup, 6);
    expect(result.multiCoreInstructionThroughputMips / result.singleCoreInstructionThroughputMips)
      .toBeLessThan(4);
  });

  it("accounts for memory bandwidth and SIMD support", () => {
    const base = {
      ...createDefaultCpuConfiguration(),
      coreCount: 8,
      threadCount: 8,
      clockMHz: 5_000,
      ipc: 8,
      maxMemoryGb: 2,
    };
    const singleChannelSdr = runCpuBenchmark({ ...base, memoryStandard: "sdr" }, "integer");
    const dualChannelDdr5 = runCpuBenchmark({
      ...base,
      memoryStandard: "ddr5",
      memoryChannels: 2,
    }, "integer");
    const scalarFloat = runCpuBenchmark(createDefaultCpuConfiguration(), "floating-point");
    const vectorFloat = runCpuBenchmark({
      ...createDefaultCpuConfiguration(),
      simdExtensions: ["avx2"],
    }, "floating-point");

    expect(dualChannelDdr5.memoryBandwidthGbPerSecond).toBe(76.8);
    expect(dualChannelDdr5.multiCoreTasksPerSecond).toBeGreaterThan(singleChannelSdr.multiCoreTasksPerSecond);
    expect(vectorFloat.singleCoreTasksPerSecond).toBeGreaterThan(scalarFloat.singleCoreTasksPerSecond);
  });

  it("caps power and frequency at the thermal boundary", () => {
    const result = runCpuBenchmark({
      ...createDefaultCpuConfiguration(),
      tdpW: 1_500,
    }, "floating-point");
    const powerLimitW = (BENCHMARK_THERMAL_MODEL.maximumTemperatureC - BENCHMARK_THERMAL_MODEL.ambientTemperatureC)
      / BENCHMARK_THERMAL_MODEL.thermalResistanceCPerW;

    expect(result.thermallyThrottled).toBe(true);
    expect(result.thermalThrottleFactor).toBeLessThan(1);
    expect(result.estimatedPowerW).toBeCloseTo(powerLimitW, 5);
    expect(result.estimatedTemperatureC).toBeCloseTo(BENCHMARK_THERMAL_MODEL.maximumTemperatureC, 5);
    expect(result.effectiveClockMHz).toBeCloseTo(100 * result.thermalThrottleFactor, 4);
  });

  it("rejects an invalid CPU configuration instead of returning a score", () => {
    expect(() => runCpuBenchmark({
      ...createDefaultCpuConfiguration(),
      clockMHz: 0,
    }, "integer")).toThrowError(InvalidBenchmarkInputError);
  });
});

describe("GPU benchmark formulas", () => {
  it("produce deterministic results for distinct gaming, rendering, compute and AI workloads", () => {
    const firstRun = runGpuBenchmarks(baselineGpu);
    const secondRun = runGpuBenchmarks(baselineGpu);

    expect(secondRun).toEqual(firstRun);
    expect(firstRun.map((result) => result.workloadId)).toEqual([
      "gaming",
      "rendering",
      "compute",
      "ai",
    ]);
    expect(firstRun.every((result) => result.supported)).toBe(true);
    expect(new Set(firstRun.map((result) => result.tasksPerSecond)).size).toBe(GPU_BENCHMARK_WORKLOADS.length);
  });

  it("marks workloads unsupported when their working set exceeds VRAM", () => {
    const result = runGpuBenchmark({ ...baselineGpu, memoryCapacityGb: 4 }, "rendering");

    expect(result).toMatchObject({
      supported: false,
      requiredMemoryGb: 6,
      availableMemoryGb: 4,
      tasksPerSecond: 0,
      estimatedPowerW: 0,
    });
  });

  it("limits GPU throughput by memory bandwidth and models thermal throttling", () => {
    const memoryLimited = runGpuBenchmark({
      ...baselineGpu,
      memoryBandwidthGbPerSecond: 10,
    }, "gaming");
    const expectedMemoryLimit = (10 * 1_000) / 256;
    const thermallyLimited = runGpuBenchmark({
      ...baselineGpu,
      tdpW: 5_000,
    }, "rendering");

    expect(memoryLimited.tasksPerSecond).toBe(expectedMemoryLimit);
    expect(memoryLimited.achievedMemoryBandwidthGbPerSecond).toBe(10);
    expect(thermallyLimited.thermallyThrottled).toBe(true);
    expect(thermallyLimited.estimatedTemperatureC)
      .toBeCloseTo(BENCHMARK_THERMAL_MODEL.maximumTemperatureC, 5);
  });

  it("accepts bounded edge values and rejects invalid inputs", () => {
    const minimum: GpuBenchmarkConfiguration = {
      computeUnits: 1,
      clockMHz: 100,
      operationsPerCyclePerUnit: 0.1,
      memoryBandwidthGbPerSecond: 0.1,
      memoryCapacityGb: 1,
      tdpW: 1,
    };
    const maximum: GpuBenchmarkConfiguration = {
      computeUnits: 4_096,
      clockMHz: 6_000,
      operationsPerCyclePerUnit: 512,
      memoryBandwidthGbPerSecond: 100_000,
      memoryCapacityGb: 4_096,
      tdpW: 5_000,
    };

    expect(runGpuBenchmark(minimum, "gaming").supported).toBe(false);
    expect(Number.isFinite(runGpuBenchmark(maximum, "ai").tasksPerSecond)).toBe(true);
    expect(() => runGpuBenchmark({ ...minimum, computeUnits: 0 }, "gaming"))
      .toThrowError(InvalidBenchmarkInputError);
    expect(() => runGpuBenchmark(baselineGpu, "unknown" as never))
      .toThrowError(InvalidBenchmarkInputError);
  });
});
