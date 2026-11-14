import { describe, expect, it } from "vitest";

import {
  CommercialOperationError,
  acceptCommercialOffer,
  buildCommercialAssets,
  declineCommercialOffer,
  runCommercialDay,
} from "./commercial";
import { generateCommercialOffer, type CommercialContract } from "../models/commercial";
import { getFinanceDailyRecord } from "../models/finance";
import { createInitialGameState } from "../models/game-state";
import { createDefaultOsConfiguration, createOsProject, type OsRelease } from "../models/os";

function stateWithOsRelease() {
  const base = createInitialGameState();
  const project = createOsProject("os-1", "Dynasty OS", createDefaultOsConfiguration(), "1995-01-01");
  const release: OsRelease = {
    id: "os-release-1",
    version: 1,
    stage: "stable",
    createdOn: "1995-01-01",
    configuration: createDefaultOsConfiguration(),
    qualityScore: 72,
    appealScore: 64,
    costUsd: 0,
  };
  return {
    ...base,
    osProjects: [{ ...project, releases: [release] }],
  };
}

function activeContract(overrides: Partial<CommercialContract> = {}): CommercialContract {
  return {
    id: "commercial-contract-1",
    offerId: "commercial-offer-1",
    partnerId: "orbit-devices",
    partnerName: "Orbit Devices",
    channel: "os-license",
    assetId: "os-license:os-1:os-release-1",
    assetName: "Dynasty OS Stable",
    signedOn: "1995-01-01",
    expiresOn: "1995-01-31",
    signingBonusUsd: 1000,
    dailyRevenueUsd: 100,
    dailyCostUsd: 0,
    totalRevenueUsd: 1000,
    qualityScore: 72,
    ...overrides,
  };
}

describe("commercial engine", () => {
  it("builds OS and app-store assets from a released OS", () => {
    const state = stateWithOsRelease();
    const assets = buildCommercialAssets({
      ...state,
      osProjects: state.osProjects.map((project) => ({
        ...project,
        releases: project.releases.map((release) => ({
          ...release,
          configuration: { ...release.configuration, appStore: "open" as const },
        })),
      })),
    });

    expect(assets.map((asset) => asset.channel)).toEqual(["app-store", "os-license"]);
    expect(assets.find((asset) => asset.channel === "os-license")?.qualityScore).toBe(72);
  });

  it("pays daily revenue, updates totals and expires contracts", () => {
    const state = {
      ...createInitialGameState(),
      commercialContracts: {
        offers: [],
        active: [activeContract()],
        lastOfferOn: "1995-01-01",
      },
    };

    const paid = runCommercialDay(state, "1995-01-02");
    expect(paid.company.balance).toBe(100_100);
    expect(paid.commercialContracts.active[0]?.totalRevenueUsd).toBe(1_100);

    const expired = runCommercialDay(paid, "1995-02-01");
    expect(expired.commercialContracts.active).toHaveLength(0);
    expect(expired.company.balance).toBe(100_100);
  });

  it("reconciles commercial revenue and cloud operating costs in finance", () => {
    const state = {
      ...createInitialGameState(),
      gameDate: "1995-01-10",
      commercialContracts: {
        offers: [],
        active: [
          activeContract({
            channel: "cloud-capacity",
            partnerId: "skygrid",
            partnerName: "SkyGrid",
            assetId: "cloud-capacity:cloud-1",
            assetName: "SkyGrid Cloud",
            dailyRevenueUsd: 100,
            dailyCostUsd: 25,
          }),
        ],
        lastOfferOn: "1995-01-10",
      },
    };

    const next = runCommercialDay(state, "1995-01-10");
    const record = getFinanceDailyRecord(next.finance, "1995-01-10");

    expect(next.company.balance).toBe(100_075);
    expect(record?.revenueUsd).toBe(100);
    expect(record?.overheadUsd).toBe(25);
  });

  it("accepts offers with signing bonus, reputation and a contract", () => {
    const state = stateWithOsRelease();
    const offer = generateCommercialOffer(state.commercialContracts, {
      date: state.gameDate,
      reputation: state.company.reputation,
      assets: buildCommercialAssets(state),
    });
    expect(offer).not.toBeNull();
    if (!offer) {
      return;
    }

    const accepted = acceptCommercialOffer(
      { ...state, commercialContracts: { ...state.commercialContracts, offers: [offer] } },
      offer.id,
    );

    expect(accepted.commercialContracts.offers).toHaveLength(0);
    expect(accepted.commercialContracts.active).toHaveLength(1);
    expect(accepted.company.balance).toBe(100_000 + offer.signingBonusUsd);
    expect(accepted.company.reputation).toBe(10.5);
  });

  it("declines offers and rejects unknown or expired offers", () => {
    const state = stateWithOsRelease();
    const offer = generateCommercialOffer(state.commercialContracts, {
      date: state.gameDate,
      reputation: state.company.reputation,
      assets: buildCommercialAssets(state),
    });
    expect(offer).not.toBeNull();
    if (!offer) {
      return;
    }

    expect(declineCommercialOffer(
      { ...state, commercialContracts: { ...state.commercialContracts, offers: [offer] } },
      offer.id,
    ).commercialContracts.offers).toHaveLength(0);

    expect(() => acceptCommercialOffer(state, "missing")).toThrow(CommercialOperationError);
    expect(() => acceptCommercialOffer(
      {
        ...state,
        gameDate: "1995-03-01",
        commercialContracts: { ...state.commercialContracts, offers: [offer] },
      },
      offer.id,
    )).toThrow(CommercialOperationError);
  });
});
