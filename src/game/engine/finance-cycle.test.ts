import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../models/game-state";
import { getFinanceDailyRecord } from "../models/finance";
import { settleDailyFinance } from "./finance";

describe("finance economic cycle", () => {
  it("applies expansion costs while keeping 1995 costs neutral", () => {
    const neutral = settleDailyFinance(createInitialGameState(), "1995-01-01");
    const expansionState = { ...createInitialGameState(), gameDate: "1997-01-01" };
    const expansion = settleDailyFinance(expansionState, "1997-01-01");

    expect(getFinanceDailyRecord(neutral.finance, "1995-01-01")).toMatchObject({
      payrollUsd: 120,
      overheadUsd: 80,
    });
    expect(neutral.company.balance).toBe(99_800);

    const record = getFinanceDailyRecord(expansion.finance, "1997-01-01");
    expect(record).toMatchObject({
      payrollUsd: 122.4,
      overheadUsd: 81.6,
      netProfitUsd: -204,
      closingBalanceUsd: 99_796,
    });
    expect(expansion.company.balance).toBe(99_796);
  });
});
