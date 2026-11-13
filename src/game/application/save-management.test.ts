import { afterEach, describe, expect, it } from "vitest";
import type { GameState } from "../models/game-state";
import type { GameStateRepository } from "../../storage/repositories/GameStateRepository";
import { LocalStorageGameStateRepository } from "../../storage/repositories/BrowserGameStateRepository";
import {
  createGameApplication,
  SaveManagementUnavailableError,
} from "./game-application";

class MemoryGameStateRepository implements GameStateRepository {
  state: GameState | null = null;

  async load(): Promise<GameState | null> {
    return this.state;
  }

  async save(state: GameState): Promise<void> {
    this.state = state;
  }
}

afterEach(() => {
  window.localStorage.clear();
});

describe("save management application commands", () => {
  it("saves to a slot, loads it, and keeps the replaced autosave in backup", async () => {
    const repository = new LocalStorageGameStateRepository(window.localStorage);
    const application = createGameApplication(repository);
    await application.load();
    await application.renameCompany("Slot Dynasty");

    const afterSlotSave = await application.saveToSlot("slot-1");
    expect(afterSlotSave.slots[0]).toMatchObject({
      slotId: "slot-1",
      companyName: "Slot Dynasty",
    });

    await application.renameCompany("Autosave Dynasty");
    const loaded = await application.loadFromSlot("slot-1");
    expect(loaded.company.name).toBe("Slot Dynasty");

    const overview = await application.getSaveInfo();
    expect(overview.autosave?.companyName).toBe("Slot Dynasty");
    expect(overview.backup?.companyName).toBe("Autosave Dynasty");
    expect((await application.load()).company.name).toBe("Slot Dynasty");
  });

  it("rejects an invalid import without changing the current save", async () => {
    const repository = new LocalStorageGameStateRepository(window.localStorage);
    const application = createGameApplication(repository);
    await application.load();
    await application.renameCompany("Stable Import Target");

    const before = await application.load();
    const beforeSerialized = window.localStorage.getItem("silicon-dynasty:save");

    await expect(application.importSave("{not-json")).rejects.toMatchObject({
      code: "invalid-json",
    });

    expect(await application.load()).toEqual(before);
    expect(window.localStorage.getItem("silicon-dynasty:save")).toBe(beforeSerialized);
  });

  it("round-trips export/import and restores a backup", async () => {
    const repository = new LocalStorageGameStateRepository(window.localStorage);
    const application = createGameApplication(repository);
    await application.load();
    await application.renameCompany("Export Source");

    const serialized = await application.exportSave();
    await application.renameCompany("Imported Target");
    const imported = await application.importSave(serialized);
    expect(imported.company.name).toBe("Export Source");

    await application.renameCompany("After Import");
    const restored = await application.restoreBackup();
    expect(restored.company.name).toBe("Export Source");
    expect((await application.load()).company.name).toBe("Export Source");
  });

  it("reports unsupported save management without breaking autosave", async () => {
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);
    await application.load();

    const overview = await application.getSaveInfo();
    expect(overview).toEqual({
      supported: false,
      autosave: null,
      backup: null,
      slots: [],
    });
    await expect(application.saveToSlot("slot-1")).rejects.toBeInstanceOf(
      SaveManagementUnavailableError,
    );
    expect(repository.state?.company.name).toBe("Silicon Dynasty");
  });
});
