import type { DeviceConfiguration } from "./devices";

export type DeviceConfigurationField = keyof DeviceConfiguration;
export type DeviceConfigurationValue = string | number | null;

export interface DeviceConfigurationChange {
  field: DeviceConfigurationField;
  before: DeviceConfigurationValue;
  after: DeviceConfigurationValue;
}

const DEVICE_CONFIGURATION_FIELDS: readonly DeviceConfigurationField[] = [
  "type",
  "cpuProjectId",
  "cpuVersion",
  "motherboardProjectId",
  "ramProjectId",
  "storageProjectId",
  "gpuProjectId",
  "networkingProjectId",
  "aiAcceleratorProjectId",
  "osProjectId",
  "osReleaseId",
  "aiProjectId",
  "aiDeploymentId",
];

export function compareDeviceConfigurations(
  before: DeviceConfiguration,
  after: DeviceConfiguration,
): DeviceConfigurationChange[] {
  const changes: DeviceConfigurationChange[] = [];

  for (const field of DEVICE_CONFIGURATION_FIELDS) {
    const previous = before[field];
    const next = after[field];
    if (previous !== next) {
      changes.push({ field, before: previous, after: next });
    }
  }

  return changes;
}
