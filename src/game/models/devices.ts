import type { AiDeployment, AiProject } from "./ai";
import {
  checkBuildCompatibility,
  type ComponentConfiguration,
  type ComponentProject,
  type ComponentType,
} from "./components";
import type { CpuProject } from "./cpu";
import { isValidDateOnly } from "./date";
import { isProjectVersionLimitReached } from "./project-limits";
import {
  checkOsHardwareCompatibility,
  type OsHardwareTarget,
  type OsPlatform,
  type OsProject,
  type OsRelease,
} from "./os";

export const DEVICE_TYPE_OPTIONS = [
  "desktop",
  "laptop",
  "smartphone",
  "tablet",
  "workstation",
  "server",
  "gaming",
  "ai-device",
] as const;

export type DeviceType = (typeof DEVICE_TYPE_OPTIONS)[number];

export const DEVICE_LIMITS = {
  projectName: { min: 2, max: 40 },
  cpuVersion: { min: 1, max: 1_000_000 },
} as const;

export interface DeviceConfiguration {
  type: DeviceType;
  cpuProjectId: string;
  cpuVersion: number;
  motherboardProjectId: string;
  ramProjectId: string;
  storageProjectId: string;
  gpuProjectId: string | null;
  networkingProjectId: string | null;
  aiAcceleratorProjectId: string | null;
  osProjectId: string;
  osReleaseId: string;
  aiProjectId: string | null;
  aiDeploymentId: string | null;
}

export interface DeviceDesignVersion {
  version: number;
  savedOn: string;
  configuration: DeviceConfiguration;
}

export interface DeviceProject {
  id: string;
  name: string;
  configuration: DeviceConfiguration;
  versions: DeviceDesignVersion[];
}

export interface DeviceReferenceContext {
  cpuProjects: readonly CpuProject[];
  componentProjects: readonly ComponentProject[];
  osProjects: readonly OsProject[];
  aiProjects: readonly AiProject[];
}

export type DeviceValidationIssueCode =
  | "invalid-name"
  | "invalid-type"
  | "required-reference"
  | "project-not-found"
  | "version-not-found"
  | "component-type-mismatch"
  | "os-release-not-found"
  | "ai-deployment-not-found"
  | "ai-project-mismatch"
  | "os-platform-mismatch"
  | "component-incompatible"
  | "os-incompatible";

export interface DeviceValidationIssue {
  code: DeviceValidationIssueCode;
  field?: keyof DeviceConfiguration | "name";
  detail?: string;
}

export interface DeviceValidationResult {
  valid: boolean;
  issues: DeviceValidationIssue[];
}

export class InvalidDeviceDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidDeviceDataError";
  }
}

export function isDeviceType(value: unknown): value is DeviceType {
  return typeof value === "string" && (DEVICE_TYPE_OPTIONS as readonly string[]).includes(value);
}

export function validateDeviceProjectName(name: string): { code: "required" | "length"; min: number; max: number } | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { code: "required", min: DEVICE_LIMITS.projectName.min, max: DEVICE_LIMITS.projectName.max };
  }
  if (trimmed.length < DEVICE_LIMITS.projectName.min || trimmed.length > DEVICE_LIMITS.projectName.max) {
    return { code: "length", min: DEVICE_LIMITS.projectName.min, max: DEVICE_LIMITS.projectName.max };
  }
  return null;
}

export function createDefaultDeviceConfiguration(type: DeviceType): DeviceConfiguration {
  return {
    type,
    cpuProjectId: "",
    cpuVersion: 1,
    motherboardProjectId: "",
    ramProjectId: "",
    storageProjectId: "",
    gpuProjectId: null,
    networkingProjectId: null,
    aiAcceleratorProjectId: null,
    osProjectId: "",
    osReleaseId: "",
    aiProjectId: null,
    aiDeploymentId: null,
  };
}

export function buildSuggestedDeviceConfiguration(
  type: DeviceType,
  context: DeviceReferenceContext,
): DeviceConfiguration {
  const cpuProject = context.cpuProjects[0];
  const motherboard = context.componentProjects.find((project) => project.type === "motherboard");
  const ram = context.componentProjects.find((project) => project.type === "ram");
  const storage = context.componentProjects.find((project) => project.type === "ssd");
  const gpu = context.componentProjects.find((project) => project.type === "gpu");
  const networking = context.componentProjects.find((project) => project.type === "networking");
  const aiAccelerator = context.componentProjects.find((project) => project.type === "ai-accelerator");
  const osProject = context.osProjects.find((project) => project.releases.length > 0) ?? context.osProjects[0];
  const release = osProject ? getLatestOsRelease(osProject) : undefined;
  const aiProject = type === "ai-device"
    ? context.aiProjects.find((project) => project.deployments.length > 0) ?? context.aiProjects[0]
    : null;
  const deployment = aiProject ? getLatestAiDeployment(aiProject) : undefined;

  return {
    type,
    cpuProjectId: cpuProject?.id ?? "",
    cpuVersion: cpuProject ? Math.max(...cpuProject.versions.map((version) => version.version)) : 1,
    motherboardProjectId: motherboard?.id ?? "",
    ramProjectId: ram?.id ?? "",
    storageProjectId: storage?.id ?? "",
    gpuProjectId: gpu?.id ?? null,
    networkingProjectId: networking?.id ?? null,
    aiAcceleratorProjectId: aiAccelerator?.id ?? null,
    osProjectId: osProject?.id ?? "",
    osReleaseId: release?.id ?? "",
    aiProjectId: aiProject?.id ?? null,
    aiDeploymentId: deployment?.id ?? null,
  };
}

export function resolveCpuVersion(
  context: DeviceReferenceContext,
  configuration: DeviceConfiguration,
): CpuProject["configuration"] | null {
  const project = context.cpuProjects.find((candidate) => candidate.id === configuration.cpuProjectId);
  if (!project) {
    return null;
  }
  return project.versions.find((version) => version.version === configuration.cpuVersion)?.configuration ?? null;
}

export function resolveComponentProject(
  context: DeviceReferenceContext,
  projectId: string | null,
  expectedType: ComponentType,
): ComponentProject | null {
  if (!projectId) {
    return null;
  }
  const project = context.componentProjects.find((candidate) => candidate.id === projectId);
  if (!project || project.type !== expectedType) {
    return null;
  }
  return project;
}

export function resolveOsRelease(
  context: DeviceReferenceContext,
  configuration: DeviceConfiguration,
): OsRelease | null {
  const project = context.osProjects.find((candidate) => candidate.id === configuration.osProjectId);
  return project?.releases.find((release) => release.id === configuration.osReleaseId) ?? null;
}

export function resolveAiDeployment(
  context: DeviceReferenceContext,
  configuration: DeviceConfiguration,
): AiDeployment | null {
  if (!configuration.aiProjectId || !configuration.aiDeploymentId) {
    return null;
  }
  const project = context.aiProjects.find((candidate) => candidate.id === configuration.aiProjectId);
  return project?.deployments.find((deployment) => deployment.id === configuration.aiDeploymentId) ?? null;
}

export function validateDeviceConfiguration(
  configuration: DeviceConfiguration,
  context: DeviceReferenceContext,
): DeviceValidationResult {
  const issues: DeviceValidationIssue[] = [];

  if (!isDeviceType(configuration.type)) {
    issues.push({ code: "invalid-type", field: "type" });
    return { valid: false, issues };
  }

  const requiredFields: Array<keyof DeviceConfiguration> = [
    "cpuProjectId",
    "motherboardProjectId",
    "ramProjectId",
    "storageProjectId",
    "osProjectId",
    "osReleaseId",
  ];
  for (const field of requiredFields) {
    if (typeof configuration[field] !== "string" || (configuration[field] as string).trim().length === 0) {
      issues.push({ code: "required-reference", field });
    }
  }

  if (!Number.isInteger(configuration.cpuVersion) || configuration.cpuVersion < 1) {
    issues.push({ code: "version-not-found", field: "cpuVersion" });
  }

  const cpu = context.cpuProjects.find((project) => project.id === configuration.cpuProjectId);
  if (configuration.cpuProjectId && !cpu) {
    issues.push({ code: "project-not-found", field: "cpuProjectId" });
  } else if (cpu && !cpu.versions.some((version) => version.version === configuration.cpuVersion)) {
    issues.push({ code: "version-not-found", field: "cpuVersion" });
  }

  const requiredComponents: Array<{ field: keyof DeviceConfiguration; type: ComponentType }> = [
    { field: "motherboardProjectId", type: "motherboard" },
    { field: "ramProjectId", type: "ram" },
    { field: "storageProjectId", type: "ssd" },
  ];
  const optionalComponents: Array<{ field: keyof DeviceConfiguration; type: ComponentType }> = [
    { field: "gpuProjectId", type: "gpu" },
    { field: "networkingProjectId", type: "networking" },
    { field: "aiAcceleratorProjectId", type: "ai-accelerator" },
  ];

  for (const { field, type } of [...requiredComponents, ...optionalComponents]) {
    const projectId = configuration[field];
    if (projectId === null) {
      continue;
    }
    if (typeof projectId !== "string" || projectId.trim().length === 0) {
      issues.push({ code: "required-reference", field });
      continue;
    }
    const project = context.componentProjects.find((candidate) => candidate.id === projectId);
    if (!project) {
      issues.push({ code: "project-not-found", field });
    } else if (project.type !== type) {
      issues.push({ code: "component-type-mismatch", field, detail: type });
    }
  }

  if (configuration.type === "gaming" && !configuration.gpuProjectId) {
    issues.push({ code: "required-reference", field: "gpuProjectId" });
  }
  if (configuration.type === "server" && !configuration.networkingProjectId) {
    issues.push({ code: "required-reference", field: "networkingProjectId" });
  }
  if (configuration.type === "ai-device") {
    if (!configuration.aiAcceleratorProjectId) {
      issues.push({ code: "required-reference", field: "aiAcceleratorProjectId" });
    }
    if (!configuration.aiProjectId || !configuration.aiDeploymentId) {
      issues.push({ code: "required-reference", field: "aiDeploymentId" });
    }
  }

  const osProject = context.osProjects.find((project) => project.id === configuration.osProjectId);
  const release = osProject?.releases.find((candidate) => candidate.id === configuration.osReleaseId);
  if (configuration.osProjectId && !osProject) {
    issues.push({ code: "project-not-found", field: "osProjectId" });
  } else if (osProject && !release) {
    issues.push({ code: "os-release-not-found", field: "osReleaseId" });
  }

  if (release) {
    const expectedPlatform = getDeviceOsPlatform(configuration.type);
    if (release.configuration.targetPlatform !== expectedPlatform && release.configuration.targetPlatform !== "universal") {
      issues.push({ code: "os-platform-mismatch", field: "osReleaseId", detail: expectedPlatform });
    }
  }

  if (configuration.aiProjectId) {
    const aiProject = context.aiProjects.find((project) => project.id === configuration.aiProjectId);
    if (!aiProject) {
      issues.push({ code: "project-not-found", field: "aiProjectId" });
    } else if (configuration.aiDeploymentId) {
      const deployment = aiProject.deployments.find((candidate) => candidate.id === configuration.aiDeploymentId);
      if (!deployment) {
        issues.push({ code: "ai-deployment-not-found", field: "aiDeploymentId" });
      }
    }
  } else if (configuration.aiDeploymentId) {
    issues.push({ code: "ai-project-mismatch", field: "aiProjectId" });
  }

  const cpuConfiguration = resolveCpuVersion(context, configuration);
  const components: Partial<Record<ComponentType, ComponentConfiguration>> = {};
  for (const { field, type } of [...requiredComponents, ...optionalComponents]) {
    const project = resolveComponentProject(context, configuration[field] as string | null, type);
    if (project) {
      components[type] = project.configuration;
    }
  }

  if (cpuConfiguration) {
    const buildCompatibility = checkBuildCompatibility({ cpu: cpuConfiguration, components });
    for (const issue of buildCompatibility.issues) {
      issues.push({
        code: "component-incompatible",
        detail: issue.code,
      });
    }
  }

  if (release) {
    const targets: OsHardwareTarget[] = [];
    if (cpuConfiguration) {
      targets.push({
        id: configuration.cpuProjectId,
        name: cpu?.name ?? configuration.cpuProjectId,
        kind: "cpu",
        architecture: cpuConfiguration.isa,
      });
    }
    for (const { field, type } of [...requiredComponents, ...optionalComponents]) {
      const project = resolveComponentProject(context, configuration[field] as string | null, type);
      if (!project) {
        continue;
      }
      const target: OsHardwareTarget = { id: project.id, name: project.name, kind: type };
      if (project.configuration.type === "gpu") {
        target.bus = project.configuration.bus;
      } else if (project.configuration.type === "ssd") {
        target.storageInterface = project.configuration.interface;
        target.storageFormFactor = project.configuration.formFactor;
      } else if (project.configuration.type === "motherboard") {
        target.pcieGeneration = project.configuration.pcieGeneration;
      } else if (project.configuration.type === "ai-accelerator") {
        target.aiInterconnect = project.configuration.interconnect;
      } else if (project.configuration.type === "networking") {
        target.bus = project.configuration.bus;
        target.networkStandard = project.configuration.standard;
        target.networkMedium = project.configuration.medium;
      }
      targets.push(target);
    }

    for (const compatibility of checkOsHardwareCompatibility(release.configuration, targets)) {
      if (!compatibility.compatible) {
        for (const issue of compatibility.issues) {
          issues.push({ code: "os-incompatible", detail: issue.code });
        }
      }
    }
  }

  const deduped = issues.filter((issue, index) => (
    issues.findIndex((candidate) => candidate.code === issue.code && candidate.field === issue.field && candidate.detail === issue.detail) === index
  ));

  return { valid: deduped.length === 0, issues: deduped };
}

export function getDeviceOsPlatform(type: DeviceType): OsPlatform {
  switch (type) {
    case "smartphone":
    case "tablet":
      return "mobile";
    case "server":
      return "server";
    case "gaming":
      return "gaming";
    case "ai-device":
      return "universal";
    case "desktop":
    case "laptop":
    case "workstation":
      return "desktop";
  }
}

export function createDeviceProject(
  id: string,
  name: string,
  configuration: DeviceConfiguration,
  savedOn: string,
): DeviceProject {
  const normalizedId = id.trim();
  if (normalizedId.length === 0) {
    throw new InvalidDeviceDataError("Device project ID is required.");
  }
  assertName(name);
  assertConfigurationStructure(configuration);
  if (!isValidDateOnly(savedOn)) {
    throw new InvalidDeviceDataError("Device project save date is invalid.");
  }

  return {
    id: normalizedId,
    name: name.trim(),
    configuration: cloneDeviceConfiguration(configuration),
    versions: [{
      version: 1,
      savedOn,
      configuration: cloneDeviceConfiguration(configuration),
    }],
  };
}

export function saveDeviceVersion(
  project: DeviceProject,
  name: string,
  configuration: DeviceConfiguration,
  savedOn: string,
): DeviceProject {
  assertName(name);
  assertConfigurationStructure(configuration);
  if (!isValidDateOnly(savedOn)) {
    throw new InvalidDeviceDataError("Device project save date is invalid.");
  }
  if (isProjectVersionLimitReached(project.versions)) {
    throw new InvalidDeviceDataError("Device project version limit reached.");
  }
  const nextVersion = Math.max(0, ...project.versions.map((version) => version.version)) + 1;

  return {
    ...project,
    name: name.trim(),
    configuration: cloneDeviceConfiguration(configuration),
    versions: [
      ...project.versions,
      { version: nextVersion, savedOn, configuration: cloneDeviceConfiguration(configuration) },
    ],
  };
}

export function cloneDeviceConfiguration(configuration: DeviceConfiguration): DeviceConfiguration {
  return { ...configuration };
}

export function deviceConfigurationsEqual(left: DeviceConfiguration, right: DeviceConfiguration): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function parseDeviceConfiguration(value: unknown): DeviceConfiguration {
  if (!isRecord(value)) {
    throw new InvalidDeviceDataError("Device configuration is invalid.");
  }
  const type = value.type;
  if (!isDeviceType(type)) {
    throw new InvalidDeviceDataError("Device type is invalid.");
  }

  const configuration: DeviceConfiguration = {
    type,
    cpuProjectId: requireString(value.cpuProjectId, "Device CPU reference is invalid."),
    cpuVersion: requireInteger(value.cpuVersion, "Device CPU version is invalid.", 1, DEVICE_LIMITS.cpuVersion.max),
    motherboardProjectId: requireString(value.motherboardProjectId, "Device motherboard reference is invalid."),
    ramProjectId: requireString(value.ramProjectId, "Device RAM reference is invalid."),
    storageProjectId: requireString(value.storageProjectId, "Device storage reference is invalid."),
    gpuProjectId: requireNullableString(value.gpuProjectId, "Device GPU reference is invalid."),
    networkingProjectId: requireNullableString(value.networkingProjectId, "Device networking reference is invalid."),
    aiAcceleratorProjectId: requireNullableString(value.aiAcceleratorProjectId, "Device AI accelerator reference is invalid."),
    osProjectId: requireString(value.osProjectId, "Device OS reference is invalid."),
    osReleaseId: requireString(value.osReleaseId, "Device OS release reference is invalid."),
    aiProjectId: requireNullableString(value.aiProjectId, "Device AI project reference is invalid."),
    aiDeploymentId: requireNullableString(value.aiDeploymentId, "Device AI deployment reference is invalid."),
  };
  assertConfigurationStructure(configuration);
  return configuration;
}

export function parseDeviceProject(value: unknown): DeviceProject {
  if (!isRecord(value)) {
    throw new InvalidDeviceDataError("Device project is invalid.");
  }
  const id = requireString(value.id, "Device project ID is invalid.");
  const name = requireString(value.name, "Device project name is invalid.");
  assertName(name);
  const configuration = parseDeviceConfiguration(value.configuration);
  if (!Array.isArray(value.versions) || value.versions.length === 0) {
    throw new InvalidDeviceDataError("Device project versions are invalid.");
  }

  const versions = value.versions.map((versionValue) => {
    if (!isRecord(versionValue)) {
      throw new InvalidDeviceDataError("Device project version is invalid.");
    }
    const version = requireInteger(versionValue.version, "Device project version number is invalid.", 1, 1_000_000);
    const savedOn = requireString(versionValue.savedOn, "Device project version date is invalid.");
    if (!isValidDateOnly(savedOn)) {
      throw new InvalidDeviceDataError("Device project version date is invalid.");
    }
    return { version, savedOn, configuration: parseDeviceConfiguration(versionValue.configuration) };
  });

  if (!versions.some((version) => version.version === 1)) {
    throw new InvalidDeviceDataError("Device project versions must start at 1.");
  }
  const versionNumbers = new Set(versions.map((version) => version.version));
  if (versionNumbers.size !== versions.length) {
    throw new InvalidDeviceDataError("Device project versions must be unique.");
  }
  versions.sort((left, right) => left.version - right.version);
  const latest = versions.at(-1);
  if (!latest || !deviceConfigurationsEqual(configuration, latest.configuration)) {
    throw new InvalidDeviceDataError("Device project configuration does not match the latest version.");
  }

  return {
    id,
    name: name.trim(),
    configuration,
    versions,
  };
}

export function getLatestOsRelease(project: OsProject): OsRelease | undefined {
  return [...project.releases].sort((left, right) => left.version - right.version).at(-1);
}

export function getLatestAiDeployment(project: AiProject): AiDeployment | undefined {
  return [...project.deployments].at(-1);
}

function assertName(name: string): void {
  if (validateDeviceProjectName(name)) {
    throw new InvalidDeviceDataError("Device project name is invalid.");
  }
}

function assertConfigurationStructure(configuration: DeviceConfiguration): void {
  if (!isDeviceType(configuration.type)) {
    throw new InvalidDeviceDataError("Device type is invalid.");
  }
  const requiredStrings: Array<keyof DeviceConfiguration> = [
    "cpuProjectId",
    "motherboardProjectId",
    "ramProjectId",
    "storageProjectId",
    "osProjectId",
    "osReleaseId",
  ];
  for (const field of requiredStrings) {
    const fieldValue = configuration[field];
    if (typeof fieldValue !== "string" || fieldValue.trim().length === 0) {
      throw new InvalidDeviceDataError(`Device configuration field ${field} is required.`);
    }
  }
  if (!Number.isInteger(configuration.cpuVersion) || configuration.cpuVersion < 1) {
    throw new InvalidDeviceDataError("Device CPU version is invalid.");
  }
  const nullableStrings: Array<keyof DeviceConfiguration> = [
    "gpuProjectId",
    "networkingProjectId",
    "aiAcceleratorProjectId",
    "aiProjectId",
    "aiDeploymentId",
  ];
  for (const field of nullableStrings) {
    const fieldValue = configuration[field];
    if (fieldValue !== null && typeof fieldValue !== "string") {
      throw new InvalidDeviceDataError(`Device configuration field ${field} is invalid.`);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new InvalidDeviceDataError(message);
  }
  return value;
}

function requireNullableString(value: unknown, message: string): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new InvalidDeviceDataError(message);
  }
  return value;
}

function requireInteger(value: unknown, message: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new InvalidDeviceDataError(message);
  }
  return value;
}
