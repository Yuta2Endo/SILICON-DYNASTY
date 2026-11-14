import { describe, expect, it } from "vitest";

import { createComponentProject, createDefaultComponentConfiguration } from "../models/components";
import { getFinanceDailyRecord } from "../models/finance";
import { createInitialGameState } from "../models/game-state";
import {
  ManufacturingOperationError,
  orderComponentProduction,
  runComponentProductionDay,
  upgradeFactory,
} from "./manufacturing";
import { releaseComponentProduct } from "./component-market";

function releasedComponentState() {
  const state = createInitialGameState();
  const project = createComponentProject(
    "component-1",
    "Dynasty Graphics",
    "gpu",
    createDefaultComponentConfiguration("gpu"),
    state.gameDate,
  );
  return releaseComponentProduct(
    { ...state, componentProjects: [project] },
    {
      projectId: "component-1",
      projectVersion: 1,
      name: "Dynasty Graphics 100",
      priceUsd: 400,
    },
  );
}

describe("manufacturing engine", () => {
  it("charges a batch, queues it and delivers it on the ready date", () => {
    const state = releasedComponentState();
    const product = state.market.componentProducts[0]!;
    const before = state.company.balance;
    const ordered = orderComponentProduction(state, product.id, 100);
    const order = ordered.manufacturing.componentOrders[0]!;

    expect(order.quantity).toBe(100);
    expect(order.readyOn).toBe("1995-01-06");
    expect(ordered.company.balance).toBeCloseTo(
      before - product.manufacturingCostUsd * 100,
      2,
    );

    const early = runComponentProductionDay(ordered, "1995-01-05");
    expect(early.market.componentProducts[0]?.inventoryUnits).toBe(0);

    const delivered = runComponentProductionDay(ordered, "1995-01-06");
    expect(delivered.manufacturing.componentOrders).toEqual([]);
    expect(delivered.market.componentProducts[0]?.inventoryUnits).toBe(100);
    expect(delivered.market.componentProducts[0]?.unitsProduced).toBe(100);
    expect(getFinanceDailyRecord(delivered.finance, "1995-01-06")?.unitsProduced).toBe(100);
  });

  it("upgrades the factory and rejects an unaffordable or maximum upgrade", () => {
    const state = releasedComponentState();
    const upgraded = upgradeFactory({ ...state, company: { ...state.company, balance: 1_000_000 } });
    expect(upgraded.manufacturing.factoryLevel).toBe(2);
    expect(upgraded.company.balance).toBe(850_000);

    expect(() => upgradeFactory(state)).toThrow();
    expect(() => upgradeFactory({
      ...state,
      company: { ...state.company, balance: 1_000_000 },
      manufacturing: { ...state.manufacturing, factoryLevel: 5 },
    })).toThrow(ManufacturingOperationError);
  });

  it("rejects invalid quantities and missing products", () => {
    const state = releasedComponentState();
    expect(() => orderComponentProduction(state, "missing", 10)).toThrow(ManufacturingOperationError);
    expect(() => orderComponentProduction(state, "component-product-1", 0)).toThrow(ManufacturingOperationError);
    expect(() => orderComponentProduction(state, "component-product-1", 1.5)).toThrow(ManufacturingOperationError);
  });
});
