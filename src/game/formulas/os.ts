import {
  OS_PROCESS_LIMITS_BY_ADDRESS_BITS,
  type OsAddressBits,
  type OsApi,
  type OsAppStore,
  type OsBootloader,
  type OsConfiguration,
  type OsDeveloperTools,
  type OsDiagnostics,
  type OsDriverFramework,
  type OsDriverModel,
  type OsEncryption,
  type OsFilesystem,
  type OsGui,
  type OsIpcModel,
  type OsKernelType,
  type OsMemoryManager,
  type OsModuleSupport,
  type OsNetworkStack,
  type OsPackageManager,
  type OsPermissionModel,
  type OsPlatform,
  type OsReleaseStage,
  type OsScheduler,
  type OsSdk,
  type OsUpdateModel,
} from "../models/os";
import {
  checkOsApplicationCompatibility,
} from "../models/os-applications";

export interface OsKernelMetrics {
  bootTimeSeconds: number;
  memoryFootprintMb: number;
  performanceScore: number;
  stabilityScore: number;
  securityScore: number;
  compatibilityScore: number;
  energyEfficiencyScore: number;
  maintainabilityScore: number;
  ipcLatencyMicroseconds: number;
  syscallOverheadNanoseconds: number;
  processCapacity: number;
  systemQualityScore: number;
  driverCoverageScore: number;
  dataIntegrityScore: number;
  networkScore: number;
  diagnosticsScore: number;
  updateReadinessScore: number;
  annualMaintenanceCostUsd: number;
  updateLatencyDays: number;
  overallScore: number;
}

export interface OsEcosystemMetrics {
  sdkScore: number;
  apiScore: number;
  guiScore: number;
  developerToolsScore: number;
  appStoreScore: number;
  ecosystemScore: number;
  compatibleApplications: number;
  totalApplications: number;
  applicationCoverage: number;
  platformAppealScore: number;
}

export interface OsReleaseMetrics {
  qualityScore: number;
  appealScore: number;
}

export type OsRequirementMetric =
  | "bootTimeSeconds"
  | "memoryFootprintMb"
  | "performanceScore"
  | "stabilityScore"
  | "securityScore"
  | "compatibilityScore"
  | "energyEfficiencyScore"
  | "ipcLatencyMicroseconds"
  | "syscallOverheadNanoseconds"
  | "systemQualityScore"
  | "overallScore";

export type OsRequirementId =
  | "boot-time"
  | "memory-footprint"
  | "performance"
  | "stability"
  | "security"
  | "compatibility"
  | "energy-efficiency"
  | "ipc-latency"
  | "syscall-overhead"
  | "system-quality"
  | "overall-score";

export interface OsRequirementRule {
  id: OsRequirementId;
  metric: OsRequirementMetric;
  comparator: "at-least" | "at-most";
  target: number;
}

export interface OsRequirementResult extends OsRequirementRule {
  actual: number;
  satisfied: boolean;
}

interface KernelProfile {
  performance: number;
  stability: number;
  security: number;
  compatibility: number;
  maintainability: number;
  footprint: number;
  boot: number;
  ipcLatency: number;
  syscall: number;
  energy: number;
}

const KERNEL_PROFILES: Record<OsKernelType, KernelProfile> = {
  monolithic: {
    performance: 1.14,
    stability: 0.9,
    security: 0.86,
    compatibility: 0.96,
    maintainability: 0.8,
    footprint: 0.82,
    boot: 0.86,
    ipcLatency: 0.72,
    syscall: 0.74,
    energy: 1.06,
  },
  microkernel: {
    performance: 0.82,
    stability: 1.2,
    security: 1.18,
    compatibility: 0.9,
    maintainability: 1.18,
    footprint: 0.94,
    boot: 1.14,
    ipcLatency: 1.65,
    syscall: 1.3,
    energy: 0.9,
  },
  hybrid: {
    performance: 1,
    stability: 1.06,
    security: 1.05,
    compatibility: 1,
    maintainability: 1.05,
    footprint: 0.9,
    boot: 1,
    ipcLatency: 1,
    syscall: 0.95,
    energy: 1,
  },
  modular: {
    performance: 0.9,
    stability: 1.04,
    security: 1.03,
    compatibility: 1.08,
    maintainability: 1.2,
    footprint: 1.08,
    boot: 1.16,
    ipcLatency: 0.96,
    syscall: 0.92,
    energy: 0.95,
  },
};

interface BootloaderProfile {
  seconds: number;
  compatibility: number;
  security: number;
  maintainability: number;
}

const BOOTLOADER_PROFILES: Record<OsBootloader, BootloaderProfile> = {
  bios: { seconds: 9, compatibility: 0.9, security: 0.84, maintainability: 0.85 },
  uefi: { seconds: 4.5, compatibility: 1.08, security: 1.08, maintainability: 1.05 },
  coreboot: { seconds: 3, compatibility: 0.96, security: 1.06, maintainability: 1.12 },
};

interface SchedulerProfile {
  throughput: number;
  latency: number;
  energy: number;
  stability: number;
  compatibility: number;
}

const SCHEDULER_PROFILES: Record<OsScheduler, SchedulerProfile> = {
  "round-robin": { throughput: 0.9, latency: 1.05, energy: 0.95, stability: 1, compatibility: 1 },
  priority: { throughput: 1, latency: 0.95, energy: 1, stability: 0.96, compatibility: 0.98 },
  "multilevel-feedback": { throughput: 1.12, latency: 0.88, energy: 0.95, stability: 1.02, compatibility: 1.03 },
  "real-time": { throughput: 0.96, latency: 0.6, energy: 0.84, stability: 0.9, compatibility: 0.9 },
  "energy-aware": { throughput: 0.88, latency: 1, energy: 1.18, stability: 1, compatibility: 0.95 },
};

interface MemoryProfile {
  performance: number;
  stability: number;
  security: number;
  compatibility: number;
  energy: number;
  overheadMb: number;
}

const MEMORY_PROFILES: Record<OsMemoryManager, MemoryProfile> = {
  flat: { performance: 1.06, stability: 0.78, security: 0.72, compatibility: 0.86, energy: 1.04, overheadMb: 12 },
  paging: { performance: 1, stability: 1.14, security: 1.14, compatibility: 1.05, energy: 0.98, overheadMb: 24 },
  segmentation: { performance: 0.92, stability: 0.96, security: 0.94, compatibility: 0.9, energy: 1, overheadMb: 18 },
  "paged-segmentation": { performance: 0.96, stability: 1.1, security: 1.1, compatibility: 1.02, energy: 0.96, overheadMb: 28 },
};

interface IpcProfile {
  latency: number;
  throughput: number;
  stability: number;
  security: number;
  compatibility: number;
}

const IPC_PROFILES: Record<OsIpcModel, IpcProfile> = {
  pipes: { latency: 1.25, throughput: 0.92, stability: 1.02, security: 0.94, compatibility: 1 },
  "message-passing": { latency: 1.05, throughput: 0.98, stability: 1.04, security: 1.04, compatibility: 1.02 },
  "shared-memory": { latency: 0.65, throughput: 1.1, stability: 0.92, security: 0.86, compatibility: 0.94 },
  hybrid: { latency: 0.85, throughput: 1.04, stability: 1.02, security: 1, compatibility: 1.03 },
};

interface ModuleProfile {
  footprintMb: number;
  compatibility: number;
  maintainability: number;
  stability: number;
  security: number;
}

const MODULE_PROFILES: Record<OsModuleSupport, ModuleProfile> = {
  none: { footprintMb: 0, compatibility: 0.92, maintainability: 0.85, stability: 1.02, security: 1.04 },
  loadable: { footprintMb: 20, compatibility: 1.06, maintainability: 1.12, stability: 0.98, security: 0.96 },
  "user-space": { footprintMb: 30, compatibility: 1.1, maintainability: 1.18, stability: 1.06, security: 1.12 },
};

interface DriverProfile {
  footprintMb: number;
  performance: number;
  stability: number;
  security: number;
  maintainability: number;
}

const DRIVER_PROFILES: Record<OsDriverModel, DriverProfile> = {
  "in-kernel": { footprintMb: 8, performance: 1.08, stability: 0.92, security: 0.86, maintainability: 0.9 },
  "user-space": { footprintMb: 26, performance: 0.82, stability: 1.14, security: 1.18, maintainability: 1.12 },
  hybrid: { footprintMb: 14, performance: 1, stability: 1.05, security: 1.06, maintainability: 1.04 },
};

interface AddressProfile {
  performance: number;
  compatibility: number;
  maintainability: number;
  bootSeconds: number;
  footprintMb: number;
}

const ADDRESS_PROFILES: Record<OsAddressBits, AddressProfile> = {
  16: { performance: 0.82, compatibility: 0.7, maintainability: 0.85, bootSeconds: -1, footprintMb: 0 },
  32: { performance: 1, compatibility: 1, maintainability: 1, bootSeconds: 0, footprintMb: 0 },
  64: { performance: 1.06, compatibility: 1.08, maintainability: 1.02, bootSeconds: 0.8, footprintMb: 8 },
};

interface FilesystemProfile {
  dataIntegrity: number;
  performance: number;
  footprintMb: number;
  maintenanceCostUsd: number;
}

const FILESYSTEM_PROFILES: Record<OsFilesystem, FilesystemProfile> = {
  fat: { dataIntegrity: 72, performance: 1.02, footprintMb: 0, maintenanceCostUsd: 2 },
  ext2: { dataIntegrity: 84, performance: 1, footprintMb: 2, maintenanceCostUsd: 3 },
  ntfs: { dataIntegrity: 90, performance: 0.98, footprintMb: 4, maintenanceCostUsd: 5 },
  zfs: { dataIntegrity: 98, performance: 0.94, footprintMb: 12, maintenanceCostUsd: 9 },
};

interface DriverFrameworkProfile {
  coverage: number;
  compatibility: number;
  stability: number;
  maintainability: number;
  maintenanceCostUsd: number;
}

const DRIVER_FRAMEWORK_PROFILES: Record<OsDriverFramework, DriverFrameworkProfile> = {
  legacy: { coverage: 45, compatibility: 0.95, stability: 0.94, maintainability: 0.9, maintenanceCostUsd: 0 },
  acpi: { coverage: 62, compatibility: 0.97, stability: 1, maintainability: 1, maintenanceCostUsd: 2 },
  unified: { coverage: 80, compatibility: 1.07, stability: 1.04, maintainability: 1.05, maintenanceCostUsd: 6 },
  certified: { coverage: 94, compatibility: 1.12, stability: 1.1, maintainability: 1.12, maintenanceCostUsd: 12 },
};

interface NetworkProfile {
  score: number;
  compatibility: number;
  security: number;
  maintenanceCostUsd: number;
}

const NETWORK_PROFILES: Record<OsNetworkStack, NetworkProfile> = {
  basic: { score: 40, compatibility: 0.95, security: 0.95, maintenanceCostUsd: 0 },
  "tcp-ip": { score: 58, compatibility: 0.99, security: 1, maintenanceCostUsd: 2 },
  advanced: { score: 78, compatibility: 1.07, security: 1.06, maintenanceCostUsd: 6 },
  cloud: { score: 92, compatibility: 1.11, security: 1.02, maintenanceCostUsd: 10 },
};

interface PermissionProfile {
  security: number;
  stability: number;
  maintenanceCostUsd: number;
}

const PERMISSION_PROFILES: Record<OsPermissionModel, PermissionProfile> = {
  none: { security: 0.72, stability: 0.96, maintenanceCostUsd: 0 },
  permissions: { security: 1, stability: 1, maintenanceCostUsd: 0 },
  "role-based": { security: 1.12, stability: 1.02, maintenanceCostUsd: 3 },
  capability: { security: 1.24, stability: 1.04, maintenanceCostUsd: 6 },
};

interface EncryptionProfile {
  security: number;
  dataIntegrity: number;
  performance: number;
  maintenanceCostUsd: number;
}

const ENCRYPTION_PROFILES: Record<OsEncryption, EncryptionProfile> = {
  none: { security: 1, dataIntegrity: 1, performance: 1, maintenanceCostUsd: 0 },
  disk: { security: 1.06, dataIntegrity: 1.04, performance: 0.99, maintenanceCostUsd: 3 },
  "full-disk": { security: 1.14, dataIntegrity: 1.09, performance: 0.96, maintenanceCostUsd: 7 },
  hardware: { security: 1.22, dataIntegrity: 1.12, performance: 0.99, maintenanceCostUsd: 12 },
};

interface UpdateProfile {
  latencyDays: number;
  readiness: number;
  security: number;
  maintenanceCostUsd: number;
}

const UPDATE_PROFILES: Record<OsUpdateModel, UpdateProfile> = {
  manual: { latencyDays: 180, readiness: 30, security: 0.94, maintenanceCostUsd: 1 },
  "package-manager": { latencyDays: 60, readiness: 58, security: 1.02, maintenanceCostUsd: 3 },
  staged: { latencyDays: 30, readiness: 76, security: 1.08, maintenanceCostUsd: 7 },
  rolling: { latencyDays: 7, readiness: 92, security: 1.1, maintenanceCostUsd: 10 },
};

interface PackageManagerProfile {
  readiness: number;
  security: number;
  maintenanceCostUsd: number;
}

const PACKAGE_MANAGER_PROFILES: Record<OsPackageManager, PackageManagerProfile> = {
  none: { readiness: 0.85, security: 0.93, maintenanceCostUsd: 0 },
  centralized: { readiness: 0.97, security: 1.02, maintenanceCostUsd: 2 },
  signed: { readiness: 1.08, security: 1.1, maintenanceCostUsd: 5 },
  decentralized: { readiness: 1.12, security: 1.06, maintenanceCostUsd: 7 },
};

interface DiagnosticsProfile {
  score: number;
  stability: number;
  maintenanceCostUsd: number;
}

const DIAGNOSTICS_PROFILES: Record<OsDiagnostics, DiagnosticsProfile> = {
  none: { score: 25, stability: 0.92, maintenanceCostUsd: 0 },
  logs: { score: 60, stability: 1, maintenanceCostUsd: 2 },
  "crash-dumps": { score: 78, stability: 1.06, maintenanceCostUsd: 5 },
  telemetry: { score: 92, stability: 1.09, maintenanceCostUsd: 9 },
};

export const OS_PLATFORM_REQUIREMENTS: Record<OsPlatform, readonly OsRequirementRule[]> = {
  desktop: [
    { id: "boot-time", metric: "bootTimeSeconds", comparator: "at-most", target: 30 },
    { id: "memory-footprint", metric: "memoryFootprintMb", comparator: "at-most", target: 1_024 },
    { id: "performance", metric: "performanceScore", comparator: "at-least", target: 45 },
    { id: "stability", metric: "stabilityScore", comparator: "at-least", target: 45 },
    { id: "compatibility", metric: "compatibilityScore", comparator: "at-least", target: 40 },
    { id: "system-quality", metric: "systemQualityScore", comparator: "at-least", target: 45 },
  ],
  mobile: [
    { id: "boot-time", metric: "bootTimeSeconds", comparator: "at-most", target: 20 },
    { id: "memory-footprint", metric: "memoryFootprintMb", comparator: "at-most", target: 512 },
    { id: "stability", metric: "stabilityScore", comparator: "at-least", target: 50 },
    { id: "energy-efficiency", metric: "energyEfficiencyScore", comparator: "at-least", target: 55 },
    { id: "compatibility", metric: "compatibilityScore", comparator: "at-least", target: 35 },
    { id: "system-quality", metric: "systemQualityScore", comparator: "at-least", target: 45 },
  ],
  server: [
    { id: "boot-time", metric: "bootTimeSeconds", comparator: "at-most", target: 120 },
    { id: "memory-footprint", metric: "memoryFootprintMb", comparator: "at-most", target: 4_096 },
    { id: "stability", metric: "stabilityScore", comparator: "at-least", target: 60 },
    { id: "security", metric: "securityScore", comparator: "at-least", target: 45 },
    { id: "performance", metric: "performanceScore", comparator: "at-least", target: 45 },
    { id: "system-quality", metric: "systemQualityScore", comparator: "at-least", target: 55 },
  ],
  gaming: [
    { id: "boot-time", metric: "bootTimeSeconds", comparator: "at-most", target: 25 },
    { id: "performance", metric: "performanceScore", comparator: "at-least", target: 60 },
    { id: "stability", metric: "stabilityScore", comparator: "at-least", target: 40 },
    { id: "ipc-latency", metric: "ipcLatencyMicroseconds", comparator: "at-most", target: 120 },
    { id: "syscall-overhead", metric: "syscallOverheadNanoseconds", comparator: "at-most", target: 600 },
    { id: "system-quality", metric: "systemQualityScore", comparator: "at-least", target: 45 },
  ],
  universal: [
    { id: "boot-time", metric: "bootTimeSeconds", comparator: "at-most", target: 45 },
    { id: "memory-footprint", metric: "memoryFootprintMb", comparator: "at-most", target: 2_048 },
    { id: "performance", metric: "performanceScore", comparator: "at-least", target: 45 },
    { id: "stability", metric: "stabilityScore", comparator: "at-least", target: 50 },
    { id: "compatibility", metric: "compatibilityScore", comparator: "at-least", target: 50 },
    { id: "system-quality", metric: "systemQualityScore", comparator: "at-least", target: 50 },
    { id: "overall-score", metric: "overallScore", comparator: "at-least", target: 50 },
  ],
};

const OVERALL_WEIGHTS: Record<OsPlatform, Record<
  "performance" | "stability" | "security" | "compatibility" | "energy" | "latency" | "syscall",
  number
>> = {
  desktop: { performance: 0.26, stability: 0.25, security: 0.16, compatibility: 0.18, energy: 0.07, latency: 0.05, syscall: 0.03 },
  mobile: { performance: 0.16, stability: 0.22, security: 0.14, compatibility: 0.12, energy: 0.24, latency: 0.07, syscall: 0.05 },
  server: { performance: 0.18, stability: 0.28, security: 0.22, compatibility: 0.16, energy: 0.06, latency: 0.05, syscall: 0.05 },
  gaming: { performance: 0.34, stability: 0.14, security: 0.05, compatibility: 0.07, energy: 0.06, latency: 0.26, syscall: 0.08 },
  universal: { performance: 0.22, stability: 0.22, security: 0.15, compatibility: 0.2, energy: 0.09, latency: 0.07, syscall: 0.05 },
};

const GUI_PROFILES: Record<OsGui, number> = {
  cli: 20,
  "desktop-shell": 55,
  "modern-desktop": 78,
  adaptive: 92,
};

const SDK_PROFILES: Record<OsSdk, number> = {
  none: 10,
  basic: 45,
  full: 75,
  professional: 92,
};

const API_PROFILES: Record<OsApi, number> = {
  proprietary: 35,
  posix: 62,
  web: 58,
  hybrid: 82,
};

const DEVELOPER_TOOLS_PROFILES: Record<OsDeveloperTools, number> = {
  none: 20,
  compiler: 48,
  ide: 72,
  suite: 90,
};

const APP_STORE_PROFILES: Record<OsAppStore, number> = {
  none: 10,
  curated: 50,
  open: 75,
  enterprise: 68,
};

export const OS_RELEASE_STAGE_COSTS_USD: Record<OsReleaseStage, number> = {
  alpha: 25_000,
  beta: 35_000,
  rc: 50_000,
  stable: 80_000,
};

const OS_RELEASE_STAGE_ORDER = ["alpha", "beta", "rc", "stable"] as const;

const RELEASE_STAGE_FACTORS: Record<OsReleaseStage, number> = {
  alpha: 0.78,
  beta: 0.88,
  rc: 0.95,
  stable: 1,
};

export function calculateOsEcosystemMetrics(
  configuration: OsConfiguration,
  kernelMetrics: OsKernelMetrics,
): OsEcosystemMetrics {
  const guiScore = GUI_PROFILES[configuration.gui];
  const sdkScore = SDK_PROFILES[configuration.sdk];
  const apiScore = API_PROFILES[configuration.api];
  const developerToolsScore = DEVELOPER_TOOLS_PROFILES[configuration.developerTools];
  const appStoreScore = APP_STORE_PROFILES[configuration.appStore];
  const applications = checkOsApplicationCompatibility(configuration, {
    memoryFootprintMb: kernelMetrics.memoryFootprintMb,
    securityScore: kernelMetrics.securityScore,
  });
  const compatibleApplications = applications.filter((application) => application.compatible).length;
  const totalApplications = applications.length;
  const applicationCoverage = totalApplications === 0
    ? 0
    : (compatibleApplications / totalApplications) * 100;
  const ecosystemScore = clamp(
    sdkScore * 0.32
      + apiScore * 0.23
      + guiScore * 0.2
      + developerToolsScore * 0.15
      + appStoreScore * 0.1,
    0,
    100,
  );
  const platformAppealScore = clamp(
    kernelMetrics.overallScore * 0.3
      + ecosystemScore * 0.3
      + applicationCoverage * 0.25
      + appStoreScore * 0.15,
    0,
    100,
  );

  return {
    sdkScore: round(sdkScore, 1),
    apiScore: round(apiScore, 1),
    guiScore: round(guiScore, 1),
    developerToolsScore: round(developerToolsScore, 1),
    appStoreScore: round(appStoreScore, 1),
    ecosystemScore: round(ecosystemScore, 1),
    compatibleApplications,
    totalApplications,
    applicationCoverage: round(applicationCoverage, 1),
    platformAppealScore: round(platformAppealScore, 1),
  };
}

export function getNextOsReleaseStage(stage: OsReleaseStage): OsReleaseStage | null {
  const index = OS_RELEASE_STAGE_ORDER.indexOf(stage);
  return index >= 0 && index < OS_RELEASE_STAGE_ORDER.length - 1
    ? OS_RELEASE_STAGE_ORDER[index + 1] ?? null
    : null;
}

export function getOsReleaseStageCost(stage: OsReleaseStage): number {
  return OS_RELEASE_STAGE_COSTS_USD[stage];
}

export function calculateOsReleaseMetrics(
  configuration: OsConfiguration,
  stage: OsReleaseStage,
): OsReleaseMetrics {
  const kernelMetrics = calculateOsKernelMetrics(configuration);
  const ecosystemMetrics = calculateOsEcosystemMetrics(configuration, kernelMetrics);
  const factor = RELEASE_STAGE_FACTORS[stage];

  return {
    qualityScore: round(clamp(
      (kernelMetrics.overallScore * 0.4 + ecosystemMetrics.platformAppealScore * 0.6) * factor,
      0,
      100,
    ), 1),
    appealScore: round(clamp(ecosystemMetrics.platformAppealScore * factor, 0, 100), 1),
  };
}

export function calculateOsKernelMetrics(configuration: OsConfiguration): OsKernelMetrics {
  const kernel = KERNEL_PROFILES[configuration.kernelType];
  const bootloader = BOOTLOADER_PROFILES[configuration.bootloader];
  const scheduler = SCHEDULER_PROFILES[configuration.scheduler];
  const memory = MEMORY_PROFILES[configuration.memoryManager];
  const ipc = IPC_PROFILES[configuration.ipcModel];
  const modules = MODULE_PROFILES[configuration.moduleSupport];
  const drivers = DRIVER_PROFILES[configuration.driverModel];
  const address = ADDRESS_PROFILES[configuration.addressBits];
  const filesystem = FILESYSTEM_PROFILES[configuration.filesystem];
  const driverFramework = DRIVER_FRAMEWORK_PROFILES[configuration.driverFramework];
  const network = NETWORK_PROFILES[configuration.networkStack];
  const permissions = PERMISSION_PROFILES[configuration.permissions];
  const encryption = ENCRYPTION_PROFILES[configuration.encryption];
  const updates = UPDATE_PROFILES[configuration.updateModel];
  const packageManager = PACKAGE_MANAGER_PROFILES[configuration.packageManager];
  const diagnostics = DIAGNOSTICS_PROFILES[configuration.diagnostics];
  const virtualMemory = configuration.virtualMemory;
  const architectureCount = configuration.supportedArchitectures.length;

  const syscallPermutationFactor = 1 - Math.min(
    0.12,
    Math.log2(Math.max(1, configuration.syscallCount / 64)) * 0.025,
  );
  const processFactor = 0.9 + Math.min(0.18, Math.log10(Math.max(1, configuration.maxProcesses)) / 10);
  const architectureCompatibility = Math.min(1.2, 0.88 + architectureCount * 0.12);
  const architectureMaintainability = 1 - Math.min(0.15, Math.max(0, architectureCount - 1) * 0.05);

  let memoryFootprintMb = 24;
  memoryFootprintMb *= kernel.footprint;
  memoryFootprintMb += memory.overheadMb;
  memoryFootprintMb += modules.footprintMb;
  memoryFootprintMb += drivers.footprintMb;
  memoryFootprintMb += virtualMemory ? 6 : 0;
  memoryFootprintMb += Math.min(24, configuration.syscallCount * 0.03);
  memoryFootprintMb += Math.sqrt(Math.max(1, configuration.maxProcesses)) * 0.55;
  memoryFootprintMb += Math.max(0, architectureCount - 1) * 5;
  memoryFootprintMb += address.footprintMb;
  memoryFootprintMb += filesystem.footprintMb;
  memoryFootprintMb += configuration.diagnostics === "telemetry" ? 6 : 0;
  memoryFootprintMb += configuration.encryption === "full-disk" ? 4 : 0;
  memoryFootprintMb = clamp(memoryFootprintMb, 16, 4_096);

  let bootTimeSeconds = bootloader.seconds + 2;
  bootTimeSeconds += memoryFootprintMb / 85;
  bootTimeSeconds += (modules.footprintMb + drivers.footprintMb) * 0.035;
  bootTimeSeconds += configuration.syscallCount / 600;
  bootTimeSeconds += address.bootSeconds;
  bootTimeSeconds += virtualMemory ? 1.2 : 0;
  bootTimeSeconds += (kernel.boot - 1) * 5;
  bootTimeSeconds = clamp(bootTimeSeconds, 1, 600);

  const performanceScore = clamp(
    55
      * kernel.performance
      * scheduler.throughput
      * memory.performance
      * drivers.performance
      * ipc.throughput
      * syscallPermutationFactor
      * processFactor
      * address.performance
      * filesystem.performance
      * encryption.performance
      * (virtualMemory ? 0.96 : 1),
    0,
    100,
  );

  const stabilityScore = clamp(
    62
      * kernel.stability
      * memory.stability
      * ipc.stability
      * scheduler.stability
      * drivers.stability
      * bootloader.security
      * modules.stability
      * driverFramework.stability
      * permissions.stability
      * diagnostics.stability
      * (virtualMemory ? 1.05 : 1),
    0,
    100,
  );

  const securityScore = clamp(
    58
      * kernel.security
      * memory.security
      * ipc.security
      * drivers.security
      * bootloader.security
      * modules.security
      * permissions.security
      * encryption.security
      * updates.security
      * packageManager.security
      * network.security
      * driverFramework.stability
      * (virtualMemory ? 1.06 : 1),
    0,
    100,
  );

  const syscallAdoption = 0.8 + 0.2 * Math.min(1, configuration.syscallCount / 256);
  const compatibilityScore = clamp(
    55
      * bootloader.compatibility
      * modules.compatibility
      * kernel.compatibility
      * address.compatibility
      * architectureCompatibility
      * driverFramework.compatibility
      * network.compatibility
      * syscallAdoption,
    0,
    100,
  );

  const energyEfficiencyScore = clamp(
    65
      * scheduler.energy
      * kernel.energy
      * memory.energy
      * clamp(1 - memoryFootprintMb / 5_000, 0.7, 1)
      * (virtualMemory ? 0.92 : 1),
    0,
    100,
  );

  const maintainabilityScore = clamp(
    55
      * kernel.maintainability
      * modules.maintainability
      * drivers.maintainability
      * bootloader.maintainability
      * address.maintainability
      * driverFramework.maintainability
      * architectureMaintainability,
    0,
    100,
  );

  const ipcLatencyMicroseconds = clamp(
    12
      * kernel.ipcLatency
      * ipc.latency
      * scheduler.latency
      * (virtualMemory ? 1.04 : 1),
    0.5,
    5_000,
  );

  const syscallOverheadNanoseconds = clamp(
    220
      * kernel.syscall
      * scheduler.latency
      * (virtualMemory ? 1.02 : 1)
      * (1 - Math.min(0.1, configuration.syscallCount / 10_240)),
    10,
    20_000,
  );

  const latencyScore = clamp(100 - Math.max(0, ipcLatencyMicroseconds - 4) * 4, 0, 100);
  const syscallScore = clamp(100 - Math.max(0, syscallOverheadNanoseconds - 80) / 7, 0, 100);
  const driverCoverageScore = clamp(
    driverFramework.coverage * (configuration.moduleSupport === "none" ? 0.9 : 1),
    0,
    100,
  );
  const dataIntegrityScore = clamp(
    filesystem.dataIntegrity
      * encryption.dataIntegrity
      * memory.stability
      * (virtualMemory ? 1.03 : 0.92),
    0,
    100,
  );
  const networkScore = network.score;
  const diagnosticsScore = diagnostics.score;
  const updateReadinessScore = clamp(
    updates.readiness
      * packageManager.readiness
      * (configuration.encryption === "none" ? 1 : 1.03),
    0,
    100,
  );
  const annualMaintenanceCostUsd = Math.round(
    120
      + (
        filesystem.maintenanceCostUsd
        + driverFramework.maintenanceCostUsd
        + network.maintenanceCostUsd
        + permissions.maintenanceCostUsd
        + encryption.maintenanceCostUsd
        + updates.maintenanceCostUsd
        + packageManager.maintenanceCostUsd
        + diagnostics.maintenanceCostUsd
      ) * 45,
  );
  const updateLatencyDays = Math.max(
    1,
    Math.round(updates.latencyDays * (configuration.packageManager === "none" ? 1 : 0.8)),
  );
  const systemQualityScore = clamp(
    driverCoverageScore * 0.24
      + dataIntegrityScore * 0.2
      + networkScore * 0.18
      + diagnosticsScore * 0.12
      + updateReadinessScore * 0.14
      + securityScore * 0.12,
    0,
    100,
  );
  const weights = OVERALL_WEIGHTS[configuration.targetPlatform];

  const overallScore = clamp(
    performanceScore * weights.performance
    + stabilityScore * weights.stability
    + securityScore * weights.security
    + compatibilityScore * weights.compatibility
    + energyEfficiencyScore * weights.energy
    + latencyScore * weights.latency
    + syscallScore * weights.syscall,
    0,
    100,
  );

  return {
    bootTimeSeconds: round(bootTimeSeconds, 1),
    memoryFootprintMb: round(memoryFootprintMb, 1),
    performanceScore: round(performanceScore, 1),
    stabilityScore: round(stabilityScore, 1),
    securityScore: round(securityScore, 1),
    compatibilityScore: round(compatibilityScore, 1),
    energyEfficiencyScore: round(energyEfficiencyScore, 1),
    maintainabilityScore: round(maintainabilityScore, 1),
    ipcLatencyMicroseconds: round(ipcLatencyMicroseconds, 2),
    syscallOverheadNanoseconds: round(syscallOverheadNanoseconds, 1),
    processCapacity: Math.min(
      configuration.maxProcesses,
      OS_PROCESS_LIMITS_BY_ADDRESS_BITS[configuration.addressBits],
    ),
    systemQualityScore: round(systemQualityScore, 1),
    driverCoverageScore: round(driverCoverageScore, 1),
    dataIntegrityScore: round(dataIntegrityScore, 1),
    networkScore: round(networkScore, 1),
    diagnosticsScore: round(diagnosticsScore, 1),
    updateReadinessScore: round(updateReadinessScore, 1),
    annualMaintenanceCostUsd: round(annualMaintenanceCostUsd, 0),
    updateLatencyDays: round(updateLatencyDays, 0),
    overallScore: round(overallScore, 1),
  };
}

export function evaluateOsRequirements(
  configuration: OsConfiguration,
  metrics: OsKernelMetrics = calculateOsKernelMetrics(configuration),
): OsRequirementResult[] {
  return OS_PLATFORM_REQUIREMENTS[configuration.targetPlatform].map((rule) => {
    const actual = metrics[rule.metric];
    const satisfied = rule.comparator === "at-least"
      ? actual >= rule.target
      : actual <= rule.target;

    return { ...rule, actual, satisfied };
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
