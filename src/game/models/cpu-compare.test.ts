import { describe, expect, it } from "vitest";
import { compareCpuConfigurations } from "./cpu-compare";
import { createDefaultCpuConfiguration } from "./cpu";

describe("compareCpuConfigurations", () => {
  it("returns no changes for identical configurations", () => {
    const configuration = createDefaultCpuConfiguration();
    expect(compareCpuConfigurations(configuration, { ...configuration })).toEqual([]);
  });

  it("detects scalar and array changes in stable field order", () => {
    const before = createDefaultCpuConfiguration();
    const after = {
      ...before,
      clockMHz: 200,
      simdExtensions: ["mmx" as const],
    };

    expect(compareCpuConfigurations(before, after)).toEqual([
      { field: "clockMHz", before: 100, after: 200 },
      { field: "simdExtensions", before: [], after: ["mmx"] },
    ]);
  });

  it("treats arrays with equal contents as unchanged", () => {
    const before = { ...createDefaultCpuConfiguration(), simdExtensions: ["sse" as const] };
    const after = { ...createDefaultCpuConfiguration(), simdExtensions: ["sse" as const] };
    expect(compareCpuConfigurations(before, after)).toEqual([]);
  });
});
