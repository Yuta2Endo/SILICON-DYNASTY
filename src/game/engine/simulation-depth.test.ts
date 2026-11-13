import { describe, expect, it } from "vitest";
import { createCpuProject, createDefaultCpuConfiguration } from "../models/cpu";
import { createInitialGameState, type GameState } from "../models/game-state";
import { orderProduction, releaseProduct, runCompetitorDay, simulateMarketDay } from "./market";

function stateWithReleasedProduct(): GameState {
  const initial = createInitialGameState();
  const project = createCpuProject(
    "cpu-1",
    "Dynasty Core",
    createDefaultCpuConfiguration(),
    initial.gameDate,
  );
  return releaseProduct(
    { ...initial, cpuProjects: [project] },
    {
      projectId: "cpu-1",
      projectVersion: 1,
      name: "Dynasty One",
      segmentId: "budget",
      priceUsd: 300,
    },
  );
}

function withOldRelease(state: GameState): GameState {
  return {
    ...state,
    market: {
      ...state.market,
      products: state.market.products.map((product) => ({
        ...product,
        releaseDate: "1985-01-01",
      })),
    },
  };
}

describe("market simulation depth", () => {
  it("scales competitor actions with economic-cycle aggression", () => {
    const neutral = runCompetitorDay(createInitialGameState(), "1995-01-04");
    const contraction = runCompetitorDay(createInitialGameState(), "2001-01-04");
    const neutralNova = neutral.market.actions.find((action) => action.competitorId === "nova");
    const contractionNova = contraction.market.actions.find((action) => action.competitorId === "nova");

    expect(neutralNova).toMatchObject({ valuePercent: 1.5 });
    expect(contractionNova?.valuePercent).toBeGreaterThan(neutralNova?.valuePercent ?? 0);
    expect(
      contraction.market.competitors.find((competitor) => competitor.competitorId === "nova")
        ?.priceMultiplier,
    ).toBeLessThan(0.985);
  });

  it("retires legacy products without open orders but preserves products in production", () => {
    const released = withOldRelease(stateWithReleasedProduct());
    const retired = simulateMarketDay(released, "1995-01-01");

    expect(retired.market.products[0]?.status).toBe("discontinued");
    expect(retired.market.products[0]?.unitsSold).toBe(0);

    const ordered = orderProduction(released, "product-1", 10);
    const inProduction = simulateMarketDay(ordered, "1995-01-01");
    expect(inProduction.market.products[0]?.status).toBe("active");
    expect(inProduction.market.productionOrders[0]?.status).toBe("in-production");
  });
});
