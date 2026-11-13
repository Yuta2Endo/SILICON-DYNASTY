import {
  AI_DEPLOYMENT_COST_USD,
  AI_OPTIMIZATION_COSTS_USD,
  cloneAiConfiguration,
  cloneAiDatasets,
  type AiDeployment,
  type AiOptimizationType,
  type AiProject,
  type AiTrainingJob,
} from "../models/ai";
import {
  calculateAiDeploymentMetrics,
  calculateAiTrainingPlan,
  getAiTrainingHardwareOptions,
  simulateAiTrainingProgress,
} from "../formulas/ai";
import { postFinanceTransaction } from "./finance";
import type { GameState } from "../models/game-state";

export type AiTrainingOperationCode =
  | "project-not-found"
  | "training-active"
  | "training-not-found"
  | "training-incomplete"
  | "optimization-already-applied"
  | "deployment-exists"
  | "incompatible-hardware";

export class AiTrainingOperationError extends Error {
  constructor(readonly code: AiTrainingOperationCode) {
    super(`AI training operation failed: ${code}`);
    this.name = "AiTrainingOperationError";
  }
}

export interface StartAiTrainingInput {
  seed: number;
  hardwareProjectId: string | null;
}

function nextId(projects: readonly AiProject[], prefix: string, values: readonly string[]): string {
  void projects;
  let index = 1;
  while (values.includes(`${prefix}-${index}`)) {
    index += 1;
  }
  return `${prefix}-${index}`;
}

function findProject(state: GameState, projectId: string): AiProject {
  const project = state.aiProjects.find((candidate) => candidate.id === projectId);
  if (project === undefined) {
    throw new AiTrainingOperationError("project-not-found");
  }
  return project;
}

function replaceProject(state: GameState, project: AiProject): GameState {
  return {
    ...state,
    aiProjects: state.aiProjects.map((candidate) => candidate.id === project.id ? project : candidate),
  };
}

export function startAiTraining(
  state: GameState,
  projectId: string,
  input: StartAiTrainingInput,
): GameState {
  const project = findProject(state, projectId);
  if (project.trainingJobs.some((job) => job.stage === "training")) {
    throw new AiTrainingOperationError("training-active");
  }
  const hardwareOptions = getAiTrainingHardwareOptions(state.componentProjects);
  const hardware = hardwareOptions.find((candidate) => candidate.id === input.hardwareProjectId);
  if (hardware === undefined) {
    throw new AiTrainingOperationError("incompatible-hardware");
  }
  const plan = calculateAiTrainingPlan(project.configuration, project.datasets, hardware);
  if (!plan.compatible) {
    throw new AiTrainingOperationError("incompatible-hardware");
  }

  const trainingIds = state.aiProjects.flatMap((candidate) =>
    candidate.trainingJobs.map((job) => job.id),
  );
  const progress = simulateAiTrainingProgress(
    project.configuration,
    project.datasets,
    input.seed,
    plan.totalDays,
    0,
  );
  const job: AiTrainingJob = {
    id: nextId(state.aiProjects, "ai-training", trainingIds),
    version: project.versions[project.versions.length - 1]?.version ?? 1,
    seed: input.seed,
    hardwareProjectId: hardware.id,
    hardwareName: hardware.name,
    hardwareTflops: hardware.tflops,
    hardwareVramGb: hardware.vramGb,
    totalDays: plan.totalDays,
    progressDays: 0,
    costPerDayUsd: plan.costPerDayUsd,
    totalCostUsd: plan.totalCostUsd,
    stage: "training",
    loss: progress.loss,
    validationScore: progress.validationScore,
    startedOn: state.gameDate,
    completedOn: null,
    configuration: cloneAiConfiguration(project.configuration),
    datasets: cloneAiDatasets(project.datasets),
    optimizations: [],
  };

  const fundedState = postFinanceTransaction(
    state,
    "research",
    -plan.totalCostUsd,
    `AI training ${project.name}: ${hardware.name}`,
  );
  return replaceProject(fundedState, {
    ...project,
    trainingJobs: [...project.trainingJobs, job],
  });
}

export function advanceAiTrainingDay(state: GameState, date: string): GameState {
  let changed = false;
  const aiProjects = state.aiProjects.map((project) => {
    let projectChanged = false;
    const trainingJobs = project.trainingJobs.map((job) => {
      if (job.stage !== "training") {
        return job;
      }
      projectChanged = true;
      const progressDays = Math.min(job.totalDays, job.progressDays + 1);
      const progress = simulateAiTrainingProgress(
        job.configuration,
        job.datasets,
        job.seed,
        job.totalDays,
        progressDays,
        job.optimizations.map((optimization) => optimization.type),
      );
      return {
        ...job,
        progressDays,
        loss: progress.loss,
        validationScore: progress.validationScore,
        stage: progress.completed ? "completed" as const : "training" as const,
        completedOn: progress.completed ? date : null,
      };
    });
    if (!projectChanged) {
      return project;
    }
    changed = true;
    return { ...project, trainingJobs };
  });
  return changed ? { ...state, aiProjects } : state;
}

export function applyAiOptimization(
  state: GameState,
  projectId: string,
  trainingJobId: string,
  type: AiOptimizationType,
): GameState {
  const project = findProject(state, projectId);
  const job = project.trainingJobs.find((candidate) => candidate.id === trainingJobId);
  if (job === undefined) {
    throw new AiTrainingOperationError("training-not-found");
  }
  if (job.stage !== "completed") {
    throw new AiTrainingOperationError("training-incomplete");
  }
  if (job.optimizations.some((optimization) => optimization.type === type)) {
    throw new AiTrainingOperationError("optimization-already-applied");
  }
  const cost = AI_OPTIMIZATION_COSTS_USD[type];
  const fundedState = postFinanceTransaction(
    state,
    "research",
    -cost,
    `AI optimization ${project.name}: ${type}`,
  );
  return replaceProject(fundedState, {
    ...project,
    trainingJobs: project.trainingJobs.map((candidate) =>
      candidate.id === trainingJobId
        ? {
            ...candidate,
            optimizations: [...candidate.optimizations, { type, appliedOn: state.gameDate, costUsd: cost }],
          }
        : candidate,
    ),
  });
}

export function deployAiModel(
  state: GameState,
  projectId: string,
  trainingJobId: string,
): GameState {
  const project = findProject(state, projectId);
  const job = project.trainingJobs.find((candidate) => candidate.id === trainingJobId);
  if (job === undefined) {
    throw new AiTrainingOperationError("training-not-found");
  }
  if (job.stage !== "completed") {
    throw new AiTrainingOperationError("training-incomplete");
  }
  if (project.deployments.some((deployment) => deployment.trainingJobId === trainingJobId)) {
    throw new AiTrainingOperationError("deployment-exists");
  }
  const metrics = calculateAiDeploymentMetrics(job);
  const deploymentIds = state.aiProjects.flatMap((candidate) =>
    candidate.deployments.map((deployment) => deployment.id),
  );
  const deployment: AiDeployment = {
    id: nextId(state.aiProjects, "ai-deployment", deploymentIds),
    trainingJobId,
    version: job.version,
    deployedOn: state.gameDate,
    qualityScore: metrics.qualityScore,
    appealScore: metrics.appealScore,
    costUsd: AI_DEPLOYMENT_COST_USD,
    optimizationTypes: job.optimizations.map((optimization) => optimization.type),
  };
  const fundedState = postFinanceTransaction(
    state,
    "release",
    -AI_DEPLOYMENT_COST_USD,
    `AI deployment ${project.name}`,
  );
  return replaceProject(fundedState, {
    ...project,
    deployments: [...project.deployments, deployment],
  });
}
