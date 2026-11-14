import { describe, expect, it } from "vitest";

import {
  createCommercialContract,
  createInitialCommercialState,
  generateCommercialOffer,
  getCommercialDailyRevenueByChannel,
  parseCommercialState,
  type CommercialAsset,
} from "./commercial";

const ASSETS: CommercialAsset[] = [
  {
    id: "ai-api:ai-1:ai-deployment-1",
    channel: "ai-api",
    name: "Dynasty AI API",
    qualityScore: 65,
    appealScore: 58,
  },
  {
    id: "os-license:os-1:os-release-1",
    channel: "os-license",
    name: "Dynasty OS Stable",
    qualityScore: 72,
    appealScore: 64,
  },
];

describe("commercial contracts", () => {
  it("generates deterministic offers and avoids occupied assets", () => {
    const state = createInitialCommercialState();
    const context = { date: "1995-01-01", reputation: 50, assets: ASSETS };

    const first = generateCommercialOffer(state, context);
    const second = generateCommercialOffer(state, context);

    expect(first).not.toBeNull();
    expect(second).toEqual(first);
    expect(["ai-api", "os-license"]).toContain(first?.channel);

    const occupied = {
      ...state,
      offers: first ? [first] : [],
    };
    const next = generateCommercialOffer(occupied, context);
    expect(next?.assetId).not.toBe(first?.assetId);
    expect(next?.id).not.toBe(first?.id);
  });

  it("sums only active contracts by channel", () => {
    const base = generateCommercialOffer(createInitialCommercialState(), {
      date: "1995-01-01",
      reputation: 50,
      assets: ASSETS,
    });
    expect(base).not.toBeNull();
    if (!base) {
      return;
    }

    const osContract = {
      ...createCommercialContract(
        {
          ...base,
          partnerId: "orbit-devices",
          partnerName: "Orbit Devices",
          channel: "os-license",
          assetId: "os-license:os-1:os-release-1",
          assetName: "Dynasty OS",
        },
        "commercial-contract-1",
        "1995-01-01",
      ),
      dailyRevenueUsd: 120,
    };
    const aiContract = {
      ...createCommercialContract(
        {
          ...base,
          partnerId: "cloudline-ai",
          partnerName: "Cloudline AI",
          channel: "ai-api",
          assetId: "ai-api:ai-1:ai-deployment-1",
          assetName: "Dynasty AI API",
        },
        "commercial-contract-2",
        "1995-01-01",
      ),
      dailyRevenueUsd: 80,
    };

    expect(getCommercialDailyRevenueByChannel([osContract, aiContract], "1995-02-01")).toEqual({
      "os-license": 120,
      "ai-api": 80,
      "device-supply": 0,
      "cloud-capacity": 0,
      "app-store": 0,
    });
    expect(getCommercialDailyRevenueByChannel([osContract, aiContract], "1996-06-01")).toEqual({
      "os-license": 0,
      "ai-api": 0,
      "device-supply": 0,
      "cloud-capacity": 0,
      "app-store": 0,
    });
  });

  it("round-trips commercial state and rejects tampering", () => {
    const offer = generateCommercialOffer(createInitialCommercialState(), {
      date: "1995-01-01",
      reputation: 50,
      assets: ASSETS,
    });
    expect(offer).not.toBeNull();
    if (!offer) {
      return;
    }

    const contract = createCommercialContract(offer, "commercial-contract-1", "1995-01-01");
    const state = {
      offers: [offer],
      active: [contract],
      lastOfferOn: "1995-01-01",
    };

    expect(parseCommercialState(state)).toEqual(state);
    expect(() => parseCommercialState({ ...state, active: [{ ...contract, expiresOn: "1994-01-01" }] })).toThrow();
  });
});
