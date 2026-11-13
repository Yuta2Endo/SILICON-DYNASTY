export const CPU_ISA_OPTIONS = ["x86", "arm", "risc-v"] as const;
export const CPU_ARCHITECTURE_OPTIONS = ["monolithic", "chiplet"] as const;
export const CPU_MICROARCHITECTURE_OPTIONS = ["in-order", "out-of-order", "hybrid"] as const;
export const CPU_MEMORY_OPTIONS = ["sdr", "ddr", "ddr2", "ddr3", "ddr4", "ddr5", "lpddr"] as const;
export const CPU_SIMD_OPTIONS = ["mmx", "sse", "avx2", "avx512", "neon", "rvv"] as const;

export type CpuIsa = (typeof CPU_ISA_OPTIONS)[number];
export type CpuArchitecture = (typeof CPU_ARCHITECTURE_OPTIONS)[number];
export type CpuMicroarchitecture = (typeof CPU_MICROARCHITECTURE_OPTIONS)[number];
export type CpuMemoryStandard = (typeof CPU_MEMORY_OPTIONS)[number];
export type CpuSimdExtension = (typeof CPU_SIMD_OPTIONS)[number];

export interface CpuConfiguration {
  isa: CpuIsa;
  architecture: CpuArchitecture;
  microarchitecture: CpuMicroarchitecture;
  coreCount: number;
  threadCount: number;
  clockMHz: number;
  ipc: number;
  l1CacheKbPerCore: number;
  l2CacheMbPerCore: number;
  l3CacheMb: number;
  memoryStandard: CpuMemoryStandard;
  memoryChannels: number;
  maxMemoryGb: number;
  simdExtensions: CpuSimdExtension[];
  processNodeNm: number;
  voltageMv: number;
  tdpW: number;
  dieAreaMm2: number;
  unitCostUsd: number;
}

export interface CpuDesignVersion {
  version: number;
  savedOn: string;
  configuration: CpuConfiguration;
}

export interface CpuProject {
  id: string;
  name: string;
  configuration: CpuConfiguration;
  versions: CpuDesignVersion[];
}

export type CpuConfigurationField = keyof CpuConfiguration;

export type CpuValidationIssue =
  | { code: "invalid-option" }
  | { code: "integer"; min: number; max: number }
  | { code: "range"; min: number; max: number }
  | { code: "precision"; step: number }
  | { code: "threads-per-core"; min: number; max: number }
  | { code: "unsupported-simd"; isa: CpuIsa }
  | { code: "duplicate-simd" };

export interface CpuConfigurationValidationResult {
  valid: boolean;
  errors: Partial<Record<CpuConfigurationField, CpuValidationIssue>>;
}

export type CpuProjectNameIssue =
  | { code: "required" }
  | { code: "length"; min: number; max: number };

export const CPU_LIMITS = {
  projectName: { min: 2, max: 40 },
  coreCount: { min: 1, max: 128 },
  threadCount: { min: 1, max: 512 },
  clockMHz: { min: 25, max: 10_000 },
  ipc: { min: 0.1, max: 8, step: 0.1 },
  l1CacheKbPerCore: { min: 4, max: 2_048 },
  l2CacheMbPerCore: { min: 0.125, max: 64, step: 0.125 },
  l3CacheMb: { min: 0, max: 1_024 },
  memoryChannels: { min: 1, max: 16 },
  maxMemoryGb: { min: 1, max: 4_096 },
  processNodeNm: { min: 2, max: 1_000 },
  voltageMv: { min: 250, max: 5_000 },
  tdpW: { min: 1, max: 1_500 },
  dieAreaMm2: { min: 1, max: 2_000 },
  unitCostUsd: { min: 1, max: 100_000 },
  maxThreadsPerCore: 4,
} as const;

export const SIMD_BY_ISA: Record<CpuIsa, readonly CpuSimdExtension[]> = {
  x86: ["mmx", "sse", "avx2", "avx512"],
  arm: ["neon"],
  "risc-v": ["rvv"],
};

export class InvalidCpuDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCpuDataError";
  }
}

export function createDefaultCpuConfiguration(): CpuConfiguration {
  return {
    isa: "x86",
    architecture: "monolithic",
    microarchitecture: "in-order",
    coreCount: 1,
    threadCount: 1,
    clockMHz: 100,
    ipc: 1,
    l1CacheKbPerCore: 16,
    l2CacheMbPerCore: 0.25,
    l3CacheMb: 0,
    memoryStandard: "sdr",
    memoryChannels: 1,
    maxMemoryGb: 1,
    simdExtensions: [],
    processNodeNm: 350,
    voltageMv: 3_300,
    tdpW: 10,
    dieAreaMm2: 50,
    unitCostUsd: 80,
  };
}

export function validateCpuProjectName(name: string): CpuProjectNameIssue | null {
  const normalizedName = name.trim();
  if (normalizedName.length === 0) {
    return { code: "required" };
  }

  if (normalizedName.length < CPU_LIMITS.projectName.min || normalizedName.length > CPU_LIMITS.projectName.max) {
    return {
      code: "length",
      min: CPU_LIMITS.projectName.min,
      max: CPU_LIMITS.projectName.max,
    };
  }

  return null;
}

export function validateCpuConfiguration(configuration: CpuConfiguration): CpuConfigurationValidationResult {
  const errors: CpuConfigurationValidationResult["errors"] = {};

  if (!isCpuIsa(configuration.isa)) {
    errors.isa = { code: "invalid-option" };
  }
  if (!isCpuArchitecture(configuration.architecture)) {
    errors.architecture = { code: "invalid-option" };
  }
  if (!isCpuMicroarchitecture(configuration.microarchitecture)) {
    errors.microarchitecture = { code: "invalid-option" };
  }
  if (!isCpuMemoryStandard(configuration.memoryStandard)) {
    errors.memoryStandard = { code: "invalid-option" };
  }

  validateInteger("coreCount", configuration.coreCount, CPU_LIMITS.coreCount.min, CPU_LIMITS.coreCount.max, errors);
  validateInteger("threadCount", configuration.threadCount, CPU_LIMITS.threadCount.min, CPU_LIMITS.threadCount.max, errors);
  validateInteger("clockMHz", configuration.clockMHz, CPU_LIMITS.clockMHz.min, CPU_LIMITS.clockMHz.max, errors);
  validateRange("ipc", configuration.ipc, CPU_LIMITS.ipc.min, CPU_LIMITS.ipc.max, errors);
  if (
    Number.isFinite(configuration.ipc) &&
    configuration.ipc >= CPU_LIMITS.ipc.min &&
    configuration.ipc <= CPU_LIMITS.ipc.max &&
    !isOnStep(configuration.ipc, CPU_LIMITS.ipc.step)
  ) {
    errors.ipc = { code: "precision", step: CPU_LIMITS.ipc.step };
  }
  validateInteger(
    "l1CacheKbPerCore",
    configuration.l1CacheKbPerCore,
    CPU_LIMITS.l1CacheKbPerCore.min,
    CPU_LIMITS.l1CacheKbPerCore.max,
    errors,
  );
  validateRange(
    "l2CacheMbPerCore",
    configuration.l2CacheMbPerCore,
    CPU_LIMITS.l2CacheMbPerCore.min,
    CPU_LIMITS.l2CacheMbPerCore.max,
    errors,
  );
  if (
    Number.isFinite(configuration.l2CacheMbPerCore) &&
    configuration.l2CacheMbPerCore >= CPU_LIMITS.l2CacheMbPerCore.min &&
    configuration.l2CacheMbPerCore <= CPU_LIMITS.l2CacheMbPerCore.max &&
    !isOnStep(configuration.l2CacheMbPerCore, CPU_LIMITS.l2CacheMbPerCore.step)
  ) {
    errors.l2CacheMbPerCore = { code: "precision", step: CPU_LIMITS.l2CacheMbPerCore.step };
  }
  validateRange("l3CacheMb", configuration.l3CacheMb, CPU_LIMITS.l3CacheMb.min, CPU_LIMITS.l3CacheMb.max, errors);
  validateInteger(
    "memoryChannels",
    configuration.memoryChannels,
    CPU_LIMITS.memoryChannels.min,
    CPU_LIMITS.memoryChannels.max,
    errors,
  );
  validateInteger("maxMemoryGb", configuration.maxMemoryGb, CPU_LIMITS.maxMemoryGb.min, CPU_LIMITS.maxMemoryGb.max, errors);
  validateInteger("processNodeNm", configuration.processNodeNm, CPU_LIMITS.processNodeNm.min, CPU_LIMITS.processNodeNm.max, errors);
  validateInteger("voltageMv", configuration.voltageMv, CPU_LIMITS.voltageMv.min, CPU_LIMITS.voltageMv.max, errors);
  validateInteger("tdpW", configuration.tdpW, CPU_LIMITS.tdpW.min, CPU_LIMITS.tdpW.max, errors);
  validateRange("dieAreaMm2", configuration.dieAreaMm2, CPU_LIMITS.dieAreaMm2.min, CPU_LIMITS.dieAreaMm2.max, errors);
  validateRange("unitCostUsd", configuration.unitCostUsd, CPU_LIMITS.unitCostUsd.min, CPU_LIMITS.unitCostUsd.max, errors);

  if (
    Number.isInteger(configuration.coreCount) &&
    configuration.coreCount >= CPU_LIMITS.coreCount.min &&
    configuration.coreCount <= CPU_LIMITS.coreCount.max &&
    Number.isInteger(configuration.threadCount) &&
    configuration.threadCount >= CPU_LIMITS.threadCount.min &&
    configuration.threadCount <= CPU_LIMITS.threadCount.max &&
    (configuration.threadCount < configuration.coreCount ||
      configuration.threadCount > configuration.coreCount * CPU_LIMITS.maxThreadsPerCore)
  ) {
    errors.threadCount = {
      code: "threads-per-core",
      min: configuration.coreCount,
      max: Math.min(configuration.coreCount * CPU_LIMITS.maxThreadsPerCore, CPU_LIMITS.threadCount.max),
    };
  }

  if (!Array.isArray(configuration.simdExtensions) || !configuration.simdExtensions.every(isCpuSimdExtension)) {
    errors.simdExtensions = { code: "invalid-option" };
  } else {
    const uniqueExtensions = new Set(configuration.simdExtensions);
    if (uniqueExtensions.size !== configuration.simdExtensions.length) {
      errors.simdExtensions = { code: "duplicate-simd" };
    } else if (
      isCpuIsa(configuration.isa) &&
      configuration.simdExtensions.some((extension) => !SIMD_BY_ISA[configuration.isa].includes(extension))
    ) {
      errors.simdExtensions = { code: "unsupported-simd", isa: configuration.isa };
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function createCpuProject(
  id: string,
  name: string,
  configuration: CpuConfiguration,
  savedOn: string,
): CpuProject {
  const normalizedId = id.trim();
  if (normalizedId.length === 0) {
    throw new InvalidCpuDataError("CPU project ID is required.");
  }

  const nameIssue = validateCpuProjectName(name);
  if (nameIssue) {
    throw new InvalidCpuDataError("CPU project name is invalid.");
  }

  assertValidConfiguration(configuration);
  if (!isDateOnly(savedOn)) {
    throw new InvalidCpuDataError("CPU project save date is invalid.");
  }

  const snapshot = cloneCpuConfiguration(configuration);
  return {
    id: normalizedId,
    name: name.trim(),
    configuration: cloneCpuConfiguration(snapshot),
    versions: [{ version: 1, savedOn, configuration: snapshot }],
  };
}

export function saveCpuProjectVersion(
  project: CpuProject,
  name: string,
  configuration: CpuConfiguration,
  savedOn: string,
): CpuProject {
  const nameIssue = validateCpuProjectName(name);
  if (nameIssue) {
    throw new InvalidCpuDataError("CPU project name is invalid.");
  }

  assertValidConfiguration(configuration);
  if (!isDateOnly(savedOn)) {
    throw new InvalidCpuDataError("CPU project save date is invalid.");
  }

  const snapshot = cloneCpuConfiguration(configuration);
  const latestVersion = project.versions.at(-1)?.version ?? 0;

  return {
    ...project,
    name: name.trim(),
    configuration: cloneCpuConfiguration(snapshot),
    versions: [...project.versions, { version: latestVersion + 1, savedOn, configuration: snapshot }],
  };
}

export function parseCpuConfiguration(value: unknown): CpuConfiguration {
  if (!isRecord(value)) {
    throw new InvalidCpuDataError("CPU configuration must be an object.");
  }

  const numericFields: Array<keyof Omit<CpuConfiguration, "isa" | "architecture" | "microarchitecture" | "memoryStandard" | "simdExtensions">> = [
    "coreCount",
    "threadCount",
    "clockMHz",
    "ipc",
    "l1CacheKbPerCore",
    "l2CacheMbPerCore",
    "l3CacheMb",
    "memoryChannels",
    "maxMemoryGb",
    "processNodeNm",
    "voltageMv",
    "tdpW",
    "dieAreaMm2",
    "unitCostUsd",
  ];

  if (
    numericFields.some((field) => typeof value[field] !== "number") ||
    typeof value.isa !== "string" ||
    typeof value.architecture !== "string" ||
    typeof value.microarchitecture !== "string" ||
    typeof value.memoryStandard !== "string" ||
    !Array.isArray(value.simdExtensions) ||
    !value.simdExtensions.every((extension) => typeof extension === "string")
  ) {
    throw new InvalidCpuDataError("CPU configuration is missing required fields.");
  }

  const configuration: CpuConfiguration = {
    isa: value.isa as CpuIsa,
    architecture: value.architecture as CpuArchitecture,
    microarchitecture: value.microarchitecture as CpuMicroarchitecture,
    coreCount: value.coreCount as number,
    threadCount: value.threadCount as number,
    clockMHz: value.clockMHz as number,
    ipc: value.ipc as number,
    l1CacheKbPerCore: value.l1CacheKbPerCore as number,
    l2CacheMbPerCore: value.l2CacheMbPerCore as number,
    l3CacheMb: value.l3CacheMb as number,
    memoryStandard: value.memoryStandard as CpuMemoryStandard,
    memoryChannels: value.memoryChannels as number,
    maxMemoryGb: value.maxMemoryGb as number,
    simdExtensions: value.simdExtensions as CpuSimdExtension[],
    processNodeNm: value.processNodeNm as number,
    voltageMv: value.voltageMv as number,
    tdpW: value.tdpW as number,
    dieAreaMm2: value.dieAreaMm2 as number,
    unitCostUsd: value.unitCostUsd as number,
  };

  assertValidConfiguration(configuration);
  return cloneCpuConfiguration(configuration);
}

export function parseCpuProject(value: unknown): CpuProject {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string" || !Array.isArray(value.versions)) {
    throw new InvalidCpuDataError("CPU project data is incomplete.");
  }

  if (value.id.trim().length === 0 || validateCpuProjectName(value.name)) {
    throw new InvalidCpuDataError("CPU project identity is invalid.");
  }

  const configuration = parseCpuConfiguration(value.configuration);
  const versions = value.versions.map(parseCpuDesignVersion);
  if (versions.length === 0 || versions.some((entry, index) => entry.version !== index + 1)) {
    throw new InvalidCpuDataError("CPU project version history is invalid.");
  }

  const latestVersion = versions.at(-1);
  if (!latestVersion || !cpuConfigurationsEqual(configuration, latestVersion.configuration)) {
    throw new InvalidCpuDataError("CPU project does not match its latest saved version.");
  }

  return {
    id: value.id,
    name: value.name.trim(),
    configuration,
    versions,
  };
}

export function cpuConfigurationsEqual(left: CpuConfiguration, right: CpuConfiguration): boolean {
  return (
    left.isa === right.isa &&
    left.architecture === right.architecture &&
    left.microarchitecture === right.microarchitecture &&
    left.coreCount === right.coreCount &&
    left.threadCount === right.threadCount &&
    left.clockMHz === right.clockMHz &&
    left.ipc === right.ipc &&
    left.l1CacheKbPerCore === right.l1CacheKbPerCore &&
    left.l2CacheMbPerCore === right.l2CacheMbPerCore &&
    left.l3CacheMb === right.l3CacheMb &&
    left.memoryStandard === right.memoryStandard &&
    left.memoryChannels === right.memoryChannels &&
    left.maxMemoryGb === right.maxMemoryGb &&
    left.processNodeNm === right.processNodeNm &&
    left.voltageMv === right.voltageMv &&
    left.tdpW === right.tdpW &&
    left.dieAreaMm2 === right.dieAreaMm2 &&
    left.unitCostUsd === right.unitCostUsd &&
    left.simdExtensions.length === right.simdExtensions.length &&
    left.simdExtensions.every((extension, index) => extension === right.simdExtensions[index])
  );
}

export function cloneCpuConfiguration(configuration: CpuConfiguration): CpuConfiguration {
  return { ...configuration, simdExtensions: [...configuration.simdExtensions] };
}

function parseCpuDesignVersion(value: unknown): CpuDesignVersion {
  if (!isRecord(value) || typeof value.version !== "number" || typeof value.savedOn !== "string") {
    throw new InvalidCpuDataError("CPU design version is incomplete.");
  }
  if (!Number.isInteger(value.version) || value.version < 1 || !isDateOnly(value.savedOn)) {
    throw new InvalidCpuDataError("CPU design version metadata is invalid.");
  }

  return {
    version: value.version,
    savedOn: value.savedOn,
    configuration: parseCpuConfiguration(value.configuration),
  };
}

function assertValidConfiguration(configuration: CpuConfiguration): void {
  if (!validateCpuConfiguration(configuration).valid) {
    throw new InvalidCpuDataError("CPU configuration is invalid.");
  }
}

function validateInteger<K extends CpuConfigurationField>(
  field: K,
  value: number,
  min: number,
  max: number,
  errors: CpuConfigurationValidationResult["errors"],
): void {
  if (!Number.isInteger(value)) {
    errors[field] = { code: "integer", min, max };
  } else if (value < min || value > max) {
    errors[field] = { code: "range", min, max };
  }
}

function validateRange<K extends CpuConfigurationField>(
  field: K,
  value: number,
  min: number,
  max: number,
  errors: CpuConfigurationValidationResult["errors"],
): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    errors[field] = { code: "range", min, max };
  }
}

function isOnStep(value: number, step: number): boolean {
  return Math.abs(value / step - Math.round(value / step)) < 1e-8;
}

function isCpuIsa(value: unknown): value is CpuIsa {
  return CPU_ISA_OPTIONS.includes(value as CpuIsa);
}

function isCpuArchitecture(value: unknown): value is CpuArchitecture {
  return CPU_ARCHITECTURE_OPTIONS.includes(value as CpuArchitecture);
}

function isCpuMicroarchitecture(value: unknown): value is CpuMicroarchitecture {
  return CPU_MICROARCHITECTURE_OPTIONS.includes(value as CpuMicroarchitecture);
}

function isCpuMemoryStandard(value: unknown): value is CpuMemoryStandard {
  return CPU_MEMORY_OPTIONS.includes(value as CpuMemoryStandard);
}

function isCpuSimdExtension(value: unknown): value is CpuSimdExtension {
  return CPU_SIMD_OPTIONS.includes(value as CpuSimdExtension);
}

function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
