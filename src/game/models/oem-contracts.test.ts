import { describe, expect, it } from "vitest";
import {
  OEM_CONTRACT_LIMITS,
  createOemContract,
  createInitialOemContractState,
  generateOemContractOffer,
  getOemContractDemandBonus,
  parseOemContractState,
  type OemContractState,
} from "./oem-contracts";
import { createInitialGameState } from "./game-state";
import { createCpuProject, createDefaultCpuConfiguration } from "./cpu";
import { releaseProduct } from "../engine/market";

function stateWithReleasedProduct() {
  const state = createInitialGameState();
  const project = createCpuProject(
    "cpu-1",
    "Test CPU",
    createDefaultCpuConfiguration(),
    state.gameDate,
  );
  return releaseProduct(
    { ...state, cpuProjects: [project] },
    {
      projectId: "cpu-1",
      projectVersion: 1,
      name: "Test Chip",
      segmentId: "budget",
      priceUsd: 300,
    },
  );
}

describe("OEM contracts", () => {
  it("generates a deterministic offer for a released product", () => {
    const state = stateWithReleasedProduct();
    const contracts = createInitialOemContractState();
    const offer = generateOemContractOffer(contracts, {
      date: state.gameDate,
      reputation: state.company.reputation,
      products: state.market.products,
    });

    expect(offer).not.toBeNull();
    expect(offer?.productId).toBe("product-1");
    expect(offer?.customerId).toMatch(/^(orbit|lumina)$/);
    expect(offer?.upfrontUsd).toBeGreaterThanOrEqual(5_000);
    expect(offer?.durationDays).toBeGreaterThanOrEqual(OEM_CONTRACT_LIMITS.minDurationDays);
    expect(offer?.demandBonusPercent).toBeGreaterThan(0);

    const repeat = generateOemContractOffer(contracts, {
      date: state.gameDate,
      reputation: state.company.reputation,
      products: state.market.products,
    });
    expect(repeat).toEqual(offer);
  });

  it("sums active demand bonuses and ignores expired contracts", () => {
    const contracts: OemContractState = {
      offers: [],
      active: [
        {
          id: "oem-contract-1",
          offerId: "oem-offer-1",
          customerId: "orbit",
          customerName: "Orbit Devices",
          productId: "product-1",
          productName: "Test Chip",
          segmentId: "budget",
          signedOn: "1995-01-01",
          expiresOn: "1995-06-01",
          upfrontUsd: 10_000,
          demandBonusPercent: 12,
          minimumReputation: 0,
        },
        {
          id: "oem-contract-2",
          offerId: "oem-offer-2",
          customerId: "lumina",
          customerName: "Lumina Mobile",
          productId: "product-1",
          productName: "Test Chip",
          segmentId: "budget",
          signedOn: "1995-01-01",
          expiresOn: "1995-02-01",
          upfrontUsd: 9_000,
          demandBonusPercent: 20,
          minimumReputation: 10,
        },
      ],
      lastOfferOn: null,
    };

    expect(getOemContractDemandBonus(contracts, "product-1", "budget", "1995-01-15")).toBe(32);
    expect(getOemContractDemandBonus(contracts, "product-1", "budget", "1995-03-01")).toBe(12);
    expect(getOemContractDemandBonus(contracts, "product-1", "mainstream", "1995-01-15")).toBe(0);
  });

  it("round-trips offers and active contracts through the parser", () => {
    const state = stateWithReleasedProduct();
    const contracts = createInitialOemContractState();
    const offer = generateOemContractOffer(contracts, {
      date: state.gameDate,
      reputation: state.company.reputation,
      products: state.market.products,
    });
    expect(offer).not.toBeNull();
    if (!offer) {
      return;
    }

    const contract = createOemContract(offer, "oem-contract-1", state.gameDate);
    const saved: OemContractState = {
      offers: [offer],
      active: [contract],
      lastOfferOn: state.gameDate,
    };

    expect(parseOemContractState(saved)).toEqual(saved);
  });

  it("rejects duplicate offer IDs", () => {
    const state = stateWithReleasedProduct();
    const contracts = createInitialOemContractState();
    const offer = generateOemContractOffer(contracts, {
      date: state.gameDate,
      reputation: state.company.reputation,
      products: state.market.products,
    });
    expect(offer).not.toBeNull();
    if (!offer) {
      return;
    }

    expect(() => parseOemContractState({
      offers: [offer, offer],
      active: [],
      lastOfferOn: null,
    })).toThrow("duplicated");
  });
});
