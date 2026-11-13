import { describe, expect, it } from "vitest";
import { createDefaultAiConfiguration, createDefaultAiDataset, type AiTrainingJob } from "../models/ai";
import {
  calculateAiDeploymentMetrics,
  calculateAiModelMetrics,
  calculateAiTrainingPlan,
  evaluateAiHardwareRequirements,
  getAiTrainingHardwareOptions,
  simulateAiTrainingProgress,
} from "./ai";

function completedTrainingJob(): AiTrainingJob {
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
    loss: 0.8,
    validationScore: 72,
    startedOn: "1995-01-01",
    completedOn: "1995-01-03",
    configuration: createDefaultAiConfiguration(),
    datasets: [],
    optimizations: [],
  };
}

describe("AI model formulas", () => {
  it("produces deterministic metrics for the default model", () => {
    const configuration = createDefaultAiConfiguration();
    const dataset = createDefaultAiDataset("dataset-1");
    const first = calculateAiModelMetrics(configuration, [dataset]);
    const second = calculateAiModelMetrics(configuration, [dataset]);

    expect(first).toEqual(second);
    expect(first.qualityScore).toBeGreaterThan(0);
    expect(first.trainingVramGb).toBeGreaterThan(0);
    expect(first.inferenceVramGb).toBeGreaterThan(0);
    expect(first.storageGb).toBeGreaterThan(first.datasetSizeGb);
  });

  it("makes architecture choices change quality and requirements", () => {
    const configuration = createDefaultAiConfiguration();
    const dataset = createDefaultAiDataset("dataset-1");
    const rnn = calculateAiModelMetrics(configuration, [dataset]);
    const transformer = calculateAiModelMetrics(
      { ...configuration, architecture: "transformer", hiddenDimension: 512, layers: 6 },
      [dataset],
    );

    expect(transformer.qualityScore).toBeGreaterThan(rnn.qualityScore);
    expect(transformer.trainingVramGb).toBeGreaterThan(rnn.trainingVramGb);
  });

  it("raises requirements as parameters grow", () => {
    const configuration = createDefaultAiConfiguration();
    const dataset = createDefaultAiDataset("dataset-1");
    const small = calculateAiModelMetrics(configuration, [dataset]);
    const large = calculateAiModelMetrics({ ...configuration, parameterCountM: 1_000 }, [dataset]);

    expect(large.modelSizeGb).toBeGreaterThan(small.modelSizeGb);
    expect(large.trainingVramGb).toBeGreaterThan(small.trainingVramGb);
    expect(large.minimumGpuTflops).toBeGreaterThan(small.minimumGpuTflops);
    expect(large.systemRamGb).toBeGreaterThan(small.systemRamGb);
    expect(large.storageGb).toBeGreaterThan(small.storageGb);
  });

  it("makes dataset quality and licensing affect model quality and commercial readiness", () => {
    const configuration = createDefaultAiConfiguration();
    const base = createDefaultAiDataset("dataset-1");
    const low = calculateAiModelMetrics(configuration, [{ ...base, qualityScore: 20, diversityScore: 20 }]);
    const high = calculateAiModelMetrics(configuration, [{ ...base, qualityScore: 95, diversityScore: 90 }]);
    const restricted = calculateAiModelMetrics(configuration, [{ ...base, license: "restricted" }]);

    expect(high.qualityScore).toBeGreaterThan(low.qualityScore);
    expect(high.commercialReadinessScore).toBeGreaterThan(low.commercialReadinessScore);
    expect(restricted.licenseComplianceScore).toBeLessThan(100);
    expect(restricted.commercialReadinessScore).toBeLessThan(
      calculateAiModelMetrics(configuration, [base]).commercialReadinessScore,
    );
  });

  it("reduces model size and inference VRAM with quantization", () => {
    const configuration = { ...createDefaultAiConfiguration(), parameterCountM: 1_000 };
    const dataset = createDefaultAiDataset("dataset-1");
    const full = calculateAiModelMetrics(configuration, [dataset]);
    const int8 = calculateAiModelMetrics({ ...configuration, quantization: "int8" }, [dataset]);
    const int4 = calculateAiModelMetrics({ ...configuration, quantization: "int4" }, [dataset]);

    expect(int8.modelSizeGb).toBeLessThan(full.modelSizeGb);
    expect(int4.modelSizeGb).toBeLessThan(int8.modelSizeGb);
    expect(int8.inferenceVramGb).toBeLessThan(full.inferenceVramGb);
    expect(int4.inferenceVramGb).toBeLessThan(int8.inferenceVramGb);
  });

  it("exposes hardware requirements as a separate evaluation", () => {
    const configuration = createDefaultAiConfiguration();
    const dataset = createDefaultAiDataset("dataset-1");
    const metrics = calculateAiModelMetrics(configuration, [dataset]);
    const requirements = evaluateAiHardwareRequirements(configuration, [dataset]);

    expect(requirements.trainingVramGb).toBe(metrics.trainingVramGb);
    expect(requirements.inferenceVramGb).toBe(metrics.inferenceVramGb);
    expect(requirements.recommendedGpuVramGb).toBeGreaterThan(metrics.trainingVramGb);
  });

  it("simulates reproducible training progress for the same seed and inputs", () => {
    const configuration = createDefaultAiConfiguration();
    const first = simulateAiTrainingProgress(configuration, [], 42, 10, 5);
    const second = simulateAiTrainingProgress(configuration, [], 42, 10, 5);
    const otherSeed = simulateAiTrainingProgress(configuration, [], 43, 10, 5);
    const finished = simulateAiTrainingProgress(configuration, [], 42, 10, 10);

    expect(first).toEqual(second);
    expect(first.progressRatio).toBe(0.5);
    expect(first.completed).toBe(false);
    expect(otherSeed.loss).not.toBe(first.loss);
    expect(finished.completed).toBe(true);
    expect(finished.loss).toBeLessThan(first.loss);
    expect(finished.validationScore).toBeGreaterThan(first.validationScore);
  });

  it("applies optimization trade-offs to model size, inference and quality", () => {
    const configuration = createDefaultAiConfiguration();
    const dataset = createDefaultAiDataset("dataset-1");
    const base = calculateAiModelMetrics(configuration, [dataset]);
    const quantized = calculateAiModelMetrics(configuration, [dataset], ["quantization"]);
    const fineTuned = calculateAiModelMetrics(configuration, [dataset], ["fine-tuning"]);
    const all = calculateAiModelMetrics(configuration, [dataset], [
      "quantization",
      "pruning",
      "distillation",
      "fine-tuning",
    ]);

    expect(quantized.modelSizeGb).toBeLessThan(base.modelSizeGb);
    expect(quantized.inferenceEfficiencyScore).toBeGreaterThan(base.inferenceEfficiencyScore);
    expect(quantized.qualityScore).toBeLessThan(base.qualityScore);
    expect(fineTuned.qualityScore).toBeGreaterThan(base.qualityScore);
    expect(all.modelSizeGb).toBeLessThan(base.modelSizeGb);
    expect(all.inferenceEfficiencyScore).toBeGreaterThan(base.inferenceEfficiencyScore);
  });

  it("builds hardware plans and detects insufficient compute or VRAM", () => {
    const configuration = createDefaultAiConfiguration();
    const reference = getAiTrainingHardwareOptions([])[0];

    expect(reference).toBeDefined();
    if (reference === undefined) {
      throw new Error("Reference training hardware is missing.");
    }
    const plan = calculateAiTrainingPlan(configuration, [], reference);
    const weak = calculateAiTrainingPlan(configuration, [], { ...reference, tflops: 1, vramGb: 1 });

    expect(plan.compatible).toBe(true);
    expect(plan.totalDays).toBeGreaterThanOrEqual(1);
    expect(plan.totalCostUsd).toBe(plan.totalDays * plan.costPerDayUsd);
    expect(weak.compatible).toBe(false);
    expect(weak.issues).toEqual(expect.arrayContaining(["insufficient-compute", "insufficient-vram"]));
  });

  it("derives deployment quality and appeal from a completed training job", () => {
    const base = calculateAiDeploymentMetrics(completedTrainingJob());
    const optimized = calculateAiDeploymentMetrics({
      ...completedTrainingJob(),
      optimizations: [{ type: "fine-tuning" }],
    });

    expect(base.qualityScore).toBeGreaterThan(0);
    expect(base.qualityScore).toBeLessThanOrEqual(100);
    expect(base.appealScore).toBeLessThanOrEqual(100);
    expect(optimized.qualityScore).toBeGreaterThan(base.qualityScore);
  });
});
