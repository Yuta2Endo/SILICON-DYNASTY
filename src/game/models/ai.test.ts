import { describe, expect, it } from "vitest";
import {
  createAiProject,
  createDefaultAiConfiguration,
  createDefaultAiDataset,
  InvalidAiDataError,
  parseAiProject,
  saveAiVersion,
  validateAiConfiguration,
  validateAiDataset,
  validateAiDatasets,
  type AiDataset,
} from "./ai";

describe("AI domain", () => {
  it("creates a valid default project and round-trips it", () => {
    const configuration = createDefaultAiConfiguration();
    const project = createAiProject("ai-1", "Dynasty Vision", configuration, "1995-01-01");

    expect(project.datasets).toEqual([]);
    expect(project.versions).toHaveLength(1);
    expect(parseAiProject(project, "1995-01-01")).toEqual(project);
  });

  it("validates numeric bounds and architecture constraints", () => {
    const configuration = createDefaultAiConfiguration();

    expect(validateAiConfiguration({ ...configuration, parameterCountM: 0 }).errors.parameterCountM?.code)
      .toBe("number-range");
    expect(validateAiConfiguration({ ...configuration, layers: 1.5 }).errors.layers?.code).toBe("integer");
    expect(validateAiConfiguration({ ...configuration, architecture: "transformer", hiddenDimension: 250, attentionHeads: 4 })
      .errors.attentionHeads?.code).toBe("attention-heads-divisible");
    expect(validateAiConfiguration({ ...configuration, architecture: "moe", experts: 1 }).errors.experts?.code)
      .toBe("moe-requires-experts");
    expect(validateAiConfiguration({ ...configuration, experts: 4 }).errors.experts?.code).toBe("experts-only-moe");
  });

  it("gates future architectures and precision by year", () => {
    const configuration = createDefaultAiConfiguration();

    expect(validateAiConfiguration({ ...configuration, architecture: "transformer" }, { currentYear: 2016 })
      .errors.architecture).toEqual({ code: "future-technology", year: 2017 });
    expect(validateAiConfiguration({ ...configuration, precision: "fp16" }, { currentYear: 2007 })
      .errors.precision).toEqual({ code: "future-technology", year: 2008 });
    expect(validateAiConfiguration({ ...configuration, quantization: "int8" }, { currentYear: 2014 })
      .errors.quantization).toEqual({ code: "future-technology", year: 2015 });
    expect(validateAiConfiguration({ ...configuration, architecture: "transformer" }, { currentYear: 2017 }).valid)
      .toBe(true);
  });

  it("validates datasets and rejects duplicate IDs", () => {
    const dataset = createDefaultAiDataset("dataset-1");

    expect(validateAiDataset({ ...dataset, qualityScore: 101 }).errors.qualityScore?.code).toBe("dataset-quality");
    expect(validateAiDataset({ ...dataset, sizeGb: 0 }).errors.sizeGb?.code).toBe("dataset-size");
    expect(validateAiDataset({ ...dataset, processingCostUsd: -1 }).errors.processingCostUsd?.code).toBe("dataset-cost");
    expect(validateAiDatasets([dataset, dataset]).errors.map((error) => error.code)).toContain("duplicate-dataset-id");
  });

  it("saves versions with datasets and preserves the previous snapshot", () => {
    const configuration = createDefaultAiConfiguration();
    const project = createAiProject("ai-1", "Dynasty Vision", configuration, "1995-01-01");
    const dataset = createDefaultAiDataset("dataset-1");
    const updated = saveAiVersion(
      project,
      "Dynasty Vision",
      { ...configuration, architecture: "cnn", layers: 4 },
      [dataset],
      "1995-01-02",
    );

    expect(updated.versions).toHaveLength(2);
    expect(updated.versions[0]?.datasets).toEqual([]);
    expect(updated.datasets).toEqual([dataset]);
    expect(project.datasets).toEqual([]);
    expect(parseAiProject(updated, "1995-01-02")).toEqual(updated);
  });

  it("rejects invalid names, dates and persisted data", () => {
    const configuration = createDefaultAiConfiguration();
    const project = createAiProject("ai-1", "Dynasty Vision", configuration, "1995-01-01");

    expect(() => createAiProject("ai-2", "x", configuration, "1995-01-01")).toThrow(InvalidAiDataError);
    expect(() => createAiProject("ai-2", "Valid name", configuration, "1995-02-30")).toThrow(InvalidAiDataError);
    expect(() => parseAiProject({ ...project, name: "x" }, "1995-01-01")).toThrow(InvalidAiDataError);
    expect(() => parseAiProject({ ...project, configuration: { ...configuration, layers: 0 } }, "1995-01-01"))
      .toThrow(InvalidAiDataError);
    expect(() => parseAiProject({ ...project, datasets: [{ ...createDefaultAiDataset("dataset-1"), sizeGb: 0 }] }, "1995-01-01"))
      .toThrow(InvalidAiDataError);
  });

  it("rejects a top-level snapshot that does not match the latest version", () => {
    const configuration = createDefaultAiConfiguration();
    const project = createAiProject("ai-1", "Dynasty Vision", configuration, "1995-01-01");
    const dataset: AiDataset = createDefaultAiDataset("dataset-1");
    const updated = saveAiVersion(project, "Dynasty Vision", configuration, [dataset], "1995-01-02");

    expect(() => parseAiProject({ ...updated, datasets: [] }, "1995-01-02")).toThrow(InvalidAiDataError);
  });
});
