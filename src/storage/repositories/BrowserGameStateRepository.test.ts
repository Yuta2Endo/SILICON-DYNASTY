import { afterEach, describe, expect, it } from "vitest";
import { createInitialGameState } from "../../game/models/game-state";
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

  it("persists the Stage 1 to Stage 2 schema migration", async () => {
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

    expect(migrated?.schemaVersion).toBe(2);
    expect(migrated?.company).toEqual(current.company);
    expect(migrated?.cpuProjects).toEqual([]);
    expect(persisted.schemaVersion).toBe(2);
    expect(legacy.schemaVersion).toBe(1);
  });
});
