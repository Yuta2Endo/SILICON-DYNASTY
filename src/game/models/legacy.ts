export const COMPANY_DOCTRINE_OPTIONS = [
  "innovator",
  "cost-leader",
  "ecosystem",
  "prestige",
] as const;

export type CompanyDoctrineId = (typeof COMPANY_DOCTRINE_OPTIONS)[number];

export interface DoctrineEffects {
  manufacturingCostMultiplier: number;
  commercialRevenueMultiplier: number;
  reputationGainMultiplier: number;
  marketAppealMultiplier: number;
}

export const COMPANY_DOCTRINE_EFFECTS: Record<CompanyDoctrineId, DoctrineEffects> = {
  innovator: {
    manufacturingCostMultiplier: 1.1,
    commercialRevenueMultiplier: 1,
    reputationGainMultiplier: 1,
    marketAppealMultiplier: 1.12,
  },
  "cost-leader": {
    manufacturingCostMultiplier: 0.82,
    commercialRevenueMultiplier: 1,
    reputationGainMultiplier: 0.9,
    marketAppealMultiplier: 0.94,
  },
  ecosystem: {
    manufacturingCostMultiplier: 1.05,
    commercialRevenueMultiplier: 1.18,
    reputationGainMultiplier: 1.05,
    marketAppealMultiplier: 0.98,
  },
  prestige: {
    manufacturingCostMultiplier: 1.08,
    commercialRevenueMultiplier: 1.08,
    reputationGainMultiplier: 1.3,
    marketAppealMultiplier: 1.03,
  },
};

export const NEUTRAL_DOCTRINE_EFFECTS: DoctrineEffects = {
  manufacturingCostMultiplier: 1,
  commercialRevenueMultiplier: 1,
  reputationGainMultiplier: 1,
  marketAppealMultiplier: 1,
};

export interface LegacyState {
  doctrine: CompanyDoctrineId | null;
}

export type ReputationTierId = "unknown" | "rising" | "respected" | "elite" | "legend";

export interface ReputationTier {
  id: ReputationTierId;
  minReputation: number;
  nextTierAt: number | null;
  contractRevenueMultiplier: number;
}

export const REPUTATION_TIERS: readonly ReputationTier[] = [
  { id: "unknown", minReputation: 0, nextTierAt: 25, contractRevenueMultiplier: 1 },
  { id: "rising", minReputation: 25, nextTierAt: 50, contractRevenueMultiplier: 1.02 },
  { id: "respected", minReputation: 50, nextTierAt: 75, contractRevenueMultiplier: 1.05 },
  { id: "elite", minReputation: 75, nextTierAt: 90, contractRevenueMultiplier: 1.08 },
  { id: "legend", minReputation: 90, nextTierAt: null, contractRevenueMultiplier: 1.12 },
];

export interface LegacyScoreInput {
  reputation: number;
  lifetimeRevenueUsd: number;
  marketShare: number;
  completedResearch: number;
  cpuProducts: number;
  componentProducts: number;
  osReleases: number;
  aiDeployments: number;
  deviceProjects: number;
  cloudProjects: number;
  commercialContracts: number;
}

export class InvalidLegacyDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidLegacyDataError";
  }
}

export function createInitialLegacyState(): LegacyState {
  return { doctrine: null };
}

export function isCompanyDoctrineId(value: unknown): value is CompanyDoctrineId {
  return typeof value === "string"
    && (COMPANY_DOCTRINE_OPTIONS as readonly string[]).includes(value);
}

export function getDoctrineEffects(doctrine: CompanyDoctrineId | null): DoctrineEffects {
  return doctrine ? COMPANY_DOCTRINE_EFFECTS[doctrine] : NEUTRAL_DOCTRINE_EFFECTS;
}

export function getReputationTier(reputation: number): ReputationTier {
  const normalized = Math.min(100, Math.max(0, Number.isFinite(reputation) ? reputation : 0));
  return [...REPUTATION_TIERS]
    .reverse()
    .find((tier) => normalized >= tier.minReputation) ?? REPUTATION_TIERS[0]!;
}

export function getReputationContractMultiplier(reputation: number): number {
  return getReputationTier(reputation).contractRevenueMultiplier;
}

export function calculateLegacyScore(input: LegacyScoreInput): number {
  const reputation = clamp(input.reputation, 0, 100) * 2;
  const revenue = Math.min(180, Math.max(0, input.lifetimeRevenueUsd) / 1_000_000 * 18);
  const share = clamp(input.marketShare, 0, 1) * 400;
  const research = clamp(input.completedResearch, 0, 27) * 4;
  const products = clamp(input.cpuProducts, 0, 30) * 3
    + clamp(input.componentProducts, 0, 30) * 2;
  const ecosystem = clamp(input.osReleases, 0, 20) * 8
    + clamp(input.aiDeployments, 0, 20) * 8
    + clamp(input.deviceProjects, 0, 20) * 6
    + clamp(input.cloudProjects, 0, 20) * 6;
  const contracts = clamp(input.commercialContracts, 0, 10) * 5;

  return Math.round(clamp(
    reputation + revenue + share + research + products + ecosystem + contracts,
    0,
    1000,
  ));
}

export function parseLegacyState(
  value: unknown,
  options: { allowMissing?: boolean } = {},
): LegacyState {
  if (!value || typeof value !== "object") {
    if (options.allowMissing) {
      return createInitialLegacyState();
    }
    throw new InvalidLegacyDataError("Legacy state is missing.");
  }

  const record = value as Record<string, unknown>;
  const doctrine = record.doctrine;
  if (doctrine === null || doctrine === undefined) {
    return createInitialLegacyState();
  }
  if (!isCompanyDoctrineId(doctrine)) {
    throw new InvalidLegacyDataError("Legacy doctrine is invalid.");
  }

  return { doctrine };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
