import { describe, expect, it } from "vitest";
import {
  buildSuggestedDeviceConfiguration,
  createDeviceProject,
  createDefaultDeviceConfiguration,
  parseDeviceProject,
  saveDeviceVersion,
  validateDeviceConfiguration,
  type DeviceConfiguration,
  type DeviceReferenceContext,
} from "./devices";
import {
  createComponentProject,
  createDefaultComponentConfiguration,
  type ComponentConfiguration,
  type ComponentType,
} from "./components";
import { createCpuProject, createDefaultCpuConfiguration } from "./cpu";
import { createDefaultOsConfiguration, createOsProject, type OsProject } from "./os";

const DATE = "1995-01-01";

function createContext(): DeviceReferenceContext {
  const cpuProjects = [
    createCpuProject("cpu-1", "Dynasty Core", {
      ...createDefaultCpuConfiguration(),
      memoryStandard: "ddr",
    }, DATE),
  ];
  const componentProjects = (["motherboard", "ram", "ssd", "gpu", "networking"] as ComponentType[])
    .map((type) => createComponentProject(
      `component-${type}`,
      `${type} project`,
      type,
      type === "motherboard"
        ? ({ ...createDefaultComponentConfiguration("motherboard"), pcieGeneration: 3 } as ComponentConfiguration)
        : createDefaultComponentConfiguration(type),
      DATE,
    ));
  const osConfiguration = {
    ...createDefaultOsConfiguration(),
    driverFramework: "acpi" as const,
  };
  const baseOs = createOsProject("os-1", "Dynasty OS", osConfiguration, DATE);
  const osProjects: OsProject[] = [{
    ...baseOs,
    releases: [{
      id: "os-release-1",
      version: 1,
      stage: "stable",
      createdOn: DATE,
      configuration: osConfiguration,
      qualityScore: 60,
      appealScore: 55,
      costUsd: 80_000,
    }],
  }];

  return { cpuProjects, componentProjects, osProjects, aiProjects: [] };
}

function createDevice(context: DeviceReferenceContext): DeviceConfiguration {
  return {
    ...buildSuggestedDeviceConfiguration("desktop", context),
    gpuProjectId: null,
    networkingProjectId: null,
    aiAcceleratorProjectId: null,
  };
}

describe("device domain", () => {
  it("builds and validates a compatible suggested device", () => {
    const context = createContext();
    const configuration = createDevice(context);
    const result = validateDeviceConfiguration(configuration, context);

    expect(result.issues).toEqual([]);
    expect(result.valid).toBe(true);
    expect(configuration.cpuProjectId).toBe("cpu-1");
    expect(configuration.osReleaseId).toBe("os-release-1");
  });

  it("detects missing references, slot mismatches and OS platform mismatches", () => {
    const context = createContext();
    const configuration = createDevice(context);

    const missingRam = validateDeviceConfiguration({ ...configuration, ramProjectId: "" }, context);
    expect(missingRam.issues.map((issue) => issue.code)).toContain("required-reference");

    const wrongSlot = validateDeviceConfiguration({
      ...configuration,
      ramProjectId: "component-gpu",
    }, context);
    expect(wrongSlot.issues.map((issue) => issue.code)).toContain("component-type-mismatch");

    const mobile = validateDeviceConfiguration({
      ...configuration,
      type: "smartphone",
    }, context);
    expect(mobile.issues.map((issue) => issue.code)).toContain("os-platform-mismatch");
  });

  it("rejects structurally incomplete devices and persists versions", () => {
    const context = createContext();
    const configuration = createDevice(context);
    const project = createDeviceProject("device-1", "Dynasty Desktop", configuration, DATE);

    expect(project.versions).toHaveLength(1);
    expect(() => createDeviceProject(
      "device-2",
      "Incomplete",
      createDefaultDeviceConfiguration("desktop"),
      DATE,
    )).toThrow();

    const saved = saveDeviceVersion(project, "Dynasty Desktop", {
      ...configuration,
      type: "workstation",
    }, "1995-01-02");

    expect(saved.versions.map((version) => version.version)).toEqual([1, 2]);
    expect(saved.configuration.type).toBe("workstation");
    expect(parseDeviceProject(saved)).toEqual(saved);
  });

  it("rejects a mismatched top-level configuration snapshot", () => {
    const context = createContext();
    const configuration = createDevice(context);
    const project = createDeviceProject("device-1", "Dynasty Desktop", configuration, DATE);
    const tampered = {
      ...project,
      configuration: { ...configuration, type: "server" as const },
    };

    expect(() => parseDeviceProject(tampered)).toThrow();
  });
});
