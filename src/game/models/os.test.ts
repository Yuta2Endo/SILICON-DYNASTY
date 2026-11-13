import { describe, expect, it } from "vitest";
import {
  InvalidOsDataError,
  OS_PROCESS_LIMITS_BY_ADDRESS_BITS,
  checkOsHardwareCompatibility,
  cloneOsConfiguration,
  createDefaultOsConfiguration,
  createOsProject,
  osConfigurationsEqual,
  parseOsConfiguration,
  parseOsProject,
  saveOsVersion,
  validateOsConfiguration,
  validateOsProjectName,
  type OsConfiguration,
} from "./os";

function configuration(overrides: Partial<OsConfiguration> = {}): OsConfiguration {
  return { ...createDefaultOsConfiguration(), ...overrides };
}

describe("OS configuration validation", () => {
  it("round-trips the default configuration and detects copies", () => {
    const initial = createDefaultOsConfiguration();
    const parsed = parseOsConfiguration(initial);
    const copy = cloneOsConfiguration(initial);

    expect(parsed).toEqual(initial);
    expect(copy).not.toBe(initial);
    expect(osConfigurationsEqual(parsed, initial)).toBe(true);
    expect(osConfigurationsEqual({ ...initial, syscallCount: 256 }, initial)).toBe(false);
  });

  it("validates integer ranges, architecture selection, and process limits", () => {
    const tooFewSyscalls = validateOsConfiguration(configuration({ syscallCount: 8 }));
    const tooManyProcesses = validateOsConfiguration(configuration({ maxProcesses: 100_001 }));
    const noArchitectures = validateOsConfiguration(configuration({ supportedArchitectures: [] }));
    const duplicateArchitectures = validateOsConfiguration(
      configuration({ supportedArchitectures: ["x86", "x86"] }),
    );

    expect(tooFewSyscalls.errors.syscallCount?.code).toBe("integer");
    expect(tooManyProcesses.errors.maxProcesses).toEqual({ code: "process-limit", max: 100_000 });
    expect(noArchitectures.errors.supportedArchitectures?.code).toBe("empty-selection");
    expect(duplicateArchitectures.errors.supportedArchitectures?.code).toBe("duplicate-option");
    expect(OS_PROCESS_LIMITS_BY_ADDRESS_BITS[16]).toBe(4_096);
  });

  it("enforces architecture and subsystem constraints", () => {
    const virtualMemoryWithoutPaging = validateOsConfiguration(
      configuration({ memoryManager: "flat", virtualMemory: true }),
    );
    const microkernelWithPipes = validateOsConfiguration(
      configuration({ kernelType: "microkernel", ipcModel: "pipes", driverModel: "user-space" }),
    );
    const microkernelWithKernelDrivers = validateOsConfiguration(
      configuration({ kernelType: "microkernel", ipcModel: "message-passing", driverModel: "in-kernel" }),
    );
    const monolithicWithUserDrivers = validateOsConfiguration(
      configuration({ kernelType: "monolithic", driverModel: "user-space" }),
    );
    const userModulesWithoutMicrokernel = validateOsConfiguration(
      configuration({ kernelType: "monolithic", moduleSupport: "user-space" }),
    );
    const modularWithoutModules = validateOsConfiguration(
      configuration({ kernelType: "modular", moduleSupport: "none" }),
    );

    expect(virtualMemoryWithoutPaging.errors.virtualMemory?.code).toBe(
      "virtual-memory-requires-paging",
    );
    expect(microkernelWithPipes.errors.ipcModel?.code).toBe("microkernel-ipc");
    expect(microkernelWithKernelDrivers.errors.driverModel?.code).toBe("microkernel-drivers");
    expect(monolithicWithUserDrivers.errors.driverModel?.code).toBe("monolithic-user-drivers");
    expect(userModulesWithoutMicrokernel.errors.moduleSupport?.code).toBe(
      "user-space-modules-require-microkernel",
    );
    expect(modularWithoutModules.errors.moduleSupport?.code).toBe("modular-requires-modules");
  });

  it("gates bootloaders and 64-bit addressing by the current year", () => {
    const uefiIn1995 = validateOsConfiguration(configuration({ bootloader: "uefi" }), {
      currentYear: 1995,
    });
    const uefiIn2005 = validateOsConfiguration(configuration({ bootloader: "uefi" }), {
      currentYear: 2005,
    });
    const corebootIn1998 = validateOsConfiguration(configuration({ bootloader: "coreboot" }), {
      currentYear: 1998,
    });
    const sixtyFourBitIn2002 = validateOsConfiguration(configuration({ addressBits: 64 }), {
      currentYear: 2002,
    });

    expect(uefiIn1995.errors.bootloader).toEqual({ code: "future-technology", minYear: 2005 });
    expect(uefiIn2005.valid).toBe(true);
    expect(corebootIn1998.errors.bootloader).toEqual({ code: "future-technology", minYear: 1999 });
    expect(sixtyFourBitIn2002.errors.addressBits).toEqual({
      code: "future-technology",
      minYear: 2003,
    });
  });

  it("rejects invalid or incomplete persisted configurations", () => {
    expect(() => parseOsConfiguration({ ...createDefaultOsConfiguration(), kernelType: "quantum" }))
      .toThrow(InvalidOsDataError);
    expect(() => parseOsConfiguration({ targetPlatform: "desktop" })).toThrow(InvalidOsDataError);
  });

  it("enforces system-service constraints and era gates", () => {
    const zfsOn32Bit = validateOsConfiguration(
      configuration({ filesystem: "zfs", addressBits: 32 }),
      { currentYear: 2010 },
    );
    const encryptionWithoutSecurity = validateOsConfiguration(
      configuration({ permissions: "none", encryption: "disk" }),
      { currentYear: 2010 },
    );
    const rollingWithoutPackages = validateOsConfiguration(
      configuration({ updateModel: "rolling", packageManager: "none" }),
      { currentYear: 2010 },
    );
    const cloudIn2002 = validateOsConfiguration(configuration({ networkStack: "cloud" }), {
      currentYear: 2002,
    });
    const telemetryIn2007 = validateOsConfiguration(configuration({ diagnostics: "telemetry" }), {
      currentYear: 2007,
    });

    expect(zfsOn32Bit.errors.filesystem?.code).toBe("filesystem-requires-64-bit");
    expect(encryptionWithoutSecurity.errors.encryption?.code).toBe(
      "encryption-requires-security",
    );
    expect(rollingWithoutPackages.errors.updateModel?.code).toBe(
      "rolling-updates-require-package-manager",
    );
    expect(cloudIn2002.errors.networkStack).toEqual({
      code: "future-technology",
      minYear: 2010,
    });
    expect(telemetryIn2007.errors.diagnostics).toEqual({
      code: "future-technology",
      minYear: 2008,
    });
  });

  it("migrates legacy configurations only when system fields are allowed to be missing", () => {
    const legacy = { ...createDefaultOsConfiguration() } as Record<string, unknown>;
    for (const field of [
      "filesystem",
      "driverFramework",
      "networkStack",
      "permissions",
      "encryption",
      "updateModel",
      "packageManager",
      "diagnostics",
    ]) {
      delete legacy[field];
    }

    expect(() => parseOsConfiguration(legacy)).toThrow(InvalidOsDataError);
    expect(parseOsConfiguration(legacy, { allowMissingSystems: true })).toEqual(
      createDefaultOsConfiguration(),
    );
  });
});

describe("OS projects and versions", () => {
  it("creates a versioned project and appends a version without mutating the original", () => {
    const initial = createDefaultOsConfiguration();
    const project = createOsProject("os-1", "  Dynasty OS  ", initial, "1995-01-01");
    const saved = saveOsVersion(
      project,
      "Dynasty OS 2",
      configuration({ kernelType: "hybrid", moduleSupport: "loadable" }),
      "1996-01-01",
    );

    expect(project.name).toBe("Dynasty OS");
    expect(project.versions).toHaveLength(1);
    expect(saved.versions.map((version) => version.version)).toEqual([1, 2]);
    expect(saved.configuration.kernelType).toBe("hybrid");
    expect(saved.name).toBe("Dynasty OS 2");
    expect(project.configuration.kernelType).toBe("monolithic");
  });

  it("round-trips a project and rejects a mismatched latest version", () => {
    const project = createOsProject(
      "os-1",
      "Dynasty OS",
      createDefaultOsConfiguration(),
      "1995-01-01",
    );
    const parsed = parseOsProject(project, "1995-01-01");
    const mismatched = { ...project, configuration: { ...project.configuration, syscallCount: 512 } };

    expect(parsed).toEqual(project);
    expect(() => parseOsProject(mismatched, "1995-01-01")).toThrow(InvalidOsDataError);
  });

  it("rejects invalid names, dates, and future configurations", () => {
    expect(validateOsProjectName(" ")).toEqual({ code: "required" });
    expect(validateOsProjectName("A")).toEqual({ code: "length", min: 2, max: 40 });
    expect(() =>
      createOsProject("os-1", "Dynasty OS", createDefaultOsConfiguration(), "1995-02-30"),
    ).toThrow(InvalidOsDataError);
    expect(() =>
      createOsProject(
        "os-1",
        "Dynasty OS",
        configuration({ bootloader: "uefi" }),
        "1995-01-01",
      ),
    ).toThrow(InvalidOsDataError);

    const project = createOsProject(
      "os-1",
      "Dynasty OS",
      createDefaultOsConfiguration(),
      "1995-01-01",
    );
    expect(() =>
      saveOsVersion(project, "Dynasty OS", configuration({ addressBits: 64 }), "1995-01-01"),
    ).toThrow(InvalidOsDataError);
  });
});

describe("OS hardware compatibility", () => {
  it("detects unsupported CPU architectures", () => {
    const results = checkOsHardwareCompatibility(createDefaultOsConfiguration(), [
      { id: "cpu-1", name: "ARM Processor", kind: "cpu", architecture: "arm" },
      { id: "cpu-2", name: "x86 Processor", kind: "cpu", architecture: "x86" },
    ]);

    expect(results[0]?.compatible).toBe(false);
    expect(results[0]?.issues.map((issue) => issue.code)).toContain("unsupported-architecture");
    expect(results[1]?.compatible).toBe(true);
  });

  it("requires progressively newer driver frameworks for modern hardware", () => {
    const targets = [
      { id: "gpu-1", name: "PCIe 5 GPU", kind: "gpu" as const, bus: "pcie-5" as const },
      { id: "ssd-1", name: "NVMe SSD", kind: "ssd" as const, storageInterface: "nvme" as const, storageFormFactor: "m2" as const },
      { id: "ai-1", name: "NVLink Accelerator", kind: "ai-accelerator" as const, aiInterconnect: "nvlink" as const },
      { id: "net-1", name: "Fiber Adapter", kind: "networking" as const, networkStandard: "infiniband" as const, networkMedium: "fiber" as const },
    ];
    const legacy = checkOsHardwareCompatibility(configuration({ driverFramework: "legacy" }), targets);
    const unified = checkOsHardwareCompatibility(configuration({ driverFramework: "unified" }), targets);
    const certified = checkOsHardwareCompatibility(
      configuration({ driverFramework: "certified", networkStack: "advanced" }),
      targets,
    );

    expect(legacy[0]?.compatible).toBe(false);
    expect(legacy[1]?.issues.map((issue) => issue.code)).toContain("storage-driver-unsupported");
    expect(unified[1]?.compatible).toBe(true);
    expect(unified[2]?.issues.map((issue) => issue.code)).toContain("ai-driver-unsupported");
    expect(certified.every((result) => result.compatible)).toBe(true);
  });

  it("requires an appropriate network stack for advanced adapters", () => {
    const fiber = {
      id: "net-1",
      name: "Fiber Adapter",
      kind: "networking" as const,
      networkStandard: "ethernet" as const,
      networkMedium: "fiber" as const,
    };

    expect(
      checkOsHardwareCompatibility(configuration({ networkStack: "basic" }), [fiber])[0]?.issues[0]?.code,
    ).toBe("network-driver-unsupported");
    expect(
      checkOsHardwareCompatibility(configuration({ networkStack: "tcp-ip" }), [fiber])[0]?.compatible,
    ).toBe(true);
  });
});
