import { isValidDateOnly } from "./date";
import {
  type DeviceProject,
  type DeviceReferenceContext,
  validateDeviceConfiguration,
} from "./devices";

export const CLOUD_LIMITS = {
  projectName: { min: 2, max: 40 },
  dataCenters: { min: 1, max: 100 },
  serversPerCenter: { min: 1, max: 10_000 },
  storageTb: { min: 1, max: 1_000_000 },
  networkGbps: { min: 1, max: 1_000_000 },
  aiAcceleratorUnits: { min: 0, max: 100_000 },
  redundancy: { min: 1, max: 3 },
} as const;

export interface CloudConfiguration {
  serverDeviceProjectId: string;
  serverDeviceVersion: number;
  dataCenters: number;
  serversPerCenter: number;
  storageTb: number;
  networkGbps: number;
  aiAcceleratorUnits: number;
  redundancy: number;
}

export interface CloudDesignVersion {
  version: number;
  savedOn: string;
  configuration: CloudConfiguration;
}

export interface CloudProject {
  id: string;
  name: string;
  configuration: CloudConfiguration;
  versions: CloudDesignVersion[];
}

export interface CloudReferenceContext extends DeviceReferenceContext {
  deviceProjects: readonly DeviceProject[];
}

export type CloudValidationIssueCode =
  | "required-reference"
  | "project-not-found"
  | "version-not-found"
  | "device-not-server"
  | "device-incompatible"
  | "integer"
  | "range";

export interface CloudValidationIssue {
  code: CloudValidationIssueCode;
  field?: keyof CloudConfiguration | "name";
  min?: number;
  max?: number;
}

export interface CloudValidationResult {
  valid: boolean;
  issues: CloudValidationIssue[];
}

export class InvalidCloudDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCloudDataError";
  }
}

export function createDefaultCloudConfiguration(): CloudConfiguration {
  return {
    serverDeviceProjectId: "",
    serverDeviceVersion: 1,
    dataCenters: 1,
    serversPerCenter: 100,
    storageTb: 1_000,
    networkGbps: 10_000,
    aiAcceleratorUnits: 0,
    redundancy: 2,
  };
}

export function buildSuggestedCloudConfiguration(
  deviceProjects: readonly DeviceProject[],
): CloudConfiguration {
  const server = deviceProjects.find((project) => project.configuration.type === "server");
  return {
    ...createDefaultCloudConfiguration(),
    serverDeviceProjectId: server?.id ?? "",
    serverDeviceVersion: server ? Math.max(...server.versions.map((version) => version.version)) : 1,
  };
}

export function validateCloudConfiguration(
  configuration: CloudConfiguration,
  context: CloudReferenceContext,
): CloudValidationResult {
  const issues: CloudValidationIssue[] = [];
  const requiredFields: Array<keyof CloudConfiguration> = ["serverDeviceProjectId"];
  for (const field of requiredFields) {
    const value = configuration[field];
    if (typeof value !== "string" || value.trim().length === 0) {
      issues.push({ code: "required-reference", field });
    }
  }

  if (!Number.isInteger(configuration.serverDeviceVersion) || configuration.serverDeviceVersion < 1) {
    issues.push({ code: "version-not-found", field: "serverDeviceVersion" });
  }

  const project = context.deviceProjects.find((candidate) => candidate.id === configuration.serverDeviceProjectId);
  if (configuration.serverDeviceProjectId && !project) {
    issues.push({ code: "project-not-found", field: "serverDeviceProjectId" });
  } else if (project) {
    const version = project.versions.find((candidate) => candidate.version === configuration.serverDeviceVersion);
    if (!version) {
      issues.push({ code: "version-not-found", field: "serverDeviceVersion" });
    } else if (version.configuration.type !== "server") {
      issues.push({ code: "device-not-server", field: "serverDeviceProjectId" });
    } else {
      const deviceValidation = validateDeviceConfiguration(version.configuration, context);
      if (!deviceValidation.valid) {
        issues.push({ code: "device-incompatible", field: "serverDeviceProjectId" });
      }
    }
  }

  validateInteger(configuration.dataCenters, "dataCenters", CLOUD_LIMITS.dataCenters, issues);
  validateInteger(configuration.serversPerCenter, "serversPerCenter", CLOUD_LIMITS.serversPerCenter, issues);
  validateInteger(configuration.storageTb, "storageTb", CLOUD_LIMITS.storageTb, issues);
  validateInteger(configuration.networkGbps, "networkGbps", CLOUD_LIMITS.networkGbps, issues);
  validateInteger(configuration.aiAcceleratorUnits, "aiAcceleratorUnits", CLOUD_LIMITS.aiAcceleratorUnits, issues);
  validateInteger(configuration.redundancy, "redundancy", CLOUD_LIMITS.redundancy, issues);

  return { valid: issues.length === 0, issues };
}

export function createCloudProject(
  id: string,
  name: string,
  configuration: CloudConfiguration,
  savedOn: string,
): CloudProject {
  const normalizedId = id.trim();
  if (normalizedId.length === 0) {
    throw new InvalidCloudDataError("Cloud project ID is required.");
  }
  assertName(name);
  assertConfiguration(configuration);
  if (!isValidDateOnly(savedOn)) {
    throw new InvalidCloudDataError("Cloud project save date is invalid.");
  }

  return {
    id: normalizedId,
    name: name.trim(),
    configuration: cloneCloudConfiguration(configuration),
    versions: [{
      version: 1,
      savedOn,
      configuration: cloneCloudConfiguration(configuration),
    }],
  };
}

export function saveCloudVersion(
  project: CloudProject,
  name: string,
  configuration: CloudConfiguration,
  savedOn: string,
): CloudProject {
  assertName(name);
  assertConfiguration(configuration);
  if (!isValidDateOnly(savedOn)) {
    throw new InvalidCloudDataError("Cloud project save date is invalid.");
  }
  const nextVersion = Math.max(0, ...project.versions.map((version) => version.version)) + 1;

  return {
    ...project,
    name: name.trim(),
    configuration: cloneCloudConfiguration(configuration),
    versions: [
      ...project.versions,
      { version: nextVersion, savedOn, configuration: cloneCloudConfiguration(configuration) },
    ],
  };
}

export function cloneCloudConfiguration(configuration: CloudConfiguration): CloudConfiguration {
  return { ...configuration };
}

export function cloudConfigurationsEqual(left: CloudConfiguration, right: CloudConfiguration): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function parseCloudConfiguration(value: unknown): CloudConfiguration {
  if (!isRecord(value)) {
    throw new InvalidCloudDataError("Cloud configuration is invalid.");
  }
  const configuration: CloudConfiguration = {
    serverDeviceProjectId: requireString(value.serverDeviceProjectId, "Cloud server reference is invalid."),
    serverDeviceVersion: requireInteger(
      value.serverDeviceVersion,
      "Cloud server version is invalid.",
      1,
      1_000_000,
    ),
    dataCenters: requireInteger(value.dataCenters, "Cloud data center count is invalid.", CLOUD_LIMITS.dataCenters.min, CLOUD_LIMITS.dataCenters.max),
    serversPerCenter: requireInteger(value.serversPerCenter, "Cloud server count is invalid.", CLOUD_LIMITS.serversPerCenter.min, CLOUD_LIMITS.serversPerCenter.max),
    storageTb: requireInteger(value.storageTb, "Cloud storage is invalid.", CLOUD_LIMITS.storageTb.min, CLOUD_LIMITS.storageTb.max),
    networkGbps: requireInteger(value.networkGbps, "Cloud network capacity is invalid.", CLOUD_LIMITS.networkGbps.min, CLOUD_LIMITS.networkGbps.max),
    aiAcceleratorUnits: requireInteger(value.aiAcceleratorUnits, "Cloud AI capacity is invalid.", CLOUD_LIMITS.aiAcceleratorUnits.min, CLOUD_LIMITS.aiAcceleratorUnits.max),
    redundancy: requireInteger(value.redundancy, "Cloud redundancy is invalid.", CLOUD_LIMITS.redundancy.min, CLOUD_LIMITS.redundancy.max),
  };
  assertConfiguration(configuration);
  return configuration;
}

export function parseCloudProject(value: unknown): CloudProject {
  if (!isRecord(value)) {
    throw new InvalidCloudDataError("Cloud project is invalid.");
  }
  const id = requireString(value.id, "Cloud project ID is invalid.");
  const name = requireString(value.name, "Cloud project name is invalid.");
  assertName(name);
  const configuration = parseCloudConfiguration(value.configuration);
  if (!Array.isArray(value.versions) || value.versions.length === 0) {
    throw new InvalidCloudDataError("Cloud project versions are invalid.");
  }

  const versions = value.versions.map((versionValue) => {
    if (!isRecord(versionValue)) {
      throw new InvalidCloudDataError("Cloud project version is invalid.");
    }
    const version = requireInteger(versionValue.version, "Cloud project version number is invalid.", 1, 1_000_000);
    const savedOn = requireString(versionValue.savedOn, "Cloud project version date is invalid.");
    if (!isValidDateOnly(savedOn)) {
      throw new InvalidCloudDataError("Cloud project version date is invalid.");
    }
    return { version, savedOn, configuration: parseCloudConfiguration(versionValue.configuration) };
  });

  if (!versions.some((version) => version.version === 1)) {
    throw new InvalidCloudDataError("Cloud project versions must start at 1.");
  }
  const versionNumbers = new Set(versions.map((version) => version.version));
  if (versionNumbers.size !== versions.length) {
    throw new InvalidCloudDataError("Cloud project versions must be unique.");
  }
  versions.sort((left, right) => left.version - right.version);
  const latest = versions.at(-1);
  if (!latest || !cloudConfigurationsEqual(configuration, latest.configuration)) {
    throw new InvalidCloudDataError("Cloud project configuration does not match the latest version.");
  }

  return {
    id,
    name: name.trim(),
    configuration,
    versions,
  };
}

function validateInteger(
  value: number,
  field: keyof CloudConfiguration,
  limits: { min: number; max: number },
  issues: CloudValidationIssue[],
): void {
  if (!Number.isInteger(value)) {
    issues.push({ code: "integer", field, min: limits.min, max: limits.max });
  } else if (value < limits.min || value > limits.max) {
    issues.push({ code: "range", field, min: limits.min, max: limits.max });
  }
}

function assertName(name: string): void {
  const trimmed = name.trim();
  if (trimmed.length < CLOUD_LIMITS.projectName.min || trimmed.length > CLOUD_LIMITS.projectName.max) {
    throw new InvalidCloudDataError("Cloud project name is invalid.");
  }
}

function assertConfiguration(configuration: CloudConfiguration): void {
  if (typeof configuration.serverDeviceProjectId !== "string" || configuration.serverDeviceProjectId.trim().length === 0) {
    throw new InvalidCloudDataError("Cloud server reference is required.");
  }
  const checks: Array<[number, { min: number; max: number }]> = [
    [configuration.serverDeviceVersion, { min: 1, max: 1_000_000 }],
    [configuration.dataCenters, CLOUD_LIMITS.dataCenters],
    [configuration.serversPerCenter, CLOUD_LIMITS.serversPerCenter],
    [configuration.storageTb, CLOUD_LIMITS.storageTb],
    [configuration.networkGbps, CLOUD_LIMITS.networkGbps],
    [configuration.aiAcceleratorUnits, CLOUD_LIMITS.aiAcceleratorUnits],
    [configuration.redundancy, CLOUD_LIMITS.redundancy],
  ];
  for (const [value, limits] of checks) {
    if (!Number.isInteger(value) || value < limits.min || value > limits.max) {
      throw new InvalidCloudDataError("Cloud configuration contains an invalid integer.");
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new InvalidCloudDataError(message);
  }
  return value;
}

function requireInteger(value: unknown, message: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new InvalidCloudDataError(message);
  }
  return value;
}
