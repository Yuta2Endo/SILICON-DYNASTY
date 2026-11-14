import type { GameState } from "../models/game-state";
import { calculateLegacyScore } from "../models/legacy";

export function calculateCompanyLegacyScore(state: GameState): number {
  const latestSummary = state.market.dailySummaries.at(-1);
  const osReleases = state.osProjects.reduce(
    (total, project) => total + project.releases.length,
    0,
  );
  const aiDeployments = state.aiProjects.reduce(
    (total, project) => total + project.deployments.length,
    0,
  );
  const componentProducts = state.market.componentProducts.length;

  return calculateLegacyScore({
    reputation: state.company.reputation,
    lifetimeRevenueUsd: state.finance.lifetimeRevenueUsd,
    marketShare: latestSummary?.marketShare ?? 0,
    completedResearch: state.research.completedTechnologyIds.length,
    cpuProducts: state.market.products.length,
    componentProducts,
    osReleases,
    aiDeployments,
    deviceProjects: state.deviceProjects.length,
    cloudProjects: state.cloudProjects.length,
    commercialContracts: state.commercialContracts.active.length,
  });
}
