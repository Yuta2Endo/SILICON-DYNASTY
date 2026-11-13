import type { GameState } from "../models/game-state";
import { cloneCpuConfiguration } from "../models/cpu";
import { addDays } from "../models/date";
import {
  COMPETITORS,
  getCompetitor,
  getMarketSegment,
  MARKET_LIMITS,
  MARKET_RULES,
  validateProductName,
  type CompetitorAction,
  type CompetitorActionType,
  type MarketDaySummary,
  type MarketProduct,
  type MarketSegmentDayResult,
  type MarketSegmentId,
  type MarketState,
  type ProductionOrder,
} from "../models/market";
import {
  calculateCompetitorProductAppeal,
  calculateCpuMarketPerformanceScore,
  calculateProductAppeal,
  estimateManufacturingCost,
  getSegmentDailyDemand,
} from "../formulas/market";
import { postFinanceTransaction } from "./finance";
import { recordDailyUnits, roundUsd } from "../models/finance";

export type MarketOperationCode =
  | "project-not-found"
  | "version-not-found"
  | "invalid-name"
  | "invalid-segment"
  | "invalid-price"
  | "invalid-quantity"
  | "duplicate-product"
  | "product-not-found"
  | "product-inactive"
  | "insufficient-funds"
  | "pending-orders"
  | "invalid-budget"
  | "too-many-orders";

export class MarketOperationError extends Error {
  constructor(
    readonly code: MarketOperationCode,
    message: string,
  ) {
    super(message);
    this.name = "MarketOperationError";
  }
}

export interface ReleaseProductInput {
  projectId: string;
  projectVersion: number;
  name: string;
  segmentId: MarketSegmentId;
  priceUsd: number;
}

export function releaseProduct(state: GameState, input: ReleaseProductInput): GameState {
  const project = state.cpuProjects.find((candidate) => candidate.id === input.projectId);
  if (!project) {
    throw new MarketOperationError("project-not-found", "CPU project was not found.");
  }
  const version = project.versions.find((candidate) => candidate.version === input.projectVersion);
  if (!version) {
    throw new MarketOperationError("version-not-found", "CPU project version was not found.");
  }
  if (!validateProductName(input.name)) {
    throw new MarketOperationError("invalid-name", "Product name is invalid.");
  }
  const segment = getMarketSegment(input.segmentId);
  if (!segment) {
    throw new MarketOperationError("invalid-segment", "Market segment is invalid.");
  }
  if (
    !Number.isFinite(input.priceUsd)
    || input.priceUsd < MARKET_LIMITS.minPriceUsd
    || input.priceUsd > MARKET_LIMITS.maxPriceUsd
  ) {
    throw new MarketOperationError("invalid-price", "Product price is invalid.");
  }
  if (
    state.market.products.some(
      (product) =>
        product.projectId === input.projectId && product.projectVersion === input.projectVersion,
    )
  ) {
    throw new MarketOperationError("duplicate-product", "This CPU version is already on the market.");
  }

  const withFee = postFinanceTransaction(
    state,
    "release",
    -MARKET_RULES.launchFeeUsd,
    `Launch: ${input.name.trim()}`,
  );
  const manufacturing = estimateManufacturingCost(version.configuration);
  const product: MarketProduct = {
    id: nextProductId(withFee.market.products),
    name: input.name.trim(),
    projectId: project.id,
    projectVersion: version.version,
    segmentId: segment.id,
    configuration: cloneCpuConfiguration(version.configuration),
    releaseDate: state.gameDate,
    priceUsd: roundUsd(input.priceUsd),
    manufacturingCostUsd: manufacturing.unitCostUsd,
    performanceScore: calculateCpuMarketPerformanceScore(version.configuration),
    inventoryUnits: 0,
    unitsProduced: 0,
    unitsSold: 0,
    revenueUsd: 0,
    status: "active",
  };

  return {
    ...withFee,
    market: {
      ...withFee.market,
      products: [...withFee.market.products, product],
    },
  };
}

export function orderProduction(state: GameState, productId: string, quantity: number): GameState {
  const product = state.market.products.find((candidate) => candidate.id === productId);
  if (!product) {
    throw new MarketOperationError("product-not-found", "Market product was not found.");
  }
  if (product.status !== "active") {
    throw new MarketOperationError("product-inactive", "The product is no longer on the market.");
  }
  if (
    !Number.isInteger(quantity)
    || quantity < 1
    || quantity > MARKET_LIMITS.maxProductionOrderUnits
  ) {
    throw new MarketOperationError("invalid-quantity", "Production quantity is invalid.");
  }
  if (
    state.market.productionOrders.filter((order) => order.status === "in-production").length
    >= MARKET_LIMITS.maxProductionOrders
  ) {
    throw new MarketOperationError("too-many-orders", "Too many production orders are open.");
  }

  const totalCostUsd = roundUsd(product.manufacturingCostUsd * quantity);
  if (state.company.balance < totalCostUsd) {
    throw new MarketOperationError("insufficient-funds", "The company cannot fund this production order.");
  }

  const withCost = postFinanceTransaction(
    state,
    "manufacturing",
    -totalCostUsd,
    `Production: ${product.name}`,
  );
  const order: ProductionOrder = {
    id: nextProductionOrderId(withCost.market.productionOrders),
    productId: product.id,
    quantity,
    unitCostUsd: product.manufacturingCostUsd,
    orderedOn: state.gameDate,
    readyOn: addDays(state.gameDate, MARKET_RULES.productionLeadTimeDays),
    status: "in-production",
  };
  const productionOrders = trimProductionOrders([...withCost.market.productionOrders, order]);

  return {
    ...withCost,
    market: { ...withCost.market, productionOrders },
  };
}

export function updateProductPrice(state: GameState, productId: string, priceUsd: number): GameState {
  const product = state.market.products.find((candidate) => candidate.id === productId);
  if (!product) {
    throw new MarketOperationError("product-not-found", "Market product was not found.");
  }
  if (
    !Number.isFinite(priceUsd)
    || priceUsd < MARKET_LIMITS.minPriceUsd
    || priceUsd > MARKET_LIMITS.maxPriceUsd
  ) {
    throw new MarketOperationError("invalid-price", "Product price is invalid.");
  }

  return {
    ...state,
    market: {
      ...state.market,
      products: state.market.products.map((candidate) =>
        candidate.id === productId ? { ...candidate, priceUsd: roundUsd(priceUsd) } : candidate,
      ),
    },
  };
}

export function discontinueProduct(state: GameState, productId: string): GameState {
  const product = state.market.products.find((candidate) => candidate.id === productId);
  if (!product) {
    throw new MarketOperationError("product-not-found", "Market product was not found.");
  }
  if (
    state.market.productionOrders.some(
      (order) => order.productId === productId && order.status === "in-production",
    )
  ) {
    throw new MarketOperationError("pending-orders", "Wait for open production orders to complete.");
  }

  return {
    ...state,
    market: {
      ...state.market,
      products: state.market.products.map((candidate) =>
        candidate.id === productId ? { ...candidate, status: "discontinued" } : candidate,
      ),
    },
  };
}

export function updateMarketingBudget(state: GameState, amountUsd: number): GameState {
  if (
    !Number.isFinite(amountUsd)
    || amountUsd < 0
    || amountUsd > MARKET_LIMITS.maxMarketingBudgetUsdPerDay
  ) {
    throw new MarketOperationError("invalid-budget", "Marketing budget is invalid.");
  }

  return {
    ...state,
    market: {
      ...state.market,
      marketingBudgetUsdPerDay: roundUsd(amountUsd),
    },
  };
}

export function runProductionDay(state: GameState, date: string): GameState {
  const completedOrders = state.market.productionOrders.filter(
    (order) => order.status === "in-production" && order.readyOn <= date,
  );
  if (completedOrders.length === 0) {
    return state;
  }

  let products = state.market.products;
  let producedUnits = 0;
  for (const order of completedOrders) {
    const product = products.find((candidate) => candidate.id === order.productId);
    if (!product) {
      throw new MarketOperationError("product-not-found", "A production order references a missing product.");
    }
    producedUnits += order.quantity;
    products = products.map((candidate) =>
      candidate.id === product.id
        ? {
          ...candidate,
          inventoryUnits: candidate.inventoryUnits + order.quantity,
          unitsProduced: candidate.unitsProduced + order.quantity,
        }
        : candidate,
    );
  }

  const productionOrders = state.market.productionOrders.map((order) =>
    completedOrders.some((completed) => completed.id === order.id)
      ? { ...order, status: "completed" as const }
      : order,
  );
  const finance = recordDailyUnits(
    state.finance,
    date,
    { produced: producedUnits },
    state.company.balance,
  );

  return {
    ...state,
    market: {
      ...state.market,
      products,
      productionOrders: trimProductionOrders(productionOrders),
    },
    finance,
  };
}

export function runCompetitorDay(state: GameState, date: string): GameState {
  let competitors = state.market.competitors;
  const newActions: CompetitorAction[] = [];

  for (const competitorState of state.market.competitors) {
    if (date < competitorState.nextActionOn) {
      continue;
    }
    const definition = getCompetitor(competitorState.competitorId);
    if (!definition) {
      continue;
    }

    const action = applyCompetitorStrategy(competitorState, definition.strategy, competitorState.actionCount);
    competitors = competitors.map((candidate) =>
      candidate.competitorId === competitorState.competitorId
        ? {
          ...candidate,
          ...action.multipliers,
          nextActionOn: addDays(date, definition.actionIntervalDays),
          actionCount: candidate.actionCount + 1,
        }
        : candidate,
    );
    newActions.push({
      id: nextActionId([...state.market.actions, ...newActions]),
      date,
      competitorId: definition.id,
      type: action.type,
      valuePercent: action.valuePercent,
    });
  }

  if (newActions.length === 0) {
    return state;
  }

  return {
    ...state,
    market: {
      ...state.market,
      competitors,
      actions: [...newActions, ...state.market.actions].slice(0, MARKET_LIMITS.maxActionHistory),
    },
  };
}

export function simulateMarketDay(state: GameState, date: string): GameState {
  let products = state.market.products;
  const segmentResults: Partial<Record<MarketSegmentId, MarketSegmentDayResult>> = {};
  const competitorStates = new Map(
    state.market.competitors.map((competitor) => [competitor.competitorId, competitor]),
  );
  let totalDemandUnits = 0;
  let playerUnits = 0;
  let playerRevenueUsd = 0;

  for (const segment of COMPETITOR_PRODUCTS_BY_SEGMENT.keys()) {
    const segmentDefinition = getMarketSegment(segment);
    if (!segmentDefinition) {
      continue;
    }
    const totalDemand = getSegmentDailyDemand(segmentDefinition, date);
    const playerProducts = products.filter(
      (product) => product.status === "active" && product.segmentId === segment,
    );
    const competitorProducts = COMPETITOR_PRODUCTS_BY_SEGMENT.get(segment) ?? [];
    const competitorAppeal = competitorProducts.reduce((total, entry) => {
      const competitorState = competitorStates.get(entry.competitorId);
      return competitorState
        ? total + calculateCompetitorProductAppeal(segmentDefinition, entry.product, competitorState)
        : total;
    }, 0);
    const playerAppeals = playerProducts.map((product) => ({
      product,
      appeal: calculateProductAppeal({
        segment: segmentDefinition,
        configuration: product.configuration,
        performanceScore: product.performanceScore,
        priceUsd: product.priceUsd,
        releaseDate: product.releaseDate,
        date,
        reputation: state.company.reputation,
        marketingBudgetUsdPerDay: state.market.marketingBudgetUsdPerDay,
      }),
    }));
    const playerAppeal = playerAppeals.reduce((total, entry) => total + entry.appeal, 0);
    const totalAppeal = playerAppeal + competitorAppeal;
    const playerDemand = totalAppeal > 0
      ? Math.floor(totalDemand * (playerAppeal / totalAppeal))
      : 0;

    let segmentPlayerUnits = 0;
    if (playerAppeal > 0 && playerDemand > 0) {
      for (const entry of playerAppeals) {
        const demandedUnits = Math.floor(playerDemand * (entry.appeal / playerAppeal));
        const soldUnits = Math.min(demandedUnits, entry.product.inventoryUnits);
        if (soldUnits <= 0) {
          continue;
        }
        const revenueUsd = roundUsd(soldUnits * entry.product.priceUsd);
        segmentPlayerUnits += soldUnits;
        playerRevenueUsd = roundUsd(playerRevenueUsd + revenueUsd);
        products = products.map((candidate) =>
          candidate.id === entry.product.id
            ? {
              ...candidate,
              inventoryUnits: candidate.inventoryUnits - soldUnits,
              unitsSold: candidate.unitsSold + soldUnits,
              revenueUsd: roundUsd(candidate.revenueUsd + revenueUsd),
            }
            : candidate,
        );
      }
    }

    totalDemandUnits += totalDemand;
    playerUnits += segmentPlayerUnits;
    segmentResults[segment] = {
      playerUnits: segmentPlayerUnits,
      totalUnits: totalDemand,
      share: totalDemand > 0 ? roundShare(segmentPlayerUnits / totalDemand) : 0,
    };
  }

  const summary: MarketDaySummary = {
    date,
    totalDemandUnits,
    playerUnits,
    competitorUnits: Math.max(0, totalDemandUnits - playerUnits),
    playerRevenueUsd,
    marketShare: totalDemandUnits > 0 ? roundShare(playerUnits / totalDemandUnits) : 0,
    segments: segmentResults,
  };

  let nextState: GameState = {
    ...state,
    market: {
      ...state.market,
      products,
      dailySummaries: [...state.market.dailySummaries, summary]
        .slice(-MARKET_LIMITS.maxDailySummaries),
    },
  };

  if (playerRevenueUsd > 0) {
    nextState = postFinanceTransaction(nextState, "sales", playerRevenueUsd, "Processor sales");
    nextState = {
      ...nextState,
      finance: recordDailyUnits(
        nextState.finance,
        date,
        { sold: playerUnits },
        nextState.company.balance,
      ),
    };
  }

  return nextState;
}

export function updateMarketReputation(state: GameState, summary: MarketDaySummary): GameState {
  const reputationGain = Math.min(0.1, summary.playerUnits / 5_000);
  const stockoutPenalty = state.market.products.some(
    (product) =>
      product.status === "active"
      && product.inventoryUnits === 0
      && (summary.segments[product.segmentId]?.totalUnits ?? 0) > 0,
  ) ? 0.01 : 0;
  const nextReputation = Math.round(
    Math.min(100, Math.max(0, state.company.reputation + reputationGain - stockoutPenalty)) * 100,
  ) / 100;

  if (nextReputation === state.company.reputation) {
    return state;
  }

  return {
    ...state,
    company: { ...state.company, reputation: nextReputation },
  };
}

export interface ProductDemandEstimate {
  marketDemandUnits: number;
  unitsPerDay: number;
  share: number;
  unitCostUsd: number;
  margin: number;
}

export function estimateProductDailyDemand(
  state: GameState,
  productId: string,
  date: string,
): ProductDemandEstimate | null {
  const product = state.market.products.find((candidate) => candidate.id === productId);
  if (!product) {
    return null;
  }
  const segment = getMarketSegment(product.segmentId);
  if (!segment) {
    return null;
  }
  const competitorStates = new Map(
    state.market.competitors.map((competitor) => [competitor.competitorId, competitor]),
  );
  const competitorAppeal = (COMPETITOR_PRODUCTS_BY_SEGMENT.get(product.segmentId) ?? []).reduce(
    (total, entry) => {
      const competitorState = competitorStates.get(entry.competitorId);
      return competitorState
        ? total + calculateCompetitorProductAppeal(segment, entry.product, competitorState)
        : total;
    },
    0,
  );
  const appeal = calculateProductAppeal({
    segment,
    configuration: product.configuration,
    performanceScore: product.performanceScore,
    priceUsd: product.priceUsd,
    releaseDate: product.releaseDate,
    date,
    reputation: state.company.reputation,
    marketingBudgetUsdPerDay: state.market.marketingBudgetUsdPerDay,
  });
  const totalAppeal = appeal + competitorAppeal;
  const marketDemandUnits = getSegmentDailyDemand(segment, date);
  const share = totalAppeal > 0 ? appeal / totalAppeal : 0;

  return {
    marketDemandUnits,
    unitsPerDay: Math.floor(marketDemandUnits * share),
    share,
    unitCostUsd: product.manufacturingCostUsd,
    margin: product.priceUsd > 0 ? (product.priceUsd - product.manufacturingCostUsd) / product.priceUsd : 0,
  };
}

const COMPETITOR_PRODUCTS_BY_SEGMENT = buildCompetitorProductIndex();

function buildCompetitorProductIndex() {
  const index = new Map<MarketSegmentId, Array<{
    competitorId: string;
    product: (typeof COMPETITORS)[number]["products"][number];
  }>>();
  for (const competitor of COMPETITORS) {
    for (const product of competitor.products) {
      const entries = index.get(product.segmentId) ?? [];
      entries.push({ competitorId: competitor.id, product });
      index.set(product.segmentId, entries);
    }
  }
  return index;
}

function applyCompetitorStrategy(
  competitorState: MarketState["competitors"][number],
  strategy: (typeof COMPETITORS)[number]["strategy"],
  actionCount: number,
): {
  type: CompetitorActionType;
  valuePercent: number;
  multipliers: Partial<Pick<
    MarketState["competitors"][number],
    "priceMultiplier" | "performanceMultiplier" | "marketingMultiplier"
  >>;
} {
  switch (strategy) {
    case "volume":
      return {
        type: "price-cut",
        valuePercent: 1.5,
        multipliers: { priceMultiplier: roundMultiplier(competitorState.priceMultiplier * 0.985, 0.75, 1) },
      };
    case "aggressive":
      return {
        type: "price-cut",
        valuePercent: 3,
        multipliers: { priceMultiplier: roundMultiplier(competitorState.priceMultiplier * 0.97, 0.65, 1) },
      };
    case "premium":
      return actionCount % 2 === 0
        ? {
          type: "price-increase",
          valuePercent: 1.2,
          multipliers: { priceMultiplier: roundMultiplier(competitorState.priceMultiplier * 1.012, 1, 1.4) },
        }
        : {
          type: "performance-refresh",
          valuePercent: 2,
          multipliers: {
            performanceMultiplier: roundMultiplier(competitorState.performanceMultiplier * 1.02, 1, 1.6),
          },
        };
    case "performance":
      return {
        type: "performance-refresh",
        valuePercent: 2.5,
        multipliers: {
          performanceMultiplier: roundMultiplier(competitorState.performanceMultiplier * 1.025, 1, 1.7),
        },
      };
    case "balanced":
      return {
        type: "campaign",
        valuePercent: 4,
        multipliers: {
          marketingMultiplier: roundMultiplier(competitorState.marketingMultiplier * 1.04, 1, 1.4),
        },
      };
    case "enterprise":
      return actionCount % 2 === 0
        ? {
          type: "performance-refresh",
          valuePercent: 1.5,
          multipliers: {
            performanceMultiplier: roundMultiplier(competitorState.performanceMultiplier * 1.015, 1, 1.5),
          },
        }
        : {
          type: "campaign",
          valuePercent: 3,
          multipliers: {
            marketingMultiplier: roundMultiplier(competitorState.marketingMultiplier * 1.03, 1, 1.4),
          },
        };
  }
}

function nextProductId(products: MarketState["products"]): string {
  let sequence = 1;
  while (products.some((product) => product.id === `product-${sequence}`)) {
    sequence += 1;
  }
  return `product-${sequence}`;
}

function nextProductionOrderId(orders: MarketState["productionOrders"]): string {
  let sequence = 1;
  while (orders.some((order) => order.id === `order-${sequence}`)) {
    sequence += 1;
  }
  return `order-${sequence}`;
}

function nextActionId(actions: MarketState["actions"]): string {
  let sequence = 1;
  while (actions.some((action) => action.id === `action-${sequence}`)) {
    sequence += 1;
  }
  return `action-${sequence}`;
}

function trimProductionOrders(orders: MarketState["productionOrders"]): MarketState["productionOrders"] {
  if (orders.length <= MARKET_LIMITS.maxProductionOrders) {
    return orders;
  }
  const active = orders.filter((order) => order.status === "in-production");
  const completed = orders
    .filter((order) => order.status === "completed")
    .slice(-(MARKET_LIMITS.maxProductionOrders - active.length));
  return [...completed, ...active].sort((left, right) => left.orderedOn.localeCompare(right.orderedOn));
}

function roundMultiplier(value: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, value)) * 1_000) / 1_000;
}

function roundShare(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
