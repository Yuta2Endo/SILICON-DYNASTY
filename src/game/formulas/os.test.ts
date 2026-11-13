import { describe, expect, it } from "vitest";
import { createDefaultOsConfiguration, type OsConfiguration } from "../models/os";
import { calculateOsKernelMetrics, evaluateOsRequirements } from "./os";

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
});
