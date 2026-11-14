import { describe, expect, it } from "vitest";
import {
  createDefaultComponentConfiguration,
  type GpuConfiguration,
} from "./components";
import { buildGpuVisualModel, getGpuHeatTier } from "./gpu-board";

function gpu(overrides: Partial<GpuConfiguration> = {}): GpuConfiguration {
  return {
    ...(createDefaultComponentConfiguration("gpu") as GpuConfiguration),
    ...overrides,
  };
}

function moduleKinds(configuration: GpuConfiguration): string[] {
  return buildGpuVisualModel(configuration).board.modules.map((module) => module.kind);
}

describe("GPU board visualization", () => {
  it("builds a deterministic board and die for the default GPU", () => {
    const configuration = gpu();
    const model = buildGpuVisualModel(configuration);
    const first = buildGpuVisualModel(configuration);

    expect(model).toEqual(first);
    expect(model.board.width).toBe(340);
    expect(model.board.height).toBe(170);
    expect(model.die.width).toBe(300);
    expect(model.die.height).toBe(190);
    expect(moduleKinds(configuration).filter((kind) => kind === "vram")).toHaveLength(4);
    expect(moduleKinds(configuration)).not.toContain("power");
    expect(model.die.blocks.filter((block) => block.kind === "compute")).toHaveLength(8);
    expect(model.metrics).toMatchObject({
      areaPerComputeUnit: 10,
      computeThroughputTflops: 0.003,
      memoryBusBits: 64,
      vramModuleCount: 4,
      vramModuleCapacityGb: 2,
      boardLengthMm: 146,
      slotWidth: 1,
      powerConnectors: 0,
      recommendedPsuW: 250,
      vrmPhaseCount: 3,
    });
    expect(model.die.hotspot).toBeGreaterThan(model.metrics.dieHeat);
  });

  it("adds RT, power delivery and a larger board for a flagship GPU", () => {
    const model = buildGpuVisualModel(gpu({
      computeUnits: 64,
      clockMHz: 1_800,
      operationsPerCyclePerUnit: 8,
      tdpW: 300,
      rayTracing: true,
    }));
    const kinds = model.board.modules.map((module) => module.kind);

    expect(kinds).toContain("power");
    expect(model.board.modules.find((module) => module.kind === "power")?.count).toBe(2);
    expect(model.die.blocks.some((block) => block.kind === "rt")).toBe(true);
    expect(model.die.blocks.filter((block) => block.kind === "compute")).toHaveLength(24);
    expect(model.metrics.slotWidth).toBe(3);
    expect(model.metrics.powerConnectors).toBe(2);
    expect(model.metrics.recommendedPsuW).toBe(1_050);
    expect(model.metrics.areaPerComputeUnit).toBe(1.25);
  });

  it("scales the memory bus and VRAM module count with bandwidth and capacity", () => {
    const model = buildGpuVisualModel(gpu({
      memoryBandwidthGbPerSecond: 800,
      memoryCapacityGb: 24,
    }));

    expect(model.metrics.memoryBusBits).toBe(512);
    expect(model.metrics.vramModuleCount).toBe(12);
    expect(model.metrics.vramModuleCapacityGb).toBe(2);
    expect(model.board.modules.filter((module) => module.kind === "vram")).toHaveLength(12);
  });

  it("classifies heat tiers at the documented thresholds", () => {
    expect(getGpuHeatTier(44)).toBe("cool");
    expect(getGpuHeatTier(45)).toBe("warm");
    expect(getGpuHeatTier(71)).toBe("warm");
    expect(getGpuHeatTier(72)).toBe("hot");
  });
});
