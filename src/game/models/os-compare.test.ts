import { describe, expect, it } from "vitest";
import { compareOsConfigurations } from "./os-compare";
import { createDefaultOsConfiguration, type OsConfiguration } from "./os";

describe("OS configuration comparison", () => {
  it("returns no changes for identical configurations", () => {
    const configuration = createDefaultOsConfiguration();
    expect(compareOsConfigurations(configuration, { ...configuration })).toEqual([]);
  });

  it("reports changed scalar, boolean and architecture fields", () => {
    const before = createDefaultOsConfiguration();
    const after: OsConfiguration = {
      ...before,
      kernelType: "microkernel",
      virtualMemory: false,
      supportedArchitectures: ["arm"],
    };

    const changes = compareOsConfigurations(before, after);

    expect(changes.map((change) => change.field)).toEqual([
      "kernelType",
      "virtualMemory",
      "supportedArchitectures",
    ]);
    expect(changes[0]).toEqual({ field: "kernelType", before: "monolithic", after: "microkernel" });
    expect(changes[1]).toEqual({ field: "virtualMemory", before: true, after: false });
    expect(changes[2]).toEqual({
      field: "supportedArchitectures",
      before: ["x86"],
      after: ["arm"],
    });
  });

  it("detects numeric changes", () => {
    const before = createDefaultOsConfiguration();
    const changes = compareOsConfigurations(before, {
      ...before,
      syscallCount: 256,
      maxProcesses: 1024,
    });

    expect(changes).toEqual([
      { field: "syscallCount", before: 128, after: 256 },
      { field: "maxProcesses", before: 512, after: 1024 },
    ]);
  });
});
