import { describe, expect, it } from "vitest";

import {
  COMPANY_DOCTRINE_EFFECTS,
  NEUTRAL_DOCTRINE_EFFECTS,
  InvalidLegacyDataError,
  calculateLegacyScore,
  createInitialLegacyState,
  getDoctrineEffects,
  getReputationContractMultiplier,
  getReputationTier,
  parseLegacyState,
} from "./legacy";

describe("legacy model", () => {
  it("starts without a doctrine and returns neutral effects", () => {
    expect(createInitialLegacyState()).toEqual({ doctrine: null });
    expect(getDoctrineEffects(null)).toEqual(NEUTRAL_DOCTRINE_EFFECTS);
    expect(getDoctrineEffects("ecosystem")).toEqual(COMPANY_DOCTRINE_EFFECTS.ecosystem);
  });

  it("maps reputation to tiers and contract multipliers", () => {
    expect(getReputationTier(0).id).toBe("unknown");
    expect(getReputationTier(24.9).id).toBe("unknown");
    expect(getReputationTier(25).id).toBe("rising");
    expect(getReputationTier(50).id).toBe("respected");
    expect(getReputationTier(75).id).toBe("elite");
    expect(getReputationTier(90).id).toBe("legend");
    expect(getReputationContractMultiplier(100)).toBe(1.12);
  });

  it("calculates a bounded legacy score from all strategic inputs", () => {
    expect(calculateLegacyScore({
      reputation: 100,
      lifetimeRevenueUsd: 2_000_000,
      marketShare: 0.25,
      completedResearch: 10,
      cpuProducts: 4,
      componentProducts: 3,
      osReleases: 2,
      aiDeployments: 1,
      deviceProjects: 1,
      cloudProjects: 1,
      commercialContracts: 2,
    })).toBe(440);

    expect(calculateLegacyScore({
      reputation: 100,
      lifetimeRevenueUsd: 100_000_000,
      marketShare: 1,
      completedResearch: 100,
      cpuProducts: 100,
      componentProducts: 100,
      osReleases: 100,
      aiDeployments: 100,
      deviceProjects: 100,
      cloudProjects: 100,
      commercialContracts: 100,
    })).toBe(1000);
  });

  it("parses valid and legacy legacy state", () => {
    expect(parseLegacyState({ doctrine: "prestige" })).toEqual({ doctrine: "prestige" });
    expect(parseLegacyState({ doctrine: null })).toEqual({ doctrine: null });
    expect(parseLegacyState(undefined, { allowMissing: true })).toEqual({ doctrine: null });
    expect(() => parseLegacyState(undefined)).toThrow(InvalidLegacyDataError);
    expect(() => parseLegacyState({ doctrine: "unknown" })).toThrow(InvalidLegacyDataError);
  });
});
