import { describe, expect, it } from "vitest";
import {
  compareAiConfigurations,
  compareAiDatasets,
  compareAiVersions,
} from "./ai-compare";
import {
  createDefaultAiConfiguration,
  type AiConfiguration,
  type AiDataset,
} from "./ai";

function dataset(overrides: Partial<AiDataset> = {}): AiDataset {
  return {
    id: "dataset-1",
    name: "Corpus",
    modality: "text",
    sizeGb: 20,
    qualityScore: 70,
    diversityScore: 60,
    license: "permissive",
    processingCostUsd: 250,
    ...overrides,
  };
}

describe("AI version comparison", () => {
  it("reports no changes for identical versions", () => {
    const configuration = createDefaultAiConfiguration();
    const datasets = [dataset()];
    const comparison = compareAiVersions(
      { configuration, datasets },
      { configuration, datasets },
    );

    expect(comparison.identical).toBe(true);
    expect(comparison.totalChanges).toBe(0);
    expect(comparison.configurationChanges).toEqual([]);
    expect(comparison.datasetChanges).toEqual([]);
  });

  it("compares configuration fields in a stable order", () => {
    const before = createDefaultAiConfiguration();
    const after: AiConfiguration = {
      ...before,
      architecture: "cnn",
      layers: 6,
      precision: "fp16",
    };

    const changes = compareAiConfigurations(before, after);

    expect(changes.map((change) => change.field)).toEqual([
      "architecture",
      "layers",
      "precision",
    ]);
    expect(changes[0]).toEqual({ field: "architecture", before: "rnn", after: "cnn" });
  });

  it("detects added, removed and changed datasets", () => {
    const before = [
      dataset({ id: "dataset-1", name: "Corpus", qualityScore: 70 }),
      dataset({ id: "dataset-2", name: "Code" }),
    ];
    const after = [
      dataset({ id: "dataset-1", name: "Corpus", qualityScore: 85 }),
      dataset({ id: "dataset-3", name: "Images", modality: "images" }),
    ];

    const changes = compareAiDatasets(before, after);

    expect(changes).toEqual([
      {
        kind: "changed",
        id: "dataset-1",
        name: "Corpus",
        fields: ["qualityScore"],
      },
      { kind: "added", id: "dataset-3", name: "Images", fields: [] },
      { kind: "removed", id: "dataset-2", name: "Code", fields: [] },
    ]);
  });

  it("ignores dataset order when the same datasets are reordered", () => {
    const first = dataset({ id: "dataset-1" });
    const second = dataset({ id: "dataset-2", name: "Second" });

    expect(compareAiDatasets([first, second], [second, first])).toEqual([]);
  });
});
