import { describe, expect, it } from "vitest";
import { runGpuBenchmarks } from "./benchmark";
import {
  calculateComponentPerformanceScore,
  calculateSuggestedComponentPrice,
  estimateComponentManufacturingCost,
  estimateComponentMarket,
  getComponentMarketProfile,
  getComponentDailyDemand,
} from "./components";
import {
  createDefaultComponentConfiguration,
  type AiAcceleratorConfiguration,
  type ComponentType,
  type GpuConfiguration,
} from "../models/components";

const TYPES: ComponentType[] = [
  "gpu",
  "ram",
  "ssd",
  "motherboard",
  "ai-accelerator",
  "networking",
];

describe("component formulas", () => {
  it("normalizes every default component to a performance score of one", () => {
    for (const type of TYPES) {
      expect(calculateComponentPerformanceScore(createDefaultComponentConfiguration(type))).toBe(1);
    }
  });

  it("distinguishes GPU gaming, rendering, compute, and AI workloads", () => {
    const results = runGpuBenchmarks(
      createDefaultComponentConfiguration("gpu") as GpuConfiguration,
    );

    expect(results).toHaveLength(4);
    expect(results.every((result) => result.supported)).toBe(true);
    expect(new Set(results.map((result) => result.tasksPerSecond)).size).toBe(4);
  });

  it("raises manufacturing cost with die area and exotic memory", () => {
    const gpu = createDefaultComponentConfiguration("gpu") as GpuConfiguration;
    const largerGpu = { ...gpu, dieAreaMm2: gpu.dieAreaMm2 * 4 };
    const ai = createDefaultComponentConfiguration("ai-accelerator") as AiAcceleratorConfiguration;
    const largerAi = { ...ai, memoryCapacityGb: ai.memoryCapacityGb * 2 };

    expect(estimateComponentManufacturingCost(largerGpu).unitCostUsd)
      .toBeGreaterThan(estimateComponentManufacturingCost(gpu).unitCostUsd);
    expect(estimateComponentManufacturingCost(largerAi).unitCostUsd)
      .toBeGreaterThan(estimateComponentManufacturingCost(ai).unitCostUsd);

    const suggested = calculateSuggestedComponentPrice(
      estimateComponentManufacturingCost(gpu).unitCostUsd,
      getComponentMarketProfile("gpu"),
    );
    expect(suggested).toBeGreaterThan(estimateComponentManufacturingCost(gpu).unitCostUsd);
    expect(suggested % 5).toBe(0);
  });

  it("makes demand react to price and specifications", () => {
    const cheap = estimateComponentMarket({
      configuration: createDefaultComponentConfiguration("gpu"),
      priceUsd: 150,
      releaseDate: "1995-01-01",
      date: "1995-01-01",
      reputation: 10,
      marketingBudgetUsdPerDay: 0,
    });
    const expensive = estimateComponentMarket({
      configuration: createDefaultComponentConfiguration("gpu"),
      priceUsd: 600,
      releaseDate: "1995-01-01",
      date: "1995-01-01",
      reputation: 10,
      marketingBudgetUsdPerDay: 0,
    });
    const faster = estimateComponentMarket({
      configuration: { ...createDefaultComponentConfiguration("gpu"), computeUnits: 64 } as GpuConfiguration,
      priceUsd: 150,
      releaseDate: "1995-01-01",
      date: "1995-01-01",
      reputation: 10,
      marketingBudgetUsdPerDay: 0,
    });

    expect(cheap.unitsPerDay).toBeGreaterThan(expensive.unitsPerDay);
    expect(cheap.share).toBeGreaterThan(expensive.share);
    expect(faster.unitsPerDay).toBeGreaterThan(cheap.unitsPerDay);
    expect(cheap.unitCostUsd).toBeGreaterThan(0);
    expect(cheap.revenuePerDayUsd).toBeGreaterThan(0);
  });

  it("grows component demand over time", () => {
    const profile = getComponentMarketProfile("ssd");

    expect(getComponentDailyDemand(profile, "2005-01-01"))
      .toBeGreaterThan(getComponentDailyDemand(profile, "1995-01-01"));
  });
});
