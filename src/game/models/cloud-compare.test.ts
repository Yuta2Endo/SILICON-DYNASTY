import { describe, expect, it } from "vitest";
import { compareCloudConfigurations } from "./cloud-compare";
import { createDefaultCloudConfiguration } from "./cloud";

describe("cloud configuration comparison", () => {
  it("returns no changes for identical configurations", () => {
    const configuration = {
      ...createDefaultCloudConfiguration(),
      serverDeviceProjectId: "device-1",
    };

    expect(compareCloudConfigurations(configuration, configuration)).toEqual([]);
  });

  it("reports changes in stable field order", () => {
    const before = {
      ...createDefaultCloudConfiguration(),
      serverDeviceProjectId: "device-1",
    };
    const after = {
      ...before,
      serverDeviceVersion: 2,
      dataCenters: 3,
      storageTb: 4_000,
      redundancy: 3,
    };

    expect(compareCloudConfigurations(before, after)).toEqual([
      { field: "serverDeviceVersion", before: 1, after: 2 },
      { field: "dataCenters", before: 1, after: 3 },
      { field: "storageTb", before: 1_000, after: 4_000 },
      { field: "redundancy", before: 2, after: 3 },
    ]);
  });
});
