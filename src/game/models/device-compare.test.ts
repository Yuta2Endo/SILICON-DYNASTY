import { describe, expect, it } from "vitest";
import { compareDeviceConfigurations } from "./device-compare";
import { createDefaultDeviceConfiguration } from "./devices";

describe("compareDeviceConfigurations", () => {
  it("returns no changes for identical configurations", () => {
    const configuration = createDefaultDeviceConfiguration("desktop");
    expect(compareDeviceConfigurations(configuration, configuration)).toEqual([]);
  });

  it("reports scalar and reference changes in stable field order", () => {
    const before = createDefaultDeviceConfiguration("desktop");
    const after = {
      ...before,
      type: "laptop" as const,
      cpuProjectId: "cpu-1",
      cpuVersion: 2,
      gpuProjectId: "component-2",
    };

    expect(compareDeviceConfigurations(before, after)).toEqual([
      { field: "type", before: "desktop", after: "laptop" },
      { field: "cpuProjectId", before: "", after: "cpu-1" },
      { field: "cpuVersion", before: 1, after: 2 },
      { field: "gpuProjectId", before: null, after: "component-2" },
    ]);
  });

  it("detects optional reference removal", () => {
    const before = {
      ...createDefaultDeviceConfiguration("gaming"),
      gpuProjectId: "component-1",
      networkingProjectId: "component-2",
    };
    const after = { ...before, gpuProjectId: null };

    expect(compareDeviceConfigurations(before, after)).toEqual([
      { field: "gpuProjectId", before: "component-1", after: null },
    ]);
  });
});
