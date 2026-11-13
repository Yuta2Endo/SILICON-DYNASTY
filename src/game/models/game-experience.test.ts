import { describe, expect, it } from "vitest";
import { createDefaultAiConfiguration, createAiProject } from "./ai";
import { createDefaultComponentConfiguration, createComponentProject } from "./components";
import { createDefaultCpuConfiguration, createCpuProject } from "./cpu";
import { createInitialGameState, type GameState } from "./game-state";
import {
  getAchievements,
  getTutorialProgress,
  getTutorialSteps,
} from "./game-experience";
import { createDefaultOsConfiguration, createOsProject, type OsRelease } from "./os";

describe("game experience", () => {
  it("starts with no tutorial steps or achievements", () => {
    const state = createInitialGameState();
    const steps = getTutorialSteps(state);
    const achievements = getAchievements(state);

    expect(steps).toHaveLength(9);
    expect(steps.every((step) => !step.completed)).toBe(true);
    expect(achievements).toHaveLength(10);
    expect(achievements.every((achievement) => !achievement.unlocked)).toBe(true);
    expect(getTutorialProgress(state)).toEqual({ completed: 0, total: 9 });
  });

  it("unlocks design, research and sales milestones from real state", () => {
    const initial = createInitialGameState();
    const cpuProject = createCpuProject(
      "cpu-1",
      "Journey CPU",
      createDefaultCpuConfiguration(),
      initial.gameDate,
    );
    const componentProject = createComponentProject(
      "component-1",
      "Journey GPU",
      "gpu",
      createDefaultComponentConfiguration("gpu"),
      initial.gameDate,
    );
    const osProject = createOsProject(
      "os-1",
      "Journey OS",
      createDefaultOsConfiguration(),
      initial.gameDate,
    );
    const aiProject = createAiProject(
      "ai-1",
      "Journey AI",
      createDefaultAiConfiguration(),
      initial.gameDate,
    );
    const state: GameState = {
      ...initial,
      gameDate: "1995-01-02",
      cpuProjects: [cpuProject],
      componentProjects: [componentProject],
      osProjects: [osProject],
      aiProjects: [aiProject],
      research: {
        ...initial.research,
        completedTechnologyIds: ["out-of-order"],
      },
      finance: {
        ...initial.finance,
        lifetimeRevenueUsd: 5_000,
        dailyRecords: [{
          date: "1995-01-02",
          revenueUsd: 5_000,
          manufacturingUsd: 1_000,
          payrollUsd: 120,
          overheadUsd: 80,
          marketingUsd: 0,
          researchUsd: 0,
          releaseUsd: 0,
          interestUsd: 0,
          taxUsd: 0,
          financingUsd: 0,
          netProfitUsd: 3_800,
          netCashFlowUsd: 3_800,
          closingBalanceUsd: 103_800,
          unitsSold: 5,
          unitsProduced: 5,
        }],
      },
    };

    const completed = getTutorialSteps(state)
      .filter((step) => step.completed)
      .map((step) => step.id);
    expect(completed).toEqual([
      "design-cpu",
      "design-component",
      "design-os",
      "design-ai",
      "advance-day",
      "start-research",
      "make-sale",
    ]);
    expect(getTutorialProgress(state)).toEqual({ completed: 7, total: 9 });

    const unlocked = getAchievements(state)
      .filter((achievement) => achievement.unlocked)
      .map((achievement) => achievement.id);
    expect(unlocked).toEqual([
      "first-cpu",
      "first-os",
      "first-ai",
      "researcher",
      "first-sale",
      "profitable",
    ]);
  });

  it("detects a stable OS release", () => {
    const state = createInitialGameState();
    const project = createOsProject(
      "os-1",
      "Stable OS",
      createDefaultOsConfiguration(),
      state.gameDate,
    );
    const release: OsRelease = {
      id: "os-release-1",
      version: 1,
      stage: "stable",
      createdOn: state.gameDate,
      configuration: createDefaultOsConfiguration(),
      qualityScore: 70,
      appealScore: 65,
      costUsd: 190_000,
    };
    const withRelease = {
      ...state,
      osProjects: [{ ...project, releases: [release] }],
    };

    expect(getAchievements(withRelease).find((achievement) => achievement.id === "stable-os")?.unlocked).toBe(true);
  });
});
