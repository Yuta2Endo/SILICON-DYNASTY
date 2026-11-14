import { describe, expect, it } from "vitest";
import type { FinanceDailyRecord } from "../models/finance";
import { buildCashFlowWaterfall } from "./finance-visuals";

function record(overrides: Partial<FinanceDailyRecord> = {}): FinanceDailyRecord {
  return {
    date: "1995-01-01",
    revenueUsd: 1_000,
    manufacturingUsd: 200,
    payrollUsd: 120,
    overheadUsd: 80,
    marketingUsd: 50,
    researchUsd: 0,
    releaseUsd: 0,
    interestUsd: 10,
    taxUsd: 100,
    financingUsd: -50,
    netProfitUsd: 440,
    netCashFlowUsd: 390,
    closingBalanceUsd: 1_390,
    unitsSold: 10,
    unitsProduced: 12,
    ...overrides,
  };
}

describe("buildCashFlowWaterfall", () => {
  it("builds opening, flows and closing from one persisted daily record", () => {
    const bridge = buildCashFlowWaterfall(record());

    expect(bridge.openingBalanceUsd).toBe(1_000);
    expect(bridge.closingBalanceUsd).toBe(1_390);
    expect(bridge.netCashFlowUsd).toBe(390);
    expect(bridge.steps.map((step) => step.id)).toEqual([
      "opening",
      "revenue",
      "manufacturing",
      "payroll",
      "overhead",
      "marketing",
      "interest",
      "tax",
      "financing",
      "closing",
    ]);
    expect(bridge.steps.at(-1)).toMatchObject({ id: "closing", endUsd: 1_390 });
    expect(bridge.steps[1]).toMatchObject({ id: "revenue", amountUsd: 1_000 });
    expect(bridge.steps[2]).toMatchObject({ id: "manufacturing", amountUsd: -200 });
  });

  it("skips zero categories and keeps running balances connected", () => {
    const bridge = buildCashFlowWaterfall(record({
      revenueUsd: 0,
      manufacturingUsd: 0,
      payrollUsd: 0,
      overheadUsd: 0,
      marketingUsd: 0,
      interestUsd: 0,
      taxUsd: 0,
      financingUsd: 0,
      netProfitUsd: 0,
      netCashFlowUsd: 0,
      closingBalanceUsd: 1_000,
    }));

    expect(bridge.steps.map((step) => step.id)).toEqual(["opening", "closing"]);
    expect(bridge.steps[0]?.endUsd).toBe(1_000);
    expect(bridge.steps[1]?.endUsd).toBe(1_000);
  });

  it("scales the domain to include zero and negative values", () => {
    const bridge = buildCashFlowWaterfall(record({
      revenueUsd: 100,
      manufacturingUsd: 900,
      payrollUsd: 0,
      overheadUsd: 0,
      marketingUsd: 0,
      interestUsd: 0,
      taxUsd: 0,
      financingUsd: 0,
      netProfitUsd: -800,
      netCashFlowUsd: -800,
      closingBalanceUsd: 200,
    }));

    expect(bridge.minUsd).toBeLessThanOrEqual(0);
    expect(bridge.maxUsd).toBeGreaterThanOrEqual(1_000);
  });
});
