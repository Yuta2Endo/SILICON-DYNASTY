import { describe, expect, it } from "vitest";
import {
  createCpuProject,
  createDefaultCpuConfiguration,
  parseCpuProject,
  saveCpuProjectVersion,
  validateCpuConfiguration,
  validateCpuProjectName,
} from "./cpu";

describe("CPU configuration validation", () => {
  it("accepts the historically grounded default configuration", () => {
    expect(validateCpuConfiguration(createDefaultCpuConfiguration())).toEqual({ valid: true, errors: {} });
  });

  it("rejects impossible thread ratios and incompatible SIMD extensions", () => {
    const configuration = createDefaultCpuConfiguration();
    const threadResult = validateCpuConfiguration({ ...configuration, coreCount: 4, threadCount: 1 });
    const simdResult = validateCpuConfiguration({ ...configuration, isa: "arm", simdExtensions: ["avx2"] });

    expect(threadResult.errors.threadCount?.code).toBe("threads-per-core");
    expect(simdResult.errors.simdExtensions?.code).toBe("unsupported-simd");
  });

  it("rejects numeric values outside documented limits", () => {
    const result = validateCpuConfiguration({
      ...createDefaultCpuConfiguration(),
      coreCount: 0,
      threadCount: 0,
      clockMHz: 10_001,
      ipc: 1.25,
      processNodeNm: 1,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.coreCount).toBeDefined();
    expect(result.errors.threadCount).toBeDefined();
    expect(result.errors.clockMHz).toBeDefined();
    expect(result.errors.ipc?.code).toBe("precision");
    expect(result.errors.processNodeNm).toBeDefined();
  });

  it("validates project names", () => {
    expect(validateCpuProjectName(" ")?.code).toBe("required");
    expect(validateCpuProjectName("A")?.code).toBe("length");
    expect(validateCpuProjectName("Dynasty 01")).toBeNull();
  });
});

describe("CPU project versions", () => {
  it("creates version 1 and appends immutable configuration snapshots", () => {
    const initialConfiguration = createDefaultCpuConfiguration();
    const project = createCpuProject("cpu-1", "Dynasty Core", initialConfiguration, "1995-01-01");
    const nextConfiguration = { ...initialConfiguration, clockMHz: 120 };
    const nextProject = saveCpuProjectVersion(project, "Dynasty Core", nextConfiguration, "1995-01-02");

    expect(project.versions).toHaveLength(1);
    expect(nextProject.versions.map((version) => version.version)).toEqual([1, 2]);
    expect(nextProject.versions[0]?.configuration.clockMHz).toBe(100);
    expect(nextProject.configuration.clockMHz).toBe(120);
    expect(parseCpuProject(nextProject)).toEqual(nextProject);
  });

  it("rejects a corrupted version history", () => {
    const project = createCpuProject("cpu-1", "Dynasty Core", createDefaultCpuConfiguration(), "1995-01-01");
    const corrupted = {
      ...project,
      versions: [{ ...project.versions[0], version: 3 }],
    };

    expect(() => parseCpuProject(corrupted)).toThrow();
  });
});
