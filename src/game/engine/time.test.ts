import { describe, expect, it } from "vitest";
import { advanceGameDay } from "./time";
import { createInitialGameState } from "../models/game-state";
import { getFinanceDailyRecord } from "../models/finance";
import { createComponentProject, createDefaultComponentConfiguration } from "../models/components";
import { releaseComponentProduct } from "./component-market";

describe("advanceGameDay", () => {
  it("advances the date and posts one day of operating expenses", () => {
    const state = createInitialGameState();
    const next = advanceGameDay(state);

    expect(next.gameDate).toBe("1995-01-02");
    expect(next.company.balance).toBe(99_800);
    expect(next.company.name).toBe(state.company.name);
    expect(next.company.reputation).toBe(state.company.reputation);
    expect(next.finance.dailyRecords).toHaveLength(1);
    expect(getFinanceDailyRecord(next.finance, "1995-01-01")).toMatchObject({
      payrollUsd: 120,
      overheadUsd: 80,
      netProfitUsd: -200,
      netCashFlowUsd: -200,
      closingBalanceUsd: 99_800,
      unitsSold: 0,
      unitsProduced: 0,
    });
    expect(state.gameDate).toBe("1995-01-01");
    expect(state.finance.dailyRecords).toHaveLength(0);
  });

  it("handles leap days and year boundaries", () => {
    const state = createInitialGameState();

    expect(advanceGameDay({ ...state, gameDate: "2000-02-28" }).gameDate).toBe("2000-02-29");
    expect(advanceGameDay({ ...state, gameDate: "1995-12-31" }).gameDate).toBe("1996-01-01");
  });

  it("runs component sales through the daily market and finance pipeline", () => {
    const state = createInitialGameState();
    const project = createComponentProject(
      "component-1",
      "Dynasty Graphics",
      "gpu",
      createDefaultComponentConfiguration("gpu"),
      state.gameDate,
    );
    const released = releaseComponentProduct(
      { ...state, componentProjects: [project] },
      {
        projectId: "component-1",
        projectVersion: 1,
        name: "Dynasty Graphics 100",
        priceUsd: 400,
      },
    );
    const mature = {
      ...released,
      market: {
        ...released.market,
        componentProducts: released.market.componentProducts.map((product) => ({
          ...product,
          releaseDate: "1994-01-01",
          inventoryUnits: 1_000,
          unitsProduced: 1_000,
        })),
      },
    };

    const next = advanceGameDay(mature);
    const summary = next.market.dailySummaries.find((entry) => entry.date === "1995-01-01");
    const record = getFinanceDailyRecord(next.finance, "1995-01-01");

    expect(next.gameDate).toBe("1995-01-02");
    expect(summary?.componentUnits).toBeGreaterThan(0);
    expect(summary?.componentRevenueUsd).toBe((summary?.componentUnits ?? 0) * 400);
    expect(record?.unitsSold).toBe(summary?.componentUnits);
    expect(record?.revenueUsd).toBe(summary?.componentRevenueUsd);
    expect(record?.manufacturingUsd).toBe(0);
  });
});
