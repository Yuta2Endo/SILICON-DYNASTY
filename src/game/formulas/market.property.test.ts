import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { createDefaultCpuConfiguration } from "../models/cpu";
import { getMarketSegment } from "../models/market";
import { calculateProductAppeal, getSegmentDailyDemand } from "./market";

const segment = getMarketSegment("budget")!;
const configuration = createDefaultCpuConfiguration();
const base = {
  segment,
  configuration,
  performanceScore: 1,
  releaseDate: "1995-01-01",
  date: "1995-03-01",
  reputation: 10,
  marketingBudgetUsdPerDay: 0,
};

describe("market property invariants", () => {
  it("does not increase appeal when the price increases", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 50, max: 5_000 }),
        fc.integer({ min: 0, max: 2_000 }),
        (lowPrice, delta) => {
          const highPrice = lowPrice + delta;
          const low = calculateProductAppeal({ ...base, priceUsd: lowPrice });
          const high = calculateProductAppeal({ ...base, priceUsd: highPrice });
          expect(low).toBeGreaterThanOrEqual(high);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("does not decrease appeal when marketing budget increases", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000 }),
        fc.integer({ min: 0, max: 10_000 }),
        (first, delta) => {
          const low = calculateProductAppeal({
            ...base,
            priceUsd: 300,
            marketingBudgetUsdPerDay: first,
          });
          const high = calculateProductAppeal({
            ...base,
            priceUsd: 300,
            marketingBudgetUsdPerDay: first + delta,
          });
          expect(high).toBeGreaterThanOrEqual(low);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("keeps segment demand positive across the simulation period", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 20_000 }), (days) => {
        const date = new Date(Date.UTC(1995, 0, 1 + days)).toISOString().slice(0, 10);
        expect(getSegmentDailyDemand(segment, date)).toBeGreaterThan(0);
      }),
      { numRuns: 30 },
    );
  });
});
