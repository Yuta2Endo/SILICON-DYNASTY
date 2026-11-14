import { addDays, isValidDateOnly } from "./date";

export const MANUFACTURING_MAX_LEVEL = 5;
export const MANUFACTURING_BASE_CAPACITY = 1_000;
export const MANUFACTURING_MAX_ACTIVE_ORDERS = 20;
export const MANUFACTURING_ORDER_LIMITS = {
  minQuantity: 1,
  maxQuantity: 100_000,
} as const;

export interface ComponentProductionOrder {
  id: string;
  productId: string;
  quantity: number;
  unitCostUsd: number;
  totalCostUsd: number;
  orderedOn: string;
  readyOn: string;
}

export interface ManufacturingState {
  factoryLevel: number;
  componentOrders: ComponentProductionOrder[];
}

export class InvalidManufacturingDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidManufacturingDataError";
  }
}

export function createInitialManufacturingState(): ManufacturingState {
  return {
    factoryLevel: 1,
    componentOrders: [],
  };
}

export function getFactoryCapacity(level: number): number {
  return MANUFACTURING_BASE_CAPACITY * 2 ** (level - 1);
}

export function getFactoryUpgradeCost(level: number): number | null {
  if (level >= MANUFACTURING_MAX_LEVEL) {
    return null;
  }
  return 150_000 * level;
}

export function getComponentProductionLeadTime(quantity: number, level: number): number {
  return 4 + Math.ceil(quantity / getFactoryCapacity(level));
}

export function getComponentOrderReadyOn(
  orderedOn: string,
  quantity: number,
  level: number,
): string {
  return addDays(orderedOn, getComponentProductionLeadTime(quantity, level));
}

export function parseManufacturingState(value: unknown): ManufacturingState {
  if (!isRecord(value)) {
    throw new InvalidManufacturingDataError("Manufacturing data must be an object.");
  }
  if (
    typeof value.factoryLevel !== "number"
    || !Number.isInteger(value.factoryLevel)
    || value.factoryLevel < 1
    || value.factoryLevel > MANUFACTURING_MAX_LEVEL
    || !Array.isArray(value.componentOrders)
    || value.componentOrders.length > MANUFACTURING_MAX_ACTIVE_ORDERS
  ) {
    throw new InvalidManufacturingDataError("Manufacturing state is invalid.");
  }

  const orders = value.componentOrders.map(parseComponentProductionOrder);
  if (new Set(orders.map((order) => order.id)).size !== orders.length) {
    throw new InvalidManufacturingDataError("Manufacturing order IDs are duplicated.");
  }

  return {
    factoryLevel: value.factoryLevel,
    componentOrders: orders,
  };
}

function parseComponentProductionOrder(value: unknown): ComponentProductionOrder {
  if (
    !isRecord(value)
    || typeof value.id !== "string"
    || value.id.length === 0
    || typeof value.productId !== "string"
    || value.productId.length === 0
    || !isPositiveInteger(value.quantity)
    || value.quantity > MANUFACTURING_ORDER_LIMITS.maxQuantity
    || typeof value.unitCostUsd !== "number"
    || !Number.isFinite(value.unitCostUsd)
    || value.unitCostUsd < 0
    || typeof value.totalCostUsd !== "number"
    || !Number.isFinite(value.totalCostUsd)
    || value.totalCostUsd < 0
    || typeof value.orderedOn !== "string"
    || !isValidDateOnly(value.orderedOn)
    || typeof value.readyOn !== "string"
    || !isValidDateOnly(value.readyOn)
    || value.readyOn <= value.orderedOn
  ) {
    throw new InvalidManufacturingDataError("Component production order is invalid.");
  }

  return {
    id: value.id,
    productId: value.productId,
    quantity: value.quantity,
    unitCostUsd: roundUsd(value.unitCostUsd),
    totalCostUsd: roundUsd(value.totalCostUsd),
    orderedOn: value.orderedOn,
    readyOn: value.readyOn,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

function roundUsd(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
