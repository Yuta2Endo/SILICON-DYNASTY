import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../models/game-state";
import { createCpuProject, createDefaultCpuConfiguration } from "../models/cpu";
import { releaseProduct, estimateProductDailyDemand } from "./market";
import {
  OemContractOperationError,
  acceptOemContract,
  declineOemContract,
  runOemContractDay,
} from "./oem-contracts";
import { generateOemContractOffer } from "../models/oem-contracts";

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

function stateWithOffer() {
  const state = runOemContractDay(stateWithReleasedProduct(), "1995-01-01");
  const offer = state.oemContracts.offers[0];
  expect(offer).toBeTruthy();
  return { state, offer: offer! };
}

describe("OEM contract engine", () => {
  it("creates a timed offer on the daily tick", () => {
    const state = runOemContractDay(stateWithReleasedProduct(), "1995-01-01");

    expect(state.oemContracts.offers).toHaveLength(1);
    expect(state.oemContracts.lastOfferOn).toBe("1995-01-01");
    expect(state.oemContracts.offers[0]?.expiresOn).toBe("1995-01-22");
  });

  it("accepts an offer for an upfront payment and adds it to active contracts", () => {
    const { state, offer } = stateWithOffer();
    const accepted = acceptOemContract(state, offer.id);

    expect(accepted.oemContracts.offers).toEqual([]);
    expect(accepted.oemContracts.active).toHaveLength(1);
    expect(accepted.oemContracts.active[0]?.customerId).toBe(offer.customerId);
    expect(accepted.company.balance).toBe(state.company.balance + offer.upfrontUsd);
    expect(accepted.company.reputation).toBe(10.5);
    expect(accepted.finance.transactions[0]?.category).toBe("sales");
  });

  it("declines an offer without changing the balance", () => {
    const { state, offer } = stateWithOffer();
    const declined = declineOemContract(state, offer.id);

    expect(declined.oemContracts.offers).toEqual([]);
    expect(declined.company.balance).toBe(state.company.balance);
  });

  it("rejects unknown, expired and duplicate offers", () => {
    const { state, offer } = stateWithOffer();

    expect(() => acceptOemContract(state, "missing")).toThrow(OemContractOperationError);
    expect(() => acceptOemContract({
      ...state,
      gameDate: "1995-02-01",
    }, offer.id)).toThrow(OemContractOperationError);

    const accepted = acceptOemContract(state, offer.id);
    const duplicateOffer = generateOemContractOffer(accepted.oemContracts, {
      date: accepted.gameDate,
      reputation: accepted.company.reputation,
      products: accepted.market.products,
    });
    // The released product is already under contract, so no second offer is generated.
    expect(duplicateOffer).toBeNull();
  });

  it("expires active contracts after their term", () => {
    const { state, offer } = stateWithOffer();
    const accepted = acceptOemContract(state, offer.id);
    const contract = accepted.oemContracts.active[0];
    expect(contract).toBeTruthy();
    if (!contract) {
      return;
    }

    const expired = runOemContractDay({
      ...accepted,
      gameDate: contract.expiresOn,
    }, contract.expiresOn);

    expect(expired.oemContracts.active).toEqual([]);
  });

  it("increases the product demand estimate while a contract is active", () => {
    const { state, offer } = stateWithOffer();
    const baseline = estimateProductDailyDemand(state, "product-1", state.gameDate);
    const accepted = acceptOemContract(state, offer.id);
    const boosted = estimateProductDailyDemand(accepted, "product-1", accepted.gameDate);

    expect(baseline).not.toBeNull();
    expect(boosted).not.toBeNull();
    if (!baseline || !boosted) {
      return;
    }
    expect(boosted.share).toBeGreaterThan(baseline.share);
  });
});
