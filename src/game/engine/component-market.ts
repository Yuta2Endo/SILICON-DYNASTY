import type { GameState } from "../models/game-state";
import { cloneComponentConfiguration, validateComponentName, type ComponentProject } from "../models/components";
import {
  MARKET_LIMITS,
  MARKET_RULES,
  type ComponentMarketProduct,
  type MarketDaySummary,
  type MarketProductStatus,
} from "../models/market";
import {
  calculateComponentAppeal,
  calculateComponentPerformanceScore,
  estimateComponentMarket,
  estimateComponentManufacturingCost,
  getComponentDailyDemand,
  getComponentMarketProfile,
  type ComponentMarketEstimate,
} from "../formulas/components";
import { postFinanceTransaction } from "./finance";
import { recordDailyUnits, roundUsd } from "../models/finance";

export type ComponentMarketOperationCode =
  | "project-not-found"
  | "version-not-found"
  | "invalid-name"
  | "invalid-price"
  | "duplicate-product"
  | "product-not-found"
  | "product-inactive"
  | "insufficient-funds"
  | "product-limit";

export class ComponentMarketOperationError extends Error {
  constructor(
    readonly code: ComponentMarketOperationCode,
    message: string,
  ) {
    super(message);
    this.name = "ComponentMarketOperationError";
  }
}

export interface ReleaseComponentProductInput {
  projectId: string;
  projectVersion: number;
  name: string;
  priceUsd: number;
}

export function releaseComponentProduct(
  state: GameState,
  input: ReleaseComponentProductInput,
): GameState {
  const project = state.componentProjects.find((candidate) => candidate.id === input.projectId);
  if (!project) {
    throw new ComponentMarketOperationError("project-not-found", "Component project was not found.");
  }
  const version = project.versions.find((candidate) => candidate.version === input.projectVersion);
  if (!version) {
    throw new ComponentMarketOperationError("version-not-found", "Component project version was not found.");
  }
  if (validateComponentName(input.name) !== null) {
    throw new ComponentMarketOperationError("invalid-name", "Component product name is invalid.");
  }
  assertComponentPrice(input.priceUsd);
  if (
    state.market.componentProducts.some(
      (product) =>
        product.projectId === input.projectId && product.projectVersion === input.projectVersion,
    )
  ) {
    throw new ComponentMarketOperationError(
      "duplicate-product",
      "This component version is already on the market.",
    );
  }
  if (state.market.componentProducts.length >= MARKET_LIMITS.maxComponentProducts) {
    throw new ComponentMarketOperationError(
      "product-limit",
      "The component product limit has been reached.",
    );
  }

  const withFee = postFinanceTransaction(
    state,
    "release",
    -MARKET_RULES.launchFeeUsd,
    `Component launch: ${input.name.trim()}`,
  );
  const manufacturing = estimateComponentManufacturingCost(version.configuration);
  const product: ComponentMarketProduct = {
    id: nextComponentProductId(withFee.market.componentProducts),
    name: input.name.trim(),
    projectId: project.id,
    projectVersion: version.version,
    componentType: project.type,
    configuration: cloneComponentConfiguration(version.configuration),
    releaseDate: state.gameDate,
    priceUsd: roundUsd(input.priceUsd),
    manufacturingCostUsd: manufacturing.unitCostUsd,
    performanceScore: calculateComponentPerformanceScore(version.configuration),
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
      componentProducts: [...withFee.market.componentProducts, product],
    },
  };
}

export function updateComponentProductPrice(
  state: GameState,
  productId: string,
  priceUsd: number,
): GameState {
  const product = findComponentProduct(state, productId);
  assertComponentPrice(priceUsd);

  return {
    ...state,
    market: {
      ...state.market,
      componentProducts: state.market.componentProducts.map((candidate) =>
        candidate.id === product.id ? { ...candidate, priceUsd: roundUsd(priceUsd) } : candidate,
      ),
    },
  };
}

export function discontinueComponentProduct(state: GameState, productId: string): GameState {
  const product = findComponentProduct(state, productId);

  return {
    ...state,
    market: {
      ...state.market,
      componentProducts: state.market.componentProducts.map((candidate) =>
        candidate.id === product.id
          ? { ...candidate, status: "discontinued" as MarketProductStatus }
          : candidate,
      ),
    },
  };
}

export interface ComponentDayResult {
  componentDemandUnits: number;
  componentUnits: number;
  componentRevenueUsd: number;
  componentManufacturingUsd: number;
}

export function simulateComponentMarketDay(state: GameState, date: string): GameState {
  let nextState = state;
  let componentDemandUnits = 0;
  let componentUnits = 0;
  let componentRevenueUsd = 0;
  const componentManufacturingUsd = 0;

  for (const componentType of COMPONENT_SALE_ORDER) {
    const activeProducts = nextState.market.componentProducts.filter(
      (product) => product.status === "active" && product.componentType === componentType,
    );
    if (activeProducts.length === 0) {
      continue;
    }

    const profile = getComponentMarketProfile(componentType);
    const demandUnits = getComponentDailyDemand(profile, date);
    const appeals = activeProducts.map((product) => ({
      product,
      appeal: calculateComponentAppeal({
        configuration: product.configuration,
        performanceScore: product.performanceScore,
        priceUsd: product.priceUsd,
        releaseDate: product.releaseDate,
        date,
        reputation: nextState.company.reputation,
        marketingBudgetUsdPerDay: nextState.market.marketingBudgetUsdPerDay,
      }),
    }));
    const playerAppeal = appeals.reduce((total, entry) => total + entry.appeal, 0);
    const totalAppeal = playerAppeal + profile.competitorAppeal;
    componentDemandUnits += demandUnits;

    if (playerAppeal <= 0 || totalAppeal <= 0) {
      continue;
    }

    for (const entry of appeals) {
      const demandedUnits = Math.floor(demandUnits * (entry.appeal / totalAppeal));
      if (demandedUnits <= 0) {
        continue;
      }
      const soldUnits = Math.min(demandedUnits, entry.product.inventoryUnits);
      if (soldUnits <= 0) {
        continue;
      }

      const revenueUsd = roundUsd(soldUnits * entry.product.priceUsd);
      nextState = postFinanceTransaction(
        nextState,
        "sales",
        revenueUsd,
        `Component sales: ${entry.product.name}`,
      );
      componentUnits += soldUnits;
      componentRevenueUsd = roundUsd(componentRevenueUsd + revenueUsd);

      nextState = {
        ...nextState,
        market: {
          ...nextState.market,
          componentProducts: nextState.market.componentProducts.map((product) =>
            product.id === entry.product.id
              ? {
                ...product,
                inventoryUnits: product.inventoryUnits - soldUnits,
                unitsSold: product.unitsSold + soldUnits,
                revenueUsd: roundUsd(product.revenueUsd + revenueUsd),
              }
              : product,
          ),
        },
      };
    }
  }

  const componentResult: ComponentDayResult = {
    componentDemandUnits,
    componentUnits,
    componentRevenueUsd,
    componentManufacturingUsd,
  };
  const summary = upsertComponentSummary(nextState.market.dailySummaries, date, componentResult);
  nextState = {
    ...nextState,
    market: { ...nextState.market, dailySummaries: summary },
  };

  if (componentUnits > 0) {
    nextState = {
      ...nextState,
      finance: recordDailyUnits(
        nextState.finance,
        date,
        { sold: componentUnits },
        nextState.company.balance,
      ),
    };
  }

  return nextState;
}

export function estimateComponentProductDailyDemand(
  state: GameState,
  productId: string,
  date: string,
): (ComponentMarketEstimate & { type: ComponentMarketProduct["componentType"] }) | null {
  const product = state.market.componentProducts.find((candidate) => candidate.id === productId);
  if (!product) {
    return null;
  }
  const siblingAppeals = state.market.componentProducts
    .filter(
      (candidate) =>
        candidate.status === "active"
        && candidate.componentType === product.componentType
        && candidate.id !== product.id,
    )
    .reduce(
      (total, candidate) =>
        total + calculateComponentAppeal({
          configuration: candidate.configuration,
          performanceScore: candidate.performanceScore,
          priceUsd: candidate.priceUsd,
          releaseDate: candidate.releaseDate,
          date,
          reputation: state.company.reputation,
          marketingBudgetUsdPerDay: state.market.marketingBudgetUsdPerDay,
        }),
      0,
    );

  return {
    type: product.componentType,
    ...estimateComponentMarket({
      configuration: product.configuration,
      priceUsd: product.priceUsd,
      releaseDate: product.releaseDate,
      date,
      reputation: state.company.reputation,
      marketingBudgetUsdPerDay: state.market.marketingBudgetUsdPerDay,
      siblingAppeals,
    }),
  };
}

function findComponentProduct(state: GameState, productId: string): ComponentMarketProduct {
  const product = state.market.componentProducts.find((candidate) => candidate.id === productId);
  if (!product) {
    throw new ComponentMarketOperationError("product-not-found", "Component product was not found.");
  }
  return product;
}

function assertComponentPrice(priceUsd: number): void {
  if (
    !Number.isFinite(priceUsd)
    || priceUsd < MARKET_LIMITS.minPriceUsd
    || priceUsd > MARKET_LIMITS.maxPriceUsd
  ) {
    throw new ComponentMarketOperationError("invalid-price", "Component product price is invalid.");
  }
}

function nextComponentProductId(products: ComponentMarketProduct[]): string {
  let sequence = 1;
  while (products.some((product) => product.id === `component-product-${sequence}`)) {
    sequence += 1;
  }
  return `component-product-${sequence}`;
}

function upsertComponentSummary(
  summaries: MarketDaySummary[],
  date: string,
  result: ComponentDayResult,
): MarketDaySummary[] {
  const existing = summaries.find((summary) => summary.date === date);
  const updated: MarketDaySummary = existing
    ? { ...existing, ...result }
    : {
      date,
      totalDemandUnits: 0,
      playerUnits: 0,
      competitorUnits: 0,
      playerRevenueUsd: 0,
      marketShare: 0,
      segments: {},
      ...result,
    };
  return [...summaries.filter((summary) => summary.date !== date), updated]
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-MARKET_LIMITS.maxDailySummaries);
}

const COMPONENT_SALE_ORDER: ComponentProject["type"][] = [
  "gpu",
  "ram",
  "ssd",
  "motherboard",
  "ai-accelerator",
  "networking",
];
