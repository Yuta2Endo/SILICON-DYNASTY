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

  it("persists the Stage 1 to Stage 12 schema migration", async () => {
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

    expect(migrated?.schemaVersion).toBe(12);
    expect(migrated?.research).toEqual(createInitialGameState().research);
    expect(migrated?.company).toEqual(current.company);
    expect(migrated?.cpuProjects).toEqual([]);
    expect(migrated?.osProjects).toEqual([]);
    expect(migrated?.finance).toEqual(current.finance);
    expect(migrated?.market).toEqual(current.market);
    expect(persisted.schemaVersion).toBe(12);
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

    expect(migrated?.schemaVersion).toBe(12);
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
    expect(persisted.schemaVersion).toBe(12);
  });

  it("keeps the previous valid autosave as a recovery backup", async () => {
    const repository = new LocalStorageGameStateRepository(window.localStorage);
    const first = createInitialGameState();
    first.company.name = "First Dynasty";
    await repository.save(first);

    const second = {
      ...first,
      gameDate: "1995-02-01",
      company: { ...first.company, name: "Second Dynasty", balance: 90_000 },
    };
    await repository.save(second);

    const overview = await repository.getSaveOverview();
    expect(overview.supported).toBe(true);
    expect(overview.autosave?.companyName).toBe("Second Dynasty");
    expect(overview.autosave?.gameDate).toBe("1995-02-01");
    expect(overview.autosave?.savedAt).toBeTruthy();
    expect(overview.backup?.companyName).toBe("First Dynasty");
    expect(overview.backup?.gameDate).toBe("1995-01-01");
    expect(await repository.load()).toEqual(second);
  });

  it("saves, lists, loads and deletes manual slots", async () => {
    const repository = new LocalStorageGameStateRepository(window.localStorage);
    const state = createInitialGameState();
    state.company.name = "Slot Dynasty";
    await repository.saveSlot("slot-1", state);

    let overview = await repository.getSaveOverview();
    expect(overview.slots).toHaveLength(1);
    expect(overview.slots[0]).toMatchObject({
      slotId: "slot-1",
      companyName: "Slot Dynasty",
      gameDate: "1995-01-01",
      schemaVersion: 12,
    });
    expect(await repository.loadSlot("slot-1")).toEqual(state);

    await repository.deleteSlot("slot-1");
    overview = await repository.getSaveOverview();
    expect(overview.slots).toEqual([]);
    expect(await repository.loadSlot("slot-1")).toBeNull();
    await expect(repository.saveSlot("slot-9", state)).rejects.toThrow("Unknown save slot");
  });

  it("restores a valid backup after the current save is corrupted", async () => {
    const repository = new LocalStorageGameStateRepository(window.localStorage);
    const first = createInitialGameState();
    first.company.name = "Recovery Source";
    await repository.save(first);

    const second = { ...first, gameDate: "1995-03-01" };
    await repository.save(second);
    window.localStorage.setItem("silicon-dynasty:save", "{corrupted");

    const restored = await repository.restoreBackup();
    expect(restored?.company.name).toBe("Recovery Source");
    expect(JSON.parse(window.localStorage.getItem("silicon-dynasty:save") ?? "null")).toEqual(first);
    expect(window.localStorage.getItem("silicon-dynasty:save:backup")).toBeTruthy();
  });
});
