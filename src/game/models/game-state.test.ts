import { describe, expect, it } from "vitest";
import { createInitialGameState, InvalidGameStateError, parseGameState } from "./game-state";
import { createCpuProject, createDefaultCpuConfiguration } from "./cpu";

describe("game state validation", () => {
  it("round-trips a valid starting state", () => {
    const state = createInitialGameState();

    expect(parseGameState(state)).toEqual(state);
  });

  it("rejects invalid dates and unknown schema versions", () => {
    const state = createInitialGameState();

    expect(() => parseGameState({ ...state, gameDate: "1995-02-30" })).toThrow(InvalidGameStateError);
    expect(() => parseGameState({ ...state, schemaVersion: 5 })).toThrow(InvalidGameStateError);
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

    expect(migrated.schemaVersion).toBe(4);
    expect(migrated.gameDate).toBe(current.gameDate);
    expect(migrated.company).toEqual(current.company);
    expect(migrated.settings).toEqual(current.settings);
    expect(migrated.cpuProjects).toEqual([]);
    expect(migrated.research).toEqual(current.research);
    expect(migrated.finance).toEqual(current.finance);
    expect(migrated.market).toEqual(current.market);
  });

  it("migrates schema-2 saves and preserves CPU history as legacy unlocks", () => {
    const current = createInitialGameState();
    const legacyConfiguration = {
      ...createDefaultCpuConfiguration(),
      isa: "arm" as const,
      memoryStandard: "ddr" as const,
      simdExtensions: ["neon" as const],
    };
    const cpuProject = createCpuProject("cpu-1", "Legacy Processor", legacyConfiguration, current.gameDate);
    const migrated = parseGameState({
      schemaVersion: 2,
      gameDate: current.gameDate,
      company: current.company,
      cpuProjects: [cpuProject],
      settings: current.settings,
    });

    expect(migrated.schemaVersion).toBe(4);
    expect(migrated.cpuProjects).toEqual([cpuProject]);
    expect(migrated.finance).toEqual(current.finance);
    expect(migrated.market).toEqual(current.market);
    expect(migrated.research.completedTechnologyIds).toEqual([]);
    expect(migrated.research.legacyUnlockIds).toEqual(
      expect.arrayContaining(["cpu.arm-isa", "memory.ddr", "cpu.neon"]),
    );
  });

  it("migrates schema-3 saves by initializing finance and market at the saved date", () => {
    const current = createInitialGameState();
    const legacySave = {
      schemaVersion: 3,
      gameDate: "1998-06-15",
      company: { ...current.company, balance: 250_000 },
      cpuProjects: [],
      research: current.research,
      settings: current.settings,
    };

    const migrated = parseGameState(legacySave);

    expect(migrated.schemaVersion).toBe(4);
    expect(migrated.gameDate).toBe("1998-06-15");
    expect(migrated.finance).toEqual(current.finance);
    expect(migrated.market.products).toEqual([]);
    expect(migrated.market.dailySummaries).toEqual([]);
    expect(migrated.market.competitors).toHaveLength(6);
    expect(migrated.market.competitors[0]?.nextActionOn).toBe("1998-06-22");
  });

  it("rejects invalid CPU projects in the current save schema", () => {
    const state = createInitialGameState();

    expect(() => parseGameState({ ...state, cpuProjects: [{ id: "bad" }] })).toThrow(InvalidGameStateError);
  });
});
