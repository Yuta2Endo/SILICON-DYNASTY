import { describe, expect, it } from "vitest";
import { createDefaultCpuConfiguration } from "../models/cpu";
import { getMarketSegment } from "../models/market";
import {
  calculateCpuMarketPerformanceScore,
  calculateProductAppeal,
  calculateSuggestedPrice,
  estimateManufacturingCost,
  getSegmentDailyDemand,
} from "./market";

describe("market formulas", () => {
  it("normalizes the default 1995 CPU to a performance score of exactly 1", () => {
    expect(calculateCpuMarketPerformanceScore(createDefaultCpuConfiguration())).toBe(1);
  });

  it("makes larger dies more expensive per unit", () => {
    const base = createDefaultCpuConfiguration();
    const compact = estimateManufacturingCost({ ...base, dieAreaMm2: 25 });
    const large = estimateManufacturingCost({ ...base, dieAreaMm2: 200 });

    expect(compact.unitCostUsd).toBeGreaterThan(0);
    expect(large.unitCostUsd).toBeGreaterThan(compact.unitCostUsd);
    expect(large.dieYield).toBeLessThan(compact.dieYield);
  });

  it("suggests a price with a positive gross margin and a $5 step", () => {
    const segment = getMarketSegment("mainstream");
    expect(segment).toBeDefined();

    const price = calculateSuggestedPrice(20, segment!);

    expect(price).toBeGreaterThan(20);
    expect(price % 5).toBe(0);
  });

  it("lets lower prices and higher marketing increase product appeal", () => {
    const segment = getMarketSegment("budget");
    expect(segment).toBeDefined();
    const base = {
      segment: segment!,
      configuration: createDefaultCpuConfiguration(),
      performanceScore: 1,
      releaseDate: "1995-01-01",
      date: "1995-03-01",
      reputation: 10,
      marketingBudgetUsdPerDay: 0,
    };

    const cheap = calculateProductAppeal({ ...base, priceUsd: 200 });
    const expensive = calculateProductAppeal({ ...base, priceUsd: 500 });
    const marketed = calculateProductAppeal({ ...base, priceUsd: 200, marketingBudgetUsdPerDay: 10_000 });

    expect(cheap).toBeGreaterThan(expensive);
    expect(marketed).toBeGreaterThan(cheap);
  });

  it("grows segment demand over time", () => {
    const segment = getMarketSegment("mainstream");
    expect(segment).toBeDefined();

    expect(getSegmentDailyDemand(segment!, "2010-01-01")).toBeGreaterThan(
      getSegmentDailyDemand(segment!, "1995-01-01"),
    );
  });
});
