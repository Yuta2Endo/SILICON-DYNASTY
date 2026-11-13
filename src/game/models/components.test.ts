import { describe, expect, it } from "vitest";
import {
  COMPONENT_TYPES,
  checkBuildCompatibility,
  createComponentProject,
  createDefaultComponentConfiguration,
  parseComponentProject,
  validateComponentConfiguration,
  validateComponentName,
  type ComponentConfiguration,
  type ComponentType,
  type GpuConfiguration,
  type MotherboardConfiguration,
  type NetworkingConfiguration,
  type RamConfiguration,
  type SsdConfiguration,
} from "./components";
import { createDefaultCpuConfiguration } from "./cpu";
import { createInitialGameState, parseGameState } from "./game-state";

describe("component projects", () => {
  it("creates and parses a project for every component type", () => {
    const state = createInitialGameState();
    const projects = COMPONENT_TYPES.map((type) =>
      createComponentProject(
        `component-${type}`,
        `${type} project`,
        type,
        createDefaultComponentConfiguration(type),
        state.gameDate,
      ),
    );

    expect(projects.map((project) => project.type)).toEqual([...COMPONENT_TYPES]);
    for (const project of projects) {
      expect(parseComponentProject(project)).toEqual(project);
    }

    const parsedState = parseGameState({ ...state, componentProjects: projects });
    expect(parsedState.componentProjects).toEqual(projects);
  });

  it("rejects out-of-range values and mismatched project types", () => {
    const gpu = createDefaultComponentConfiguration("gpu") as GpuConfiguration;
    gpu.computeUnits = 0;
    expect(validateComponentConfiguration(gpu).errors.computeUnits?.code).toBe("integer");

    expect(() => createComponentProject(
      "component-bad",
      "Broken GPU",
      "ram",
      gpu,
      "1995-01-01",
    )).toThrow("does not match");
    expect(validateComponentName("x")).not.toBeNull();
  });
});

describe("build compatibility", () => {
  it("accepts a coherent platform and reports mismatched parts", () => {
    const cpu = createDefaultCpuConfiguration();
    const motherboard = createDefaultComponentConfiguration("motherboard") as MotherboardConfiguration;
    const ram = createDefaultComponentConfiguration("ram") as RamConfiguration;
    const gpu = createDefaultComponentConfiguration("gpu") as GpuConfiguration;
    const ssd = createDefaultComponentConfiguration("ssd") as SsdConfiguration;
    const networking = createDefaultComponentConfiguration("networking") as NetworkingConfiguration;

    const compatible = checkBuildCompatibility({
      cpu,
      components: {
        motherboard: { ...motherboard, memoryStandard: "sdr" },
        ram: { ...ram, memoryStandard: "sdr" },
        gpu,
        ssd,
        networking: { ...networking, bus: "pci" },
      },
    });
    expect(compatible.compatible).toBe(true);
    expect(compatible.issues).toEqual([]);

    const mismatched = checkBuildCompatibility({
      cpu: { ...cpu, isa: "arm" },
      components: {
        motherboard,
        ram: { ...ram, memoryStandard: "ddr2", capacityGb: 32 },
        gpu: { ...gpu, bus: "pcie-5" },
        ssd: { ...ssd, interface: "nvme", formFactor: "2.5-inch" },
        networking: { ...networking, bus: "pcie-4" },
      },
    });

    expect(mismatched.compatible).toBe(false);
    expect(mismatched.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "cpu-isa-mismatch",
      "memory-standard-mismatch",
      "memory-capacity-exceeded",
      "gpu-bus-incompatible",
      "storage-interface-unavailable",
      "storage-form-factor-incompatible",
      "networking-bus-incompatible",
    ]));
  });

  it("requires a motherboard when other components are selected", () => {
    const components: Partial<Record<ComponentType, ComponentConfiguration>> = {
      gpu: createDefaultComponentConfiguration("gpu"),
    };

    const result = checkBuildCompatibility({ components });

    expect(result.compatible).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("missing-motherboard");
  });
});
