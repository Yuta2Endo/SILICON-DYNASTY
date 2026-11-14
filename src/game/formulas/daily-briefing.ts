import type { GameState } from "../models/game-state";

export interface DailyBriefing {
  date: string;
  revenueUsd: number;
  expensesUsd: number;
  netProfitUsd: number;
  unitsSold: number;
  marketSharePercent: number;
  revenueDeltaUsd: number;
  profitDeltaUsd: number;
  unitsDelta: number;
  marketShareDeltaPoints: number;
  oemOffers: number;
  commercialOffers: number;
  competitorExits: number;
  stockouts: number;
}

/**
 * Derived, non-persisted summary of the most recently simulated day.
 *
 * Finance records and market summaries are written for the simulated date
 * before the calendar advances, so the latest record is the day the player
 * just completed.
 */
export function buildDailyBriefing(state: GameState): DailyBriefing | null {
  const latestFinance = state.finance.dailyRecords.at(-1);
  if (!latestFinance) {
    return null;
  }

  const previousFinance = state.finance.dailyRecords.at(-2);
  const latestMarket = state.market.dailySummaries.at(-1);
  const previousMarket = state.market.dailySummaries.at(-2);
  const latestShare = (latestMarket?.marketShare ?? 0) * 100;
  const previousShare = (previousMarket?.marketShare ?? 0) * 100;
  const activeProducts = state.market.products.filter((product) => product.status === "active");
  const competitorExits = state.market.actions.filter(
    (action) => action.date === latestFinance.date && action.type === "market-exit",
  ).length;

  return {
    date: latestFinance.date,
    revenueUsd: latestFinance.revenueUsd,
    expensesUsd: latestFinance.revenueUsd - latestFinance.netProfitUsd,
    netProfitUsd: latestFinance.netProfitUsd,
    unitsSold: latestFinance.unitsSold,
    marketSharePercent: latestShare,
    revenueDeltaUsd: latestFinance.revenueUsd - (previousFinance?.revenueUsd ?? 0),
    profitDeltaUsd: latestFinance.netProfitUsd - (previousFinance?.netProfitUsd ?? 0),
    unitsDelta: latestFinance.unitsSold - (previousFinance?.unitsSold ?? 0),
    marketShareDeltaPoints: latestShare - previousShare,
    oemOffers: state.oemContracts.offers.length,
    commercialOffers: state.commercialContracts.offers.length,
    competitorExits,
    stockouts: activeProducts.filter((product) => product.inventoryUnits === 0).length,
  };
}
