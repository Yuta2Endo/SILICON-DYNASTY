import { describe, expect, it } from "vitest";
import type { GameState } from "../models/game-state";
import { createDefaultCpuConfiguration } from "../models/cpu";
import { createGameApplication } from "./game-application";
import type { GameStateRepository } from "../../storage/repositories/GameStateRepository";

class MemoryGameStateRepository implements GameStateRepository {
  state: GameState | null = null;

  async load(): Promise<GameState | null> {
    return this.state;
  }

  async save(state: GameState): Promise<void> {
    this.state = state;
  }
}

describe("game application commands", () => {
  it("creates and persists a starting state on first load", async () => {
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);

    const state = await application.load();

    expect(state.gameDate).toBe("1995-01-01");
    expect(repository.state).toEqual(state);
  });

  it("advances time and persists company name and settings updates", async () => {
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);

    await application.load();
    await application.advanceDay();
    await application.renameCompany("Dynasty Labs");
    const updated = await application.updateSettings({ locale: "en", theme: "dark" });

    expect(updated.gameDate).toBe("1995-01-02");
    expect(updated.company.name).toBe("Dynasty Labs");
    expect(updated.settings).toEqual({ locale: "en", theme: "dark" });
    expect(repository.state).toEqual(updated);
  });

  it("does not persist an invalid company name", async () => {
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);
    const initial = await application.load();

    await expect(application.renameCompany(" ")).rejects.toThrow();
    expect(repository.state).toEqual(initial);
  });

  it("creates, versions, saves, and reloads a CPU project", async () => {
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);
    const initial = createDefaultCpuConfiguration();

    await application.load();
    await application.createCpuProject("Dynasty Core", initial);
    await application.saveCpuVersion("cpu-1", "Dynasty Core", { ...initial, clockMHz: 120 });

    const reloaded = await createGameApplication(repository).load();
    const project = reloaded.cpuProjects[0];

    expect(project?.name).toBe("Dynasty Core");
    expect(project?.configuration.clockMHz).toBe(120);
    expect(project?.versions.map((version) => version.version)).toEqual([1, 2]);
  });

  it("rejects invalid CPU configurations without persisting them", async () => {
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);
    const initial = await application.load();
    const invalidConfiguration = {
      ...createDefaultCpuConfiguration(),
      isa: "arm" as const,
      simdExtensions: ["avx2" as const],
    };

    await expect(application.createCpuProject("Dynasty Core", invalidConfiguration)).rejects.toThrow();
    expect(repository.state).toEqual(initial);
  });
});
