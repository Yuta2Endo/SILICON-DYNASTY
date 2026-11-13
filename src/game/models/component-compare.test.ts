import { describe, expect, it } from "vitest";
import {
  InvalidComponentDataError,
  createDefaultComponentConfiguration,
  type AiAcceleratorConfiguration,
  type ComponentConfiguration,
  type GpuConfiguration,
} from "./components";
import { compareComponentConfigurations } from "./component-compare";

describe("compareComponentConfigurations", () => {
  it("returns no changes for identical configurations", () => {
    const configuration = createDefaultComponentConfiguration("gpu");
    expect(compareComponentConfigurations(configuration, configuration)).toEqual([]);
  });

  it("reports scalar changes in schema order", () => {
    const before = createDefaultComponentConfiguration("gpu") as GpuConfiguration;
    const after: GpuConfiguration = {
      ...before,
      computeUnits: 12,
      clockMHz: 150,
      rayTracing: true,
    };

    const changes = compareComponentConfigurations(before, after);
    expect(changes.map((change) => change.field)).toEqual(["computeUnits", "clockMHz", "rayTracing"]);
    expect(changes[0]).toMatchObject({ before: 8, after: 12 });
    expect(changes[2]).toMatchObject({ before: false, after: true });
  });

  it("compares array values by content and rejects mixed component types", () => {
    const before = createDefaultComponentConfiguration("ai-accelerator") as AiAcceleratorConfiguration;
    const clone: ComponentConfiguration = {
      ...before,
      precisions: [...before.precisions],
    };
    expect(compareComponentConfigurations(before, clone)).toEqual([]);

    const widened: AiAcceleratorConfiguration = {
      ...before,
      precisions: [...before.precisions, "fp8"],
    };
    expect(compareComponentConfigurations(before, widened).map((change) => change.field)).toEqual([
      "precisions",
    ]);

    expect(() =>
      compareComponentConfigurations(before, createDefaultComponentConfiguration("gpu")),
    ).toThrow(InvalidComponentDataError);
  });
});
