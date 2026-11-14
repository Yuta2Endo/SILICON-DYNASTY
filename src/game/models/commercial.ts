import { addDays, daysBetween, isValidDateOnly } from "./date";

export const COMMERCIAL_CHANNELS = [
  "os-license",
  "ai-api",
  "device-supply",
  "cloud-capacity",
  "app-store",
] as const;

export type CommercialChannel = (typeof COMMERCIAL_CHANNELS)[number];

export interface CommercialPartnerDefinition {
  id: string;
  name: string;
  channel: CommercialChannel;
  minReputation: number;
}

export const COMMERCIAL_PARTNERS = [
  { id: "orbit-devices", name: "Orbit Devices", channel: "os-license", minReputation: 0 },
  { id: "northstar-computing", name: "Northstar Computing", channel: "os-license", minReputation: 15 },
  { id: "cloudline-ai", name: "Cloudline AI", channel: "ai-api", minReputation: 0 },
  { id: "atlas-inference", name: "Atlas Inference", channel: "ai-api", minReputation: 15 },
  { id: "lumina-retail", name: "Lumina Retail", channel: "device-supply", minReputation: 0 },
  { id: "titan-gaming", name: "Titan Gaming", channel: "device-supply", minReputation: 20 },
  { id: "skygrid", name: "SkyGrid", channel: "cloud-capacity", minReputation: 0 },
  { id: "dataharbor", name: "DataHarbor", channel: "cloud-capacity", minReputation: 25 },
  { id: "appwave", name: "AppWave", channel: "app-store", minReputation: 0 },
  { id: "nexus-store", name: "Nexus Store", channel: "app-store", minReputation: 30 },
] as const satisfies readonly CommercialPartnerDefinition[];

export const COMMERCIAL_LIMITS = {
  maxOffers: 6,
  maxActive: 10,
  offerTtlDays: 21,
  offerIntervalDays: 7,
  minDurationDays: 120,
  maxDurationDays: 360,
} as const;

export const COMMERCIAL_CHANNEL_BASE_DAILY_USD: Record<CommercialChannel, number> = {
  "os-license": 60,
  "ai-api": 85,
  "device-supply": 120,
  "cloud-capacity": 100,
  "app-store": 40,
};

export interface CommercialAsset {
  id: string;
  channel: CommercialChannel;
  name: string;
  qualityScore: number;
  appealScore: number;
  dailyCostUsd?: number;
}

export interface CommercialOffer {
  id: string;
  partnerId: string;
  partnerName: string;
  channel: CommercialChannel;
  assetId: string;
  assetName: string;
  createdOn: string;
  expiresOn: string;
  durationDays: number;
  signingBonusUsd: number;
  dailyRevenueUsd: number;
  dailyCostUsd: number;
  minimumReputation: number;
  qualityScore: number;
}

export interface CommercialContract {
  id: string;
  offerId: string;
  partnerId: string;
  partnerName: string;
  channel: CommercialChannel;
  assetId: string;
  assetName: string;
  signedOn: string;
  expiresOn: string;
  signingBonusUsd: number;
  dailyRevenueUsd: number;
  dailyCostUsd: number;
  totalRevenueUsd: number;
  qualityScore: number;
}

export interface CommercialState {
  offers: CommercialOffer[];
  active: CommercialContract[];
  lastOfferOn: string | null;
}

export interface CommercialOfferContext {
  date: string;
  reputation: number;
  assets: readonly CommercialAsset[];
  revenueMultiplier?: number;
}

export class InvalidCommercialDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCommercialDataError";
  }
}

export function createInitialCommercialState(): CommercialState {
  return {
    offers: [],
    active: [],
    lastOfferOn: null,
  };
}

export function getCommercialPartner(partnerId: string): CommercialPartnerDefinition | undefined {
  return COMMERCIAL_PARTNERS.find((partner) => partner.id === partnerId);
}

export function getCommercialOfferDaysRemaining(offer: CommercialOffer, date: string): number {
  return Math.max(0, daysBetween(date, offer.expiresOn));
}

export function getCommercialContractDaysRemaining(contract: CommercialContract, date: string): number {
  return Math.max(0, daysBetween(date, contract.expiresOn));
}

export function getCommercialDailyRevenueByChannel(
  contracts: readonly CommercialContract[],
  date: string,
): Record<CommercialChannel, number> {
  const totals: Record<CommercialChannel, number> = {
    "os-license": 0,
    "ai-api": 0,
    "device-supply": 0,
    "cloud-capacity": 0,
    "app-store": 0,
  };

  for (const contract of contracts) {
    if (contract.expiresOn > date) {
      totals[contract.channel] = roundUsd(totals[contract.channel] + contract.dailyRevenueUsd);
    }
  }

  return totals;
}

export function generateCommercialOffer(
  state: CommercialState,
  context: CommercialOfferContext,
): CommercialOffer | null {
  if (state.offers.length >= COMMERCIAL_LIMITS.maxOffers || state.active.length >= COMMERCIAL_LIMITS.maxActive) {
    return null;
  }

  const occupiedAssetIds = new Set([
    ...state.offers.map((offer) => offer.assetId),
    ...state.active.filter((contract) => contract.expiresOn > context.date).map((contract) => contract.assetId),
  ]);
  const eligible = context.assets
    .filter((asset) => asset.qualityScore > 0 && !occupiedAssetIds.has(asset.id))
    .sort((left, right) => left.id.localeCompare(right.id));

  if (eligible.length === 0) {
    return null;
  }

  const seed = Math.max(0, daysBetween("1995-01-01", context.date))
    + state.offers.length * 13
    + state.active.length * 7
    + context.assets.length;
  const asset = eligible[seed % eligible.length];
  if (!asset) {
    return null;
  }

  const partners = COMMERCIAL_PARTNERS.filter((partner) =>
    partner.channel === asset.channel && partner.minReputation <= context.reputation,
  );
  if (partners.length === 0) {
    return null;
  }

  const partner = partners[(seed + Math.round(asset.qualityScore)) % partners.length];
  if (!partner) {
    return null;
  }

  const durationDays = 180 + (seed % 3) * 90;
  const base = COMMERCIAL_CHANNEL_BASE_DAILY_USD[asset.channel];
  const revenueMultiplier = Math.max(0.1, context.revenueMultiplier ?? 1);
  const dailyRevenueUsd = roundUsd(Math.max(
    25,
    base * (0.35 + asset.qualityScore / 100) * (0.5 + asset.appealScore / 100) * revenueMultiplier,
  ));
  const signingBonusUsd = roundUsd(dailyRevenueUsd * (10 + (seed % 6)));

  return {
    id: nextOfferId(state),
    partnerId: partner.id,
    partnerName: partner.name,
    channel: asset.channel,
    assetId: asset.id,
    assetName: asset.name,
    createdOn: context.date,
    expiresOn: addDays(context.date, COMMERCIAL_LIMITS.offerTtlDays),
    durationDays,
    signingBonusUsd,
    dailyRevenueUsd,
    dailyCostUsd: roundUsd(asset.dailyCostUsd ?? 0),
    minimumReputation: partner.minReputation,
    qualityScore: roundScore(asset.qualityScore),
  };
}

export function createCommercialContract(
  offer: CommercialOffer,
  id: string,
  signedOn: string,
): CommercialContract {
  return {
    id,
    offerId: offer.id,
    partnerId: offer.partnerId,
    partnerName: offer.partnerName,
    channel: offer.channel,
    assetId: offer.assetId,
    assetName: offer.assetName,
    signedOn,
    expiresOn: addDays(signedOn, offer.durationDays),
    signingBonusUsd: offer.signingBonusUsd,
    dailyRevenueUsd: offer.dailyRevenueUsd,
    dailyCostUsd: offer.dailyCostUsd,
    totalRevenueUsd: offer.signingBonusUsd,
    qualityScore: offer.qualityScore,
  };
}

export function nextOfferId(state: CommercialState): string {
  return nextId("commercial-offer-", state.offers.map((offer) => offer.id));
}

export function nextContractId(state: CommercialState): string {
  return nextId("commercial-contract-", state.active.map((contract) => contract.id));
}

export function parseCommercialState(value: unknown): CommercialState {
  if (!isRecord(value)) {
    throw new InvalidCommercialDataError("Commercial contract data must be an object.");
  }

  if (
    !Array.isArray(value.offers)
    || !Array.isArray(value.active)
    || (value.lastOfferOn !== null && typeof value.lastOfferOn !== "string")
    || value.offers.length > COMMERCIAL_LIMITS.maxOffers
    || value.active.length > COMMERCIAL_LIMITS.maxActive
  ) {
    throw new InvalidCommercialDataError("Commercial contract state is invalid.");
  }

  if (value.lastOfferOn !== null && !isValidDateOnly(value.lastOfferOn)) {
    throw new InvalidCommercialDataError("Commercial offer date is invalid.");
  }

  const offers = value.offers.map(parseCommercialOffer);
  const active = value.active.map(parseCommercialContract);

  if (new Set(offers.map((offer) => offer.id)).size !== offers.length) {
    throw new InvalidCommercialDataError("Commercial offer IDs are duplicated.");
  }
  if (new Set(active.map((contract) => contract.id)).size !== active.length) {
    throw new InvalidCommercialDataError("Commercial contract IDs are duplicated.");
  }

  return { offers, active, lastOfferOn: value.lastOfferOn };
}

function parseCommercialOffer(value: unknown): CommercialOffer {
  if (!isRecord(value)) {
    throw new InvalidCommercialDataError("Commercial offer is invalid.");
  }
  assertCommonFields(value);

  if (
    typeof value.createdOn !== "string"
    || !isValidDateOnly(value.createdOn)
    || typeof value.expiresOn !== "string"
    || !isValidDateOnly(value.expiresOn)
    || value.expiresOn < value.createdOn
    || typeof value.durationDays !== "number"
    || !Number.isInteger(value.durationDays)
    || value.durationDays < COMMERCIAL_LIMITS.minDurationDays
    || value.durationDays > COMMERCIAL_LIMITS.maxDurationDays
    || typeof value.minimumReputation !== "number"
    || !Number.isFinite(value.minimumReputation)
    || value.minimumReputation < 0
    || value.minimumReputation > 100
  ) {
    throw new InvalidCommercialDataError("Commercial offer dates are invalid.");
  }

  return {
    id: value.id,
    partnerId: value.partnerId,
    partnerName: value.partnerName,
    channel: value.channel,
    assetId: value.assetId,
    assetName: value.assetName,
    createdOn: value.createdOn,
    expiresOn: value.expiresOn,
    durationDays: value.durationDays,
    signingBonusUsd: roundUsd(value.signingBonusUsd),
    dailyRevenueUsd: roundUsd(value.dailyRevenueUsd),
    dailyCostUsd: parseDailyCost(value.dailyCostUsd),
    minimumReputation: value.minimumReputation,
    qualityScore: roundScore(value.qualityScore),
  };
}

function parseCommercialContract(value: unknown): CommercialContract {
  if (!isRecord(value)) {
    throw new InvalidCommercialDataError("Commercial contract is invalid.");
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
    || typeof value.totalRevenueUsd !== "number"
    || !Number.isFinite(value.totalRevenueUsd)
    || value.totalRevenueUsd < 0
  ) {
    throw new InvalidCommercialDataError("Commercial contract dates are invalid.");
  }

  return {
    id: value.id,
    offerId: value.offerId,
    partnerId: value.partnerId,
    partnerName: value.partnerName,
    channel: value.channel,
    assetId: value.assetId,
    assetName: value.assetName,
    signedOn: value.signedOn,
    expiresOn: value.expiresOn,
    signingBonusUsd: roundUsd(value.signingBonusUsd),
    dailyRevenueUsd: roundUsd(value.dailyRevenueUsd),
    dailyCostUsd: parseDailyCost(value.dailyCostUsd),
    totalRevenueUsd: roundUsd(value.totalRevenueUsd),
    qualityScore: roundScore(value.qualityScore),
  };
}

function assertCommonFields(value: Record<string, unknown>): asserts value is Record<string, unknown> & {
  id: string;
  partnerId: string;
  partnerName: string;
  channel: CommercialChannel;
  assetId: string;
  assetName: string;
  signingBonusUsd: number;
  dailyRevenueUsd: number;
  qualityScore: number;
} {
  if (
    typeof value.id !== "string"
    || value.id.length < 2
    || typeof value.partnerId !== "string"
    || typeof value.partnerName !== "string"
    || value.partnerName.length < 2
    || !isCommercialChannel(value.channel)
    || typeof value.assetId !== "string"
    || value.assetId.length < 2
    || typeof value.assetName !== "string"
    || value.assetName.length < 2
    || typeof value.signingBonusUsd !== "number"
    || !Number.isFinite(value.signingBonusUsd)
    || value.signingBonusUsd <= 0
    || typeof value.dailyRevenueUsd !== "number"
    || !Number.isFinite(value.dailyRevenueUsd)
    || value.dailyRevenueUsd <= 0
    || typeof value.qualityScore !== "number"
    || !Number.isFinite(value.qualityScore)
    || value.qualityScore < 0
    || value.qualityScore > 100
  ) {
    throw new InvalidCommercialDataError("Commercial contract fields are invalid.");
  }

  const partner = getCommercialPartner(value.partnerId);
  if (!partner || partner.channel !== value.channel) {
    throw new InvalidCommercialDataError("Commercial partner is invalid.");
  }
}

export function isCommercialChannel(value: unknown): value is CommercialChannel {
  return typeof value === "string" && (COMMERCIAL_CHANNELS as readonly string[]).includes(value);
}

function parseDailyCost(value: unknown): number {
  if (value === undefined) {
    return 0;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new InvalidCommercialDataError("Commercial daily cost is invalid.");
  }
  return roundUsd(value);
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

function roundScore(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
