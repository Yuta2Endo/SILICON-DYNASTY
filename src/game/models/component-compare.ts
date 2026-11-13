import {
  COMPONENT_FIELD_SCHEMAS,
  InvalidComponentDataError,
  type ComponentConfiguration,
  type ComponentConfigurationField,
} from "./components";

export interface ComponentConfigurationChange {
  field: ComponentConfigurationField;
  before: string | number | boolean | string[];
  after: string | number | boolean | string[];
}

function valuesEqual(
  left: string | number | boolean | string[],
  right: string | number | boolean | string[],
): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => value === right[index]);
  }
  return left === right;
}

export function compareComponentConfigurations(
  before: ComponentConfiguration,
  after: ComponentConfiguration,
): ComponentConfigurationChange[] {
  if (before.type !== after.type) {
    throw new InvalidComponentDataError("Cannot compare component configurations of different types.");
  }

  const changes: ComponentConfigurationChange[] = [];
  for (const field of COMPONENT_FIELD_SCHEMAS[before.type]) {
    const beforeValue = (before as unknown as Record<string, string | number | boolean | string[]>)[field.key];
    const afterValue = (after as unknown as Record<string, string | number | boolean | string[]>)[field.key];
    if (beforeValue === undefined || afterValue === undefined) {
      continue;
    }
    if (!valuesEqual(beforeValue, afterValue)) {
      changes.push({
        field: field.key,
        before: Array.isArray(beforeValue) ? [...beforeValue] : beforeValue,
        after: Array.isArray(afterValue) ? [...afterValue] : afterValue,
      });
    }
  }
  return changes;
}
