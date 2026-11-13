import {
  CPU_MEMORY_OPTIONS,
  CPU_ISA_OPTIONS,
  type CpuConfiguration,
  type CpuIsa,
  type CpuMemoryStandard,
} from "./cpu";
import { isProjectVersionLimitReached } from "./project-limits";

export const COMPONENT_TYPES = [
  "gpu",
  "ram",
  "ssd",
  "motherboard",
  "ai-accelerator",
  "networking",
] as const;

export type ComponentType = (typeof COMPONENT_TYPES)[number];

export const COMPONENT_BUS_OPTIONS = ["pci", "pcie-3", "pcie-4", "pcie-5"] as const;
export const SSD_INTERFACE_OPTIONS = ["sata", "nvme"] as const;
export const SSD_FORM_FACTOR_OPTIONS = ["2.5-inch", "m2"] as const;
export const MOTHERBOARD_FORM_FACTOR_OPTIONS = ["atx", "matx", "itx", "eatx"] as const;
export const AI_INTERCONNECT_OPTIONS = ["pcie", "nvlink"] as const;
export const AI_PRECISION_OPTIONS = ["fp32", "fp16", "bf16", "fp8", "int8"] as const;
export const NETWORK_MEDIUM_OPTIONS = ["copper", "fiber"] as const;
export const NETWORK_STANDARD_OPTIONS = ["ethernet", "infiniband"] as const;

export type ComponentBus = (typeof COMPONENT_BUS_OPTIONS)[number];
export type SsdInterface = (typeof SSD_INTERFACE_OPTIONS)[number];
export type SsdFormFactor = (typeof SSD_FORM_FACTOR_OPTIONS)[number];
export type MotherboardFormFactor = (typeof MOTHERBOARD_FORM_FACTOR_OPTIONS)[number];
export type AiInterconnect = (typeof AI_INTERCONNECT_OPTIONS)[number];
export type AiPrecision = (typeof AI_PRECISION_OPTIONS)[number];
export type NetworkMedium = (typeof NETWORK_MEDIUM_OPTIONS)[number];
export type NetworkStandard = (typeof NETWORK_STANDARD_OPTIONS)[number];

export interface GpuConfiguration {
  type: "gpu";
  bus: ComponentBus;
  computeUnits: number;
  clockMHz: number;
  operationsPerCyclePerUnit: number;
  memoryCapacityGb: number;
  memoryBandwidthGbPerSecond: number;
  processNodeNm: number;
  dieAreaMm2: number;
  tdpW: number;
  rayTracing: boolean;
}

export interface RamConfiguration {
  type: "ram";
  memoryStandard: CpuMemoryStandard;
  capacityGb: number;
  speedMTs: number;
  channels: number;
  latencyCl: number;
  tdpW: number;
}

export interface SsdConfiguration {
  type: "ssd";
  interface: SsdInterface;
  formFactor: SsdFormFactor;
  capacityGb: number;
  sequentialReadMbps: number;
  sequentialWriteMbps: number;
  randomReadIops: number;
  enduranceTbw: number;
  tdpW: number;
}

export interface MotherboardConfiguration {
  type: "motherboard";
  supportedIsa: CpuIsa;
  memoryStandard: CpuMemoryStandard;
  formFactor: MotherboardFormFactor;
  memorySlots: number;
  maxMemoryGb: number;
  pcieGeneration: number;
  pcieLanes: number;
  m2Slots: number;
  sataPorts: number;
  networkGbps: number;
  tdpW: number;
}

export interface AiAcceleratorConfiguration {
  type: "ai-accelerator";
  interconnect: AiInterconnect;
  computeUnits: number;
  clockMHz: number;
  operationsPerCyclePerUnit: number;
  memoryCapacityGb: number;
  memoryBandwidthGbPerSecond: number;
  precisions: AiPrecision[];
  processNodeNm: number;
  dieAreaMm2: number;
  tdpW: number;
}

export interface NetworkingConfiguration {
  type: "networking";
  bus: ComponentBus;
  ports: number;
  speedGbps: number;
  medium: NetworkMedium;
  standard: NetworkStandard;
  tdpW: number;
}

export type ComponentConfiguration =
  | GpuConfiguration
  | RamConfiguration
  | SsdConfiguration
  | MotherboardConfiguration
  | AiAcceleratorConfiguration
  | NetworkingConfiguration;

export type ComponentConfigurationField =
  | Exclude<keyof GpuConfiguration, "type">
  | Exclude<keyof RamConfiguration, "type">
  | Exclude<keyof SsdConfiguration, "type">
  | Exclude<keyof MotherboardConfiguration, "type">
  | Exclude<keyof AiAcceleratorConfiguration, "type">
  | Exclude<keyof NetworkingConfiguration, "type">;
export type ComponentProjectType = ComponentType;

export const COMPONENT_LIMITS = {
  projectName: { min: 2, max: 40 },
  gpu: {
    computeUnits: { min: 1, max: 4_096 },
    clockMHz: { min: 100, max: 6_000 },
    operationsPerCyclePerUnit: { min: 0.1, max: 512, step: 0.1 },
    memoryCapacityGb: { min: 1, max: 4_096 },
    memoryBandwidthGbPerSecond: { min: 0.1, max: 100_000 },
    processNodeNm: { min: 2, max: 1_000 },
    dieAreaMm2: { min: 1, max: 4_000 },
    tdpW: { min: 1, max: 5_000 },
  },
  ram: {
    capacityGb: { min: 1, max: 4_096 },
    speedMTs: { min: 100, max: 20_000 },
    channels: { min: 1, max: 16 },
    latencyCl: { min: 1, max: 100 },
    tdpW: { min: 1, max: 500 },
  },
  ssd: {
    capacityGb: { min: 16, max: 100_000 },
    sequentialReadMbps: { min: 50, max: 100_000 },
    sequentialWriteMbps: { min: 50, max: 100_000 },
    randomReadIops: { min: 1_000, max: 100_000_000 },
    enduranceTbw: { min: 1, max: 100_000 },
    tdpW: { min: 1, max: 100 },
  },
  motherboard: {
    memorySlots: { min: 1, max: 16 },
    maxMemoryGb: { min: 1, max: 4_096 },
    pcieGeneration: { min: 1, max: 5 },
    pcieLanes: { min: 1, max: 256 },
    m2Slots: { min: 0, max: 16 },
    sataPorts: { min: 0, max: 32 },
    networkGbps: { min: 1, max: 400 },
    tdpW: { min: 1, max: 200 },
  },
  "ai-accelerator": {
    computeUnits: { min: 1, max: 8_192 },
    clockMHz: { min: 100, max: 6_000 },
    operationsPerCyclePerUnit: { min: 0.1, max: 512, step: 0.1 },
    memoryCapacityGb: { min: 1, max: 4_096 },
    memoryBandwidthGbPerSecond: { min: 0.1, max: 100_000 },
    processNodeNm: { min: 2, max: 1_000 },
    dieAreaMm2: { min: 1, max: 4_000 },
    tdpW: { min: 1, max: 5_000 },
  },
  networking: {
    ports: { min: 1, max: 128 },
    speedGbps: { min: 1, max: 1_600 },
    tdpW: { min: 1, max: 1_000 },
  },
} as const;

export type ComponentFieldKind = "integer" | "decimal" | "select" | "boolean" | "multi-select";

export interface ComponentFieldDefinition {
  key: ComponentConfigurationField;
  kind: ComponentFieldKind;
  min?: number;
  max?: number;
  step?: number;
  options?: readonly string[];
}

export const COMPONENT_FIELD_SCHEMAS: Record<ComponentType, readonly ComponentFieldDefinition[]> = {
  gpu: [
    { key: "bus", kind: "select", options: COMPONENT_BUS_OPTIONS },
    { key: "computeUnits", kind: "integer", ...COMPONENT_LIMITS.gpu.computeUnits },
    { key: "clockMHz", kind: "integer", ...COMPONENT_LIMITS.gpu.clockMHz },
    { key: "operationsPerCyclePerUnit", kind: "decimal", ...COMPONENT_LIMITS.gpu.operationsPerCyclePerUnit },
    { key: "memoryCapacityGb", kind: "integer", ...COMPONENT_LIMITS.gpu.memoryCapacityGb },
    { key: "memoryBandwidthGbPerSecond", kind: "decimal", ...COMPONENT_LIMITS.gpu.memoryBandwidthGbPerSecond },
    { key: "processNodeNm", kind: "integer", ...COMPONENT_LIMITS.gpu.processNodeNm },
    { key: "dieAreaMm2", kind: "decimal", ...COMPONENT_LIMITS.gpu.dieAreaMm2 },
    { key: "tdpW", kind: "integer", ...COMPONENT_LIMITS.gpu.tdpW },
    { key: "rayTracing", kind: "boolean" },
  ],
  ram: [
    { key: "memoryStandard", kind: "select", options: CPU_MEMORY_OPTIONS },
    { key: "capacityGb", kind: "integer", ...COMPONENT_LIMITS.ram.capacityGb },
    { key: "speedMTs", kind: "integer", ...COMPONENT_LIMITS.ram.speedMTs },
    { key: "channels", kind: "integer", ...COMPONENT_LIMITS.ram.channels },
    { key: "latencyCl", kind: "integer", ...COMPONENT_LIMITS.ram.latencyCl },
    { key: "tdpW", kind: "integer", ...COMPONENT_LIMITS.ram.tdpW },
  ],
  ssd: [
    { key: "interface", kind: "select", options: SSD_INTERFACE_OPTIONS },
    { key: "formFactor", kind: "select", options: SSD_FORM_FACTOR_OPTIONS },
    { key: "capacityGb", kind: "integer", ...COMPONENT_LIMITS.ssd.capacityGb },
    { key: "sequentialReadMbps", kind: "integer", ...COMPONENT_LIMITS.ssd.sequentialReadMbps },
    { key: "sequentialWriteMbps", kind: "integer", ...COMPONENT_LIMITS.ssd.sequentialWriteMbps },
    { key: "randomReadIops", kind: "integer", ...COMPONENT_LIMITS.ssd.randomReadIops },
    { key: "enduranceTbw", kind: "integer", ...COMPONENT_LIMITS.ssd.enduranceTbw },
    { key: "tdpW", kind: "integer", ...COMPONENT_LIMITS.ssd.tdpW },
  ],
  motherboard: [
    { key: "supportedIsa", kind: "select", options: CPU_ISA_OPTIONS },
    { key: "memoryStandard", kind: "select", options: CPU_MEMORY_OPTIONS },
    { key: "formFactor", kind: "select", options: MOTHERBOARD_FORM_FACTOR_OPTIONS },
    { key: "memorySlots", kind: "integer", ...COMPONENT_LIMITS.motherboard.memorySlots },
    { key: "maxMemoryGb", kind: "integer", ...COMPONENT_LIMITS.motherboard.maxMemoryGb },
    { key: "pcieGeneration", kind: "integer", ...COMPONENT_LIMITS.motherboard.pcieGeneration },
    { key: "pcieLanes", kind: "integer", ...COMPONENT_LIMITS.motherboard.pcieLanes },
    { key: "m2Slots", kind: "integer", ...COMPONENT_LIMITS.motherboard.m2Slots },
    { key: "sataPorts", kind: "integer", ...COMPONENT_LIMITS.motherboard.sataPorts },
    { key: "networkGbps", kind: "integer", ...COMPONENT_LIMITS.motherboard.networkGbps },
    { key: "tdpW", kind: "integer", ...COMPONENT_LIMITS.motherboard.tdpW },
  ],
  "ai-accelerator": [
    { key: "interconnect", kind: "select", options: AI_INTERCONNECT_OPTIONS },
    { key: "computeUnits", kind: "integer", ...COMPONENT_LIMITS["ai-accelerator"].computeUnits },
    { key: "clockMHz", kind: "integer", ...COMPONENT_LIMITS["ai-accelerator"].clockMHz },
    {
      key: "operationsPerCyclePerUnit",
      kind: "decimal",
      ...COMPONENT_LIMITS["ai-accelerator"].operationsPerCyclePerUnit,
    },
    { key: "memoryCapacityGb", kind: "integer", ...COMPONENT_LIMITS["ai-accelerator"].memoryCapacityGb },
    {
      key: "memoryBandwidthGbPerSecond",
      kind: "decimal",
      ...COMPONENT_LIMITS["ai-accelerator"].memoryBandwidthGbPerSecond,
    },
    { key: "precisions", kind: "multi-select", options: AI_PRECISION_OPTIONS },
    { key: "processNodeNm", kind: "integer", ...COMPONENT_LIMITS["ai-accelerator"].processNodeNm },
    { key: "dieAreaMm2", kind: "decimal", ...COMPONENT_LIMITS["ai-accelerator"].dieAreaMm2 },
    { key: "tdpW", kind: "integer", ...COMPONENT_LIMITS["ai-accelerator"].tdpW },
  ],
  networking: [
    { key: "bus", kind: "select", options: COMPONENT_BUS_OPTIONS },
    { key: "ports", kind: "integer", ...COMPONENT_LIMITS.networking.ports },
    { key: "speedGbps", kind: "integer", ...COMPONENT_LIMITS.networking.speedGbps },
    { key: "medium", kind: "select", options: NETWORK_MEDIUM_OPTIONS },
    { key: "standard", kind: "select", options: NETWORK_STANDARD_OPTIONS },
    { key: "tdpW", kind: "integer", ...COMPONENT_LIMITS.networking.tdpW },
  ],
};

export interface ComponentDesignVersion {
  version: number;
  savedOn: string;
  configuration: ComponentConfiguration;
}

export interface ComponentProject {
  id: string;
  name: string;
  type: ComponentType;
  configuration: ComponentConfiguration;
  versions: ComponentDesignVersion[];
}

export type ComponentValidationIssue =
  | { code: "invalid-option" }
  | { code: "integer"; min: number; max: number }
  | { code: "range"; min: number; max: number }
  | { code: "precision"; step: number }
  | { code: "empty-selection" }
  | { code: "duplicate-option" };

export interface ComponentConfigurationValidationResult {
  valid: boolean;
  errors: Partial<Record<ComponentConfigurationField, ComponentValidationIssue>>;
}

export type ComponentNameIssue =
  | { code: "required" }
  | { code: "length"; min: number; max: number };

export class InvalidComponentDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidComponentDataError";
  }
}

export function createDefaultComponentConfiguration(type: ComponentType): ComponentConfiguration {
  switch (type) {
    case "gpu":
      return {
        type,
        bus: "pci",
        computeUnits: 8,
        clockMHz: 100,
        operationsPerCyclePerUnit: 2,
        memoryCapacityGb: 8,
        memoryBandwidthGbPerSecond: 1.6,
        processNodeNm: 350,
        dieAreaMm2: 80,
        tdpW: 25,
        rayTracing: false,
      };
    case "ram":
      return {
        type,
        memoryStandard: "ddr",
        capacityGb: 8,
        speedMTs: 400,
        channels: 1,
        latencyCl: 3,
        tdpW: 5,
      };
    case "ssd":
      return {
        type,
        interface: "sata",
        formFactor: "2.5-inch",
        capacityGb: 64,
        sequentialReadMbps: 500,
        sequentialWriteMbps: 450,
        randomReadIops: 50_000,
        enduranceTbw: 50,
        tdpW: 3,
      };
    case "motherboard":
      return {
        type,
        supportedIsa: "x86",
        memoryStandard: "ddr",
        formFactor: "atx",
        memorySlots: 4,
        maxMemoryGb: 16,
        pcieGeneration: 1,
        pcieLanes: 20,
        m2Slots: 0,
        sataPorts: 4,
        networkGbps: 1,
        tdpW: 20,
      };
    case "ai-accelerator":
      return {
        type,
        interconnect: "pcie",
        computeUnits: 16,
        clockMHz: 200,
        operationsPerCyclePerUnit: 4,
        memoryCapacityGb: 16,
        memoryBandwidthGbPerSecond: 256,
        precisions: ["fp16", "int8"],
        processNodeNm: 350,
        dieAreaMm2: 180,
        tdpW: 120,
      };
    case "networking":
      return {
        type,
        bus: "pcie-3",
        ports: 2,
        speedGbps: 1,
        medium: "copper",
        standard: "ethernet",
        tdpW: 10,
      };
  }
}

export function validateComponentName(name: string): ComponentNameIssue | null {
  const normalized = name.trim();
  if (normalized.length === 0) {
    return { code: "required" };
  }
  if (
    normalized.length < COMPONENT_LIMITS.projectName.min
    || normalized.length > COMPONENT_LIMITS.projectName.max
  ) {
    return {
      code: "length",
      min: COMPONENT_LIMITS.projectName.min,
      max: COMPONENT_LIMITS.projectName.max,
    };
  }
  return null;
}

export function validateComponentConfiguration(
  configuration: ComponentConfiguration,
): ComponentConfigurationValidationResult {
  const errors: ComponentConfigurationValidationResult["errors"] = {};
  if (!isComponentType(configuration.type)) {
    return { valid: false, errors: {} };
  }

  for (const field of COMPONENT_FIELD_SCHEMAS[configuration.type]) {
    const value = getFieldValue(configuration, field.key);
    if (field.kind === "boolean") {
      if (typeof value !== "boolean") {
        errors[field.key] = { code: "invalid-option" };
      }
      continue;
    }
    if (field.kind === "select") {
      if (typeof value !== "string" || !field.options?.includes(value)) {
        errors[field.key] = { code: "invalid-option" };
      }
      continue;
    }
    if (field.kind === "multi-select") {
      if (
        !Array.isArray(value)
        || value.length === 0
        || !value.every((entry) => typeof entry === "string" && field.options?.includes(entry))
      ) {
        errors[field.key] = { code: "empty-selection" };
        continue;
      }
      if (new Set(value).size !== value.length) {
        errors[field.key] = { code: "duplicate-option" };
      }
      continue;
    }

    if (typeof value !== "number" || !Number.isFinite(value)) {
      errors[field.key] = field.kind === "integer"
        ? { code: "integer", min: field.min ?? 0, max: field.max ?? 0 }
        : { code: "range", min: field.min ?? 0, max: field.max ?? 0 };
      continue;
    }
    if (field.kind === "integer" && !Number.isInteger(value)) {
      errors[field.key] = { code: "integer", min: field.min ?? 0, max: field.max ?? 0 };
      continue;
    }
    if ((field.min !== undefined && value < field.min) || (field.max !== undefined && value > field.max)) {
      errors[field.key] = field.kind === "integer"
        ? { code: "integer", min: field.min ?? 0, max: field.max ?? 0 }
        : { code: "range", min: field.min ?? 0, max: field.max ?? 0 };
      continue;
    }
    if (field.step !== undefined && !isOnStep(value, field.step)) {
      errors[field.key] = { code: "precision", step: field.step };
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function createComponentProject(
  id: string,
  name: string,
  type: ComponentType,
  configuration: ComponentConfiguration,
  savedOn: string,
): ComponentProject {
  const normalizedId = id.trim();
  if (normalizedId.length === 0) {
    throw new InvalidComponentDataError("Component project ID is required.");
  }
  assertName(name);
  if (!isComponentType(type)) {
    throw new InvalidComponentDataError("Component type is invalid.");
  }
  if (configuration.type !== type) {
    throw new InvalidComponentDataError("Component configuration does not match the project type.");
  }
  assertConfiguration(configuration);
  if (!isValidDate(savedOn)) {
    throw new InvalidComponentDataError("Component project save date is invalid.");
  }

  return {
    id: normalizedId,
    name: name.trim(),
    type,
    configuration: cloneComponentConfiguration(configuration),
    versions: [{
      version: 1,
      savedOn,
      configuration: cloneComponentConfiguration(configuration),
    }],
  };
}

export function saveComponentVersion(
  project: ComponentProject,
  name: string,
  configuration: ComponentConfiguration,
  savedOn: string,
): ComponentProject {
  assertName(name);
  if (configuration.type !== project.type) {
    throw new InvalidComponentDataError("Component configuration does not match the project type.");
  }
  assertConfiguration(configuration);
  if (!isValidDate(savedOn)) {
    throw new InvalidComponentDataError("Component project save date is invalid.");
  }
  if (isProjectVersionLimitReached(project.versions)) {
    throw new InvalidComponentDataError("Component project version limit reached.");
  }
  const nextVersion = Math.max(0, ...project.versions.map((version) => version.version)) + 1;

  return {
    ...project,
    name: name.trim(),
    configuration: cloneComponentConfiguration(configuration),
    versions: [
      ...project.versions,
      {
        version: nextVersion,
        savedOn,
        configuration: cloneComponentConfiguration(configuration),
      },
    ],
  };
}

export function cloneComponentConfiguration<T extends ComponentConfiguration>(configuration: T): T {
  return {
    ...configuration,
    ...(configuration.type === "ai-accelerator" ? { precisions: [...configuration.precisions] } : {}),
  } as T;
}

export function componentConfigurationsEqual(
  left: ComponentConfiguration,
  right: ComponentConfiguration,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function parseComponentConfiguration(value: unknown): ComponentConfiguration {
  if (!isRecord(value) || !isComponentType(value.type)) {
    throw new InvalidComponentDataError("Component configuration is invalid.");
  }

  const configuration = createDefaultComponentConfiguration(value.type);
  for (const field of COMPONENT_FIELD_SCHEMAS[value.type]) {
    if (!(field.key in value)) {
      throw new InvalidComponentDataError(`Component field "${field.key}" is missing.`);
    }
    setFieldValue(configuration, field.key, value[field.key]);
  }

  const validation = validateComponentConfiguration(configuration);
  if (!validation.valid) {
    throw new InvalidComponentDataError("Component configuration contains invalid values.");
  }
  return cloneComponentConfiguration(configuration);
}

export function parseComponentProject(value: unknown): ComponentProject {
  if (!isRecord(value)) {
    throw new InvalidComponentDataError("Component project data is invalid.");
  }
  if (
    typeof value.id !== "string"
    || value.id.trim().length === 0
    || typeof value.name !== "string"
    || !isComponentType(value.type)
    || !Array.isArray(value.versions)
  ) {
    throw new InvalidComponentDataError("Component project is incomplete.");
  }
  assertName(value.name);
  const configuration = parseComponentConfiguration(value.configuration);
  if (configuration.type !== value.type) {
    throw new InvalidComponentDataError("Component configuration does not match the project type.");
  }
  if (value.versions.length === 0) {
    throw new InvalidComponentDataError("Component project has no versions.");
  }

  const versions = value.versions.map((entry): ComponentDesignVersion => {
    if (
      !isRecord(entry)
      || typeof entry.version !== "number"
      || !Number.isInteger(entry.version)
      || entry.version < 1
      || typeof entry.savedOn !== "string"
      || !isValidDate(entry.savedOn)
    ) {
      throw new InvalidComponentDataError("Component project version is invalid.");
    }
    const versionConfiguration = parseComponentConfiguration(entry.configuration);
    if (versionConfiguration.type !== value.type) {
      throw new InvalidComponentDataError("Component version type does not match the project type.");
    }
    return {
      version: entry.version,
      savedOn: entry.savedOn,
      configuration: versionConfiguration,
    };
  });

  if (new Set(versions.map((version) => version.version)).size !== versions.length) {
    throw new InvalidComponentDataError("Component project versions are duplicated.");
  }
  if (!versions.some((version) => version.version === 1)) {
    throw new InvalidComponentDataError("Component project is missing its first version.");
  }

  return {
    id: value.id,
    name: value.name.trim(),
    type: value.type,
    configuration,
    versions: versions.sort((left, right) => left.version - right.version),
  };
}

export type CompatibilityComponentId = ComponentType | "cpu";

export type CompatibilityIssueCode =
  | "missing-motherboard"
  | "missing-memory"
  | "cpu-isa-mismatch"
  | "cpu-memory-mismatch"
  | "memory-standard-mismatch"
  | "memory-capacity-exceeded"
  | "memory-slots-exceeded"
  | "gpu-bus-incompatible"
  | "ai-bus-incompatible"
  | "storage-interface-unavailable"
  | "storage-form-factor-incompatible"
  | "networking-bus-incompatible";

export interface CompatibilityIssue {
  code: CompatibilityIssueCode;
  severity: "error" | "warning";
  components: CompatibilityComponentId[];
  details?: Record<string, string | number>;
}

export interface BuildConfiguration {
  cpu?: CpuConfiguration;
  components?: Partial<Record<ComponentType, ComponentConfiguration>>;
}

export interface CompatibilityResult {
  compatible: boolean;
  issues: CompatibilityIssue[];
}

export function checkBuildCompatibility(build: BuildConfiguration): CompatibilityResult {
  const issues: CompatibilityIssue[] = [];
  const components = build.components ?? {};
  const motherboard = getTypedComponent(components, "motherboard");
  const ram = getTypedComponent(components, "ram");
  const gpu = getTypedComponent(components, "gpu");
  const ssd = getTypedComponent(components, "ssd");
  const ai = getTypedComponent(components, "ai-accelerator");
  const networking = getTypedComponent(components, "networking");
  const hasOtherComponents = Boolean(ram || gpu || ssd || ai || networking || build.cpu);

  if (!motherboard && hasOtherComponents) {
    issues.push({ code: "missing-motherboard", severity: "error", components: ["motherboard"] });
  }

  if (motherboard) {
    if (build.cpu && build.cpu.isa !== motherboard.supportedIsa) {
      issues.push({
        code: "cpu-isa-mismatch",
        severity: "error",
        components: ["cpu", "motherboard"],
        details: { cpuIsa: build.cpu.isa, motherboardIsa: motherboard.supportedIsa },
      });
    }
    if (build.cpu && build.cpu.memoryStandard !== motherboard.memoryStandard) {
      issues.push({
        code: "cpu-memory-mismatch",
        severity: "error",
        components: ["cpu", "motherboard"],
        details: { cpuMemory: build.cpu.memoryStandard, motherboardMemory: motherboard.memoryStandard },
      });
    }
    if (ram) {
      if (ram.memoryStandard !== motherboard.memoryStandard) {
        issues.push({
          code: "memory-standard-mismatch",
          severity: "error",
          components: ["ram", "motherboard"],
          details: { ramMemory: ram.memoryStandard, motherboardMemory: motherboard.memoryStandard },
        });
      }
      if (ram.capacityGb > motherboard.maxMemoryGb) {
        issues.push({
          code: "memory-capacity-exceeded",
          severity: "error",
          components: ["ram", "motherboard"],
          details: { capacityGb: ram.capacityGb, maxMemoryGb: motherboard.maxMemoryGb },
        });
      }
      if (ram.channels > motherboard.memorySlots) {
        issues.push({
          code: "memory-slots-exceeded",
          severity: "error",
          components: ["ram", "motherboard"],
          details: { channels: ram.channels, slots: motherboard.memorySlots },
        });
      }
    } else if (build.cpu) {
      issues.push({ code: "missing-memory", severity: "warning", components: ["ram"] });
    }

    if (gpu) {
      assertBusCompatibility(gpu.bus, motherboard, "gpu", "gpu-bus-incompatible", issues);
    }
    if (ai) {
      const aiBus = ai.interconnect === "pcie" ? "pcie-3" : "pci";
      assertBusCompatibility(aiBus, motherboard, "ai-accelerator", "ai-bus-incompatible", issues);
    }
    if (ssd) {
      if (ssd.interface === "sata" && motherboard.sataPorts < 1) {
        issues.push({
          code: "storage-interface-unavailable",
          severity: "error",
          components: ["ssd", "motherboard"],
          details: { required: ssd.interface },
        });
      }
      if (ssd.interface === "nvme" && motherboard.m2Slots < 1) {
        issues.push({
          code: "storage-interface-unavailable",
          severity: "error",
          components: ["ssd", "motherboard"],
          details: { required: ssd.interface },
        });
      }
      if (ssd.interface === "nvme" && ssd.formFactor !== "m2") {
        issues.push({
          code: "storage-form-factor-incompatible",
          severity: "error",
          components: ["ssd"],
          details: { required: ssd.formFactor },
        });
      }
    }
    if (networking) {
      assertBusCompatibility(networking.bus, motherboard, "networking", "networking-bus-incompatible", issues);
    }
  }

  return {
    compatible: issues.every((issue) => issue.severity !== "error"),
    issues,
  };
}

function assertBusCompatibility(
  bus: ComponentBus,
  motherboard: MotherboardConfiguration,
  component: ComponentType,
  code: CompatibilityIssueCode,
  issues: CompatibilityIssue[],
): void {
  const requiredGeneration = bus === "pci" ? 0 : Number(bus.slice("pcie-".length));
  if (bus !== "pci" && requiredGeneration > motherboard.pcieGeneration) {
    issues.push({
      code,
      severity: "error",
      components: [component, "motherboard"],
      details: {
        required: bus,
        available: motherboard.pcieGeneration > 0 ? `pcie-${motherboard.pcieGeneration}` : "pci",
      },
    });
  }
}

function getTypedComponent<T extends ComponentType>(
  components: Partial<Record<ComponentType, ComponentConfiguration>>,
  type: T,
): Extract<ComponentConfiguration, { type: T }> | undefined {
  const component = components[type];
  return component?.type === type ? component as Extract<ComponentConfiguration, { type: T }> : undefined;
}

function assertName(name: string): void {
  if (validateComponentName(name)) {
    throw new InvalidComponentDataError("Component project name is invalid.");
  }
}

function assertConfiguration(configuration: ComponentConfiguration): void {
  if (!validateComponentConfiguration(configuration).valid) {
    throw new InvalidComponentDataError("Component configuration contains invalid values.");
  }
}

export function isComponentType(value: unknown): value is ComponentType {
  return typeof value === "string" && (COMPONENT_TYPES as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isOnStep(value: number, step: number): boolean {
  return Math.abs(Math.round(value / step) * step - value) < 1e-6;
}

function getFieldValue(
  configuration: ComponentConfiguration,
  key: ComponentConfigurationField,
): unknown {
  return (configuration as unknown as Record<string, unknown>)[key];
}

function setFieldValue(
  configuration: ComponentConfiguration,
  key: ComponentConfigurationField,
  value: unknown,
): void {
  (configuration as unknown as Record<string, unknown>)[key] = Array.isArray(value) ? [...value] : value;
}
