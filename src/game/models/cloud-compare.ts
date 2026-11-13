import type { CloudConfiguration } from "./cloud";

export type CloudConfigurationField = keyof CloudConfiguration;
export type CloudConfigurationValue = string | number;

export interface CloudConfigurationChange {
  field: CloudConfigurationField;
  before: CloudConfigurationValue;
  after: CloudConfigurationValue;
}

const CLOUD_CONFIGURATION_FIELDS: readonly CloudConfigurationField[] = [
  "serverDeviceProjectId",
  "serverDeviceVersion",
  "dataCenters",
  "serversPerCenter",
  "storageTb",
  "networkGbps",
  "aiAcceleratorUnits",
  "redundancy",
];

export function compareCloudConfigurations(
  before: CloudConfiguration,
  after: CloudConfiguration,
): CloudConfigurationChange[] {
  const changes: CloudConfigurationChange[] = [];

  for (const field of CLOUD_CONFIGURATION_FIELDS) {
    const previous = before[field];
    const next = after[field];
    if (previous !== next) {
      changes.push({ field, before: previous, after: next });
    }
  }

  return changes;
}
