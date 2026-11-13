import { describe, expect, it } from "vitest";
import { getEconomicCycle } from "./economy";
import {
  getProductLifecycle,
  getSegmentDailyDemand,
  PRODUCT_LIFECYCLE_RETIRE_AFTER_DAYS,
} from "./market";
import { getMarketSegment } from "../models/market";

describe("economic cycles", () => {
  it("maps game years to deterministic phases and multipliers", () => {
    expect(getEconomicCycle("1995-01-01")).toEqual({
      phase: "stable",
      demandMultiplier: 1,
      costMultiplier: 1,
      competitorAggression: 1,
    });
    expect(getEconomicCycle("1997-01-01").phase).toBe("expansion");
    expect(getEconomicCycle("1999-01-01").phase).toBe("peak");
    expect(getEconomicCycle("2001-01-01").phase).toBe("contraction");
    expect(getEconomicCycle("2002-01-01").phase).toBe("trough");
    expect(getEconomicCycle("2003-01-01").phase).toBe("stable");
    expect(getEconomicCycle("2002-01-01").demandMultiplier).toBeLessThan(1);
    expect(getEconomicCycle("2001-01-01").competitorAggression).toBeGreaterThan(1);
  });

  it("applies the cycle demand multiplier to segment demand", () => {
    const segment = getMarketSegment("budget")!;
    const contraction = getSegmentDailyDemand(segment, "2001-01-01");
    const trough = getSegmentDailyDemand(segment, "2002-01-01");

    expect(trough).toBeLessThan(contraction);
    expect(getSegmentDailyDemand(segment, "1995-01-01")).toBe(6_000);
  });
});

describe("product lifecycle", () => {
  it("reports launch, growth, mature, decline and legacy stages", () => {
    expect(getProductLifecycle("1995-01-01", "1995-01-01")).toMatchObject({
      stage: "launch",
      factor: 1,
      daysOnMarket: 0,
    });
    expect(getProductLifecycle("1995-01-01", "1995-02-15").stage).toBe("growth");
    expect(getProductLifecycle("1995-01-01", "1996-01-01").stage).toBe("mature");
    expect(getProductLifecycle("1995-01-01", "1999-01-01").stage).toBe("decline");
    expect(getProductLifecycle("1995-01-01", "2005-01-01")).toMatchObject({
      stage: "legacy",
      factor: 0.7,
    });
    expect(PRODUCT_LIFECYCLE_RETIRE_AFTER_DAYS).toBe(3_650);
  });
});
