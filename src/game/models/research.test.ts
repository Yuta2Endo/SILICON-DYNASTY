import { describe, expect, it } from "vitest";
import { createCpuProject, createDefaultCpuConfiguration } from "./cpu";
import {
  InvalidResearchCatalogError,
  createResearchCatalog,
  getLegacyCpuResearchUnlocks,
  getRequiredCpuResearchUnlocks,
  parseResearchState,
  RESEARCH_CATALOG,
  validateResearchCatalog,
  type ResearchTechnologyDefinition,
} from "./research";
import { createInitialGameState } from "./game-state";

describe("research catalog", () => {
  it("contains unique definitions with explicit unlock effects", () => {
    const ids = RESEARCH_CATALOG.definitions.map((technology) => technology.id);
    const unlocks = RESEARCH_CATALOG.definitions.flatMap((technology) => technology.unlockIds);

    expect(new Set(ids).size).toBe(ids.length);
    expect(RESEARCH_CATALOG.definitions.length).toBeGreaterThan(0);
    expect(unlocks).toContain("cpu.arm-isa");
    expect(unlocks).toContain("memory.ddr");
  });

  it("rejects dependency cycles", () => {
    const shared = {
      category: "cpu",
      eraId: "pc-foundation",
      availableFromYear: 1995,
      costUsd: 100,
      durationDays: 2,
      unlockIds: ["cpu.out-of-order"],
    } satisfies Omit<ResearchTechnologyDefinition, "id" | "prerequisiteIds">;
    const cyclicDefinitions: ResearchTechnologyDefinition[] = [
      { ...shared, id: "cycle-a", prerequisiteIds: ["cycle-b"] },
      { ...shared, id: "cycle-b", prerequisiteIds: ["cycle-a"] },
    ];

    expect(validateResearchCatalog(cyclicDefinitions)).toContainEqual({
      code: "dependency-cycle",
      technologyId: "cycle-a",
    });
    expect(() => createResearchCatalog(cyclicDefinitions)).toThrow(InvalidResearchCatalogError);
  });

  it("derives legacy capabilities from every saved CPU design version", () => {
    const configuration = {
      ...createDefaultCpuConfiguration(),
      isa: "arm" as const,
      memoryStandard: "ddr" as const,
      simdExtensions: ["neon" as const],
    };
    const project = createCpuProject("legacy-cpu", "Legacy CPU", configuration, "1995-01-01");
    const legacyUnlocks = getLegacyCpuResearchUnlocks([project]);

    expect(legacyUnlocks).toEqual(expect.arrayContaining(["cpu.arm-isa", "memory.ddr", "cpu.neon"]));
  });
});

describe("research save parsing", () => {
  it("round-trips the initial schema-3 research state", () => {
    const state = createInitialGameState();

    expect(parseResearchState(state.research, state.gameDate)).toEqual(state.research);
  });
});

describe("CPU research requirements", () => {
  it("maps advanced CPU configuration options to explicit unlocks", () => {
    const configuration = {
      ...createDefaultCpuConfiguration(),
      isa: "arm" as const,
      architecture: "chiplet" as const,
      coreCount: 2,
      threadCount: 2,
      memoryStandard: "ddr2" as const,
      simdExtensions: ["neon" as const],
    };

    expect(getRequiredCpuResearchUnlocks(configuration)).toEqual(
      expect.arrayContaining(["cpu.arm-isa", "cpu.chiplets", "cpu.multicore", "memory.ddr2", "cpu.neon"]),
    );
  });
});
