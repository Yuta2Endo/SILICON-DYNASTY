import type { GameState } from "../models/game-state";
import { recordDailyUnits, roundUsd } from "../models/finance";
import {
  MANUFACTURING_MAX_ACTIVE_ORDERS,
  MANUFACTURING_ORDER_LIMITS,
  getComponentOrderReadyOn,
  getFactoryUpgradeCost,
  type ComponentProductionOrder,
} from "../models/manufacturing";
import { postFinanceTransaction } from "./finance";

export type ManufacturingOperationCode =
  | "product-not-found"
  | "product-inactive"
  | "invalid-quantity"
  | "order-limit"
  | "max-level";

export class ManufacturingOperationError extends Error {
  constructor(
    readonly code: ManufacturingOperationCode,
    message: string,
  ) {
    super(message);
    this.name = "ManufacturingOperationError";
  }
}

export function orderComponentProduction(
  state: GameState,
  productId: string,
  quantity: number,
): GameState {
  const product = state.market.componentProducts.find((candidate) => candidate.id === productId);
  if (!product) {
    throw new ManufacturingOperationError("product-not-found", "Component product was not found.");
  }
  if (product.status !== "active") {
    throw new ManufacturingOperationError("product-inactive", "Component product is discontinued.");
  }
  if (
    !Number.isInteger(quantity)
    || quantity < MANUFACTURING_ORDER_LIMITS.minQuantity
    || quantity > MANUFACTURING_ORDER_LIMITS.maxQuantity
  ) {
    throw new ManufacturingOperationError("invalid-quantity", "Production quantity is invalid.");
  }
  if (state.manufacturing.componentOrders.length >= MANUFACTURING_MAX_ACTIVE_ORDERS) {
    throw new ManufacturingOperationError("order-limit", "The production queue is full.");
  }

  const totalCostUsd = roundUsd(quantity * product.manufacturingCostUsd);
  const charged = postFinanceTransaction(
    state,
    "manufacturing",
    -totalCostUsd,
    `Component production: ${product.name}`,
  );
  const order: ComponentProductionOrder = {
    id: nextOrderId(state.manufacturing.componentOrders),
    productId: product.id,
    quantity,
    unitCostUsd: product.manufacturingCostUsd,
    totalCostUsd,
    orderedOn: state.gameDate,
    readyOn: getComponentOrderReadyOn(
      state.gameDate,
      quantity,
      state.manufacturing.factoryLevel,
    ),
  };

  return {
    ...charged,
    manufacturing: {
      ...charged.manufacturing,
      componentOrders: [...charged.manufacturing.componentOrders, order],
    },
  };
}

export function runComponentProductionDay(state: GameState, date: string): GameState {
  const dueOrders = state.manufacturing.componentOrders.filter((order) => order.readyOn <= date);
  if (dueOrders.length === 0) {
    return state;
  }

  const producedByProduct = new Map<string, number>();
  for (const order of dueOrders) {
    producedByProduct.set(
      order.productId,
      (producedByProduct.get(order.productId) ?? 0) + order.quantity,
    );
  }

  const producedUnits = [...producedByProduct.values()].reduce((total, value) => total + value, 0);
  let nextState: GameState = {
    ...state,
    manufacturing: {
      ...state.manufacturing,
      componentOrders: state.manufacturing.componentOrders.filter((order) => order.readyOn > date),
    },
    market: {
      ...state.market,
      componentProducts: state.market.componentProducts.map((product) => {
        const produced = producedByProduct.get(product.id);
        return produced
          ? {
            ...product,
            inventoryUnits: product.inventoryUnits + produced,
            unitsProduced: product.unitsProduced + produced,
          }
          : product;
      }),
    },
  };

  if (producedUnits > 0) {
    nextState = {
      ...nextState,
      finance: recordDailyUnits(
        nextState.finance,
        date,
        { produced: producedUnits },
        nextState.company.balance,
      ),
    };
  }

  return nextState;
}

export function upgradeFactory(state: GameState): GameState {
  const cost = getFactoryUpgradeCost(state.manufacturing.factoryLevel);
  if (cost === null) {
    throw new ManufacturingOperationError("max-level", "The factory is already at maximum level.");
  }
  const charged = postFinanceTransaction(
    state,
    "overhead",
    -cost,
    `Factory upgrade to level ${state.manufacturing.factoryLevel + 1}`,
  );

  return {
    ...charged,
    manufacturing: {
      ...charged.manufacturing,
      factoryLevel: charged.manufacturing.factoryLevel + 1,
    },
  };
}

function nextOrderId(orders: readonly ComponentProductionOrder[]): string {
  let index = orders.length + 1;
  const ids = new Set(orders.map((order) => order.id));
  while (ids.has(`component-order-${index}`)) {
    index += 1;
  }
  return `component-order-${index}`;
}
