import type { CpuIsa } from "./cpu";
import type {
  AiInterconnect,
  ComponentBus,
  ComponentType,
  NetworkMedium,
  NetworkStandard,
  SsdFormFactor,
  SsdInterface,
} from "./components";
import { isValidDateOnly } from "./date";

export const OS_PLATFORM_OPTIONS = ["desktop", "mobile", "server", "gaming", "universal"] as const;
export const OS_KERNEL_OPTIONS = ["monolithic", "microkernel", "hybrid", "modular"] as const;
export const OS_BOOTLOADER_OPTIONS = ["bios", "uefi", "coreboot"] as const;
export const OS_SCHEDULER_OPTIONS = [
  "round-robin",
  "priority",
  "multilevel-feedback",
  "real-time",
  "energy-aware",
] as const;
export const OS_MEMORY_MANAGER_OPTIONS = ["flat", "paging", "segmentation", "paged-segmentation"] as const;
export const OS_IPC_OPTIONS = ["pipes", "message-passing", "shared-memory", "hybrid"] as const;
export const OS_MODULE_SUPPORT_OPTIONS = ["none", "loadable", "user-space"] as const;
export const OS_DRIVER_MODEL_OPTIONS = ["in-kernel", "user-space", "hybrid"] as const;
export const OS_ADDRESS_BIT_OPTIONS = [16, 32, 64] as const;
export const OS_ARCHITECTURE_OPTIONS = ["x86", "arm", "risc-v"] as const satisfies readonly CpuIsa[];
export const OS_FILESYSTEM_OPTIONS = ["fat", "ext2", "ntfs", "zfs"] as const;
export const OS_DRIVER_FRAMEWORK_OPTIONS = ["legacy", "acpi", "unified", "certified"] as const;
export const OS_NETWORK_STACK_OPTIONS = ["basic", "tcp-ip", "advanced", "cloud"] as const;
export const OS_PERMISSION_MODEL_OPTIONS = ["none", "permissions", "role-based", "capability"] as const;
export const OS_ENCRYPTION_OPTIONS = ["none", "disk", "full-disk", "hardware"] as const;
export const OS_UPDATE_MODEL_OPTIONS = ["manual", "package-manager", "staged", "rolling"] as const;
export const OS_PACKAGE_MANAGER_OPTIONS = ["none", "centralized", "signed", "decentralized"] as const;
export const OS_DIAGNOSTICS_OPTIONS = ["none", "logs", "crash-dumps", "telemetry"] as const;
export const OS_GUI_OPTIONS = ["cli", "desktop-shell", "modern-desktop", "adaptive"] as const;
export const OS_SDK_OPTIONS = ["none", "basic", "full", "professional"] as const;
export const OS_API_OPTIONS = ["proprietary", "posix", "web", "hybrid"] as const;
export const OS_DEVELOPER_TOOLS_OPTIONS = ["none", "compiler", "ide", "suite"] as const;
export const OS_APP_STORE_OPTIONS = ["none", "curated", "open", "enterprise"] as const;
export const OS_RELEASE_STAGE_OPTIONS = ["alpha", "beta", "rc", "stable"] as const;
export const OS_PLATFORM_PROFILE_OPTIONS = ["desktop", "mobile", "server", "gaming"] as const;

export type OsPlatform = (typeof OS_PLATFORM_OPTIONS)[number];
export type OsKernelType = (typeof OS_KERNEL_OPTIONS)[number];
export type OsBootloader = (typeof OS_BOOTLOADER_OPTIONS)[number];
export type OsScheduler = (typeof OS_SCHEDULER_OPTIONS)[number];
export type OsMemoryManager = (typeof OS_MEMORY_MANAGER_OPTIONS)[number];
export type OsIpcModel = (typeof OS_IPC_OPTIONS)[number];
export type OsModuleSupport = (typeof OS_MODULE_SUPPORT_OPTIONS)[number];
export type OsDriverModel = (typeof OS_DRIVER_MODEL_OPTIONS)[number];
export type OsAddressBits = (typeof OS_ADDRESS_BIT_OPTIONS)[number];
export type OsFilesystem = (typeof OS_FILESYSTEM_OPTIONS)[number];
export type OsDriverFramework = (typeof OS_DRIVER_FRAMEWORK_OPTIONS)[number];
export type OsNetworkStack = (typeof OS_NETWORK_STACK_OPTIONS)[number];
export type OsPermissionModel = (typeof OS_PERMISSION_MODEL_OPTIONS)[number];
export type OsEncryption = (typeof OS_ENCRYPTION_OPTIONS)[number];
export type OsUpdateModel = (typeof OS_UPDATE_MODEL_OPTIONS)[number];
export type OsPackageManager = (typeof OS_PACKAGE_MANAGER_OPTIONS)[number];
export type OsDiagnostics = (typeof OS_DIAGNOSTICS_OPTIONS)[number];
export type OsGui = (typeof OS_GUI_OPTIONS)[number];
export type OsSdk = (typeof OS_SDK_OPTIONS)[number];
export type OsApi = (typeof OS_API_OPTIONS)[number];
export type OsDeveloperTools = (typeof OS_DEVELOPER_TOOLS_OPTIONS)[number];
export type OsAppStore = (typeof OS_APP_STORE_OPTIONS)[number];
export type OsReleaseStage = (typeof OS_RELEASE_STAGE_OPTIONS)[number];
export type OsPlatformProfile = (typeof OS_PLATFORM_PROFILE_OPTIONS)[number];

export interface OsConfiguration {
  targetPlatform: OsPlatform;
  kernelType: OsKernelType;
  bootloader: OsBootloader;
  scheduler: OsScheduler;
  memoryManager: OsMemoryManager;
  virtualMemory: boolean;
  ipcModel: OsIpcModel;
  syscallCount: number;
  moduleSupport: OsModuleSupport;
  driverModel: OsDriverModel;
  addressBits: OsAddressBits;
  maxProcesses: number;
  supportedArchitectures: CpuIsa[];
  filesystem: OsFilesystem;
  driverFramework: OsDriverFramework;
  networkStack: OsNetworkStack;
  permissions: OsPermissionModel;
  encryption: OsEncryption;
  updateModel: OsUpdateModel;
  packageManager: OsPackageManager;
  diagnostics: OsDiagnostics;
  gui: OsGui;
  sdk: OsSdk;
  api: OsApi;
  developerTools: OsDeveloperTools;
  appStore: OsAppStore;
}

export interface OsDesignVersion {
  version: number;
  savedOn: string;
  configuration: OsConfiguration;
}

export interface OsRelease {
  id: string;
  version: number;
  stage: OsReleaseStage;
  createdOn: string;
  configuration: OsConfiguration;
  qualityScore: number;
  appealScore: number;
  costUsd: number;
}

export interface OsProject {
  id: string;
  name: string;
  configuration: OsConfiguration;
  versions: OsDesignVersion[];
  releases: OsRelease[];
}

export type OsConfigurationField = keyof OsConfiguration;

export type OsValidationIssue =
  | { code: "invalid-option" }
  | { code: "integer"; min: number; max: number }
  | { code: "empty-selection" }
  | { code: "duplicate-option" }
  | { code: "future-technology"; minYear: number }
  | { code: "virtual-memory-requires-paging" }
  | { code: "microkernel-ipc" }
  | { code: "microkernel-drivers" }
  | { code: "monolithic-user-drivers" }
  | { code: "user-space-modules-require-microkernel" }
  | { code: "modular-requires-modules" }
  | { code: "process-limit"; max: number }
  | { code: "filesystem-requires-64-bit" }
  | { code: "encryption-requires-security" }
  | { code: "rolling-updates-require-package-manager" }
  | { code: "app-store-requires-sdk" }
  | { code: "developer-tools-require-sdk" }
  | { code: "suite-requires-full-sdk" }
  | { code: "web-api-requires-network" };

export interface OsConfigurationValidationResult {
  valid: boolean;
  errors: Partial<Record<OsConfigurationField, OsValidationIssue>>;
}

export type OsProjectNameIssue =
  | { code: "required" }
  | { code: "length"; min: number; max: number };

export const OS_LIMITS = {
  projectName: { min: 2, max: 40 },
  syscallCount: { min: 16, max: 1_024 },
  maxProcesses: { min: 16, max: 1_000_000 },
} as const;

export const OS_MINIMUM_YEARS = {
  coreboot: 1999,
  addressBits64: 2003,
  uefi: 2005,
  zfs: 2005,
  advancedNetwork: 2003,
  cloudNetwork: 2010,
  roleBasedPermissions: 1998,
  capabilityPermissions: 2003,
  fullDiskEncryption: 2000,
  hardwareEncryption: 2007,
  stagedUpdates: 2001,
  rollingUpdates: 2010,
  signedPackages: 2002,
  decentralizedPackages: 2012,
  telemetry: 2008,
  modernDesktop: 2000,
  adaptiveGui: 2008,
  fullSdk: 1998,
  professionalSdk: 2005,
  webApi: 1997,
  hybridApi: 2003,
  ideTools: 1997,
  suiteTools: 2004,
  curatedStore: 1999,
  openStore: 2003,
  enterpriseStore: 2007,
} as const;

export const OS_PROCESS_LIMITS_BY_ADDRESS_BITS: Record<OsAddressBits, number> = {
  16: 4_096,
  32: 100_000,
  64: 1_000_000,
};

export class InvalidOsDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidOsDataError";
  }
}

export function createDefaultOsConfiguration(): OsConfiguration {
  return {
    targetPlatform: "desktop",
    kernelType: "monolithic",
    bootloader: "bios",
    scheduler: "round-robin",
    memoryManager: "paging",
    virtualMemory: true,
    ipcModel: "pipes",
    syscallCount: 128,
    moduleSupport: "loadable",
    driverModel: "in-kernel",
    addressBits: 32,
    maxProcesses: 512,
    supportedArchitectures: ["x86"],
    filesystem: "fat",
    driverFramework: "legacy",
    networkStack: "basic",
    permissions: "permissions",
    encryption: "none",
    updateModel: "manual",
    packageManager: "none",
    diagnostics: "logs",
    gui: "cli",
    sdk: "basic",
    api: "proprietary",
    developerTools: "compiler",
    appStore: "none",
  };
}

export function createOsPlatformProfileConfiguration(profile: OsPlatformProfile): OsConfiguration {
  const defaults = createDefaultOsConfiguration();

  switch (profile) {
    case "mobile":
      return cloneOsConfiguration({
        ...defaults,
        targetPlatform: "mobile",
        kernelType: "microkernel",
        scheduler: "energy-aware",
        ipcModel: "message-passing",
        syscallCount: 96,
        moduleSupport: "user-space",
        driverModel: "user-space",
        maxProcesses: 256,
        supportedArchitectures: ["arm"],
        filesystem: "ext2",
        gui: "desktop-shell",
      });
    case "server":
      return cloneOsConfiguration({
        ...defaults,
        targetPlatform: "server",
        scheduler: "priority",
        ipcModel: "message-passing",
        syscallCount: 256,
        maxProcesses: 4_096,
        filesystem: "ext2",
        driverFramework: "acpi",
        networkStack: "tcp-ip",
        packageManager: "centralized",
        diagnostics: "crash-dumps",
        api: "posix",
      });
    case "gaming":
      return cloneOsConfiguration({
        ...defaults,
        targetPlatform: "gaming",
        kernelType: "hybrid",
        scheduler: "priority",
        ipcModel: "shared-memory",
        syscallCount: 256,
        driverModel: "hybrid",
        maxProcesses: 1_024,
        driverFramework: "acpi",
        gui: "desktop-shell",
      });
    case "desktop":
    default:
      return cloneOsConfiguration({
        ...defaults,
        gui: "desktop-shell",
      });
  }
}

export function validateOsProjectName(name: string): OsProjectNameIssue | null {
  const normalizedName = name.trim();
  if (normalizedName.length === 0) {
    return { code: "required" };
  }

  if (normalizedName.length < OS_LIMITS.projectName.min || normalizedName.length > OS_LIMITS.projectName.max) {
    return {
      code: "length",
      min: OS_LIMITS.projectName.min,
      max: OS_LIMITS.projectName.max,
    };
  }

  return null;
}

export function validateOsConfiguration(
  configuration: OsConfiguration,
  options: { currentYear?: number } = {},
): OsConfigurationValidationResult {
  const errors: OsConfigurationValidationResult["errors"] = {};

  if (!isOsPlatform(configuration.targetPlatform)) {
    errors.targetPlatform = { code: "invalid-option" };
  }
  if (!isOsKernelType(configuration.kernelType)) {
    errors.kernelType = { code: "invalid-option" };
  }
  if (!isOsBootloader(configuration.bootloader)) {
    errors.bootloader = { code: "invalid-option" };
  }
  if (!isOsScheduler(configuration.scheduler)) {
    errors.scheduler = { code: "invalid-option" };
  }
  if (!isOsMemoryManager(configuration.memoryManager)) {
    errors.memoryManager = { code: "invalid-option" };
  }
  if (!isOsIpcModel(configuration.ipcModel)) {
    errors.ipcModel = { code: "invalid-option" };
  }
  if (!isOsModuleSupport(configuration.moduleSupport)) {
    errors.moduleSupport = { code: "invalid-option" };
  }
  if (!isOsDriverModel(configuration.driverModel)) {
    errors.driverModel = { code: "invalid-option" };
  }
  if (!isOsFilesystem(configuration.filesystem)) {
    errors.filesystem = { code: "invalid-option" };
  }
  if (!isOsDriverFramework(configuration.driverFramework)) {
    errors.driverFramework = { code: "invalid-option" };
  }
  if (!isOsNetworkStack(configuration.networkStack)) {
    errors.networkStack = { code: "invalid-option" };
  }
  if (!isOsPermissionModel(configuration.permissions)) {
    errors.permissions = { code: "invalid-option" };
  }
  if (!isOsEncryption(configuration.encryption)) {
    errors.encryption = { code: "invalid-option" };
  }
  if (!isOsUpdateModel(configuration.updateModel)) {
    errors.updateModel = { code: "invalid-option" };
  }
  if (!isOsPackageManager(configuration.packageManager)) {
    errors.packageManager = { code: "invalid-option" };
  }
  if (!isOsDiagnostics(configuration.diagnostics)) {
    errors.diagnostics = { code: "invalid-option" };
  }
  if (!isOsGui(configuration.gui)) {
    errors.gui = { code: "invalid-option" };
  }
  if (!isOsSdk(configuration.sdk)) {
    errors.sdk = { code: "invalid-option" };
  }
  if (!isOsApi(configuration.api)) {
    errors.api = { code: "invalid-option" };
  }
  if (!isOsDeveloperTools(configuration.developerTools)) {
    errors.developerTools = { code: "invalid-option" };
  }
  if (!isOsAppStore(configuration.appStore)) {
    errors.appStore = { code: "invalid-option" };
  }
  if (!isOsAddressBits(configuration.addressBits)) {
    errors.addressBits = { code: "invalid-option" };
  }
  if (typeof configuration.virtualMemory !== "boolean") {
    errors.virtualMemory = { code: "invalid-option" };
  }

  if (
    !Number.isInteger(configuration.syscallCount)
    || configuration.syscallCount < OS_LIMITS.syscallCount.min
    || configuration.syscallCount > OS_LIMITS.syscallCount.max
  ) {
    errors.syscallCount = {
      code: "integer",
      min: OS_LIMITS.syscallCount.min,
      max: OS_LIMITS.syscallCount.max,
    };
  }

  if (
    !Number.isInteger(configuration.maxProcesses)
    || configuration.maxProcesses < OS_LIMITS.maxProcesses.min
    || configuration.maxProcesses > OS_LIMITS.maxProcesses.max
  ) {
    errors.maxProcesses = {
      code: "integer",
      min: OS_LIMITS.maxProcesses.min,
      max: OS_LIMITS.maxProcesses.max,
    };
  }

  if (!Array.isArray(configuration.supportedArchitectures)) {
    errors.supportedArchitectures = { code: "invalid-option" };
  } else if (configuration.supportedArchitectures.length === 0) {
    errors.supportedArchitectures = { code: "empty-selection" };
  } else if (!configuration.supportedArchitectures.every(isOsArchitecture)) {
    errors.supportedArchitectures = { code: "invalid-option" };
  } else if (new Set(configuration.supportedArchitectures).size !== configuration.supportedArchitectures.length) {
    errors.supportedArchitectures = { code: "duplicate-option" };
  }

  if (
    configuration.virtualMemory === true
    && isOsMemoryManager(configuration.memoryManager)
    && configuration.memoryManager === "flat"
  ) {
    errors.virtualMemory = { code: "virtual-memory-requires-paging" };
  }

  if (
    configuration.kernelType === "microkernel"
    && isOsIpcModel(configuration.ipcModel)
    && (configuration.ipcModel === "pipes" || configuration.ipcModel === "shared-memory")
  ) {
    errors.ipcModel = { code: "microkernel-ipc" };
  }

  if (configuration.kernelType === "microkernel" && configuration.driverModel === "in-kernel") {
    errors.driverModel = { code: "microkernel-drivers" };
  }

  if (configuration.kernelType === "monolithic" && configuration.driverModel === "user-space") {
    errors.driverModel = { code: "monolithic-user-drivers" };
  }

  if (
    configuration.moduleSupport === "user-space"
    && configuration.kernelType !== "microkernel"
    && configuration.kernelType !== "hybrid"
  ) {
    errors.moduleSupport = { code: "user-space-modules-require-microkernel" };
  }

  if (configuration.kernelType === "modular" && configuration.moduleSupport === "none") {
    errors.moduleSupport = { code: "modular-requires-modules" };
  }

  if (
    Number.isInteger(configuration.maxProcesses)
    && isOsAddressBits(configuration.addressBits)
    && configuration.maxProcesses > OS_PROCESS_LIMITS_BY_ADDRESS_BITS[configuration.addressBits]
  ) {
    errors.maxProcesses = {
      code: "process-limit",
      max: OS_PROCESS_LIMITS_BY_ADDRESS_BITS[configuration.addressBits],
    };
  }

  if (configuration.filesystem === "zfs" && configuration.addressBits !== 64) {
    errors.filesystem = { code: "filesystem-requires-64-bit" };
  }

  if (configuration.encryption !== "none" && configuration.permissions === "none") {
    errors.encryption = { code: "encryption-requires-security" };
  }

  if (configuration.updateModel === "rolling" && configuration.packageManager === "none") {
    errors.updateModel = { code: "rolling-updates-require-package-manager" };
  }

  if (configuration.appStore !== "none" && configuration.sdk === "none") {
    errors.appStore = { code: "app-store-requires-sdk" };
  }

  if (configuration.developerTools !== "none" && configuration.sdk === "none") {
    errors.developerTools = { code: "developer-tools-require-sdk" };
  }

  if (
    configuration.developerTools === "suite"
    && configuration.sdk !== "full"
    && configuration.sdk !== "professional"
  ) {
    errors.developerTools = { code: "suite-requires-full-sdk" };
  }

  if (configuration.api === "web" && configuration.networkStack === "basic") {
    errors.api = { code: "web-api-requires-network" };
  }

  if (options.currentYear !== undefined) {
    if (
      configuration.bootloader === "coreboot"
      && options.currentYear < OS_MINIMUM_YEARS.coreboot
    ) {
      errors.bootloader = { code: "future-technology", minYear: OS_MINIMUM_YEARS.coreboot };
    }
    if (
      configuration.bootloader === "uefi"
      && options.currentYear < OS_MINIMUM_YEARS.uefi
    ) {
      errors.bootloader = { code: "future-technology", minYear: OS_MINIMUM_YEARS.uefi };
    }
    if (
      configuration.addressBits === 64
      && options.currentYear < OS_MINIMUM_YEARS.addressBits64
    ) {
      errors.addressBits = { code: "future-technology", minYear: OS_MINIMUM_YEARS.addressBits64 };
    }
    if (configuration.filesystem === "zfs" && options.currentYear < OS_MINIMUM_YEARS.zfs) {
      errors.filesystem = { code: "future-technology", minYear: OS_MINIMUM_YEARS.zfs };
    }
    if (configuration.networkStack === "advanced" && options.currentYear < OS_MINIMUM_YEARS.advancedNetwork) {
      errors.networkStack = { code: "future-technology", minYear: OS_MINIMUM_YEARS.advancedNetwork };
    }
    if (configuration.networkStack === "cloud" && options.currentYear < OS_MINIMUM_YEARS.cloudNetwork) {
      errors.networkStack = { code: "future-technology", minYear: OS_MINIMUM_YEARS.cloudNetwork };
    }
    if (
      configuration.permissions === "role-based"
      && options.currentYear < OS_MINIMUM_YEARS.roleBasedPermissions
    ) {
      errors.permissions = { code: "future-technology", minYear: OS_MINIMUM_YEARS.roleBasedPermissions };
    }
    if (
      configuration.permissions === "capability"
      && options.currentYear < OS_MINIMUM_YEARS.capabilityPermissions
    ) {
      errors.permissions = { code: "future-technology", minYear: OS_MINIMUM_YEARS.capabilityPermissions };
    }
    if (
      configuration.encryption === "full-disk"
      && options.currentYear < OS_MINIMUM_YEARS.fullDiskEncryption
    ) {
      errors.encryption = { code: "future-technology", minYear: OS_MINIMUM_YEARS.fullDiskEncryption };
    }
    if (
      configuration.encryption === "hardware"
      && options.currentYear < OS_MINIMUM_YEARS.hardwareEncryption
    ) {
      errors.encryption = { code: "future-technology", minYear: OS_MINIMUM_YEARS.hardwareEncryption };
    }
    if (configuration.updateModel === "staged" && options.currentYear < OS_MINIMUM_YEARS.stagedUpdates) {
      errors.updateModel = { code: "future-technology", minYear: OS_MINIMUM_YEARS.stagedUpdates };
    }
    if (configuration.updateModel === "rolling" && options.currentYear < OS_MINIMUM_YEARS.rollingUpdates) {
      errors.updateModel = { code: "future-technology", minYear: OS_MINIMUM_YEARS.rollingUpdates };
    }
    if (configuration.packageManager === "signed" && options.currentYear < OS_MINIMUM_YEARS.signedPackages) {
      errors.packageManager = { code: "future-technology", minYear: OS_MINIMUM_YEARS.signedPackages };
    }
    if (
      configuration.packageManager === "decentralized"
      && options.currentYear < OS_MINIMUM_YEARS.decentralizedPackages
    ) {
      errors.packageManager = {
        code: "future-technology",
        minYear: OS_MINIMUM_YEARS.decentralizedPackages,
      };
    }
    if (configuration.diagnostics === "telemetry" && options.currentYear < OS_MINIMUM_YEARS.telemetry) {
      errors.diagnostics = { code: "future-technology", minYear: OS_MINIMUM_YEARS.telemetry };
    }
    if (configuration.gui === "modern-desktop" && options.currentYear < OS_MINIMUM_YEARS.modernDesktop) {
      errors.gui = { code: "future-technology", minYear: OS_MINIMUM_YEARS.modernDesktop };
    }
    if (configuration.gui === "adaptive" && options.currentYear < OS_MINIMUM_YEARS.adaptiveGui) {
      errors.gui = { code: "future-technology", minYear: OS_MINIMUM_YEARS.adaptiveGui };
    }
    if (configuration.sdk === "full" && options.currentYear < OS_MINIMUM_YEARS.fullSdk) {
      errors.sdk = { code: "future-technology", minYear: OS_MINIMUM_YEARS.fullSdk };
    }
    if (configuration.sdk === "professional" && options.currentYear < OS_MINIMUM_YEARS.professionalSdk) {
      errors.sdk = { code: "future-technology", minYear: OS_MINIMUM_YEARS.professionalSdk };
    }
    if (configuration.api === "web" && options.currentYear < OS_MINIMUM_YEARS.webApi) {
      errors.api = { code: "future-technology", minYear: OS_MINIMUM_YEARS.webApi };
    }
    if (configuration.api === "hybrid" && options.currentYear < OS_MINIMUM_YEARS.hybridApi) {
      errors.api = { code: "future-technology", minYear: OS_MINIMUM_YEARS.hybridApi };
    }
    if (configuration.developerTools === "ide" && options.currentYear < OS_MINIMUM_YEARS.ideTools) {
      errors.developerTools = { code: "future-technology", minYear: OS_MINIMUM_YEARS.ideTools };
    }
    if (configuration.developerTools === "suite" && options.currentYear < OS_MINIMUM_YEARS.suiteTools) {
      errors.developerTools = { code: "future-technology", minYear: OS_MINIMUM_YEARS.suiteTools };
    }
    if (configuration.appStore === "curated" && options.currentYear < OS_MINIMUM_YEARS.curatedStore) {
      errors.appStore = { code: "future-technology", minYear: OS_MINIMUM_YEARS.curatedStore };
    }
    if (configuration.appStore === "open" && options.currentYear < OS_MINIMUM_YEARS.openStore) {
      errors.appStore = { code: "future-technology", minYear: OS_MINIMUM_YEARS.openStore };
    }
    if (configuration.appStore === "enterprise" && options.currentYear < OS_MINIMUM_YEARS.enterpriseStore) {
      errors.appStore = { code: "future-technology", minYear: OS_MINIMUM_YEARS.enterpriseStore };
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function createOsProject(
  id: string,
  name: string,
  configuration: OsConfiguration,
  savedOn: string,
): OsProject {
  const normalizedId = id.trim();
  if (normalizedId.length === 0) {
    throw new InvalidOsDataError("OS project ID is required.");
  }
  assertName(name);
  assertConfiguration(configuration, getYear(savedOn));
  if (!isValidDateOnly(savedOn)) {
    throw new InvalidOsDataError("OS project save date is invalid.");
  }

  return {
    id: normalizedId,
    name: name.trim(),
    configuration: cloneOsConfiguration(configuration),
    versions: [{
      version: 1,
      savedOn,
      configuration: cloneOsConfiguration(configuration),
    }],
    releases: [],
  };
}

export function saveOsVersion(
  project: OsProject,
  name: string,
  configuration: OsConfiguration,
  savedOn: string,
): OsProject {
  assertName(name);
  const year = getYear(savedOn);
  assertConfiguration(configuration, year);
  const nextVersion = Math.max(0, ...project.versions.map((version) => version.version)) + 1;

  return {
    ...project,
    name: name.trim(),
    configuration: cloneOsConfiguration(configuration),
    versions: [
      ...project.versions,
      {
        version: nextVersion,
        savedOn,
        configuration: cloneOsConfiguration(configuration),
      },
    ],
  };
}

export function cloneOsConfiguration(configuration: OsConfiguration): OsConfiguration {
  return {
    ...configuration,
    supportedArchitectures: [...configuration.supportedArchitectures],
  };
}

export function osConfigurationsEqual(left: OsConfiguration, right: OsConfiguration): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function parseOsConfiguration(
  value: unknown,
  options: { allowMissingSystems?: boolean; allowMissingEcosystem?: boolean } = {},
): OsConfiguration {
  if (!isRecord(value)) {
    throw new InvalidOsDataError("OS configuration is invalid.");
  }

  const defaults = createDefaultOsConfiguration();
  const missingSystemValue = (key: keyof OsConfiguration): boolean =>
    options.allowMissingSystems === true && value[key] === undefined;
  const missingEcosystemValue = (key: keyof OsConfiguration): boolean =>
    options.allowMissingEcosystem === true && value[key] === undefined;
  const systemFields: Array<keyof OsConfiguration> = [
    "filesystem",
    "driverFramework",
    "networkStack",
    "permissions",
    "encryption",
    "updateModel",
    "packageManager",
    "diagnostics",
  ];
  const ecosystemFields: Array<keyof OsConfiguration> = [
    "gui",
    "sdk",
    "api",
    "developerTools",
    "appStore",
  ];

  if (
    typeof value.targetPlatform !== "string"
    || typeof value.kernelType !== "string"
    || typeof value.bootloader !== "string"
    || typeof value.scheduler !== "string"
    || typeof value.memoryManager !== "string"
    || typeof value.virtualMemory !== "boolean"
    || typeof value.ipcModel !== "string"
    || typeof value.syscallCount !== "number"
    || typeof value.moduleSupport !== "string"
    || typeof value.driverModel !== "string"
    || typeof value.addressBits !== "number"
    || typeof value.maxProcesses !== "number"
    || !Array.isArray(value.supportedArchitectures)
    || !value.supportedArchitectures.every((entry) => typeof entry === "string")
    || systemFields.some((key) => typeof value[key] !== "string" && !missingSystemValue(key))
    || ecosystemFields.some((key) => typeof value[key] !== "string" && !missingEcosystemValue(key))
  ) {
    throw new InvalidOsDataError("OS configuration is incomplete.");
  }

  const configuration: OsConfiguration = {
    targetPlatform: value.targetPlatform as OsPlatform,
    kernelType: value.kernelType as OsKernelType,
    bootloader: value.bootloader as OsBootloader,
    scheduler: value.scheduler as OsScheduler,
    memoryManager: value.memoryManager as OsMemoryManager,
    virtualMemory: value.virtualMemory,
    ipcModel: value.ipcModel as OsIpcModel,
    syscallCount: value.syscallCount,
    moduleSupport: value.moduleSupport as OsModuleSupport,
    driverModel: value.driverModel as OsDriverModel,
    addressBits: value.addressBits as OsAddressBits,
    maxProcesses: value.maxProcesses,
    supportedArchitectures: [...value.supportedArchitectures] as CpuIsa[],
    filesystem: (value.filesystem ?? defaults.filesystem) as OsFilesystem,
    driverFramework: (value.driverFramework ?? defaults.driverFramework) as OsDriverFramework,
    networkStack: (value.networkStack ?? defaults.networkStack) as OsNetworkStack,
    permissions: (value.permissions ?? defaults.permissions) as OsPermissionModel,
    encryption: (value.encryption ?? defaults.encryption) as OsEncryption,
    updateModel: (value.updateModel ?? defaults.updateModel) as OsUpdateModel,
    packageManager: (value.packageManager ?? defaults.packageManager) as OsPackageManager,
    diagnostics: (value.diagnostics ?? defaults.diagnostics) as OsDiagnostics,
    gui: (value.gui ?? defaults.gui) as OsGui,
    sdk: (value.sdk ?? defaults.sdk) as OsSdk,
    api: (value.api ?? defaults.api) as OsApi,
    developerTools: (value.developerTools ?? defaults.developerTools) as OsDeveloperTools,
    appStore: (value.appStore ?? defaults.appStore) as OsAppStore,
  };

  const validation = validateOsConfiguration(configuration);
  if (!validation.valid) {
    throw new InvalidOsDataError("OS configuration contains invalid values.");
  }

  return cloneOsConfiguration(configuration);
}

export function parseOsProject(
  value: unknown,
  currentDate: string,
  options: {
    allowMissingSystems?: boolean;
    allowMissingEcosystem?: boolean;
    allowMissingReleases?: boolean;
  } = {},
): OsProject {
  if (!isRecord(value)) {
    throw new InvalidOsDataError("OS project data is invalid.");
  }
  if (
    typeof value.id !== "string"
    || value.id.trim().length === 0
    || typeof value.name !== "string"
    || !Array.isArray(value.versions)
  ) {
    throw new InvalidOsDataError("OS project is incomplete.");
  }
  if (!isValidDateOnly(currentDate)) {
    throw new InvalidOsDataError("OS project reference date is invalid.");
  }

  assertName(value.name);
  const currentYear = getYear(currentDate);
  const configuration = parseOsConfiguration(value.configuration, options);
  assertConfiguration(configuration, currentYear);

  if (value.versions.length === 0) {
    throw new InvalidOsDataError("OS project has no versions.");
  }

  const versions = value.versions.map((entry): OsDesignVersion => {
    if (
      !isRecord(entry)
      || typeof entry.version !== "number"
      || !Number.isInteger(entry.version)
      || entry.version < 1
      || typeof entry.savedOn !== "string"
      || !isValidDateOnly(entry.savedOn)
    ) {
      throw new InvalidOsDataError("OS project version is invalid.");
    }

    const versionConfiguration = parseOsConfiguration(entry.configuration, options);
    assertConfiguration(versionConfiguration, currentYear);

    return {
      version: entry.version,
      savedOn: entry.savedOn,
      configuration: versionConfiguration,
    };
  }).sort((left, right) => left.version - right.version);

  if (versions[0]?.version !== 1) {
    throw new InvalidOsDataError("OS project is missing its first version.");
  }
  if (new Set(versions.map((version) => version.version)).size !== versions.length) {
    throw new InvalidOsDataError("OS project versions are duplicated.");
  }

  const latestVersion = versions[versions.length - 1];
  if (!latestVersion || !osConfigurationsEqual(latestVersion.configuration, configuration)) {
    throw new InvalidOsDataError("OS project configuration does not match its latest saved version.");
  }

  let releases: OsRelease[] = [];
  if (value.releases !== undefined || options.allowMissingReleases !== true) {
    if (!Array.isArray(value.releases)) {
      throw new InvalidOsDataError("OS project releases are invalid.");
    }

    releases = value.releases
      .map((entry) => parseOsRelease(entry, currentYear, options))
      .sort((left, right) => left.version - right.version);
  }

  if (new Set(releases.map((release) => release.id)).size !== releases.length) {
    throw new InvalidOsDataError("OS release IDs are duplicated.");
  }
  if (new Set(releases.map((release) => release.version)).size !== releases.length) {
    throw new InvalidOsDataError("OS release versions are duplicated.");
  }

  return {
    id: value.id.trim(),
    name: value.name.trim(),
    configuration,
    versions,
    releases,
  };
}

function parseOsRelease(
  value: unknown,
  currentYear: number,
  options: { allowMissingSystems?: boolean; allowMissingEcosystem?: boolean },
): OsRelease {
  if (
    !isRecord(value)
    || typeof value.id !== "string"
    || value.id.trim().length === 0
    || typeof value.version !== "number"
    || !Number.isInteger(value.version)
    || value.version < 1
    || typeof value.stage !== "string"
    || !isOsReleaseStage(value.stage)
    || typeof value.createdOn !== "string"
    || !isValidDateOnly(value.createdOn)
    || typeof value.qualityScore !== "number"
    || !Number.isFinite(value.qualityScore)
    || value.qualityScore < 0
    || value.qualityScore > 100
    || typeof value.appealScore !== "number"
    || !Number.isFinite(value.appealScore)
    || value.appealScore < 0
    || value.appealScore > 100
    || typeof value.costUsd !== "number"
    || !Number.isFinite(value.costUsd)
    || value.costUsd < 0
  ) {
    throw new InvalidOsDataError("OS release is invalid.");
  }

  const configuration = parseOsConfiguration(value.configuration, options);
  assertConfiguration(configuration, currentYear);

  return {
    id: value.id.trim(),
    version: value.version,
    stage: value.stage,
    createdOn: value.createdOn,
    configuration: cloneOsConfiguration(configuration),
    qualityScore: value.qualityScore,
    appealScore: value.appealScore,
    costUsd: value.costUsd,
  };
}

export function isOsPlatform(value: unknown): value is OsPlatform {
  return typeof value === "string" && OS_PLATFORM_OPTIONS.includes(value as OsPlatform);
}

export function isOsKernelType(value: unknown): value is OsKernelType {
  return typeof value === "string" && OS_KERNEL_OPTIONS.includes(value as OsKernelType);
}

export function isOsBootloader(value: unknown): value is OsBootloader {
  return typeof value === "string" && OS_BOOTLOADER_OPTIONS.includes(value as OsBootloader);
}

export function isOsScheduler(value: unknown): value is OsScheduler {
  return typeof value === "string" && OS_SCHEDULER_OPTIONS.includes(value as OsScheduler);
}

export function isOsMemoryManager(value: unknown): value is OsMemoryManager {
  return typeof value === "string" && OS_MEMORY_MANAGER_OPTIONS.includes(value as OsMemoryManager);
}

export function isOsIpcModel(value: unknown): value is OsIpcModel {
  return typeof value === "string" && OS_IPC_OPTIONS.includes(value as OsIpcModel);
}

export function isOsModuleSupport(value: unknown): value is OsModuleSupport {
  return typeof value === "string" && OS_MODULE_SUPPORT_OPTIONS.includes(value as OsModuleSupport);
}

export function isOsDriverModel(value: unknown): value is OsDriverModel {
  return typeof value === "string" && OS_DRIVER_MODEL_OPTIONS.includes(value as OsDriverModel);
}

export function isOsAddressBits(value: unknown): value is OsAddressBits {
  return typeof value === "number" && OS_ADDRESS_BIT_OPTIONS.includes(value as OsAddressBits);
}

export function isOsArchitecture(value: unknown): value is CpuIsa {
  return typeof value === "string" && OS_ARCHITECTURE_OPTIONS.includes(value as CpuIsa);
}

export function isOsFilesystem(value: unknown): value is OsFilesystem {
  return typeof value === "string" && OS_FILESYSTEM_OPTIONS.includes(value as OsFilesystem);
}

export function isOsDriverFramework(value: unknown): value is OsDriverFramework {
  return typeof value === "string" && OS_DRIVER_FRAMEWORK_OPTIONS.includes(value as OsDriverFramework);
}

export function isOsNetworkStack(value: unknown): value is OsNetworkStack {
  return typeof value === "string" && OS_NETWORK_STACK_OPTIONS.includes(value as OsNetworkStack);
}

export function isOsPermissionModel(value: unknown): value is OsPermissionModel {
  return typeof value === "string" && OS_PERMISSION_MODEL_OPTIONS.includes(value as OsPermissionModel);
}

export function isOsEncryption(value: unknown): value is OsEncryption {
  return typeof value === "string" && OS_ENCRYPTION_OPTIONS.includes(value as OsEncryption);
}

export function isOsUpdateModel(value: unknown): value is OsUpdateModel {
  return typeof value === "string" && OS_UPDATE_MODEL_OPTIONS.includes(value as OsUpdateModel);
}

export function isOsPackageManager(value: unknown): value is OsPackageManager {
  return typeof value === "string" && OS_PACKAGE_MANAGER_OPTIONS.includes(value as OsPackageManager);
}

export function isOsDiagnostics(value: unknown): value is OsDiagnostics {
  return typeof value === "string" && OS_DIAGNOSTICS_OPTIONS.includes(value as OsDiagnostics);
}

export function isOsGui(value: unknown): value is OsGui {
  return typeof value === "string" && OS_GUI_OPTIONS.includes(value as OsGui);
}

export function isOsSdk(value: unknown): value is OsSdk {
  return typeof value === "string" && OS_SDK_OPTIONS.includes(value as OsSdk);
}

export function isOsApi(value: unknown): value is OsApi {
  return typeof value === "string" && OS_API_OPTIONS.includes(value as OsApi);
}

export function isOsDeveloperTools(value: unknown): value is OsDeveloperTools {
  return typeof value === "string" && OS_DEVELOPER_TOOLS_OPTIONS.includes(value as OsDeveloperTools);
}

export function isOsAppStore(value: unknown): value is OsAppStore {
  return typeof value === "string" && OS_APP_STORE_OPTIONS.includes(value as OsAppStore);
}

export function isOsReleaseStage(value: unknown): value is OsReleaseStage {
  return typeof value === "string" && OS_RELEASE_STAGE_OPTIONS.includes(value as OsReleaseStage);
}

export type OsHardwareKind = "cpu" | ComponentType;

export interface OsHardwareTarget {
  id: string;
  name: string;
  kind: OsHardwareKind;
  architecture?: CpuIsa;
  bus?: ComponentBus;
  storageInterface?: SsdInterface;
  storageFormFactor?: SsdFormFactor;
  aiInterconnect?: AiInterconnect;
  networkStandard?: NetworkStandard;
  networkMedium?: NetworkMedium;
  pcieGeneration?: number;
}

export type OsHardwareCompatibilityIssueCode =
  | "unsupported-architecture"
  | "driver-framework-required"
  | "storage-driver-unsupported"
  | "network-driver-unsupported"
  | "ai-driver-unsupported";

export interface OsHardwareCompatibilityIssue {
  code: OsHardwareCompatibilityIssueCode;
}

export interface OsHardwareCompatibility {
  targetId: string;
  name: string;
  kind: OsHardwareKind;
  compatible: boolean;
  issues: OsHardwareCompatibilityIssue[];
}

const DRIVER_FRAMEWORK_LEVELS: Record<OsDriverFramework, number> = {
  legacy: 0,
  acpi: 1,
  unified: 2,
  certified: 3,
};

const BUS_DRIVER_LEVELS: Record<ComponentBus, number> = {
  pci: 0,
  "pcie-3": 1,
  "pcie-4": 2,
  "pcie-5": 3,
};

const NETWORK_STACK_LEVELS: Record<OsNetworkStack, number> = {
  basic: 0,
  "tcp-ip": 1,
  advanced: 2,
  cloud: 3,
};

export function checkOsHardwareCompatibility(
  configuration: OsConfiguration,
  targets: readonly OsHardwareTarget[],
): OsHardwareCompatibility[] {
  const driverLevel = DRIVER_FRAMEWORK_LEVELS[configuration.driverFramework] ?? 0;
  const networkLevel = NETWORK_STACK_LEVELS[configuration.networkStack] ?? 0;

  return targets.map((target) => {
    const codes = new Set<OsHardwareCompatibilityIssueCode>();

    if (target.kind === "cpu") {
      if (!target.architecture || !configuration.supportedArchitectures.includes(target.architecture)) {
        codes.add("unsupported-architecture");
      }
    }

    if (target.bus && driverLevel < BUS_DRIVER_LEVELS[target.bus]) {
      codes.add("driver-framework-required");
    }

    if (target.kind === "ssd") {
      const requiredLevel = target.storageInterface === "nvme" || target.storageFormFactor === "m2" ? 2 : 1;
      if (driverLevel < requiredLevel) {
        codes.add("storage-driver-unsupported");
      }
    }

    if (target.kind === "ai-accelerator") {
      const requiredLevel = target.aiInterconnect === "nvlink" ? 3 : 2;
      if (driverLevel < requiredLevel) {
        codes.add("ai-driver-unsupported");
      }
    }

    if (target.kind === "networking") {
      if (
        (target.networkMedium === "fiber" && networkLevel < 1)
        || (target.networkStandard === "infiniband" && networkLevel < 2)
      ) {
        codes.add("network-driver-unsupported");
      }
    }

    if (target.kind === "motherboard" && target.pcieGeneration !== undefined) {
      const requiredLevel = target.pcieGeneration >= 5
        ? 3
        : target.pcieGeneration >= 4
          ? 2
          : target.pcieGeneration >= 3
            ? 1
            : 0;
      if (driverLevel < requiredLevel) {
        codes.add("driver-framework-required");
      }
    }

    const issues = [...codes].map((code) => ({ code }));
    return {
      targetId: target.id,
      name: target.name,
      kind: target.kind,
      compatible: issues.length === 0,
      issues,
    };
  });
}

function assertName(name: string): void {
  const issue = validateOsProjectName(name);
  if (issue) {
    throw new InvalidOsDataError("OS project name is invalid.");
  }
}

function assertConfiguration(configuration: OsConfiguration, currentYear: number): void {
  const validation = validateOsConfiguration(configuration, { currentYear });
  if (!validation.valid) {
    throw new InvalidOsDataError("OS configuration is invalid.");
  }
}

function getYear(date: string): number {
  if (!isValidDateOnly(date)) {
    throw new InvalidOsDataError("OS project save date is invalid.");
  }
  return Number(date.slice(0, 4));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
