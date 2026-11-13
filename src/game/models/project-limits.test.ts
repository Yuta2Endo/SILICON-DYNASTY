import { describe, expect, it } from "vitest";
import {
  createCpuProject,
  createDefaultCpuConfiguration,
  InvalidCpuDataError,
  saveCpuProjectVersion,
} from "./cpu";
import { isProjectVersionLimitReached, PROJECT_LIMITS } from "./project-limits";

describe("project version limits", () => {
  it("allows 99 versions and blocks the next one", () => {
    expect(PROJECT_LIMITS.maxVersionsPerProject).toBe(100);
    expect(isProjectVersionLimitReached(Array.from({ length: 99 }, () => ({})))).toBe(false);
    expect(isProjectVersionLimitReached(Array.from({ length: 100 }, () => ({})))).toBe(true);

    const configuration = createDefaultCpuConfiguration();
    const project = createCpuProject("cpu-1", "Dynasty Core", configuration, "1995-01-01");
    const fullProject = {
      ...project,
      versions: Array.from({ length: 100 }, (_, index) => ({
        version: index + 1,
        savedOn: "1995-01-01",
        configuration,
      })),
    };

    expect(() =>
      saveCpuProjectVersion(fullProject, "Dynasty Core", configuration, "1995-01-02"),
    ).toThrow(InvalidCpuDataError);
  });
});
