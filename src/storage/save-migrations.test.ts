import { describe, expect, it } from "vitest";
import { advanceGameDay } from "../game/engine/time";
import { createInitialGameState, parseGameState, SAVE_SCHEMA_VERSION } from "../game/models/game-state";
import {
  createSchema1Fixture,
  createSchema5Fixture,
  createSchema7Fixture,
  createSchema10Fixture,
  createSchema11Fixture,
} from "./fixtures/legacy-saves";

describe("save migrations with fixture saves", () => {
  it("migrates a schema-1 save and preserves company data", () => {
    const state = parseGameState(createSchema1Fixture());

    expect(state.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(state.company.name).toBe("Silicon Dynasty");
    expect(state.cpuProjects).toEqual([]);
    expect(state.componentProjects).toEqual([]);
    expect(state.osProjects).toEqual([]);
    expect(state.aiProjects).toEqual([]);
    expect(state.deviceProjects).toEqual([]);
    expect(state.cloudProjects).toEqual([]);
  });

  it("migrates schema-5 components and finance without losing project data", () => {
    const state = parseGameState(createSchema5Fixture());

    expect(state.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(state.company.name).toBe("Legacy Components Co");
    expect(state.cpuProjects.map((project) => project.name)).toEqual(["Legacy CPU"]);
    expect(state.componentProjects.map((project) => project.name)).toEqual(["Legacy GPU"]);
    expect(state.osProjects).toEqual([]);
    expect(state.aiProjects).toEqual([]);
    expect(state.finance).toEqual(createInitialGameState().finance);
  });

  it("fills legacy OS ecosystem defaults and empty releases for schema 7", () => {
    const state = parseGameState(createSchema7Fixture());

    expect(state.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(state.osProjects).toHaveLength(1);
    expect(state.osProjects[0]?.name).toBe("Legacy OS");
    expect(state.osProjects[0]?.configuration.gui).toBe("cli");
    expect(state.osProjects[0]?.configuration.sdk).toBe("basic");
    expect(state.osProjects[0]?.configuration.api).toBe("proprietary");
    expect(state.osProjects[0]?.configuration.developerTools).toBe("compiler");
    expect(state.osProjects[0]?.configuration.appStore).toBe("none");
    expect(state.osProjects[0]?.releases).toEqual([]);
    expect(state.deviceProjects).toEqual([]);
    expect(state.cloudProjects).toEqual([]);
  });

  it("initializes device and cloud arrays for schema 10", () => {
    const state = parseGameState(createSchema10Fixture());

    expect(state.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(state.company.name).toBe("Pre-Devices Co");
    expect(state.deviceProjects).toEqual([]);
    expect(state.cloudProjects).toEqual([]);
  });

  it("round-trips a current schema save and rejects a future schema", () => {
    const current = parseGameState(createSchema11Fixture());
    expect(current.company.name).toBe("Current Save Co");
    expect(parseGameState(JSON.parse(JSON.stringify(current)))).toEqual(current);

    expect(() => parseGameState({
      ...createSchema11Fixture() as Record<string, unknown>,
      schemaVersion: 12,
    })).toThrow("unsupported schema version");
  });

  it("survives a long session and a full JSON round-trip", () => {
    let state = createInitialGameState();
    for (let day = 0; day < 30; day += 1) {
      state = advanceGameDay(state);
    }

    const restored = parseGameState(JSON.parse(JSON.stringify(state)));
    expect(restored.gameDate).toBe("1995-01-31");
    expect(restored.finance.dailyRecords.length).toBeLessThanOrEqual(365);
    expect(restored.finance.transactions.length).toBeLessThanOrEqual(120);
    expect(restored.market.dailySummaries.length).toBeLessThanOrEqual(180);
    expect(restored.company.balance).toBe(state.company.balance);
  });
});
