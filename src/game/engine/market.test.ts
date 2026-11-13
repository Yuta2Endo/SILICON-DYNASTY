import { describe, expect, it } from "vitest";
import { createCpuProject, createDefaultCpuConfiguration } from "../models/cpu";
import { createInitialGameState, type GameState } from "../models/game-state";
import { getFinanceDailyRecord } from "../models/finance";
import {
  discontinueProduct,
  estimateProductDailyDemand,
  orderProduction,
  releaseProduct,
  runCompetitorDay,
  runProductionDay,
  simulateMarketDay,
  updateMarketReputation,
} from "./market";

describe("market engine", () => {
  it("releases a CPU version, charges the launch fee, and refuses duplicates", () => {
    const state = releaseProduct(stateWithProject(), {
      projectId: "cpu-1",
      projectVersion: 1,
      name: "Dynasty One",
      segmentId: "budget",
      priceUsd: 300,
    });
    const product = state.market.products[0];

    expect(state.company.balance).toBe(95_000);
    expect(product).toMatchObject({
      name: "Dynasty One",
      projectId: "cpu-1",
      projectVersion: 1,
      segmentId: "budget",
      priceUsd: 300,
      status: "active",
      inventoryUnits: 0,
      unitsSold: 0,
    });
    expect(product?.manufacturingCostUsd).toBeGreaterThan(0);
    expect(product?.performanceScore).toBeGreaterThan(0);
    expect(getFinanceDailyRecord(state.finance, "1995-01-01")?.releaseUsd).toBe(5_000);

    expect(() =>
      releaseProduct(state, {
        projectId: "cpu-1",
        projectVersion: 1,
        name: "Dynasty Duplicate",
        segmentId: "budget",
        priceUsd: 300,
      }),
    ).toThrow("already on the market");
  });

  it("charges production up front and delivers the order on its ready date", () => {
    const state = stateWithProduct();
    const unitCost = state.market.products[0]!.manufacturingCostUsd;
    const ordered = orderProduction(state, "product-1", 100);
    const order = ordered.market.productionOrders[0]!;

    expect(ordered.company.balance).toBeCloseTo(95_000 - unitCost * 100, 2);
    expect(order).toMatchObject({
      productId: "product-1",
      quantity: 100,
      orderedOn: "1995-01-01",
      readyOn: "1995-01-06",
      status: "in-production",
    });

    const beforeReady = runProductionDay(ordered, "1995-01-05");
    expect(beforeReady.market.products[0]?.inventoryUnits).toBe(0);

    const delivered = runProductionDay(ordered, "1995-01-06");
    expect(delivered.market.products[0]).toMatchObject({
      inventoryUnits: 100,
      unitsProduced: 100,
    });
    expect(delivered.market.productionOrders[0]?.status).toBe("completed");
    expect(getFinanceDailyRecord(delivered.finance, "1995-01-06")?.unitsProduced).toBe(100);
  });

  it("sells only available inventory and records real market share and revenue", () => {
    const state = stateWithProduct();
    const withInventory = {
      ...state,
      market: {
        ...state.market,
        products: state.market.products.map((product) => ({
          ...product,
          inventoryUnits: 50,
          unitsProduced: 50,
        })),
      },
    };

    const simulated = simulateMarketDay(withInventory, "1995-01-01");
    const product = simulated.market.products[0]!;
    const summary = simulated.market.dailySummaries[0]!;

    expect(product.unitsSold).toBeGreaterThan(0);
    expect(product.unitsSold).toBeLessThanOrEqual(50);
    expect(product.inventoryUnits).toBe(50 - product.unitsSold);
    expect(product.revenueUsd).toBe(product.unitsSold * product.priceUsd);
    expect(summary.playerUnits).toBe(product.unitsSold);
    expect(summary.competitorUnits).toBe(summary.totalDemandUnits - product.unitsSold);
    expect(summary.marketShare).toBeGreaterThan(0);
    expect(summary.segments.budget?.playerUnits).toBe(product.unitsSold);
    expect(simulated.company.balance).toBe(95_000 + product.revenueUsd);
    expect(getFinanceDailyRecord(simulated.finance, "1995-01-01")).toMatchObject({
      revenueUsd: product.revenueUsd,
      unitsSold: product.unitsSold,
    });
  });

  it("shows demand falling when the price rises and rising with marketing", () => {
    const cheap = estimateProductDailyDemand(stateWithProduct(250), "product-1", "1995-01-01");
    const expensive = estimateProductDailyDemand(stateWithProduct(900), "product-1", "1995-01-01");
    const marketedState = stateWithProduct(250);
    const marketed = estimateProductDailyDemand(
      {
        ...marketedState,
        market: { ...marketedState.market, marketingBudgetUsdPerDay: 10_000 },
      },
      "product-1",
      "1995-01-01",
    );

    expect(cheap).not.toBeNull();
    expect(expensive).not.toBeNull();
    expect(marketed).not.toBeNull();
    expect(cheap!.unitsPerDay).toBeGreaterThan(expensive!.unitsPerDay);
    expect(marketed!.unitsPerDay).toBeGreaterThan(cheap!.unitsPerDay);
    expect(cheap!.margin).toBeGreaterThan(0);
  });

  it("applies observable, deterministic competitor strategies on schedule", () => {
    const initial = createInitialGameState();
    const quiet = runCompetitorDay(initial, "1995-01-01");
    const active = runCompetitorDay(initial, "1995-01-04");
    const repeated = runCompetitorDay(createInitialGameState(), "1995-01-04");

    expect(quiet.market.actions).toEqual([]);
    expect(active.market.actions).toHaveLength(1);
    expect(active.market.actions[0]).toMatchObject({
      date: "1995-01-04",
      competitorId: "nova",
      type: "price-cut",
      valuePercent: 1.5,
    });
    expect(active.market.competitors.find((competitor) => competitor.competitorId === "nova")).toMatchObject({
      priceMultiplier: 0.985,
      nextActionOn: "1995-02-03",
      actionCount: 1,
    });
    expect(active).toEqual(repeated);
  });

  it("prevents discontinuing a product with an open production order", () => {
    const ordered = orderProduction(stateWithProduct(), "product-1", 10);

    expect(() => discontinueProduct(ordered, "product-1")).toThrow("open production orders");
    const completed = runProductionDay(ordered, "1995-01-06");
    expect(discontinueProduct(completed, "product-1").market.products[0]?.status).toBe("discontinued");
  });

  it("rewards sales with reputation and penalizes a stockout", () => {
    const state = stateWithProduct();
    const summary = {
      date: "1995-01-01",
      totalDemandUnits: 6_000,
      playerUnits: 200,
      competitorUnits: 5_800,
      playerRevenueUsd: 60_000,
      marketShare: 200 / 6_000,
      componentDemandUnits: 0,
      componentUnits: 0,
      componentRevenueUsd: 0,
      componentManufacturingUsd: 0,
      segments: { budget: { playerUnits: 200, totalUnits: 6_000, share: 200 / 6_000 } },
    };
    const rewarded = updateMarketReputation(state, summary);
    const stockedOut = updateMarketReputation(state, { ...summary, playerUnits: 0 });

    expect(rewarded.company.reputation).toBeGreaterThan(state.company.reputation);
    expect(stockedOut.company.reputation).toBeLessThan(state.company.reputation);
  });

  it("rejects a CPU product release at the market product cap", () => {
    const base = stateWithProduct().market.products[0]!;
    const filled = {
      ...stateWithProject(),
      market: {
        ...stateWithProject().market,
        products: Array.from({ length: 100 }, (_, index) => ({
          ...base,
          id: `product-${index + 1}`,
          projectId: `cpu-${index + 2}`,
        })),
      },
    };

    expect(() =>
      releaseProduct(filled, {
        projectId: "cpu-1",
        projectVersion: 1,
        name: "Overflow",
        segmentId: "budget",
        priceUsd: 300,
      }),
    ).toThrowError(expect.objectContaining({ code: "product-limit" }));
    expect(filled.company.balance).toBe(100_000);
  });
});

function stateWithProject(): GameState {
  const state = createInitialGameState();
  return {
    ...state,
    cpuProjects: [
      createCpuProject("cpu-1", "Dynasty Core", createDefaultCpuConfiguration(), state.gameDate),
    ],
  };
}

function stateWithProduct(priceUsd = 300): GameState {
  return releaseProduct(stateWithProject(), {
    projectId: "cpu-1",
    projectVersion: 1,
    name: "Dynasty One",
    segmentId: "budget",
    priceUsd,
  });
}
