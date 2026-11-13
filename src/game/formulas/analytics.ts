import type { GameState } from "../models/game-state";
import type { MarketSegmentId } from "../models/market";
import { addDays } from "../models/date";
import { getTechnology } from "../models/research";

export type AnalyticsRangeDays = 7 | 30 | 90;

export const ANALYTICS_RANGE_OPTIONS: readonly AnalyticsRangeDays[] = [7, 30, 90];

export interface AnalyticsPoint {
  date: string;
  revenueUsd: number;
  expensesUsd: number;
  netProfitUsd: number;
  unitsSold: number;
  marketShare: number;
}

export interface AnalyticsSegmentSummary {
  segmentId: MarketSegmentId;
  playerUnits: number;
  totalUnits: number;
  share: number;
}

export interface AnalyticsProductSummary {
  id: string;
  name: string;
  kind: "cpu" | "component";
  segmentId: MarketSegmentId | null;
  unitsSold: number;
  revenueUsd: number;
  status: "active" | "discontinued";
}

export interface AnalyticsCorporateSummary {
  revenueUsd: number;
  expensesUsd: number;
  netProfitUsd: number;
  manufacturingUsd: number;
  payrollUsd: number;
  overheadUsd: number;
  marketingUsd: number;
  researchUsd: number;
  releaseUsd: number;
  interestUsd: number;
  taxUsd: number;
  netMargin: number;
  averageDailyRevenueUsd: number;
  averageDailyProfitUsd: number;
  closingBalanceUsd: number;
  dailyOperatingCostUsd: number;
  cashRunwayDays: number | null;
  debtUsd: number;
  lifetimeRevenueUsd: number;
  lifetimeExpensesUsd: number;
  lifetimeTaxesUsd: number;
  lifetimeInterestUsd: number;
  lifetimeFinancingUsd: number;
}

export interface AnalyticsMarketSummary {
  playerUnits: number;
  totalDemandUnits: number;
  marketShare: number;
  revenueUsd: number;
  componentUnits: number;
  componentDemandUnits: number;
  componentRevenueUsd: number;
  activeProducts: number;
  activeComponentProducts: number;
  competitorActions: number;
  bestDay: { date: string; revenueUsd: number } | null;
  segments: AnalyticsSegmentSummary[];
  topProducts: AnalyticsProductSummary[];
}

export interface AnalyticsTechnologySummary {
  researchCompleted: number;
  researchInvestedUsd: number;
  activeResearch: {
    technologyId: string;
    name: string;
    progressDays: number;
    durationDays: number;
    progress: number;
  } | null;
  cpuProjects: number;
  componentProjects: number;
  osProjects: number;
  aiProjects: number;
  deviceProjects: number;
  cloudProjects: number;
  totalProjects: number;
  totalVersions: number;
  osReleases: number;
  aiDeployments: number;
}

export interface AnalyticsReport {
  rangeDays: AnalyticsRangeDays;
  fromDate: string | null;
  toDate: string | null;
  points: AnalyticsPoint[];
  corporate: AnalyticsCorporateSummary;
  market: AnalyticsMarketSummary;
  technology: AnalyticsTechnologySummary;
}

export function buildAnalyticsReport(state: GameState, rangeDays: AnalyticsRangeDays): AnalyticsReport {
  const cutoff = addDays(state.gameDate, -rangeDays);
  const records = state.finance.dailyRecords.filter((record) => record.date >= cutoff);
  const summaries = state.market.dailySummaries.filter((summary) => summary.date >= cutoff);
  const summariesByDate = new Map(summaries.map((summary) => [summary.date, summary]));

  const points: AnalyticsPoint[] = records.map((record) => ({
    date: record.date,
    revenueUsd: record.revenueUsd,
    expensesUsd: dailyExpenses(record),
    netProfitUsd: record.netProfitUsd,
    unitsSold: record.unitsSold,
    marketShare: summariesByDate.get(record.date)?.marketShare ?? 0,
  }));

  const revenueUsd = sum(points, (point) => point.revenueUsd);
  const expensesUsd = sum(points, (point) => point.expensesUsd);
  const netProfitUsd = sum(points, (point) => point.netProfitUsd);
  const latestRecord = records.at(-1);
  const dailyOperatingCostUsd = latestRecord
    ? latestRecord.payrollUsd
      + latestRecord.overheadUsd
      + latestRecord.marketingUsd
      + latestRecord.interestUsd
    : 0;
  const debtUsd = state.finance.loan?.principalUsd ?? 0;

  const playerUnits = sum(summaries, (summary) => summary.playerUnits);
  const totalDemandUnits = sum(summaries, (summary) => summary.totalDemandUnits);
  const segmentTotals = new Map<MarketSegmentId, { playerUnits: number; totalUnits: number }>();
  for (const summary of summaries) {
    for (const [segmentId, result] of Object.entries(summary.segments) as Array<
      [MarketSegmentId, { playerUnits: number; totalUnits: number }]
    >) {
      const current = segmentTotals.get(segmentId) ?? { playerUnits: 0, totalUnits: 0 };
      current.playerUnits += result.playerUnits;
      current.totalUnits += result.totalUnits;
      segmentTotals.set(segmentId, current);
    }
  }

  const segments: AnalyticsSegmentSummary[] = [...segmentTotals.entries()]
    .map(([segmentId, totals]) => ({
      segmentId,
      playerUnits: totals.playerUnits,
      totalUnits: totals.totalUnits,
      share: totals.totalUnits > 0 ? totals.playerUnits / totals.totalUnits : 0,
    }))
    .sort((left, right) => right.totalUnits - left.totalUnits);

  const topProducts: AnalyticsProductSummary[] = [
    ...state.market.products.map((product) => ({
      id: product.id,
      name: product.name,
      kind: "cpu" as const,
      segmentId: product.segmentId,
      unitsSold: product.unitsSold,
      revenueUsd: product.revenueUsd,
      status: product.status,
    })),
    ...state.market.componentProducts.map((product) => ({
      id: product.id,
      name: product.name,
      kind: "component" as const,
      segmentId: null,
      unitsSold: product.unitsSold,
      revenueUsd: product.revenueUsd,
      status: product.status,
    })),
  ]
    .sort((left, right) => right.revenueUsd - left.revenueUsd)
    .slice(0, 5);

  const bestDay = summaries.reduce<{ date: string; revenueUsd: number } | null>(
    (best, summary) =>
      !best || summary.playerRevenueUsd > best.revenueUsd
        ? { date: summary.date, revenueUsd: summary.playerRevenueUsd }
        : best,
    null,
  );

  const activeResearchTechnology = state.research.activeProject
    ? getTechnology(state.research.activeProject.technologyId)
    : undefined;
  const activeResearchDuration = activeResearchTechnology?.durationDays ?? 0;

  const totalVersions = [
    ...state.cpuProjects,
    ...state.componentProjects,
    ...state.osProjects,
    ...state.aiProjects,
    ...state.deviceProjects,
    ...state.cloudProjects,
  ].reduce((total, project) => total + project.versions.length, 0);

  const technology: AnalyticsTechnologySummary = {
    researchCompleted: state.research.completedTechnologyIds.length,
    researchInvestedUsd: state.research.totalInvestedUsd,
    activeResearch: state.research.activeProject
      ? {
        technologyId: state.research.activeProject.technologyId,
        name: state.research.activeProject.technologyId,
        progressDays: state.research.activeProject.progressDays,
        durationDays: activeResearchDuration,
        progress: activeResearchDuration > 0
          ? Math.min(1, state.research.activeProject.progressDays / activeResearchDuration)
          : 0,
      }
      : null,
    cpuProjects: state.cpuProjects.length,
    componentProjects: state.componentProjects.length,
    osProjects: state.osProjects.length,
    aiProjects: state.aiProjects.length,
    deviceProjects: state.deviceProjects.length,
    cloudProjects: state.cloudProjects.length,
    totalProjects: state.cpuProjects.length
      + state.componentProjects.length
      + state.osProjects.length
      + state.aiProjects.length
      + state.deviceProjects.length
      + state.cloudProjects.length,
    totalVersions,
    osReleases: state.osProjects.reduce((total, project) => total + project.releases.length, 0),
    aiDeployments: state.aiProjects.reduce((total, project) => total + project.deployments.length, 0),
  };

  return {
    rangeDays,
    fromDate: points[0]?.date ?? null,
    toDate: points.at(-1)?.date ?? null,
    points,
    corporate: {
      revenueUsd,
      expensesUsd,
      netProfitUsd,
      manufacturingUsd: sum(records, (record) => record.manufacturingUsd),
      payrollUsd: sum(records, (record) => record.payrollUsd),
      overheadUsd: sum(records, (record) => record.overheadUsd),
      marketingUsd: sum(records, (record) => record.marketingUsd),
      researchUsd: sum(records, (record) => record.researchUsd),
      releaseUsd: sum(records, (record) => record.releaseUsd),
      interestUsd: sum(records, (record) => record.interestUsd),
      taxUsd: sum(records, (record) => record.taxUsd),
      netMargin: revenueUsd > 0 ? netProfitUsd / revenueUsd : 0,
      averageDailyRevenueUsd: records.length > 0 ? revenueUsd / records.length : 0,
      averageDailyProfitUsd: records.length > 0 ? netProfitUsd / records.length : 0,
      closingBalanceUsd: state.company.balance,
      dailyOperatingCostUsd,
      cashRunwayDays: dailyOperatingCostUsd > 0
        ? Math.floor(state.company.balance / dailyOperatingCostUsd)
        : null,
      debtUsd,
      lifetimeRevenueUsd: state.finance.lifetimeRevenueUsd,
      lifetimeExpensesUsd: state.finance.lifetimeExpensesUsd,
      lifetimeTaxesUsd: state.finance.lifetimeTaxesUsd,
      lifetimeInterestUsd: state.finance.lifetimeInterestUsd,
      lifetimeFinancingUsd: state.finance.lifetimeFinancingUsd,
    },
    market: {
      playerUnits,
      totalDemandUnits,
      marketShare: totalDemandUnits > 0 ? playerUnits / totalDemandUnits : 0,
      revenueUsd: sum(summaries, (summary) => summary.playerRevenueUsd),
      componentUnits: sum(summaries, (summary) => summary.componentUnits),
      componentDemandUnits: sum(summaries, (summary) => summary.componentDemandUnits),
      componentRevenueUsd: sum(summaries, (summary) => summary.componentRevenueUsd),
      activeProducts: state.market.products.filter((product) => product.status === "active").length,
      activeComponentProducts: state.market.componentProducts.filter(
        (product) => product.status === "active",
      ).length,
      competitorActions: state.market.actions.filter((action) => action.date >= cutoff).length,
      bestDay,
      segments,
      topProducts,
    },
    technology,
  };
}

export function analyticsCsv(report: AnalyticsReport): string {
  const header = "date,revenue_usd,expenses_usd,net_profit_usd,units_sold,market_share";
  const rows = report.points.map((point) => [
    point.date,
    point.revenueUsd.toFixed(2),
    point.expensesUsd.toFixed(2),
    point.netProfitUsd.toFixed(2),
    String(point.unitsSold),
    point.marketShare.toFixed(6),
  ].join(","));
  return [header, ...rows].join("\n");
}

function dailyExpenses(record: GameState["finance"]["dailyRecords"][number]): number {
  return record.manufacturingUsd
    + record.payrollUsd
    + record.overheadUsd
    + record.marketingUsd
    + record.researchUsd
    + record.releaseUsd
    + record.interestUsd
    + record.taxUsd;
}

function sum<T>(items: readonly T[], select: (item: T) => number): number {
  return items.reduce((total, item) => total + select(item), 0);
}
