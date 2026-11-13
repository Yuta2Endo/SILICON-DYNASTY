import { describe, expect, it } from "vitest";
import { createCpuProject, createDefaultCpuConfiguration } from "../models/cpu";
import { applyFinanceTransaction, createInitialFinanceState } from "../models/finance";
import { createInitialGameState, type GameState } from "../models/game-state";
import type { MarketDaySummary } from "../models/market";
import { analyticsCsv, buildAnalyticsReport } from "./analytics";

function stateWithHistory(): GameState {
  const base = createInitialGameState();
  let finance = createInitialFinanceState();
  finance = applyFinanceTransaction(
    finance,
    { date: "1995-01-01", category: "sales", amountUsd: 10_000 },
    110_000,
  );
  finance = applyFinanceTransaction(
    finance,
    { date: "1995-01-01", category: "manufacturing", amountUsd: -2_000 },
    108_000,
  );
  finance = applyFinanceTransaction(
    finance,
    { date: "1995-01-01", category: "payroll", amountUsd: -120 },
    107_880,
  );
  finance = applyFinanceTransaction(
    finance,
    { date: "1995-01-01", category: "overhead", amountUsd: -80 },
    107_800,
  );
  finance = applyFinanceTransaction(
    finance,
    { date: "1994-11-01", category: "sales", amountUsd: 999 },
    108_799,
  );

  const summaries: MarketDaySummary[] = [
    {
      date: "1995-01-01",
      totalDemandUnits: 6_000,
      playerUnits: 600,
      competitorUnits: 5_400,
      playerRevenueUsd: 10_000,
      marketShare: 0.1,
      componentDemandUnits: 100,
      componentUnits: 20,
      componentRevenueUsd: 4_000,
      componentManufacturingUsd: 1_000,
      segments: {
        budget: { playerUnits: 600, totalUnits: 6_000, share: 0.1 },
      },
    },
    {
      date: "1995-01-02",
      totalDemandUnits: 6_000,
      playerUnits: 400,
      competitorUnits: 5_600,
      playerRevenueUsd: 7_000,
      marketShare: 400 / 6_000,
      componentDemandUnits: 100,
      componentUnits: 10,
      componentRevenueUsd: 2_000,
      componentManufacturingUsd: 500,
      segments: {
        budget: { playerUnits: 400, totalUnits: 6_000, share: 400 / 6_000 },
      },
    },
  ];

  return {
    ...base,
    gameDate: "1995-01-03",
    finance,
    cpuProjects: [
      createCpuProject("cpu-1", "Dynasty Core", createDefaultCpuConfiguration(), "1995-01-01"),
    ],
    market: {
      ...base.market,
      dailySummaries: summaries,
    },
  };
}

describe("analytics formulas", () => {
  it("builds a range report from finance, market and project data", () => {
    const report = buildAnalyticsReport(stateWithHistory(), 7);

    expect(report.points).toHaveLength(1);
    expect(report.points[0]).toMatchObject({
      date: "1995-01-01",
      revenueUsd: 10_000,
      expensesUsd: 2_200,
      netProfitUsd: 7_800,
      unitsSold: 0,
      marketShare: 0.1,
    });
    expect(report.corporate.revenueUsd).toBe(10_000);
    expect(report.corporate.expensesUsd).toBe(2_200);
    expect(report.corporate.netProfitUsd).toBe(7_800);
    expect(report.corporate.netMargin).toBeCloseTo(0.78, 2);
    expect(report.market.playerUnits).toBe(1_000);
    expect(report.market.totalDemandUnits).toBe(12_000);
    expect(report.market.marketShare).toBeCloseTo(1_000 / 12_000, 4);
    expect(report.market.segments[0]).toMatchObject({
      segmentId: "budget",
      playerUnits: 1_000,
      totalUnits: 12_000,
    });
    expect(report.technology.cpuProjects).toBe(1);
    expect(report.technology.totalVersions).toBe(1);
  });

  it("filters records by the selected period and exports CSV", () => {
    const report = buildAnalyticsReport(stateWithHistory(), 7);
    const csv = analyticsCsv(report);

    expect(report.points.some((point) => point.date === "1994-11-01")).toBe(false);
    expect(csv.split("\n")[0]).toBe(
      "date,revenue_usd,expenses_usd,net_profit_usd,units_sold,market_share",
    );
    expect(csv).toContain("1995-01-01,10000.00,2200.00,7800.00,0,0.100000");
  });
});
