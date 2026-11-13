import { describe, expect, it } from "vitest";
import { getMarketSegment } from "../models/market";
import {
  getPressDemandFactor,
  getPressReview,
  PRESS_REVIEW_CYCLE_DAYS,
  PRESS_REVIEW_FIRST_DAY,
  type PressReviewInput,
} from "./press";

const budget = (() => {
  const segment = getMarketSegment("budget");
  if (!segment) {
    throw new Error("Budget segment is required for press tests.");
  }
  return segment;
})();

function reviewInput(overrides: Partial<PressReviewInput> = {}): PressReviewInput {
  return {
    productId: "product-1",
    productName: "Dynasty One",
    segment: budget,
    releaseDate: "1995-01-01",
    date: "1995-02-15",
    priceUsd: 300,
    performanceScore: 1,
    reputation: 10,
    ...overrides,
  };
}

describe("press reviews", () => {
  it("starts after the first month and stays deterministic", () => {
    expect(getPressReview(reviewInput({ date: "1995-01-30" }))).toBeNull();

    const first = getPressReview(reviewInput());
    const second = getPressReview(reviewInput());

    expect(first).not.toBeNull();
    expect(second).toEqual(first);
    expect(first?.publishedOn).toBe("1995-01-31");
    expect(first?.cycle).toBe(0);
    expect(first?.score).toBeGreaterThanOrEqual(5);
    expect(first?.score).toBeLessThanOrEqual(98);
    expect(first?.demandFactor).toBeGreaterThanOrEqual(0.9);
    expect(first?.demandFactor).toBeLessThanOrEqual(1.1);
    expect(PRESS_REVIEW_FIRST_DAY).toBe(30);
  });

  it("criticizes a higher price and rewards performance", () => {
    const affordable = getPressReview(reviewInput({ priceUsd: 200 }));
    const expensive = getPressReview(reviewInput({ priceUsd: 450 }));
    const slow = getPressReview(reviewInput({ performanceScore: 0.6 }));
    const fast = getPressReview(reviewInput({ performanceScore: 1.6 }));

    expect(affordable?.score).toBeGreaterThan(expensive?.score ?? 0);
    expect(fast?.score).toBeGreaterThan(slow?.score ?? 0);
  });

  it("moves to a new review cycle every 90 days", () => {
    const first = getPressReview(reviewInput({ date: "1995-02-15" }));
    const next = getPressReview(reviewInput({
      date: `1995-${String(5).padStart(2, "0")}-01`,
    }));

    expect(first?.cycle).toBe(0);
    expect(next?.cycle).toBeGreaterThan(first?.cycle ?? 0);
    expect(PRESS_REVIEW_CYCLE_DAYS).toBe(90);
  });

  it("maps review scores to a bounded demand factor", () => {
    expect(getPressDemandFactor(50)).toBe(1);
    expect(getPressDemandFactor(0)).toBe(0.92);
    expect(getPressDemandFactor(100)).toBe(1.08);
  });
});
