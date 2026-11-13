import { addDays, daysBetween } from "../models/date";
import type { MarketSegmentDefinition } from "../models/market";

export const PRESS_OUTLET_IDS = [
  "silicon-times",
  "chip-report",
  "byte-review",
  "workstation-weekly",
] as const;

export type PressOutletId = (typeof PRESS_OUTLET_IDS)[number];

export type PressSentiment = "positive" | "mixed" | "negative";

export type PressHeadlineKey =
  | "value"
  | "performance"
  | "overpriced"
  | "balanced";

export interface PressReviewInput {
  productId: string;
  productName: string;
  segment: MarketSegmentDefinition;
  releaseDate: string;
  date: string;
  priceUsd: number;
  performanceScore: number;
  reputation: number;
}

export interface PressReview {
  productId: string;
  productName: string;
  outletId: PressOutletId;
  publishedOn: string;
  cycle: number;
  score: number;
  sentiment: PressSentiment;
  headlineKey: PressHeadlineKey;
  demandFactor: number;
}

export const PRESS_REVIEW_FIRST_DAY = 30;
export const PRESS_REVIEW_CYCLE_DAYS = 90;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function seededUnit(seed: number): number {
  let value = seed | 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value ^= value >>> 16;
  return (value >>> 0) / 4_294_967_296;
}

function productSeed(productId: string, cycle: number): number {
  let hash = 2166136261;
  for (const character of `${productId}:${cycle}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash | 0;
}

export function getPressDemandFactor(score: number): number {
  return round(clamp(0.92 + score * 0.0016, 0.9, 1.1), 3);
}

export function getPressReview(input: PressReviewInput): PressReview | null {
  const daysOnMarket = Math.max(0, daysBetween(input.releaseDate, input.date));
  if (daysOnMarket < PRESS_REVIEW_FIRST_DAY) {
    return null;
  }

  const cycle = Math.floor(
    (daysOnMarket - PRESS_REVIEW_FIRST_DAY) / PRESS_REVIEW_CYCLE_DAYS,
  );
  const publishedOn = addDays(
    input.releaseDate,
    PRESS_REVIEW_FIRST_DAY + cycle * PRESS_REVIEW_CYCLE_DAYS,
  );
  const seed = productSeed(input.productId, cycle);
  const priceDelta = clamp(
    (input.segment.referencePriceUsd / Math.max(input.priceUsd, 1) - 1) * 35,
    -20,
    20,
  );
  const performanceDelta = clamp(
    (input.performanceScore / input.segment.referencePerformanceScore - 1) * 30,
    -15,
    20,
  );
  const reputationDelta = (input.reputation - 50) * 0.12;
  const noise = (seededUnit(seed) - 0.5) * 10;
  const score = round(clamp(
    52 + priceDelta + performanceDelta + reputationDelta + noise,
    5,
    98,
  ));

  const sentiment: PressSentiment = score >= 70
    ? "positive"
    : score >= 45
      ? "mixed"
      : "negative";
  const headlineKey: PressHeadlineKey = priceDelta < -8
    ? "overpriced"
    : priceDelta > 5
      ? "value"
      : performanceDelta > 10
        ? "performance"
        : "balanced";
  const outletId = PRESS_OUTLET_IDS[
    Math.floor(seededUnit(seed ^ 0x9e3779b9) * PRESS_OUTLET_IDS.length)
  ] ?? PRESS_OUTLET_IDS[0];

  return {
    productId: input.productId,
    productName: input.productName,
    outletId,
    publishedOn,
    cycle,
    score,
    sentiment,
    headlineKey,
    demandFactor: getPressDemandFactor(score),
  };
}
