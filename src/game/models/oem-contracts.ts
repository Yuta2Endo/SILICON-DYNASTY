import { addDays, daysBetween, isValidDateOnly } from "./date";
import {
  MARKET_SEGMENT_IDS,
  type MarketProduct,
  type MarketSegmentId,
} from "./market";

export const OEM_CONTRACT_LIMITS = {
  maxOffers: 5,
  maxActive: 8,
  offerTtlDays: 21,
  offerIntervalDays: 14,
  minDurationDays: 90,
  maxDurationDays: 365,
  maxDemandBonusPercent: 50,
} as const;

export interface OemCustomerDefinition {
  id: string;
  name: string;
  minReputation: number;
  preferredSegments: readonly MarketSegmentId[];
}

export const OEM_CUSTOMERS = [
  {
    id: "northstar",
    name: "Northstar Computing",
    minReputation: 5,
    preferredSegments: ["mainstream", "performance"],
  },
  {
    id: "lumina",
    name: "Lumina Mobile",
    minReputation: 10,
    preferredSegments: ["budget", "mainstream"],
  },
  {
    id: "vertex",
    name: "Vertex Workstations",
    minReputation: 25,
    preferredSegments: ["workstation", "enterprise"],
  },
  {
    id: "orbit",
    name: "Orbit Devices",
    minReputation: 0,
    preferredSegments: ["budget", "mainstream", "performance"],
  },
  {
    id: "titan",
    name: "Titan Gaming",
    minReputation: 20,
    preferredSegments: ["enthusiast", "performance"],
  },
  {
    id: "meridian",
    name: "Meridian Cloud",
    minReputation: 35,
    preferredSegments: ["workstation", "enterprise"],
  },
] as const satisfies readonly OemCustomerDefinition[];

export interface OemContractOffer {
  id: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  segmentId: MarketSegmentId;
  createdOn: string;
  expiresOn: string;
  durationDays: number;
  upfrontUsd: number;
  demandBonusPercent: number;
  minimumReputation: number;
}

export interface OemContract {
  id: string;
  offerId: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  segmentId: MarketSegmentId;
  signedOn: string;
  expiresOn: string;
  upfrontUsd: number;
  demandBonusPercent: number;
  minimumReputation: number;
}

export interface OemContractState {
  offers: OemContractOffer[];
  active: OemContract[];
  lastOfferOn: string | null;
}

export interface OemOfferContext {
  date: string;
  reputation: number;
  products: readonly MarketProduct[];
}

export class InvalidOemContractDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidOemContractDataError";
  }
}

export function createInitialOemContractState(): OemContractState {
  return {
    offers: [],
    active: [],
    lastOfferOn: null,
  };
}

export function getOemCustomer(customerId: string): OemCustomerDefinition | undefined {
  return OEM_CUSTOMERS.find((customer) => customer.id === customerId);
}

export function getOemContractDemandBonus(
  contracts: OemContractState,
  productId: string,
  segmentId: MarketSegmentId,
  date: string,
): number {
  const bonus = contracts.active
    .filter((contract) =>
      contract.productId === productId
      && contract.segmentId === segmentId
      && contract.expiresOn > date,
    )
    .reduce((total, contract) => total + contract.demandBonusPercent, 0);

  return Math.min(OEM_CONTRACT_LIMITS.maxDemandBonusPercent, bonus);
}

export function getOemContractDaysRemaining(contract: OemContract, date: string): number {
  return Math.max(0, daysBetween(date, contract.expiresOn));
}

export function generateOemContractOffer(
  contracts: OemContractState,
  context: OemOfferContext,
): OemContractOffer | null {
  if (
    contracts.offers.length >= OEM_CONTRACT_LIMITS.maxOffers
    || contracts.active.length >= OEM_CONTRACT_LIMITS.maxActive
  ) {
    return null;
  }

  const contractedProductIds = new Set([
    ...contracts.active.map((contract) => contract.productId),
    ...contracts.offers.map((offer) => offer.productId),
  ]);
  const eligibleProducts = context.products.filter((product) =>
    product.status === "active" && !contractedProductIds.has(product.id),
  );

  if (eligibleProducts.length === 0) {
    return null;
  }

  const seed = Math.max(0, daysBetween("1995-01-01", context.date))
    + contracts.active.length * 11
    + contracts.offers.length * 7
    + context.products.length;
  const product = eligibleProducts[seed % eligibleProducts.length];
  if (!product) {
    return null;
  }

  const customers = OEM_CUSTOMERS.filter((customer) =>
    customer.minReputation <= context.reputation
    && (customer.preferredSegments as readonly MarketSegmentId[]).includes(product.segmentId),
  );
  if (customers.length === 0) {
    return null;
  }

  const customer = customers[(seed + Math.floor(product.performanceScore * 10)) % customers.length];
  if (!customer) {
    return null;
  }

  const durationDays = 120 + (seed % 4) * 60;
  const demandBonusPercent = Math.max(
    5,
    Math.min(
      35,
      Math.round(6 + product.performanceScore * 3 + context.reputation * 0.15),
    ),
  );
  const upfrontUsd = roundUsd(Math.max(
    5_000,
    product.priceUsd * (250 + Math.round(product.performanceScore * 150)) * 0.08,
  ));

  return {
    id: nextOfferId(contracts),
    customerId: customer.id,
    customerName: customer.name,
    productId: product.id,
    productName: product.name,
    segmentId: product.segmentId,
    createdOn: context.date,
    expiresOn: addDays(context.date, OEM_CONTRACT_LIMITS.offerTtlDays),
    durationDays,
    upfrontUsd,
    demandBonusPercent,
    minimumReputation: customer.minReputation,
  };
}

export function createOemContract(
  offer: OemContractOffer,
  id: string,
  signedOn: string,
): OemContract {
  return {
    id,
    offerId: offer.id,
    customerId: offer.customerId,
    customerName: offer.customerName,
    productId: offer.productId,
    productName: offer.productName,
    segmentId: offer.segmentId,
    signedOn,
    expiresOn: addDays(signedOn, offer.durationDays),
    upfrontUsd: offer.upfrontUsd,
    demandBonusPercent: offer.demandBonusPercent,
    minimumReputation: offer.minimumReputation,
  };
}

export function nextOfferId(contracts: OemContractState): string {
  return nextId("oem-offer-", contracts.offers.map((offer) => offer.id));
}

export function nextContractId(contracts: OemContractState): string {
  return nextId("oem-contract-", contracts.active.map((contract) => contract.id));
}

export function parseOemContractState(value: unknown): OemContractState {
  if (!isRecord(value)) {
    throw new InvalidOemContractDataError("OEM contract data must be an object.");
  }

  if (
    !Array.isArray(value.offers)
    || !Array.isArray(value.active)
    || (value.lastOfferOn !== null && typeof value.lastOfferOn !== "string")
    || value.offers.length > OEM_CONTRACT_LIMITS.maxOffers
    || value.active.length > OEM_CONTRACT_LIMITS.maxActive
  ) {
    throw new InvalidOemContractDataError("OEM contract state is invalid.");
  }

  if (value.lastOfferOn !== null && !isValidDateOnly(value.lastOfferOn)) {
    throw new InvalidOemContractDataError("OEM offer date is invalid.");
  }

  const offers = value.offers.map(parseOemContractOffer);
  const active = value.active.map(parseOemContract);

  if (new Set(offers.map((offer) => offer.id)).size !== offers.length) {
    throw new InvalidOemContractDataError("OEM offer IDs are duplicated.");
  }
  if (new Set(active.map((contract) => contract.id)).size !== active.length) {
    throw new InvalidOemContractDataError("OEM contract IDs are duplicated.");
  }

  return {
    offers,
    active,
    lastOfferOn: value.lastOfferOn,
  };
}

function parseOemContractOffer(value: unknown): OemContractOffer {
  if (!isRecord(value)) {
    throw new InvalidOemContractDataError("OEM offer is invalid.");
  }

  assertCommonFields(value);
  const durationDays = value.durationDays;
  if (
    typeof value.createdOn !== "string"
    || !isValidDateOnly(value.createdOn)
    || typeof value.expiresOn !== "string"
    || !isValidDateOnly(value.expiresOn)
    || value.expiresOn < value.createdOn
    || typeof durationDays !== "number"
    || !Number.isInteger(durationDays)
    || durationDays < OEM_CONTRACT_LIMITS.minDurationDays
    || durationDays > OEM_CONTRACT_LIMITS.maxDurationDays
  ) {
    throw new InvalidOemContractDataError("OEM offer dates are invalid.");
  }

  return {
    id: value.id,
    customerId: value.customerId,
    customerName: value.customerName,
    productId: value.productId,
    productName: value.productName,
    segmentId: value.segmentId,
    createdOn: value.createdOn,
    expiresOn: value.expiresOn,
    durationDays,
    upfrontUsd: roundUsd(value.upfrontUsd),
    demandBonusPercent: value.demandBonusPercent,
    minimumReputation: value.minimumReputation,
  };
}

function parseOemContract(value: unknown): OemContract {
  if (!isRecord(value)) {
    throw new InvalidOemContractDataError("OEM contract is invalid.");
  }

  assertCommonFields(value);
  if (
    typeof value.offerId !== "string"
    || value.offerId.length < 2
    || typeof value.signedOn !== "string"
    || !isValidDateOnly(value.signedOn)
    || typeof value.expiresOn !== "string"
    || !isValidDateOnly(value.expiresOn)
    || value.expiresOn <= value.signedOn
  ) {
    throw new InvalidOemContractDataError("OEM contract dates are invalid.");
  }

  return {
    id: value.id,
    offerId: value.offerId,
    customerId: value.customerId,
    customerName: value.customerName,
    productId: value.productId,
    productName: value.productName,
    segmentId: value.segmentId,
    signedOn: value.signedOn,
    expiresOn: value.expiresOn,
    upfrontUsd: roundUsd(value.upfrontUsd),
    demandBonusPercent: value.demandBonusPercent,
    minimumReputation: value.minimumReputation,
  };
}

function assertCommonFields(value: Record<string, unknown>): asserts value is Record<string, unknown> & {
  id: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  segmentId: MarketSegmentId;
  upfrontUsd: number;
  demandBonusPercent: number;
  minimumReputation: number;
} {
  if (
    typeof value.id !== "string"
    || value.id.length < 2
    || typeof value.customerId !== "string"
    || !getOemCustomer(value.customerId)
    || typeof value.customerName !== "string"
    || value.customerName.length < 2
    || typeof value.productId !== "string"
    || value.productId.length < 2
    || typeof value.productName !== "string"
    || value.productName.length < 2
    || typeof value.segmentId !== "string"
    || !MARKET_SEGMENT_IDS.includes(value.segmentId as MarketSegmentId)
    || typeof value.upfrontUsd !== "number"
    || !Number.isFinite(value.upfrontUsd)
    || value.upfrontUsd <= 0
    || typeof value.demandBonusPercent !== "number"
    || !Number.isFinite(value.demandBonusPercent)
    || value.demandBonusPercent <= 0
    || value.demandBonusPercent > OEM_CONTRACT_LIMITS.maxDemandBonusPercent
    || typeof value.minimumReputation !== "number"
    || !Number.isFinite(value.minimumReputation)
    || value.minimumReputation < 0
    || value.minimumReputation > 100
  ) {
    throw new InvalidOemContractDataError("OEM contract fields are invalid.");
  }
}

function nextId(prefix: string, values: readonly string[]): string {
  const highest = values.reduce((max, id) => {
    const numeric = Number.parseInt(id.slice(prefix.length), 10);
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
  }, 0);
  return `${prefix}${highest + 1}`;
}

function roundUsd(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
