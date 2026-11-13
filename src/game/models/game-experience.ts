import type { GameState } from "./game-state";

export const TUTORIAL_STEP_IDS = [
  "design-cpu",
  "design-component",
  "design-os",
  "design-ai",
  "build-device",
  "advance-day",
  "start-research",
  "release-product",
  "make-sale",
] as const;

export type TutorialStepId = (typeof TUTORIAL_STEP_IDS)[number];

export interface TutorialStep {
  id: TutorialStepId;
  completed: boolean;
}

export const ACHIEVEMENT_IDS = [
  "first-cpu",
  "first-os",
  "first-ai",
  "first-device",
  "cloud-builder",
  "researcher",
  "first-sale",
  "profitable",
  "stable-os",
  "full-stack",
] as const;

export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

export interface Achievement {
  id: AchievementId;
  unlocked: boolean;
}

export function getTutorialSteps(state: GameState): TutorialStep[] {
  const latestFinance = state.finance.dailyRecords.at(-1);

  return [
    { id: "design-cpu", completed: state.cpuProjects.length > 0 },
    { id: "design-component", completed: state.componentProjects.length > 0 },
    { id: "design-os", completed: state.osProjects.length > 0 },
    { id: "design-ai", completed: state.aiProjects.length > 0 },
    { id: "build-device", completed: state.deviceProjects.length > 0 },
    { id: "advance-day", completed: state.gameDate !== "1995-01-01" },
    {
      id: "start-research",
      completed: state.research.completedTechnologyIds.length > 0 || state.research.activeProject !== null,
    },
    {
      id: "release-product",
      completed: state.market.products.length > 0 || state.market.componentProducts.length > 0,
    },
    {
      id: "make-sale",
      completed: state.finance.lifetimeRevenueUsd > 0 || (latestFinance?.revenueUsd ?? 0) > 0,
    },
  ];
}

export function getAchievements(state: GameState): Achievement[] {
  const latestFinance = state.finance.dailyRecords.at(-1);
  const hasStableOs = state.osProjects.some((project) =>
    project.releases.some((release) => release.stage === "stable"),
  );
  const hasFullStack = (
    state.cpuProjects.length > 0
    && state.componentProjects.length > 0
    && state.osProjects.length > 0
    && state.aiProjects.length > 0
    && state.deviceProjects.length > 0
  );

  return [
    { id: "first-cpu", unlocked: state.cpuProjects.length > 0 },
    { id: "first-os", unlocked: state.osProjects.length > 0 },
    { id: "first-ai", unlocked: state.aiProjects.length > 0 },
    { id: "first-device", unlocked: state.deviceProjects.length > 0 },
    { id: "cloud-builder", unlocked: state.cloudProjects.length > 0 },
    { id: "researcher", unlocked: state.research.completedTechnologyIds.length > 0 },
    { id: "first-sale", unlocked: state.finance.lifetimeRevenueUsd > 0 },
    { id: "profitable", unlocked: (latestFinance?.netProfitUsd ?? 0) > 0 },
    { id: "stable-os", unlocked: hasStableOs },
    { id: "full-stack", unlocked: hasFullStack },
  ];
}

export function getTutorialProgress(state: GameState): { completed: number; total: number } {
  const steps = getTutorialSteps(state);
  return {
    completed: steps.filter((step) => step.completed).length,
    total: steps.length,
  };
}
