import {
  cloneComponentConfiguration,
  isComponentType,
  parseComponentConfiguration,
  validateComponentName,
  type ComponentConfiguration,
  type ComponentType,
} from "./components";
import { cloneCpuConfiguration, parseCpuConfiguration, type CpuConfiguration, type CpuIsa } from "./cpu";
import { addDays, isValidDateOnly } from "./date";

export const MARKET_SEGMENT_IDS = [
  "budget",
  "mainstream",
  "performance",
  "enthusiast",
  "workstation",
  "enterprise",
] as const;

export type MarketSegmentId = (typeof MARKET_SEGMENT_IDS)[number];

export interface MarketSegmentDefinition {
  id: MarketSegmentId;
  baseDailyUnits: number;
  annualGrowthRate: number;
  referencePriceUsd: number;
  referencePerformanceScore: number;
  priceElasticity: number;
  performanceElasticity: number;
  isaAppealMultipliers: Record<CpuIsa, number>;
}

export const MARKET_SEGMENTS: readonly MarketSegmentDefinition[] = [
  {
    id: "budget",
    baseDailyUnits: 6_000,
    annualGrowthRate: 0.035,
    referencePriceUsd: 260,
    referencePerformanceScore: 0.7,
    priceElasticity: 1.15,
    performanceElasticity: 0.4,
    isaAppealMultipliers: { x86: 1, arm: 1.05, "risc-v": 0.95 },
  },
  {
    id: "mainstream",
    baseDailyUnits: 4_200,
    annualGrowthRate: 0.05,
    referencePriceUsd: 580,
    referencePerformanceScore: 1,
    priceElasticity: 1,
    performanceElasticity: 0.5,
    isaAppealMultipliers: { x86: 1.05, arm: 1, "risc-v": 0.85 },
  },
  {
    id: "performance",
    baseDailyUnits: 1_800,
    annualGrowthRate: 0.055,
    referencePriceUsd: 1_300,
    referencePerformanceScore: 1.55,
    priceElasticity: 0.9,
    performanceElasticity: 0.6,
    isaAppealMultipliers: { x86: 1.08, arm: 0.95, "risc-v": 0.85 },
  },
  {
    id: "enthusiast",
    baseDailyUnits: 800,
    annualGrowthRate: 0.045,
    referencePriceUsd: 2_300,
    referencePerformanceScore: 2.2,
    priceElasticity: 0.8,
    performanceElasticity: 0.65,
    isaAppealMultipliers: { x86: 1.1, arm: 0.9, "risc-v": 0.8 },
  },
  {
    id: "workstation",
    baseDailyUnits: 380,
    annualGrowthRate: 0.04,
    referencePriceUsd: 3_600,
    referencePerformanceScore: 2,
    priceElasticity: 0.7,
    performanceElasticity: 0.55,
    isaAppealMultipliers: { x86: 1.08, arm: 0.9, "risc-v": 0.9 },
  },
  {
    id: "enterprise",
    baseDailyUnits: 220,
    annualGrowthRate: 0.03,
    referencePriceUsd: 5_200,
    referencePerformanceScore: 1.4,
    priceElasticity: 0.6,
    performanceElasticity: 0.5,
    isaAppealMultipliers: { x86: 1.12, arm: 0.85, "risc-v": 0.7 },
  },
] as const;

export type CompetitorStrategy =
  | "volume"
  | "aggressive"
  | "premium"
  | "performance"
  | "balanced"
  | "enterprise";

export interface CompetitorProductDefinition {
  id: string;
  name: string;
  segmentId: MarketSegmentId;
  basePriceUsd: number;
  basePerformanceScore: number;
  appealStrength: number;
}

export interface CompetitorDefinition {
  id: string;
  name: string;
  strategy: CompetitorStrategy;
  actionIntervalDays: number;
  firstActionOffsetDays: number;
  products: readonly CompetitorProductDefinition[];
}

export const COMPETITORS: readonly CompetitorDefinition[] = [
  {
    id: "apex",
    name: "Apex Microsystems",
    strategy: "premium",
    actionIntervalDays: 45,
    firstActionOffsetDays: 7,
    products: [
      { id: "apex-a4", name: "Apex A4-66", segmentId: "budget", basePriceUsd: 260, basePerformanceScore: 0.72, appealStrength: 22 },
      { id: "apex-a5", name: "Apex A5-100", segmentId: "mainstream", basePriceUsd: 620, basePerformanceScore: 1.05, appealStrength: 26 },
      { id: "apex-a6", name: "Apex A6 Pro", segmentId: "performance", basePriceUsd: 1_350, basePerformanceScore: 1.55, appealStrength: 24 },
    ],
  },
  {
    id: "nova",
    name: "Nova Semiconductors",
    strategy: "volume",
    actionIntervalDays: 30,
    firstActionOffsetDays: 3,
    products: [
      { id: "nova-value", name: "Nova Value 80", segmentId: "budget", basePriceUsd: 210, basePerformanceScore: 0.6, appealStrength: 18 },
      { id: "nova-office", name: "Nova Office 120", segmentId: "mainstream", basePriceUsd: 480, basePerformanceScore: 0.9, appealStrength: 20 },
      { id: "nova-station", name: "Nova Station 3", segmentId: "workstation", basePriceUsd: 3_200, basePerformanceScore: 1.6, appealStrength: 18 },
    ],
  },
  {
    id: "vector",
    name: "Vector Logic",
    strategy: "aggressive",
    actionIntervalDays: 25,
    firstActionOffsetDays: 5,
    products: [
      { id: "vector-v1", name: "Vector V1", segmentId: "budget", basePriceUsd: 240, basePerformanceScore: 0.68, appealStrength: 20 },
      { id: "vector-v2", name: "Vector V2", segmentId: "mainstream", basePriceUsd: 540, basePerformanceScore: 1, appealStrength: 24 },
      { id: "vector-extreme", name: "Vector Extreme", segmentId: "enthusiast", basePriceUsd: 2_100, basePerformanceScore: 2, appealStrength: 20 },
    ],
  },
  {
    id: "northbridge",
    name: "Northbridge Computing",
    strategy: "balanced",
    actionIntervalDays: 60,
    firstActionOffsetDays: 11,
    products: [
      { id: "northbridge-nb90", name: "Northbridge NB-90", segmentId: "mainstream", basePriceUsd: 580, basePerformanceScore: 1.1, appealStrength: 22 },
      { id: "northbridge-pro", name: "Northbridge Pro", segmentId: "performance", basePriceUsd: 1_250, basePerformanceScore: 1.5, appealStrength: 20 },
      { id: "northbridge-ws", name: "Northbridge WS", segmentId: "workstation", basePriceUsd: 3_500, basePerformanceScore: 1.9, appealStrength: 16 },
    ],
  },
  {
    id: "titan",
    name: "Titan Works",
    strategy: "performance",
    actionIntervalDays: 90,
    firstActionOffsetDays: 17,
    products: [
      { id: "titan-hx", name: "Titan HX", segmentId: "enthusiast", basePriceUsd: 2_400, basePerformanceScore: 2.2, appealStrength: 24 },
      { id: "titan-station", name: "Titan Station", segmentId: "workstation", basePriceUsd: 3_900, basePerformanceScore: 2.1, appealStrength: 22 },
      { id: "titan-enterprise", name: "Titan Enterprise", segmentId: "enterprise", basePriceUsd: 5_600, basePerformanceScore: 1.4, appealStrength: 24 },
    ],
  },
  {
    id: "meridian",
    name: "Meridian Systems",
    strategy: "enterprise",
    actionIntervalDays: 120,
    firstActionOffsetDays: 23,
    products: [
      { id: "meridian-m1", name: "Meridian M1", segmentId: "enterprise", basePriceUsd: 5_200, basePerformanceScore: 1.3, appealStrength: 26 },
      { id: "meridian-m2", name: "Meridian M2", segmentId: "performance", basePriceUsd: 1_400, basePerformanceScore: 1.6, appealStrength: 18 },
      { id: "meridian-ws", name: "Meridian WS", segmentId: "workstation", basePriceUsd: 3_400, basePerformanceScore: 1.8, appealStrength: 16 },
    ],
  },
];

export const MARKET_LIMITS = {
  minPriceUsd: 1,
  maxPriceUsd: 1_000_000,
  maxProductionOrderUnits: 100_000,
  maxMarketingBudgetUsdPerDay: 20_000,
  maxProductNameLength: 40,
  minProductNameLength: 2,
  maxActionHistory: 60,
  maxDailySummaries: 180,
  maxProductionOrders: 40,
  maxCpuProducts: 100,
  maxComponentProducts: 60,
} as const;

export const MARKET_RULES = {
  launchFeeUsd: 5_000,
  productionLeadTimeDays: 5,
} as const;

export type MarketProductStatus = "active" | "discontinued";
export type ProductionOrderStatus = "in-production" | "completed";

export interface MarketProduct {
  id: string;
  name: string;
  projectId: string;
  projectVersion: number;
  segmentId: MarketSegmentId;
  configuration: CpuConfiguration;
  releaseDate: string;
  priceUsd: number;
  manufacturingCostUsd: number;
  performanceScore: number;
  inventoryUnits: number;
  unitsProduced: number;
  unitsSold: number;
  revenueUsd: number;
  status: MarketProductStatus;
}

export interface ComponentMarketProduct {
  id: string;
  name: string;
  projectId: string;
  projectVersion: number;
  componentType: ComponentType;
  configuration: ComponentConfiguration;
  releaseDate: string;
  priceUsd: number;
  manufacturingCostUsd: number;
  performanceScore: number;
  unitsSold: number;
  revenueUsd: number;
  status: MarketProductStatus;
}

export interface ProductionOrder {
  id: string;
  productId: string;
  quantity: number;
  unitCostUsd: number;
  orderedOn: string;
  readyOn: string;
  status: ProductionOrderStatus;
}

export interface CompetitorMarketState {
  competitorId: string;
  priceMultiplier: number;
  performanceMultiplier: number;
  marketingMultiplier: number;
  nextActionOn: string;
  actionCount: number;
}

export type CompetitorActionType =
  | "price-cut"
  | "price-increase"
  | "performance-refresh"
  | "campaign";

export interface CompetitorAction {
  id: string;
  date: string;
  competitorId: string;
  type: CompetitorActionType;
  valuePercent: number;
}

export interface MarketSegmentDayResult {
  playerUnits: number;
  totalUnits: number;
  share: number;
}

export interface MarketDaySummary {
  date: string;
  totalDemandUnits: number;
  playerUnits: number;
  competitorUnits: number;
  playerRevenueUsd: number;
  marketShare: number;
  segments: Partial<Record<MarketSegmentId, MarketSegmentDayResult>>;
  componentDemandUnits: number;
  componentUnits: number;
  componentRevenueUsd: number;
  componentManufacturingUsd: number;
}

export interface MarketState {
  products: MarketProduct[];
  componentProducts: ComponentMarketProduct[];
  productionOrders: ProductionOrder[];
  competitors: CompetitorMarketState[];
  actions: CompetitorAction[];
  dailySummaries: MarketDaySummary[];
  marketingBudgetUsdPerDay: number;
}

export class InvalidMarketDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidMarketDataError";
  }
}

export function createInitialMarketState(gameDate: string): MarketState {
  return {
    products: [],
    componentProducts: [],
    productionOrders: [],
    competitors: COMPETITORS.map((competitor) => ({
      competitorId: competitor.id,
      priceMultiplier: 1,
      performanceMultiplier: 1,
      marketingMultiplier: 1,
      nextActionOn: addDays(gameDate, competitor.firstActionOffsetDays),
      actionCount: 0,
    })),
    actions: [],
    dailySummaries: [],
    marketingBudgetUsdPerDay: 0,
  };
}

export function getMarketSegment(segmentId: string): MarketSegmentDefinition | undefined {
  return MARKET_SEGMENTS.find((segment) => segment.id === segmentId);
}

export function getCompetitor(competitorId: string): CompetitorDefinition | undefined {
  return COMPETITORS.find((competitor) => competitor.id === competitorId);
}

export function getCompetitorProduct(productId: string): CompetitorProductDefinition | undefined {
  for (const competitor of COMPETITORS) {
    const product = competitor.products.find((candidate) => candidate.id === productId);
    if (product) {
      return product;
    }
  }
  return undefined;
}

export function validateProductName(name: string): boolean {
  const normalized = name.trim();
  return normalized.length >= MARKET_LIMITS.minProductNameLength
    && normalized.length <= MARKET_LIMITS.maxProductNameLength;
}

export function parseMarketState(
  value: unknown,
  options: { allowMissingComponentData?: boolean } = {},
): MarketState {
  if (!isRecord(value)) {
    throw new InvalidMarketDataError("Market data must be an object.");
  }
  if (
    !Array.isArray(value.products)
    || !Array.isArray(value.productionOrders)
    || !Array.isArray(value.competitors)
    || !Array.isArray(value.actions)
    || !Array.isArray(value.dailySummaries)
    || (!options.allowMissingComponentData && !Array.isArray(value.componentProducts))
  ) {
    throw new InvalidMarketDataError("Market history is missing.");
  }
  if (
    value.actions.length > MARKET_LIMITS.maxActionHistory
    || value.dailySummaries.length > MARKET_LIMITS.maxDailySummaries
    || value.productionOrders.length > MARKET_LIMITS.maxProductionOrders
    || (Array.isArray(value.componentProducts) && value.componentProducts.length > MARKET_LIMITS.maxComponentProducts)
  ) {
    throw new InvalidMarketDataError("Market history is too long.");
  }

  const products = value.products.map(parseMarketProduct);
  if (new Set(products.map((product) => product.id)).size !== products.length) {
    throw new InvalidMarketDataError("Market product IDs are duplicated.");
  }
  if (
    new Set(products.map((product) => `${product.projectId}:${product.projectVersion}`)).size
    !== products.length
  ) {
    throw new InvalidMarketDataError("Market products duplicate a CPU project version.");
  }

  const componentProducts = Array.isArray(value.componentProducts)
    ? value.componentProducts.map(parseComponentMarketProduct)
    : [];
  if (new Set(componentProducts.map((product) => product.id)).size !== componentProducts.length) {
    throw new InvalidMarketDataError("Component product IDs are duplicated.");
  }
  if (
    new Set(componentProducts.map((product) => `${product.projectId}:${product.projectVersion}`)).size
    !== componentProducts.length
  ) {
    throw new InvalidMarketDataError("Component products duplicate a project version.");
  }

  const productIds = new Set(products.map((product) => product.id));
  const productionOrders = value.productionOrders.map(parseProductionOrder);
  if (new Set(productionOrders.map((order) => order.id)).size !== productionOrders.length) {
    throw new InvalidMarketDataError("Production order IDs are duplicated.");
  }
  if (productionOrders.some((order) => !productIds.has(order.productId))) {
    throw new InvalidMarketDataError("Production order references an unknown product.");
  }

  const competitors = value.competitors.map(parseCompetitorState);
  const competitorIds = new Set(competitors.map((competitor) => competitor.competitorId));
  if (
    competitorIds.size !== COMPETITORS.length
    || COMPETITORS.some((competitor) => !competitorIds.has(competitor.id))
  ) {
    throw new InvalidMarketDataError("Competitor state does not match the market catalog.");
  }

  const actions = value.actions.map(parseCompetitorAction);
  if (new Set(actions.map((action) => action.id)).size !== actions.length) {
    throw new InvalidMarketDataError("Competitor action IDs are duplicated.");
  }
  if (actions.some((action) => !competitorIds.has(action.competitorId))) {
    throw new InvalidMarketDataError("Competitor action references an unknown competitor.");
  }

  const dailySummaries = value.dailySummaries.map((summary) =>
    parseMarketDaySummary(summary, options.allowMissingComponentData === true)
  );
  if (new Set(dailySummaries.map((summary) => summary.date)).size !== dailySummaries.length) {
    throw new InvalidMarketDataError("Market summaries contain duplicate dates.");
  }

  if (
    typeof value.marketingBudgetUsdPerDay !== "number"
    || !Number.isFinite(value.marketingBudgetUsdPerDay)
    || value.marketingBudgetUsdPerDay < 0
    || value.marketingBudgetUsdPerDay > MARKET_LIMITS.maxMarketingBudgetUsdPerDay
  ) {
    throw new InvalidMarketDataError("Marketing budget is invalid.");
  }

  return {
    products,
    componentProducts,
    productionOrders,
    competitors,
    actions,
    dailySummaries,
    marketingBudgetUsdPerDay: roundUsd(value.marketingBudgetUsdPerDay),
  };
}

function parseComponentMarketProduct(value: unknown): ComponentMarketProduct {
  if (!isRecord(value)) {
    throw new InvalidMarketDataError("Component product is invalid.");
  }
  if (
    typeof value.id !== "string"
    || typeof value.name !== "string"
    || typeof value.projectId !== "string"
    || typeof value.projectVersion !== "number"
    || typeof value.componentType !== "string"
    || !isComponentType(value.componentType)
    || typeof value.releaseDate !== "string"
    || typeof value.priceUsd !== "number"
    || typeof value.manufacturingCostUsd !== "number"
    || typeof value.performanceScore !== "number"
    || typeof value.unitsSold !== "number"
    || typeof value.revenueUsd !== "number"
    || (value.status !== "active" && value.status !== "discontinued")
  ) {
    throw new InvalidMarketDataError("Component product is incomplete.");
  }
  if (
    value.id.trim().length === 0
    || validateComponentName(value.name) !== null
    || value.projectId.trim().length === 0
    || !Number.isInteger(value.projectVersion)
    || value.projectVersion < 1
    || !isValidDateOnly(value.releaseDate)
    || !isWithin(value.priceUsd, MARKET_LIMITS.minPriceUsd, MARKET_LIMITS.maxPriceUsd)
    || !isPositive(value.manufacturingCostUsd)
    || !isPositive(value.performanceScore)
    || !isNonNegativeInteger(value.unitsSold)
    || !isNonNegative(value.revenueUsd)
  ) {
    throw new InvalidMarketDataError("Component product fields are invalid.");
  }

  const configuration = parseComponentConfiguration(value.configuration);
  if (configuration.type !== value.componentType) {
    throw new InvalidMarketDataError("Component product type does not match its configuration.");
  }

  return {
    id: value.id,
    name: value.name.trim(),
    projectId: value.projectId,
    projectVersion: value.projectVersion,
    componentType: value.componentType,
    configuration: cloneComponentConfiguration(configuration),
    releaseDate: value.releaseDate,
    priceUsd: roundUsd(value.priceUsd),
    manufacturingCostUsd: roundUsd(value.manufacturingCostUsd),
    performanceScore: roundScore(value.performanceScore),
    unitsSold: value.unitsSold,
    revenueUsd: roundUsd(value.revenueUsd),
    status: value.status,
  };
}

function parseMarketProduct(value: unknown): MarketProduct {
  if (!isRecord(value)) {
    throw new InvalidMarketDataError("Market product is invalid.");
  }
  if (
    typeof value.id !== "string"
    || typeof value.name !== "string"
    || typeof value.projectId !== "string"
    || typeof value.projectVersion !== "number"
    || typeof value.segmentId !== "string"
    || typeof value.releaseDate !== "string"
    || typeof value.priceUsd !== "number"
    || typeof value.manufacturingCostUsd !== "number"
    || typeof value.performanceScore !== "number"
    || typeof value.inventoryUnits !== "number"
    || typeof value.unitsProduced !== "number"
    || typeof value.unitsSold !== "number"
    || typeof value.revenueUsd !== "number"
    || (value.status !== "active" && value.status !== "discontinued")
  ) {
    throw new InvalidMarketDataError("Market product is incomplete.");
  }
  if (
    value.id.trim().length === 0
    || !validateProductName(value.name)
    || value.projectId.trim().length === 0
    || !Number.isInteger(value.projectVersion)
    || value.projectVersion < 1
    || !getMarketSegment(value.segmentId)
    || !isValidDateOnly(value.releaseDate)
    || !isWithin(value.priceUsd, MARKET_LIMITS.minPriceUsd, MARKET_LIMITS.maxPriceUsd)
    || !isPositive(value.manufacturingCostUsd)
    || !isPositive(value.performanceScore)
    || !isNonNegativeInteger(value.inventoryUnits)
    || !isNonNegativeInteger(value.unitsProduced)
    || !isNonNegativeInteger(value.unitsSold)
    || !isNonNegative(value.revenueUsd)
    || value.inventoryUnits !== value.unitsProduced - value.unitsSold
  ) {
    throw new InvalidMarketDataError("Market product fields are invalid.");
  }

  return {
    id: value.id,
    name: value.name.trim(),
    projectId: value.projectId,
    projectVersion: value.projectVersion,
    segmentId: value.segmentId as MarketSegmentId,
    configuration: cloneCpuConfiguration(parseCpuConfiguration(value.configuration)),
    releaseDate: value.releaseDate,
    priceUsd: roundUsd(value.priceUsd),
    manufacturingCostUsd: roundUsd(value.manufacturingCostUsd),
    performanceScore: roundScore(value.performanceScore),
    inventoryUnits: value.inventoryUnits,
    unitsProduced: value.unitsProduced,
    unitsSold: value.unitsSold,
    revenueUsd: roundUsd(value.revenueUsd),
    status: value.status,
  };
}

function parseProductionOrder(value: unknown): ProductionOrder {
  if (!isRecord(value)) {
    throw new InvalidMarketDataError("Production order is invalid.");
  }
  if (
    typeof value.id !== "string"
    || typeof value.productId !== "string"
    || typeof value.quantity !== "number"
    || typeof value.unitCostUsd !== "number"
    || typeof value.orderedOn !== "string"
    || typeof value.readyOn !== "string"
    || (value.status !== "in-production" && value.status !== "completed")
  ) {
    throw new InvalidMarketDataError("Production order is incomplete.");
  }
  if (
    value.id.trim().length === 0
    || !Number.isInteger(value.quantity)
    || value.quantity < 1
    || value.quantity > MARKET_LIMITS.maxProductionOrderUnits
    || !isPositive(value.unitCostUsd)
    || !isValidDateOnly(value.orderedOn)
    || !isValidDateOnly(value.readyOn)
    || value.readyOn < value.orderedOn
  ) {
    throw new InvalidMarketDataError("Production order fields are invalid.");
  }

  return {
    id: value.id,
    productId: value.productId,
    quantity: value.quantity,
    unitCostUsd: roundUsd(value.unitCostUsd),
    orderedOn: value.orderedOn,
    readyOn: value.readyOn,
    status: value.status,
  };
}

function parseCompetitorState(value: unknown): CompetitorMarketState {
  if (!isRecord(value)) {
    throw new InvalidMarketDataError("Competitor state is invalid.");
  }
  if (
    typeof value.competitorId !== "string"
    || typeof value.priceMultiplier !== "number"
    || typeof value.performanceMultiplier !== "number"
    || typeof value.marketingMultiplier !== "number"
    || typeof value.nextActionOn !== "string"
    || typeof value.actionCount !== "number"
  ) {
    throw new InvalidMarketDataError("Competitor state is incomplete.");
  }
  if (
    !getCompetitor(value.competitorId)
    || !isWithin(value.priceMultiplier, 0.25, 4)
    || !isWithin(value.performanceMultiplier, 0.5, 4)
    || !isWithin(value.marketingMultiplier, 0.5, 4)
    || !isValidDateOnly(value.nextActionOn)
    || !isNonNegativeInteger(value.actionCount)
  ) {
    throw new InvalidMarketDataError("Competitor state fields are invalid.");
  }

  return {
    competitorId: value.competitorId,
    priceMultiplier: value.priceMultiplier,
    performanceMultiplier: value.performanceMultiplier,
    marketingMultiplier: value.marketingMultiplier,
    nextActionOn: value.nextActionOn,
    actionCount: value.actionCount,
  };
}

function parseCompetitorAction(value: unknown): CompetitorAction {
  if (!isRecord(value)) {
    throw new InvalidMarketDataError("Competitor action is invalid.");
  }
  const validTypes = ["price-cut", "price-increase", "performance-refresh", "campaign"] as const;
  if (
    typeof value.id !== "string"
    || typeof value.date !== "string"
    || typeof value.competitorId !== "string"
    || typeof value.type !== "string"
    || typeof value.valuePercent !== "number"
    || !validTypes.includes(value.type as CompetitorActionType)
    || !getCompetitor(value.competitorId)
    || !isValidDateOnly(value.date)
    || !isPositive(value.valuePercent)
    || value.valuePercent > 100
  ) {
    throw new InvalidMarketDataError("Competitor action fields are invalid.");
  }

  return {
    id: value.id,
    date: value.date,
    competitorId: value.competitorId,
    type: value.type as CompetitorActionType,
    valuePercent: roundScore(value.valuePercent),
  };
}

function parseMarketDaySummary(
  value: unknown,
  allowMissingComponentData: boolean,
): MarketDaySummary {
  const componentDemandUnits = value && isRecord(value) && value.componentDemandUnits !== undefined
    ? value.componentDemandUnits
    : allowMissingComponentData ? 0 : undefined;
  const componentUnits = value && isRecord(value) && value.componentUnits !== undefined
    ? value.componentUnits
    : allowMissingComponentData ? 0 : undefined;
  const componentRevenueUsd = value && isRecord(value) && value.componentRevenueUsd !== undefined
    ? value.componentRevenueUsd
    : allowMissingComponentData ? 0 : undefined;
  const componentManufacturingUsd = value && isRecord(value)
    && value.componentManufacturingUsd !== undefined
    ? value.componentManufacturingUsd
    : allowMissingComponentData ? 0 : undefined;

  if (!isRecord(value) || typeof value.date !== "string" || !isValidDateOnly(value.date)) {
    throw new InvalidMarketDataError("Market day summary is invalid.");
  }
  if (
    typeof value.totalDemandUnits !== "number"
    || typeof value.playerUnits !== "number"
    || typeof value.competitorUnits !== "number"
    || typeof value.playerRevenueUsd !== "number"
    || typeof value.marketShare !== "number"
    || !isRecord(value.segments)
    || typeof componentDemandUnits !== "number"
    || typeof componentUnits !== "number"
    || typeof componentRevenueUsd !== "number"
    || typeof componentManufacturingUsd !== "number"
  ) {
    throw new InvalidMarketDataError("Market day summary is incomplete.");
  }
  if (
    !isNonNegativeInteger(value.totalDemandUnits)
    || !isNonNegativeInteger(value.playerUnits)
    || !isNonNegativeInteger(value.competitorUnits)
    || value.playerUnits + value.competitorUnits !== value.totalDemandUnits
    || !isNonNegative(value.playerRevenueUsd)
    || !isWithin(value.marketShare, 0, 1)
    || !isNonNegativeInteger(componentDemandUnits)
    || !isNonNegativeInteger(componentUnits)
    || componentUnits > componentDemandUnits
    || !isNonNegative(componentRevenueUsd)
    || !isNonNegative(componentManufacturingUsd)
  ) {
    throw new InvalidMarketDataError("Market day summary fields are invalid.");
  }

  const segments: Partial<Record<MarketSegmentId, MarketSegmentDayResult>> = {};
  for (const [segmentId, segmentValue] of Object.entries(value.segments)) {
    if (!getMarketSegment(segmentId) || !isRecord(segmentValue)) {
      throw new InvalidMarketDataError("Market day segment summary is invalid.");
    }
    if (
      typeof segmentValue.playerUnits !== "number"
      || typeof segmentValue.totalUnits !== "number"
      || typeof segmentValue.share !== "number"
      || !isNonNegativeInteger(segmentValue.playerUnits)
      || !isNonNegativeInteger(segmentValue.totalUnits)
      || segmentValue.playerUnits > segmentValue.totalUnits
      || !isWithin(segmentValue.share, 0, 1)
    ) {
      throw new InvalidMarketDataError("Market day segment summary fields are invalid.");
    }
    segments[segmentId as MarketSegmentId] = {
      playerUnits: segmentValue.playerUnits,
      totalUnits: segmentValue.totalUnits,
      share: segmentValue.share,
    };
  }

  return {
    date: value.date,
    totalDemandUnits: value.totalDemandUnits,
    playerUnits: value.playerUnits,
    competitorUnits: value.competitorUnits,
    playerRevenueUsd: roundUsd(value.playerRevenueUsd),
    marketShare: value.marketShare,
    segments,
    componentDemandUnits,
    componentUnits,
    componentRevenueUsd: roundUsd(componentRevenueUsd),
    componentManufacturingUsd: roundUsd(componentManufacturingUsd),
  };
}

function isPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function isWithin(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

function roundUsd(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundScore(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
