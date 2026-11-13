import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../models/game-state";
import {
  createAiProject,
  createDefaultAiConfiguration,
  type AiConfiguration,
  type AiTrainingJob,
} from "../models/ai";
import { getFinanceDailyRecord } from "../models/finance";
import {
  advanceAiTrainingDay,
  AiTrainingOperationError,
  applyAiOptimization,
  deployAiModel,
  startAiTraining,
} from "./ai-training";

function stateWithProject(configuration: AiConfiguration = createDefaultAiConfiguration()) {
  const state = createInitialGameState();
  const project = createAiProject("ai-1", "Dynasty Vision", configuration, state.gameDate);
  return { ...state, aiProjects: [project] };
}

function completedJob(): AiTrainingJob {
  return {
    id: "ai-training-1",
    version: 1,
    seed: 42,
    hardwareProjectId: null,
    hardwareName: "Reference training cluster",
    hardwareTflops: 20,
    hardwareVramGb: 16,
    totalDays: 3,
    progressDays: 3,
    costPerDayUsd: 300,
    totalCostUsd: 900,
    stage: "completed",
    loss: 0.5,
    validationScore: 70,
    startedOn: "1995-01-01",
    completedOn: "1995-01-03",
    configuration: createDefaultAiConfiguration(),
    datasets: [],
    optimizations: [],
  };
}

function stateWithCompletedJob() {
  const state = stateWithProject();
  return {
    ...state,
    aiProjects: state.aiProjects.map((project) => ({ ...project, trainingJobs: [completedJob()] })),
  };
}

function expectOperationError(action: () => unknown, code: string) {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(AiTrainingOperationError);
    expect((error as AiTrainingOperationError).code).toBe(code);
    return;
  }
  throw new Error(`Expected AI training error ${code}.`);
}

describe("AI training engine", () => {
  it("starts training, charges the plan cost and records the finance transaction", () => {
    const state = stateWithProject();
    const next = startAiTraining(state, "ai-1", { seed: 42, hardwareProjectId: null });
    const job = next.aiProjects[0]?.trainingJobs[0];

    expect(job).toMatchObject({
      id: "ai-training-1",
      seed: 42,
      hardwareProjectId: null,
      stage: "training",
      progressDays: 0,
    });
    expect(job?.totalCostUsd).toBeGreaterThan(0);
    expect(next.company.balance).toBe(100_000 - (job?.totalCostUsd ?? 0));
    expect(getFinanceDailyRecord(next.finance, next.gameDate)?.researchUsd).toBe(job?.totalCostUsd);
    expectOperationError(
      () => startAiTraining(next, "ai-1", { seed: 42, hardwareProjectId: null }),
      "training-active",
    );
  });

  it("rejects missing projects and hardware that cannot fit the model", () => {
    const state = stateWithProject();
    const large = stateWithProject({ ...createDefaultAiConfiguration(), parameterCountM: 1_000_000 });

    expectOperationError(
      () => startAiTraining(state, "missing", { seed: 42, hardwareProjectId: null }),
      "project-not-found",
    );
    expectOperationError(
      () => startAiTraining(large, "ai-1", { seed: 42, hardwareProjectId: null }),
      "incompatible-hardware",
    );
    expectOperationError(
      () => startAiTraining(state, "ai-1", { seed: 42, hardwareProjectId: "missing-hardware" }),
      "incompatible-hardware",
    );
  });

  it("advances training deterministically to completion", () => {
    const started = startAiTraining(stateWithProject(), "ai-1", { seed: 42, hardwareProjectId: null });
    const job = started.aiProjects[0]?.trainingJobs[0];
    expect(job).toBeDefined();
    if (job === undefined) {
      throw new Error("Training job was not created.");
    }

    let current = started;
    for (let day = 0; day < job.totalDays; day += 1) {
      current = advanceAiTrainingDay(current, current.gameDate);
    }

    const completed = current.aiProjects[0]?.trainingJobs[0];
    expect(completed).toMatchObject({
      stage: "completed",
      progressDays: job.totalDays,
      completedOn: current.gameDate,
    });
    expect(completed?.loss).toBeLessThan(job.loss);
    expect(completed?.validationScore).toBeGreaterThan(0);
    expect(advanceAiTrainingDay(current, current.gameDate)).toBe(current);
  });

  it("applies optimization and deployment costs with duplicate guards", () => {
    const state = stateWithCompletedJob();
    const optimized = applyAiOptimization(state, "ai-1", "ai-training-1", "quantization");
    const job = optimized.aiProjects[0]?.trainingJobs[0];

    expect(job?.optimizations).toEqual([
      { type: "quantization", appliedOn: optimized.gameDate, costUsd: 12_000 },
    ]);
    expect(optimized.company.balance).toBe(88_000);
    expectOperationError(
      () => applyAiOptimization(optimized, "ai-1", "ai-training-1", "quantization"),
      "optimization-already-applied",
    );

    const deployed = deployAiModel(optimized, "ai-1", "ai-training-1");
    expect(deployed.company.balance).toBe(73_000);
    expect(deployed.aiProjects[0]?.deployments[0]).toMatchObject({
      id: "ai-deployment-1",
      trainingJobId: "ai-training-1",
      costUsd: 15_000,
      optimizationTypes: ["quantization"],
    });
    expectOperationError(
      () => deployAiModel(deployed, "ai-1", "ai-training-1"),
      "deployment-exists",
    );
  });

  it("rejects optimization and deployment before training completes", () => {
    const state = stateWithProject();
    const started = startAiTraining(state, "ai-1", { seed: 42, hardwareProjectId: null });
    const job = started.aiProjects[0]?.trainingJobs[0];

    expectOperationError(
      () => applyAiOptimization(started, "ai-1", job?.id ?? "", "pruning"),
      "training-incomplete",
    );
    expectOperationError(
      () => deployAiModel(started, "ai-1", job?.id ?? ""),
      "training-incomplete",
    );
    expectOperationError(
      () => deployAiModel(started, "ai-1", "missing-job"),
      "training-not-found",
    );
  });
});
