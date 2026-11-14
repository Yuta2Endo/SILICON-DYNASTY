import { describe, expect, it } from "vitest";

import {
  LegacyOperationError,
  chooseCompanyDoctrine,
} from "./legacy";
import { createInitialGameState } from "../models/game-state";
import { createCpuProject, createDefaultCpuConfiguration } from "../models/cpu";
import { estimateProductDailyDemand, orderProduction, releaseProduct } from "./market";
import {
  createInitialCommercialState,
  generateCommercialOffer,
} from "../models/commercial";
import type { CompanyDoctrineId } from "../models/legacy";

describe("legacy engine", () => {
  it("chooses a permanent company doctrine", () => {
    const next = chooseCompanyDoctrine(createInitialGameState(), "prestige");
    expect(next.legacy.doctrine).toBe("prestige");
  });

  it("rejects a second doctrine choice", () => {
    const chosen = chooseCompanyDoctrine(createInitialGameState(), "ecosystem");
    expect(() => chooseCompanyDoctrine(chosen, "prestige")).toThrow(LegacyOperationError);
  });

  it("rejects an unknown doctrine id", () => {
    expect(() => chooseCompanyDoctrine(
      createInitialGameState(),
      "unknown" as CompanyDoctrineId,
    )).toThrow(LegacyOperationError);
  });

  it("applies a commercial revenue multiplier to generated offers", () => {
    const offer = (revenueMultiplier: number) => generateCommercialOffer(
      createInitialCommercialState(),
      {
        date: "1995-01-01",
        reputation: 60,
        revenueMultiplier,
        assets: [{
          id: "os-license:os-1:os-release-1",
          channel: "os-license",
          name: "Dynasty OS",
          qualityScore: 70,
          appealScore: 60,
        }],
      },
    );

    const base = offer(1);
    const boosted = offer(1.18);
    expect(base).not.toBeNull();
    expect(boosted).not.toBeNull();
    expect(boosted!.dailyRevenueUsd).toBeGreaterThan(base!.dailyRevenueUsd);
  });

  it("applies doctrine to market appeal and manufacturing costs", () => {
    const base = {
      ...createInitialGameState(),
      cpuProjects: [
        createCpuProject("cpu-1", "Legacy CPU", createDefaultCpuConfiguration(), "1995-01-01"),
      ],
    };
    const released = releaseProduct(base, {
      projectId: "cpu-1",
      projectVersion: 1,
      name: "Legacy One",
      segmentId: "budget",
      priceUsd: 300,
    });
    const innovator = chooseCompanyDoctrine(released, "innovator");
    const costLeader = chooseCompanyDoctrine(released, "cost-leader");

    const baseDemand = estimateProductDailyDemand(released, "product-1", "1995-03-01");
    const innovatorDemand = estimateProductDailyDemand(innovator, "product-1", "1995-03-01");
    if (!baseDemand || !innovatorDemand) {
      throw new Error("Expected demand estimates for the released product.");
    }
    expect(innovatorDemand.share).toBeGreaterThan(baseDemand.share);

    const baseOrder = orderProduction(released, "product-1", 10);
    const costOrder = orderProduction(costLeader, "product-1", 10);
    const baseUnitCost = baseOrder.market.productionOrders[0]?.unitCostUsd ?? 0;
    const costUnitCost = costOrder.market.productionOrders[0]?.unitCostUsd ?? 0;
    expect(costUnitCost).toBeLessThan(baseUnitCost);
  });
});
