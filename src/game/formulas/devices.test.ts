import { describe, expect, it } from "vitest";
import {
  buildSuggestedDeviceConfiguration,
  createDeviceProject,
  type DeviceConfiguration,
  type DeviceReferenceContext,
} from "../models/devices";
import { buildSuggestedCloudConfiguration, type CloudReferenceContext } from "../models/cloud";
import {
  createComponentProject,
  createDefaultComponentConfiguration,
  type ComponentConfiguration,
  type ComponentType,
} from "../models/components";
import { createCpuProject, createDefaultCpuConfiguration } from "../models/cpu";
import { createDefaultOsConfiguration, createOsProject, type OsProject } from "../models/os";
import { calculateCloudMetrics } from "./cloud";
import { calculateDeviceMetrics, calculateEcosystemSynergy } from "./devices";

const DATE = "1995-01-01";

function createOsProjects(platform: "desktop" | "mobile" | "server" = "desktop"): OsProject[] {
  const configuration = {
    ...createDefaultOsConfiguration(),
    targetPlatform: platform,
    driverFramework: "acpi" as const,
  };
  const base = createOsProject("os-1", "Dynasty OS", configuration, DATE);
  return [{
    ...base,
    releases: [{
      id: "os-release-1",
      version: 1,
      stage: "stable",
      createdOn: DATE,
      configuration,
      qualityScore: 62,
      appealScore: 58,
      costUsd: 80_000,
    }],
  }];
}

function createContext(platform: "desktop" | "mobile" | "server" = "desktop"): DeviceReferenceContext {
  return {
    cpuProjects: [createCpuProject("cpu-1", "Dynasty Core", {
      ...createDefaultCpuConfiguration(),
      memoryStandard: "ddr",
    }, DATE)],
    componentProjects: (["motherboard", "ram", "ssd", "gpu", "networking"] as ComponentType[])
      .map((type) => createComponentProject(
        `component-${type}`,
        `${type} project`,
        type,
        type === "motherboard"
          ? ({ ...createDefaultComponentConfiguration("motherboard"), pcieGeneration: 3 } as ComponentConfiguration)
          : createDefaultComponentConfiguration(type),
        DATE,
      )),
    osProjects: createOsProjects(platform),
    aiProjects: [],
  };
}

function desktopConfiguration(context: DeviceReferenceContext): DeviceConfiguration {
  return {
    ...buildSuggestedDeviceConfiguration("desktop", context),
    gpuProjectId: null,
    networkingProjectId: null,
    aiAcceleratorProjectId: null,
  };
}

describe("device formulas", () => {
  it("calculates bounded device metrics and real cost/power inputs", () => {
    const context = createContext();
    const metrics = calculateDeviceMetrics(desktopConfiguration(context), context);

    expect(metrics.overallScore).toBeGreaterThan(0);
    expect(metrics.overallScore).toBeLessThanOrEqual(100);
    expect(metrics.compatibilityScore).toBe(100);
    expect(metrics.unitCostUsd).toBeGreaterThan(0);
    expect(metrics.powerW).toBeGreaterThan(0);
    expect(metrics.memoryGb).toBeGreaterThan(0);
    expect(metrics.storageGb).toBeGreaterThan(0);
  });

  it("rewards a matching OS platform over a mismatched one", () => {
    const desktopContext = createContext("desktop");
    const mobileContext = createContext("mobile");
    const desktopMetrics = calculateDeviceMetrics(desktopConfiguration(desktopContext), desktopContext);
    const mobileMetrics = calculateDeviceMetrics(desktopConfiguration(desktopContext), mobileContext);

    expect(desktopMetrics.osIntegrationScore).toBeGreaterThan(mobileMetrics.osIntegrationScore);
  });

  it("keeps ecosystem synergy bounded and changes with OS integration", () => {
    const synergy = calculateEcosystemSynergy({
      cpuScore: 80,
      gpuScore: 60,
      aiCapabilityScore: 40,
      osIntegrationScore: 70,
      applicationCoverage: 0.5,
      networkScore: 50,
      platformMatch: true,
    });
    const weak = calculateEcosystemSynergy({
      cpuScore: 80,
      gpuScore: 60,
      aiCapabilityScore: 40,
      osIntegrationScore: 20,
      applicationCoverage: 0.5,
      networkScore: 50,
      platformMatch: true,
    });

    expect(synergy).toBeGreaterThan(weak);
    expect(synergy).toBeGreaterThanOrEqual(0);
    expect(synergy).toBeLessThanOrEqual(100);
  });

  it("scales cloud capacity and operating cost from the server device", () => {
    const context = createContext("server");
    const serverConfiguration = {
      ...buildSuggestedDeviceConfiguration("server", context),
      gpuProjectId: null,
      aiAcceleratorProjectId: null,
    };
    const server = createDeviceProject("device-1", "Dynasty Server", serverConfiguration, DATE);
    const cloudContext: CloudReferenceContext = { ...context, deviceProjects: [server] };
    const configuration = buildSuggestedCloudConfiguration([server]);
    const single = calculateCloudMetrics(configuration, cloudContext);
    const scaled = calculateCloudMetrics({ ...configuration, dataCenters: 2 }, cloudContext);

    expect(single.computeUnits).toBeGreaterThan(0);
    expect(single.operatingCostPerDayUsd).toBeGreaterThan(0);
    expect(scaled.computeUnits).toBeGreaterThan(single.computeUnits);
    expect(scaled.operatingCostPerDayUsd).toBeGreaterThan(single.operatingCostPerDayUsd);
    expect(scaled.availability).toBeGreaterThanOrEqual(single.availability);
  });
});
