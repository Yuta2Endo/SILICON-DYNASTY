import {
  createDefaultOsConfiguration,
  type OsConfiguration,
  type OsConfigurationField,
} from "./os";

export interface OsConfigurationChange {
  field: OsConfigurationField;
  before: unknown;
  after: unknown;
}

const CONFIGURATION_FIELDS = Object.keys(
  createDefaultOsConfiguration(),
) as OsConfigurationField[];

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Array.isArray(left) && Array.isArray(right)) {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  return left === right;
}

export function compareOsConfigurations(
  before: OsConfiguration,
  after: OsConfiguration,
): OsConfigurationChange[] {
  return CONFIGURATION_FIELDS.filter(
    (field) => !valuesEqual(before[field], after[field]),
  ).map((field) => ({
    field,
    before: before[field],
    after: after[field],
  }));
}
