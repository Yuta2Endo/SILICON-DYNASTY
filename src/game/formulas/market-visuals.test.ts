import { describe, expect, it } from "vitest";
import { createCpuProject, createDefaultCpuConfiguration } from "../models/cpu";
import { createInitialGameState } from "../models/game-state";
import { releaseProduct } from "../engine/market";
import { buildPricePerformancePoints } from "./market-visuals";

function stateWithProduct() {
  const base = createInitialGameState();
  const project = createCpuProject(
    "cpu-1",
    "Dynasty One",
    createDefaultCpuConfiguration(),
    "1995-01-01",
  );
  return releaseProduct(
    { ...base, cpuProjects: [project] },
    {
      projectId: "cpu-1",
      projectVersion: 1,
      name: "Dynasty One",
      segmentId: "budget",
      priceUsd: 300,
    },
  );
}

describe("buildPricePerformancePoints", () => {
  it("includes active player products and active competitor products", () => {
    const points = buildPricePerformancePoints(stateWithProduct());
    const player = points.filter((point) => point.kind === "player");
    const competitors = points.filter((point) => point.kind === "competitor");

    expect(player).toHaveLength(1);
    expect(player[0]).toMatchObject({
      name: "Dynasty One",
      segmentId: "budget",
      priceUsd: 300,
    });
    expect(competitors.length).toBeGreaterThan(0);
    expect(points.some((point) => point.name === "Apex A4-66")).toBe(true);
  });

  it("applies competitor price and performance multipliers", () => {
    const product = stateWithProduct();
    const state = {
      ...product,
      market: {
        ...product.market,
        competitors: product.market.competitors.map((competitor) =>
          competitor.competitorId === "apex"
            ? {
                ...competitor,
                priceMultiplier: 0.9,
                performanceMultiplier: 1.1,
              }
            : competitor,
        ),
      },
    };
    const apex = buildPricePerformancePoints(state).find(
      (point) => point.id === "apex:apex-a4",
    );

    expect(apex?.priceUsd).toBe(234);
    expect(apex?.performanceScore).toBe(0.79);
  });

  it("omits retired competitors and inactive player products", () => {
    const product = stateWithProduct();
    const state = {
      ...product,
      market: {
        ...product.market,
        products: product.market.products.map((entry) => ({
          ...entry,
          status: "discontinued" as const,
        })),
        competitors: product.market.competitors.map((competitor) =>
          competitor.competitorId === "apex"
            ? { ...competitor, status: "retired" as const }
            : competitor,
        ),
      },
    };
    const points = buildPricePerformancePoints(state);

    expect(points.some((point) => point.kind === "player")).toBe(false);
    expect(points.some((point) => point.id.startsWith("apex:"))).toBe(false);
  });
});
