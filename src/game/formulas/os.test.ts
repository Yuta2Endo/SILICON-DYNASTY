import { describe, expect, it } from "vitest";
import { createDefaultOsConfiguration, type OsConfiguration } from "../models/os";
import { checkOsApplicationCompatibility } from "../models/os-applications";
import {
  calculateOsEcosystemMetrics,
  calculateOsKernelMetrics,
  calculateOsReleaseMetrics,
  evaluateOsRequirements,
  getNextOsReleaseStage,
  getOsReleaseStageCost,
  OS_RELEASE_STAGE_COSTS_USD,
} from "./os";

function configuration(overrides: Partial<OsConfiguration> = {}): OsConfiguration {
  return { ...createDefaultOsConfiguration(), ...overrides };
}

const microkernel: OsConfiguration = configuration({
  kernelType: "microkernel",
  ipcModel: "message-passing",
  driverModel: "user-space",
  moduleSupport: "user-space",
});

describe("OS kernel metrics", () => {
  it("is deterministic and produces the expected 1995 desktop profile", () => {
    const initial = createDefaultOsConfiguration();
    const first = calculateOsKernelMetrics(initial);
    const second = calculateOsKernelMetrics(initial);

    expect(first).toEqual(second);
    expect(first.performanceScore).toBeGreaterThanOrEqual(45);
    expect(first.stabilityScore).toBeGreaterThanOrEqual(45);
    expect(first.bootTimeSeconds).toBeGreaterThan(0);
    expect(first.memoryFootprintMb).toBeGreaterThan(0);
  });

  it("makes kernel architecture trade-offs visible in the metrics", () => {
    const monolithic = calculateOsKernelMetrics(createDefaultOsConfiguration());
    const micro = calculateOsKernelMetrics(microkernel);

    expect(monolithic.performanceScore).toBeGreaterThan(micro.performanceScore);
    expect(micro.securityScore).toBeGreaterThan(monolithic.securityScore);
    expect(micro.stabilityScore).toBeGreaterThan(monolithic.stabilityScore);
    expect(micro.ipcLatencyMicroseconds).toBeGreaterThan(monolithic.ipcLatencyMicroseconds);
    expect(micro.maintainabilityScore).toBeGreaterThan(monolithic.maintainabilityScore);
  });

  it("reflects bootloader, addressing, and supported architecture choices", () => {
    const bios = calculateOsKernelMetrics(configuration({ bootloader: "bios" }));
    const uefi = calculateOsKernelMetrics(configuration({ bootloader: "uefi" }));
    const modern = calculateOsKernelMetrics(
      configuration({ bootloader: "uefi", addressBits: 64, supportedArchitectures: ["x86"] }),
    );
    const universal = calculateOsKernelMetrics(
      configuration({
        bootloader: "uefi",
        addressBits: 64,
        supportedArchitectures: ["x86", "arm", "risc-v"],
      }),
    );
    const sixteenBit = calculateOsKernelMetrics(
      configuration({ addressBits: 16, maxProcesses: 800_000 }),
    );

    expect(uefi.bootTimeSeconds).toBeLessThan(bios.bootTimeSeconds);
    expect(uefi.compatibilityScore).toBeGreaterThan(bios.compatibilityScore);
    expect(modern.compatibilityScore).toBeGreaterThan(bios.compatibilityScore);
    expect(universal.compatibilityScore).toBeGreaterThan(modern.compatibilityScore);
    expect(universal.maintainabilityScore).toBeLessThan(modern.maintainabilityScore);
    expect(sixteenBit.processCapacity).toBe(4_096);
  });

  it("models system services, security, update costs, and maintenance", () => {
    const legacy = calculateOsKernelMetrics(createDefaultOsConfiguration());
    const hardened = calculateOsKernelMetrics(
      configuration({
        filesystem: "zfs",
        driverFramework: "certified",
        networkStack: "advanced",
        permissions: "capability",
        encryption: "hardware",
        updateModel: "rolling",
        packageManager: "signed",
        diagnostics: "crash-dumps",
        addressBits: 64,
        supportedArchitectures: ["x86"],
      }),
    );

    expect(hardened.systemQualityScore).toBeGreaterThan(legacy.systemQualityScore);
    expect(hardened.securityScore).toBeGreaterThan(legacy.securityScore);
    expect(hardened.compatibilityScore).toBeGreaterThan(legacy.compatibilityScore);
    expect(hardened.driverCoverageScore).toBeGreaterThan(legacy.driverCoverageScore);
    expect(hardened.updateLatencyDays).toBeLessThan(legacy.updateLatencyDays);
    expect(hardened.annualMaintenanceCostUsd).toBeGreaterThan(legacy.annualMaintenanceCostUsd);
  });

  it("evaluates platform requirements against calculated metrics", () => {
    const desktop = evaluateOsRequirements(createDefaultOsConfiguration());
    const gaming = evaluateOsRequirements(configuration({ targetPlatform: "gaming" }));

    expect(desktop.length).toBeGreaterThan(0);
    expect(desktop.every((requirement) => requirement.satisfied)).toBe(true);
    expect(gaming.find((requirement) => requirement.id === "performance")?.satisfied).toBe(false);
    expect(gaming.find((requirement) => requirement.id === "boot-time")?.satisfied).toBe(true);
  });

  it("caps process capacity by the selected address width", () => {
    const sixtyFourBit = calculateOsKernelMetrics(
      configuration({ addressBits: 64, maxProcesses: 800_000 }),
    );
    const capped = calculateOsKernelMetrics(
      configuration({ addressBits: 32, maxProcesses: 800_000 }),
    );

    expect(sixtyFourBit.processCapacity).toBe(800_000);
    expect(capped.processCapacity).toBe(100_000);
  });

  it("models ecosystem scores, application coverage, and platform appeal", () => {
    const initial = createDefaultOsConfiguration();
    const initialEcosystem = calculateOsEcosystemMetrics(
      initial,
      calculateOsKernelMetrics(initial),
    );
    const expandedConfiguration = configuration({
      filesystem: "zfs",
      driverFramework: "certified",
      networkStack: "advanced",
      permissions: "capability",
      encryption: "hardware",
      updateModel: "rolling",
      packageManager: "signed",
      diagnostics: "telemetry",
      addressBits: 64,
      supportedArchitectures: ["x86"],
      gui: "modern-desktop",
      sdk: "professional",
      api: "proprietary",
      developerTools: "suite",
      appStore: "open",
    });
    const expandedEcosystem = calculateOsEcosystemMetrics(
      expandedConfiguration,
      calculateOsKernelMetrics(expandedConfiguration),
    );

    expect(initialEcosystem.totalApplications).toBe(6);
    expect(initialEcosystem.compatibleApplications).toBe(1);
    expect(initialEcosystem.ecosystemScore).toBeGreaterThan(0);
    expect(initialEcosystem.platformAppealScore).toBeGreaterThan(0);
    expect(expandedEcosystem.compatibleApplications).toBe(5);
    expect(expandedEcosystem.ecosystemScore).toBeGreaterThan(initialEcosystem.ecosystemScore);
    expect(expandedEcosystem.platformAppealScore).toBeGreaterThan(
      initialEcosystem.platformAppealScore,
    );
  });

  it("checks application requirements against OS capabilities", () => {
    const initial = createDefaultOsConfiguration();
    const metrics = calculateOsKernelMetrics(initial);
    const applications = checkOsApplicationCompatibility(initial, {
      memoryFootprintMb: metrics.memoryFootprintMb,
      securityScore: metrics.securityScore,
    });

    expect(applications.find((application) => application.applicationId === "notes")).toMatchObject({
      compatible: true,
      issues: [],
    });
    expect(
      applications.find((application) => application.applicationId === "web-browser")?.issues,
    ).toContain("gui-required");
    expect(
      applications.find((application) => application.applicationId === "enterprise-console")?.issues,
    ).toEqual(expect.arrayContaining(["gui-required", "sdk-required", "api-unsupported"]));
  });

  it("models release stage costs and quality progression", () => {
    const initial = createDefaultOsConfiguration();
    const alpha = calculateOsReleaseMetrics(initial, "alpha");
    const stable = calculateOsReleaseMetrics(initial, "stable");

    expect(getNextOsReleaseStage("alpha")).toBe("beta");
    expect(getNextOsReleaseStage("beta")).toBe("rc");
    expect(getNextOsReleaseStage("rc")).toBe("stable");
    expect(getNextOsReleaseStage("stable")).toBeNull();
    expect(getOsReleaseStageCost("alpha")).toBe(OS_RELEASE_STAGE_COSTS_USD.alpha);
    expect(getOsReleaseStageCost("stable")).toBe(OS_RELEASE_STAGE_COSTS_USD.stable);
    expect(stable.qualityScore).toBeGreaterThan(alpha.qualityScore);
    expect(stable.appealScore).toBeGreaterThan(alpha.appealScore);
    expect(stable.qualityScore).toBeLessThanOrEqual(100);
  });
});
