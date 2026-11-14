import type { GameState } from "../models/game-state";
import {
  COMPETITORS,
  type MarketSegmentId,
} from "../models/market";

export type PricePerformanceKind = "player" | "competitor";

export interface PricePerformancePoint {
  id: string;
  name: string;
  kind: PricePerformanceKind;
  segmentId: MarketSegmentId;
  priceUsd: number;
  performanceScore: number;
  sourceName: string;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Builds the price/performance map from the same persisted products and
 * competitor multipliers used by the daily market simulation.
 */
export function buildPricePerformancePoints(state: GameState): PricePerformancePoint[] {
  const playerPoints: PricePerformancePoint[] = state.market.products
    .filter((product) => product.status === "active")
    .map((product) => ({
      id: product.id,
      name: product.name,
      kind: "player",
      segmentId: product.segmentId,
      priceUsd: product.priceUsd,
      performanceScore: product.performanceScore,
      sourceName: product.name,
    }));

  const competitorPoints: PricePerformancePoint[] = [];
  for (const competitor of COMPETITORS) {
    const competitorState = state.market.competitors.find(
      (entry) => entry.competitorId === competitor.id,
    );
    if (!competitorState || competitorState.status !== "active") {
      continue;
    }
    for (const product of competitor.products) {
      competitorPoints.push({
        id: `${competitor.id}:${product.id}`,
        name: product.name,
        kind: "competitor",
        segmentId: product.segmentId,
        priceUsd: round(product.basePriceUsd * competitorState.priceMultiplier),
        performanceScore: round(product.basePerformanceScore * competitorState.performanceMultiplier),
        sourceName: competitor.name,
      });
    }
  }

  return [...playerPoints, ...competitorPoints];
}
