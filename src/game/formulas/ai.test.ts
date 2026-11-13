import { describe, expect, it } from "vitest";
import { createDefaultAiConfiguration, createDefaultAiDataset } from "../models/ai";
import { calculateAiModelMetrics, evaluateAiHardwareRequirements } from "./ai";

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
});
