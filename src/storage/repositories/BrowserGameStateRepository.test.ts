import { afterEach, describe, expect, it } from "vitest";
import {
  createInitialGameState,
} from "../../game/models/game-state";
import { createCpuProject, createDefaultCpuConfiguration } from "../../game/models/cpu";
import { LocalStorageGameStateRepository } from "./BrowserGameStateRepository";

afterEach(() => {
  window.localStorage.clear();
});

describe("LocalStorageGameStateRepository", () => {
  it("loads a missing save as null and round-trips valid state", async () => {
    const repository = new LocalStorageGameStateRepository(window.localStorage);

    expect(await repository.load()).toBeNull();

    const state = createInitialGameState();
    await repository.save(state);

    expect(await repository.load()).toEqual(state);
  });

  it("rejects corrupted saves instead of silently replacing them", async () => {
    const repository = new LocalStorageGameStateRepository(window.localStorage);
    window.localStorage.setItem("silicon-dynasty:save:v1", "{not-json");

    await expect(repository.load()).rejects.toThrow("not valid JSON");
    expect(window.localStorage.getItem("silicon-dynasty:save:v1")).toBe("{not-json");
  });

  it("persists the Stage 1 to Stage 6 schema migration", async () => {
    const repository = new LocalStorageGameStateRepository(window.localStorage);
    const current = createInitialGameState();
    const legacySave = {
      schemaVersion: 1,
      gameDate: current.gameDate,
      company: current.company,
      settings: current.settings,
    };
    window.localStorage.setItem("silicon-dynasty:save:v1", JSON.stringify(legacySave));

    const migrated = await repository.load();
    const persisted = JSON.parse(window.localStorage.getItem("silicon-dynasty:save") ?? "null") as { schemaVersion?: number };
    const legacy = JSON.parse(window.localStorage.getItem("silicon-dynasty:save:v1") ?? "null") as { schemaVersion?: number };

    expect(migrated?.schemaVersion).toBe(6);
    expect(migrated?.research).toEqual(createInitialGameState().research);
    expect(migrated?.company).toEqual(current.company);
    expect(migrated?.cpuProjects).toEqual([]);
    expect(migrated?.osProjects).toEqual([]);
    expect(migrated?.finance).toEqual(current.finance);
    expect(migrated?.market).toEqual(current.market);
    expect(persisted.schemaVersion).toBe(6);
    expect(legacy.schemaVersion).toBe(1);
  });

  it("migrates schema-2 saves while preserving CPU capabilities", async () => {
    const current = createInitialGameState();
    const configuration = {
      ...createDefaultCpuConfiguration(),
      isa: "arm" as const,
      memoryStandard: "ddr" as const,
      simdExtensions: ["neon" as const],
    };
    const project = createCpuProject("legacy-cpu", "Legacy Processor", configuration, current.gameDate);
    const legacySave = {
      schemaVersion: 2,
      gameDate: current.gameDate,
      company: current.company,
      settings: current.settings,
      cpuProjects: [project],
    };
    window.localStorage.setItem("silicon-dynasty:save", JSON.stringify(legacySave));
    const repository = new LocalStorageGameStateRepository(window.localStorage);

    const migrated = await repository.load();
    const persisted = JSON.parse(window.localStorage.getItem("silicon-dynasty:save") ?? "null") as {
      schemaVersion: number;
    };

    expect(migrated?.schemaVersion).toBe(6);
    expect(migrated?.cpuProjects).toEqual([project]);
    expect(migrated?.finance).toEqual(current.finance);
    expect(migrated?.market).toEqual(current.market);
    expect(migrated?.osProjects).toEqual([]);
    expect(migrated?.research.completedTechnologyIds).toEqual([]);
    expect(migrated?.research.legacyUnlockIds).toEqual(expect.arrayContaining([
      "cpu.arm-isa",
      "memory.ddr",
      "cpu.neon",
    ]));
    expect(persisted.schemaVersion).toBe(6);
  });
});
