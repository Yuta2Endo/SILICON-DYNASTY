import { describe, expect, it } from "vitest";

import { calculateCompanyLegacyScore } from "./legacy";
import { createInitialGameState } from "../models/game-state";

describe("company legacy score", () => {
  it("derives the score from live company state", () => {
    const initial = createInitialGameState();
    expect(calculateCompanyLegacyScore(initial)).toBe(20);

    const stronger = {
      ...initial,
      company: { ...initial.company, reputation: 50 },
      finance: {
        ...initial.finance,
        lifetimeRevenueUsd: 1_000_000,
      },
    };
    expect(calculateCompanyLegacyScore(stronger)).toBe(118);
  });
});
