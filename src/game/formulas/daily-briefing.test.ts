import { describe, expect, it } from "vitest";

import { buildDailyBriefing } from "./daily-briefing";
import { postFinanceTransaction } from "../engine/finance";
import { advanceGameDay } from "../engine/time";
import { createInitialGameState } from "../models/game-state";

describe("buildDailyBriefing", () => {
  it("returns null before the first simulated day", () => {
    expect(buildDailyBriefing(createInitialGameState())).toBeNull();
  });

  it("summarizes the latest day and compares it with the previous day", () => {
    let state = createInitialGameState();
    state = postFinanceTransaction(state, "sales", 1_000, "Test sale");
    state = advanceGameDay(state);
    state = advanceGameDay(state);

    const briefing = buildDailyBriefing(state);

    expect(briefing).not.toBeNull();
    expect(briefing?.date).toBe("1995-01-02");
    expect(briefing?.revenueUsd).toBe(0);
    expect(briefing?.revenueDeltaUsd).toBe(-1_000);
    expect(briefing?.profitDeltaUsd).toBeLessThan(0);
    expect(briefing?.oemOffers).toBe(0);
    expect(briefing?.commercialOffers).toBe(0);
    expect(briefing?.competitorExits).toBe(0);
    expect(briefing?.stockouts).toBe(0);
  });
});
