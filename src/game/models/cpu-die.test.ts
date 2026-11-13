import { describe, expect, it } from "vitest";
import { createDefaultCpuConfiguration, type CpuConfiguration } from "./cpu";
import { buildCpuDieLayout, getCpuDieHeatTier } from "./cpu-die";

function config(overrides: Partial<CpuConfiguration> = {}): CpuConfiguration {
  return { ...createDefaultCpuConfiguration(), ...overrides };
}

describe("CPU die layout", () => {
  it("builds a deterministic floorplan for the default processor", () => {
    const layout = buildCpuDieLayout(config());

    expect(layout.coreCount).toBe(1);
    expect(layout.displayedCoreCount).toBe(1);
    expect(layout.blocks.filter((block) => block.kind === "core")).toHaveLength(1);
    expect(layout.blocks.filter((block) => block.kind === "cache")).toHaveLength(1);
    expect(layout.blocks.filter((block) => block.kind === "io")).toHaveLength(3);
    expect(layout.areaPerCoreMm2).toBe(50);
    expect(layout.thermalDensityWPerMm2).toBe(0.2);
    expect(layout.hotspot).toBeGreaterThan(0);
    expect(layout.hotspot).toBeLessThan(100);
  });

  it("scales core tiles and aggregates large core counts", () => {
    const eightCores = buildCpuDieLayout(config({ coreCount: 8, threadCount: 8 }));
    expect(eightCores.blocks.filter((block) => block.kind === "core")).toHaveLength(8);

    const manyCores = buildCpuDieLayout(config({ coreCount: 128, threadCount: 256 }));
    const coreBlocks = manyCores.blocks.filter((block) => block.kind === "core");
    expect(manyCores.displayedCoreCount).toBe(31);
    expect(coreBlocks).toHaveLength(32);
    expect(coreBlocks.at(-1)?.count).toBe(97);
  });

  it("adds an L3 block when L3 cache is present", () => {
    const layout = buildCpuDieLayout(config({ l3CacheMb: 8 }));
    const cacheBlocks = layout.blocks.filter((block) => block.kind === "cache");
    expect(cacheBlocks.map((block) => block.variant)).toEqual(["l2", "l3"]);
  });

  it("raises hotspot heat with power density and reports heat tiers", () => {
    const efficient = buildCpuDieLayout(config({ tdpW: 10 }));
    const hot = buildCpuDieLayout(config({ tdpW: 150 }));

    expect(hot.hotspot).toBeGreaterThan(efficient.hotspot);
    expect(hot.blocks.find((block) => block.kind === "core")?.heat).toBeGreaterThan(
      efficient.blocks.find((block) => block.kind === "core")?.heat ?? 0,
    );
    expect(getCpuDieHeatTier(20)).toBe("cool");
    expect(getCpuDieHeatTier(50)).toBe("warm");
    expect(getCpuDieHeatTier(90)).toBe("hot");
  });

  it("increases cache area share with a larger cache", () => {
    const small = buildCpuDieLayout(config({ l3CacheMb: 0 }));
    const large = buildCpuDieLayout(config({ l3CacheMb: 64 }));

    expect(large.cacheSharePercent).toBeGreaterThan(small.cacheSharePercent);
    expect(large.cacheAreaMm2).toBeGreaterThan(small.cacheAreaMm2);
  });
});
