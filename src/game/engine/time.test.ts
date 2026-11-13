import { describe, expect, it } from "vitest";
import { advanceGameDay } from "./time";
import { createInitialGameState } from "../models/game-state";

describe("advanceGameDay", () => {
  it("advances the game date by one day without changing company data", () => {
    const state = createInitialGameState();
    const next = advanceGameDay(state);

    expect(next.gameDate).toBe("1995-01-02");
    expect(next.company).toEqual(state.company);
    expect(state.gameDate).toBe("1995-01-01");
  });

  it("handles leap days and year boundaries", () => {
    const state = createInitialGameState();

    expect(advanceGameDay({ ...state, gameDate: "2000-02-28" }).gameDate).toBe("2000-02-29");
    expect(advanceGameDay({ ...state, gameDate: "1995-12-31" }).gameDate).toBe("1996-01-01");
  });
});
