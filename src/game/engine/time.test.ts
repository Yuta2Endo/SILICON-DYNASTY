import { describe, expect, it } from "vitest";
import { advanceGameDay } from "./time";
import { createInitialGameState } from "../models/game-state";
import { getFinanceDailyRecord } from "../models/finance";

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
});
