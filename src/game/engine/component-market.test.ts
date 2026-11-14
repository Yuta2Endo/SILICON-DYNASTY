import { describe, expect, it } from "vitest";
import {
  createDefaultComponentConfiguration,
  createComponentProject,
} from "../models/components";
import { createInitialGameState } from "../models/game-state";
import type { GameState } from "../models/game-state";
import {
  ComponentMarketOperationError,
  discontinueComponentProduct,
  releaseComponentProduct,
  simulateComponentMarketDay,
  updateComponentProductPrice,
} from "./component-market";

function stateWithGpuProject(): GameState {
  const state = createInitialGameState();
  const project = createComponentProject(
    "component-1",
    "Dynasty Graphics",
    "gpu",
    createDefaultComponentConfiguration("gpu"),
    state.gameDate,
  );
  return { ...state, componentProjects: [project] };
}

function releasedGpuState(priceUsd = 400): GameState {
  return releaseComponentProduct(stateWithGpuProject(), {
    projectId: "component-1",
    projectVersion: 1,
    name: "Dynasty Graphics 100",
    priceUsd,
  });
}

function withMatureRelease(state: GameState): GameState {
  return {
    ...state,
    market: {
      ...state.market,
      componentProducts: state.market.componentProducts.map((product) => ({
        ...product,
        releaseDate: "1994-01-01",
      })),
    },
  };
}

function withInventory(state: GameState, units = 1_000): GameState {
  return {
    ...state,
    market: {
      ...state.market,
      componentProducts: state.market.componentProducts.map((product) => ({
        ...product,
        inventoryUnits: units,
        unitsProduced: product.unitsSold + units,
      })),
    },
  };
}

describe("component market", () => {
  it("charges a launch fee and creates a manufactured product", () => {
    const state = releasedGpuState();
    const product = state.market.componentProducts[0];

    expect(state.company.balance).toBe(95_000);
    expect(product).toEqual(expect.objectContaining({
      id: "component-product-1",
      projectId: "component-1",
      projectVersion: 1,
      componentType: "gpu",
      priceUsd: 400,
      status: "active",
      unitsSold: 0,
      revenueUsd: 0,
    }));
    expect(product?.manufacturingCostUsd).toBeGreaterThan(0);
    expect(product?.performanceScore).toBe(1);
    expect(() => releaseComponentProduct(state, {
      projectId: "component-1",
      projectVersion: 1,
      name: "Duplicate",
      priceUsd: 400,
    })).toThrow(ComponentMarketOperationError);
  });

  it("sells components from inventory and records revenue and units", () => {
    const released = withInventory(withMatureRelease(releasedGpuState()));
    const before = released.company.balance;
    const simulated = simulateComponentMarketDay(released, "1995-01-01");
    const product = simulated.market.componentProducts[0];
    const summary = simulated.market.dailySummaries.at(-1);
    const units = product?.unitsSold ?? 0;

    expect(units).toBeGreaterThan(0);
    expect(product?.inventoryUnits).toBe(1_000 - units);
    expect(product?.unitsProduced).toBe(1_000);
    expect(product?.revenueUsd).toBe(units * 400);
    expect(summary).toEqual(expect.objectContaining({
      date: "1995-01-01",
      componentUnits: units,
      componentRevenueUsd: units * 400,
      componentManufacturingUsd: 0,
    }));
    expect(summary?.componentDemandUnits).toBeGreaterThan(0);
    expect(simulated.company.balance).toBeCloseTo(before + units * 400, 2);
    expect(simulated.finance.dailyRecords.at(-1)?.unitsSold).toBe(units);
    expect(simulated.finance.transactions.some((transaction) => transaction.category === "sales")).toBe(true);
  });

  it("sells fewer units at a higher price", () => {
    const cheap = simulateComponentMarketDay(withInventory(withMatureRelease(releasedGpuState(120))), "1995-01-01");
    const expensive = simulateComponentMarketDay(withInventory(withMatureRelease(releasedGpuState(900))), "1995-01-01");

    expect(cheap.market.componentProducts[0]?.unitsSold ?? 0)
      .toBeGreaterThan(expensive.market.componentProducts[0]?.unitsSold ?? 0);
  });

  it("caps sales at available inventory", () => {
    const released = withInventory(withMatureRelease(releasedGpuState()), 5);
    const before = released.company.balance;
    const simulated = simulateComponentMarketDay(released, "1995-01-01");

    expect(simulated.market.componentProducts[0]?.unitsSold).toBe(5);
    expect(simulated.market.componentProducts[0]?.inventoryUnits).toBe(0);
    expect(simulated.market.dailySummaries.at(-1)?.componentUnits).toBe(5);
    expect(simulated.company.balance).toBe(before + 5 * 400);
  });

  it("updates prices and stops sales for a discontinued product", () => {
    const released = withMatureRelease(releasedGpuState());
    const repriced = updateComponentProductPrice(released, "component-product-1", 550);
    expect(repriced.market.componentProducts[0]?.priceUsd).toBe(550);

    const discontinued = discontinueComponentProduct(repriced, "component-product-1");
    expect(discontinued.market.componentProducts[0]?.status).toBe("discontinued");

    const simulated = simulateComponentMarketDay(discontinued, "1995-01-01");
    expect(simulated.market.componentProducts[0]?.unitsSold).toBe(0);
  });

  it("rejects a component release at the product cap", () => {
    const base = releasedGpuState().market.componentProducts[0]!;
    const filled = {
      ...stateWithGpuProject(),
      market: {
        ...stateWithGpuProject().market,
        componentProducts: Array.from({ length: 60 }, (_, index) => ({
          ...base,
          id: `component-product-${index + 1}`,
          projectId: `component-${index + 2}`,
        })),
      },
    };

    expect(() => releaseComponentProduct(filled, {
      projectId: "component-1",
      projectVersion: 1,
      name: "Overflow GPU",
      priceUsd: 400,
    })).toThrowError(expect.objectContaining({ code: "product-limit" }));
    expect(filled.company.balance).toBe(100_000);
  });
});
