import {
  createDefaultAiConfiguration,
  type AiConfiguration,
  type AiConfigurationField,
  type AiDataset,
} from "./ai";

export interface AiConfigurationChange {
  field: AiConfigurationField;
  before: string | number;
  after: string | number;
}

export type AiDatasetField = Exclude<keyof AiDataset, "id">;
export type AiDatasetChangeKind = "added" | "removed" | "changed";

export interface AiDatasetChange {
  kind: AiDatasetChangeKind;
  id: string;
  name: string;
  fields: AiDatasetField[];
}

export interface AiVersionComparison {
  configurationChanges: AiConfigurationChange[];
  datasetChanges: AiDatasetChange[];
  totalChanges: number;
  identical: boolean;
}

const DATASET_FIELD_ORDER: readonly AiDatasetField[] = [
  "name",
  "modality",
  "sizeGb",
  "qualityScore",
  "diversityScore",
  "license",
  "processingCostUsd",
];

export function compareAiConfigurations(
  before: AiConfiguration,
  after: AiConfiguration,
): AiConfigurationChange[] {
  const fields = Object.keys(createDefaultAiConfiguration()) as AiConfigurationField[];
  return fields
    .filter((field) => before[field] !== after[field])
    .map((field) => ({
      field,
      before: before[field],
      after: after[field],
    }));
}

function changedDatasetFields(before: AiDataset, after: AiDataset): AiDatasetField[] {
  return DATASET_FIELD_ORDER.filter((field) => before[field] !== after[field]);
}

export function compareAiDatasets(
  before: readonly AiDataset[],
  after: readonly AiDataset[],
): AiDatasetChange[] {
  const beforeById = new Map(before.map((dataset) => [dataset.id, dataset]));
  const afterById = new Map(after.map((dataset) => [dataset.id, dataset]));
  const changes: AiDatasetChange[] = [];

  for (const dataset of after) {
    const previous = beforeById.get(dataset.id);
    if (!previous) {
      changes.push({
        kind: "added",
        id: dataset.id,
        name: dataset.name,
        fields: [],
      });
      continue;
    }
    const fields = changedDatasetFields(previous, dataset);
    if (fields.length > 0) {
      changes.push({
        kind: "changed",
        id: dataset.id,
        name: dataset.name,
        fields,
      });
    }
  }

  for (const dataset of before) {
    if (!afterById.has(dataset.id)) {
      changes.push({
        kind: "removed",
        id: dataset.id,
        name: dataset.name,
        fields: [],
      });
    }
  }

  return changes;
}

export function compareAiVersions(
  before: { configuration: AiConfiguration; datasets: readonly AiDataset[] },
  after: { configuration: AiConfiguration; datasets: readonly AiDataset[] },
): AiVersionComparison {
  const configurationChanges = compareAiConfigurations(before.configuration, after.configuration);
  const datasetChanges = compareAiDatasets(before.datasets, after.datasets);
  const totalChanges = configurationChanges.length + datasetChanges.length;
  return {
    configurationChanges,
    datasetChanges,
    totalChanges,
    identical: totalChanges === 0,
  };
}
