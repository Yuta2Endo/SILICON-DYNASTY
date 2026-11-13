import {
  createDefaultCpuConfiguration,
  type CpuConfiguration,
  type CpuConfigurationField,
} from "./cpu";

export interface CpuConfigurationChange {
  field: CpuConfigurationField;
  before: unknown;
  after: unknown;
}

const CONFIGURATION_FIELDS = Object.keys(
  createDefaultCpuConfiguration(),
) as CpuConfigurationField[];

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Array.isArray(left) && Array.isArray(right)) {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  return left === right;
}

export function compareCpuConfigurations(
  before: CpuConfiguration,
  after: CpuConfiguration,
): CpuConfigurationChange[] {
  return CONFIGURATION_FIELDS.filter(
    (field) => !valuesEqual(before[field], after[field]),
  ).map((field) => ({
    field,
    before: before[field],
    after: after[field],
  }));
}
