import { describe, expect, it } from "vitest";
import {
  buildSuggestedCloudConfiguration,
  createCloudProject,
  createDefaultCloudConfiguration,
  parseCloudProject,
  saveCloudVersion,
  validateCloudConfiguration,
  type CloudReferenceContext,
} from "./cloud";
import {
  buildSuggestedDeviceConfiguration,
  createDeviceProject,
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

function createContext(): CloudReferenceContext {
  const cpuProjects = [createCpuProject("cpu-1", "Dynasty Core", {
    ...createDefaultCpuConfiguration(),
    memoryStandard: "ddr",
  }, DATE)];
  const componentProjects = (["motherboard", "ram", "ssd", "networking"] as ComponentType[])
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
    targetPlatform: "server" as const,
    driverFramework: "acpi" as const,
  };
  const baseOs = createOsProject("os-1", "Dynasty Server OS", osConfiguration, DATE);
  const osProjects: OsProject[] = [{
    ...baseOs,
    releases: [{
      id: "os-release-1",
      version: 1,
      stage: "stable",
      createdOn: DATE,
      configuration: osConfiguration,
      qualityScore: 70,
      appealScore: 65,
      costUsd: 80_000,
    }],
  }];
  const baseContext: DeviceReferenceContext = {
    cpuProjects,
    componentProjects,
    osProjects,
    aiProjects: [],
  };
  const serverConfiguration: DeviceConfiguration = {
    ...buildSuggestedDeviceConfiguration("server", baseContext),
    gpuProjectId: null,
    aiAcceleratorProjectId: null,
  };
  const server = createDeviceProject("device-1", "Dynasty Server", serverConfiguration, DATE);
  return { ...baseContext, deviceProjects: [server] };
}

describe("cloud domain", () => {
  it("builds and validates a cloud around a server device", () => {
    const context = createContext();
    const configuration = buildSuggestedCloudConfiguration(context.deviceProjects);
    const result = validateCloudConfiguration(configuration, context);

    expect(result.valid).toBe(true);
    expect(configuration.serverDeviceProjectId).toBe("device-1");
    expect(configuration.dataCenters).toBe(1);
  });

  it("rejects non-server devices and out-of-range capacity", () => {
    const context = createContext();
    const configuration = buildSuggestedCloudConfiguration(context.deviceProjects);

    const invalidCapacity = validateCloudConfiguration({
      ...configuration,
      dataCenters: 0,
      storageTb: 0,
    }, context);
    expect(invalidCapacity.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["range", "range"]),
    );

    const noServer = validateCloudConfiguration({
      ...configuration,
      serverDeviceProjectId: "",
    }, context);
    expect(noServer.issues.map((issue) => issue.code)).toContain("required-reference");
  });

  it("versions and round-trips cloud projects", () => {
    const context = createContext();
    const configuration = buildSuggestedCloudConfiguration(context.deviceProjects);
    const project = createCloudProject("cloud-1", "Dynasty Cloud", configuration, DATE);
    const saved = saveCloudVersion(project, "Dynasty Cloud", {
      ...configuration,
      dataCenters: 3,
      redundancy: 3,
    }, "1995-01-02");

    expect(saved.versions.map((version) => version.version)).toEqual([1, 2]);
    expect(saved.configuration.dataCenters).toBe(3);
    expect(parseCloudProject(saved)).toEqual(saved);
    expect(() => createCloudProject(
      "cloud-2",
      "Empty Cloud",
      createDefaultCloudConfiguration(),
      DATE,
    )).toThrow();
  });
});
