import { describe, expect, it } from "vitest";
import { createGameApplication } from "./game-application";
import { ResearchUnavailableError } from "../engine/research";
import { getTechnology } from "../models/research";
import { createDefaultCpuConfiguration } from "../models/cpu";
import { createInitialGameState, type GameState } from "../models/game-state";
import type { GameStateRepository } from "../../storage/repositories/GameStateRepository";

class MemoryGameStateRepository implements GameStateRepository {
  currentState: GameState | null;

  constructor(initialState: GameState | null = null) {
    this.currentState = initialState;
  }

  async load(): Promise<GameState | null> {
    return this.currentState;
  }

  async save(state: GameState): Promise<void> {
    this.currentState = state;
  }
}

describe("GameApplication research commands", () => {
  it("charges and persists an available research project", async () => {
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);
    const initialState = await application.load();
    const technology = getTechnology("out-of-order");

    if (!technology) {
      throw new Error("The out-of-order technology must exist in the research catalog.");
    }

    const started = await application.startResearch(technology.id);
    const expectedBalance = Math.round((initialState.company.balance - technology.costUsd) * 100) / 100;

    expect(started.company.balance).toBe(expectedBalance);
    expect(started.research.activeProject).toEqual({
      technologyId: technology.id,
      startedOn: initialState.gameDate,
      progressDays: 0,
      costPaidUsd: technology.costUsd,
    });
    expect(started.research.totalInvestedUsd).toBe(technology.costUsd);

    const reloaded = await createGameApplication(repository).load();
    expect(reloaded.company.balance).toBe(expectedBalance);
    expect(reloaded.research).toEqual(started.research);
  });

  it("rejects unaffordable research without changing the save", async () => {
    const initialState = createInitialGameState();
    const poorState: GameState = {
      ...initialState,
      company: { ...initialState.company, balance: 0 },
    };
    const repository = new MemoryGameStateRepository(poorState);
    const application = createGameApplication(repository);

    await application.load();
    await expect(application.startResearch("out-of-order")).rejects.toBeInstanceOf(ResearchUnavailableError);
    expect(repository.currentState).toEqual(poorState);
  });

  it("gates CPU features until research completes", async () => {
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);
    const configuration = {
      ...createDefaultCpuConfiguration(),
      isa: "arm" as const,
    };

    await application.load();
    await expect(application.createCpuProject("ARM Core", configuration)).rejects.toMatchObject({
      missingUnlockIds: expect.arrayContaining(["cpu.arm-isa"]),
    });
    expect(repository.currentState?.cpuProjects).toHaveLength(0);

    const technology = getTechnology("arm-isa");
    if (!technology) {
      throw new Error("The ARM ISA technology must exist in the research catalog.");
    }

    await application.startResearch(technology.id);
    for (let day = 0; day < technology.durationDays; day += 1) {
      await application.advanceDay();
    }

    expect(repository.currentState?.research.completedTechnologyIds).toContain(technology.id);
    const created = await application.createCpuProject("ARM Core", configuration);
    expect(created.cpuProjects).toHaveLength(1);
    expect(created.cpuProjects[0]?.configuration.isa).toBe("arm");
  });
});
