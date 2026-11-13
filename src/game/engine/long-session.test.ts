import { describe, expect, it } from "vitest";
import { addDays } from "../models/date";
import { createInitialGameState } from "../models/game-state";
import { MAX_SAVE_IMPORT_BYTES, exportGameState } from "../application/save-transfer";
import { advanceGameDay } from "./time";

describe("long session simulation", () => {
  it("advances 400 days without exceeding history caps or import limits", () => {
    const initial = createInitialGameState();
    let state = initial;

    for (let day = 0; day < 400; day += 1) {
      state = advanceGameDay(state);
    }

    expect(state.gameDate).toBe(addDays(initial.gameDate, 400));
    expect(state.finance.dailyRecords.length).toBeLessThanOrEqual(365);
    expect(state.finance.transactions.length).toBeLessThanOrEqual(120);
    expect(state.market.dailySummaries.length).toBeLessThanOrEqual(180);

    const serialized = exportGameState(state);
    expect(new TextEncoder().encode(serialized).byteLength).toBeLessThan(MAX_SAVE_IMPORT_BYTES);
  });
});
