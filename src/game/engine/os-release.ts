import type { GameState } from "../models/game-state";
import {
  cloneOsConfiguration,
  type OsProject,
  type OsRelease,
} from "../models/os";
import {
  calculateOsReleaseMetrics,
  getNextOsReleaseStage,
  getOsReleaseStageCost,
} from "../formulas/os";
import { postFinanceTransaction } from "./finance";

export type OsReleaseOperationCode =
  | "project-not-found"
  | "release-not-found"
  | "release-final";

export class OsReleaseOperationError extends Error {
  constructor(
    readonly code: OsReleaseOperationCode,
    message: string,
  ) {
    super(message);
    this.name = "OsReleaseOperationError";
  }
}

export function startOsRelease(state: GameState, projectId: string): GameState {
  const project = state.osProjects.find((entry) => entry.id === projectId);
  if (!project) {
    throw new OsReleaseOperationError("project-not-found", "OS project was not found.");
  }

  const costUsd = getOsReleaseStageCost("alpha");
  const metrics = calculateOsReleaseMetrics(project.configuration, "alpha");
  const release: OsRelease = {
    id: nextOsReleaseId(state.osProjects),
    version: Math.max(0, ...project.releases.map((entry) => entry.version)) + 1,
    stage: "alpha",
    createdOn: state.gameDate,
    configuration: cloneOsConfiguration(project.configuration),
    qualityScore: metrics.qualityScore,
    appealScore: metrics.appealScore,
    costUsd,
  };

  const nextState = postFinanceTransaction(
    state,
    "release",
    -costUsd,
    `OS release ${project.name}: alpha`,
  );

  return {
    ...nextState,
    osProjects: nextState.osProjects.map((entry) =>
      entry.id === projectId
        ? { ...entry, releases: [...entry.releases, release] }
        : entry,
    ),
  };
}

export function advanceOsRelease(
  state: GameState,
  projectId: string,
  releaseId: string,
): GameState {
  const project = state.osProjects.find((entry) => entry.id === projectId);
  if (!project) {
    throw new OsReleaseOperationError("project-not-found", "OS project was not found.");
  }

  const release = project.releases.find((entry) => entry.id === releaseId);
  if (!release) {
    throw new OsReleaseOperationError("release-not-found", "OS release was not found.");
  }

  const nextStage = getNextOsReleaseStage(release.stage);
  if (!nextStage) {
    throw new OsReleaseOperationError("release-final", "The release is already stable.");
  }

  const costUsd = getOsReleaseStageCost(nextStage);
  const metrics = calculateOsReleaseMetrics(release.configuration, nextStage);
  const updatedRelease: OsRelease = {
    ...release,
    stage: nextStage,
    qualityScore: metrics.qualityScore,
    appealScore: metrics.appealScore,
    costUsd: release.costUsd + costUsd,
  };

  const nextState = postFinanceTransaction(
    state,
    "release",
    -costUsd,
    `OS release ${project.name}: ${nextStage}`,
  );

  return {
    ...nextState,
    osProjects: nextState.osProjects.map((entry) =>
      entry.id === projectId
        ? {
            ...entry,
            releases: entry.releases.map((currentRelease) =>
              currentRelease.id === releaseId ? updatedRelease : currentRelease,
            ),
          }
        : entry,
    ),
  };
}

export function getLatestOsRelease(project: OsProject): OsRelease | null {
  return [...project.releases].sort((left, right) => right.version - left.version)[0] ?? null;
}

function nextOsReleaseId(projects: readonly OsProject[]): string {
  const existingIds = new Set(projects.flatMap((project) => project.releases.map((release) => release.id)));
  let sequence = 1;
  while (existingIds.has(`os-release-${sequence}`)) {
    sequence += 1;
  }
  return `os-release-${sequence}`;
}
