import { describe, expect, it } from "vitest";

import {
  InvalidManufacturingDataError,
  createInitialManufacturingState,
  getComponentOrderReadyOn,
  getComponentProductionLeadTime,
  getFactoryCapacity,
  getFactoryUpgradeCost,
  parseManufacturingState,
} from "./manufacturing";

describe("manufacturing model", () => {
  it("scales capacity and lead time with factory level", () => {
    expect(createInitialManufacturingState()).toEqual({ factoryLevel: 1, componentOrders: [] });
    expect(getFactoryCapacity(1)).toBe(1_000);
    expect(getFactoryCapacity(4)).toBe(8_000);
    expect(getComponentProductionLeadTime(100, 1)).toBe(5);
    expect(getComponentProductionLeadTime(2_000, 1)).toBe(6);
    expect(getComponentProductionLeadTime(2_000, 2)).toBe(5);
    expect(getComponentOrderReadyOn("1995-01-01", 100, 1)).toBe("1995-01-06");
  });

  it("prices upgrades and stops at the maximum level", () => {
    expect(getFactoryUpgradeCost(1)).toBe(150_000);
    expect(getFactoryUpgradeCost(4)).toBe(600_000);
    expect(getFactoryUpgradeCost(5)).toBeNull();
  });

  it("round-trips production orders and rejects tampered dates", () => {
    const state = {
      factoryLevel: 2,
      componentOrders: [
        {
          id: "component-order-1",
          productId: "component-product-1",
          quantity: 500,
          unitCostUsd: 42,
          totalCostUsd: 21_000,
          orderedOn: "1995-01-01",
          readyOn: "1995-01-06",
        },
      ],
    };

    expect(parseManufacturingState(state)).toEqual(state);
    expect(() => parseManufacturingState({
      ...state,
      componentOrders: [{ ...state.componentOrders[0], readyOn: "1995-01-01" }],
    })).toThrow(InvalidManufacturingDataError);
  });
});
