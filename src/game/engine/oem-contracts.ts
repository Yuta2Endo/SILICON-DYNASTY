import { addDays } from "../models/date";
import type { GameState } from "../models/game-state";
import {
  OEM_CONTRACT_LIMITS,
  createOemContract,
  generateOemContractOffer,
  nextContractId,
  type OemContractState,
} from "../models/oem-contracts";
import { postFinanceTransaction } from "./finance";
import { getDoctrineEffects } from "../models/legacy";

export type OemContractOperationCode =
  | "offer-not-found"
  | "offer-expired"
  | "product-unavailable"
  | "duplicate-contract";

export class OemContractOperationError extends Error {
  constructor(readonly code: OemContractOperationCode, message: string) {
    super(message);
    this.name = "OemContractOperationError";
  }
}

export function runOemContractDay(state: GameState, date: string): GameState {
  const active = state.oemContracts.active.filter((contract) => contract.expiresOn > date);
  const offers = state.oemContracts.offers.filter((offer) => offer.expiresOn >= date);
  let contracts: OemContractState = {
    ...state.oemContracts,
    active,
    offers,
  };

  const isOfferDue = contracts.lastOfferOn === null
    || date >= addDays(contracts.lastOfferOn, OEM_CONTRACT_LIMITS.offerIntervalDays);

  if (isOfferDue) {
    const offer = generateOemContractOffer(contracts, {
      date,
      reputation: state.company.reputation,
      products: state.market.products,
    });

    if (offer) {
      contracts = {
        ...contracts,
        offers: [...contracts.offers, offer],
        lastOfferOn: date,
      };
    }
  }

  return { ...state, oemContracts: contracts };
}

export function acceptOemContract(state: GameState, offerId: string): GameState {
  const offer = state.oemContracts.offers.find((candidate) => candidate.id === offerId);
  if (!offer) {
    throw new OemContractOperationError("offer-not-found", "OEM offer was not found.");
  }
  if (state.gameDate > offer.expiresOn) {
    throw new OemContractOperationError("offer-expired", "OEM offer has expired.");
  }

  const product = state.market.products.find((candidate) =>
    candidate.id === offer.productId && candidate.status === "active",
  );
  if (!product) {
    throw new OemContractOperationError("product-unavailable", "The offered product is no longer on sale.");
  }

  const hasDuplicate = state.oemContracts.active.some((contract) =>
    contract.expiresOn > state.gameDate
    && contract.productId === offer.productId
    && contract.customerId === offer.customerId,
  );
  if (hasDuplicate) {
    throw new OemContractOperationError(
      "duplicate-contract",
      "This customer already has an active contract for the product.",
    );
  }

  const contract = createOemContract(
    offer,
    nextContractId(state.oemContracts),
    state.gameDate,
  );
  const nextState: GameState = {
    ...state,
    company: {
      ...state.company,
      reputation: Math.min(
        100,
        Math.round(
          (state.company.reputation
            + 0.5 * getDoctrineEffects(state.legacy.doctrine).reputationGainMultiplier) * 100,
        ) / 100,
      ),
    },
    oemContracts: {
      ...state.oemContracts,
      offers: state.oemContracts.offers.filter((candidate) => candidate.id !== offerId),
      active: [...state.oemContracts.active, contract],
    },
  };

  return postFinanceTransaction(
    nextState,
    "sales",
    offer.upfrontUsd,
    `OEM design win: ${offer.customerName} / ${offer.productName}`,
  );
}

export function declineOemContract(state: GameState, offerId: string): GameState {
  if (!state.oemContracts.offers.some((offer) => offer.id === offerId)) {
    throw new OemContractOperationError("offer-not-found", "OEM offer was not found.");
  }

  return {
    ...state,
    oemContracts: {
      ...state.oemContracts,
      offers: state.oemContracts.offers.filter((offer) => offer.id !== offerId),
    },
  };
}
