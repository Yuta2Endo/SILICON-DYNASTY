import { describe, expect, it } from "vitest";
import { createInitialGameState, InvalidGameStateError, parseGameState } from "./game-state";

describe("game state validation", () => {
  it("round-trips a valid starting state", () => {
    const state = createInitialGameState();

    expect(parseGameState(state)).toEqual(state);
  });

  it("rejects invalid dates and unknown schema versions", () => {
    const state = createInitialGameState();

    expect(() => parseGameState({ ...state, gameDate: "1995-02-30" })).toThrow(InvalidGameStateError);
    expect(() => parseGameState({ ...state, schemaVersion: 3 })).toThrow(InvalidGameStateError);
  });

  it("migrates a Stage 1 save without losing company, date, or settings", () => {
    const current = createInitialGameState();
    const legacyStageOneSave = {
      schemaVersion: 1,
      gameDate: current.gameDate,
      company: current.company,
      settings: current.settings,
    };

    const migrated = parseGameState(legacyStageOneSave);

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.gameDate).toBe(current.gameDate);
    expect(migrated.company).toEqual(current.company);
    expect(migrated.settings).toEqual(current.settings);
    expect(migrated.cpuProjects).toEqual([]);
  });

  it("rejects invalid CPU projects in the current save schema", () => {
    const state = createInitialGameState();

    expect(() => parseGameState({ ...state, cpuProjects: [{ id: "bad" }] })).toThrow(InvalidGameStateError);
  });
});
