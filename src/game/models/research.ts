import type { CpuConfiguration, CpuMemoryStandard, CpuProject, CpuSimdExtension } from "./cpu";

export const RESEARCH_CATEGORIES = ["cpu", "memory", "graphics", "network", "mobile", "ai", "robotics", "future"] as const;
export type ResearchCategory = (typeof RESEARCH_CATEGORIES)[number];

export const RESEARCH_ERAS = [
  { id: "pc-foundation", startYear: 1995, endYear: 1999 },
  { id: "connected-computing", startYear: 2000, endYear: 2009 },
  { id: "mobile-cloud", startYear: 2010, endYear: 2019 },
  { id: "accelerated-ai", startYear: 2020, endYear: 2034 },
  { id: "autonomous-systems", startYear: 2035, endYear: 2049 },
  { id: "future-computing", startYear: 2050, endYear: null },
] as const;

export type ResearchEraId = (typeof RESEARCH_ERAS)[number]["id"];

export const RESEARCH_UNLOCK_IDS = [
  "cpu.out-of-order",
  "cpu.hybrid-cores",
  "cpu.multicore",
  "cpu.arm-isa",
  "cpu.risc-v-isa",
  "cpu.chiplets",
  "cpu.mmx",
  "cpu.sse",
  "cpu.avx2",
  "cpu.avx512",
  "cpu.neon",
  "cpu.risc-v-vector",
  "memory.ddr",
  "memory.ddr2",
  "memory.ddr3",
  "memory.ddr4",
  "memory.ddr5",
  "memory.lpddr",
  "graphics.3d",
  "network.internet",
  "mobile.soc",
  "cloud.computing",
  "ai.machine-learning",
  "ai.accelerators",
  "robotics.control",
  "robotics.autonomy",
  "future.computing",
] as const;

export type ResearchUnlockId = (typeof RESEARCH_UNLOCK_IDS)[number];

export interface ResearchTechnologyDefinition {
  id: string;
  category: ResearchCategory;
  eraId: ResearchEraId;
  availableFromYear: number;
  costUsd: number;
  durationDays: number;
  prerequisiteIds: readonly string[];
  unlockIds: readonly ResearchUnlockId[];
}

export const RESEARCH_TECHNOLOGIES = [
  { id: "out-of-order", category: "cpu", eraId: "pc-foundation", availableFromYear: 1995, costUsd: 12_000, durationDays: 20, prerequisiteIds: [], unlockIds: ["cpu.out-of-order"] },
  { id: "arm-isa", category: "cpu", eraId: "pc-foundation", availableFromYear: 1995, costUsd: 10_000, durationDays: 25, prerequisiteIds: [], unlockIds: ["cpu.arm-isa"] },
  { id: "mmx", category: "cpu", eraId: "pc-foundation", availableFromYear: 1996, costUsd: 8_000, durationDays: 15, prerequisiteIds: [], unlockIds: ["cpu.mmx"] },
  { id: "internet-protocol", category: "network", eraId: "pc-foundation", availableFromYear: 1995, costUsd: 10_000, durationDays: 20, prerequisiteIds: [], unlockIds: ["network.internet"] },
  { id: "three-dimensional-graphics", category: "graphics", eraId: "pc-foundation", availableFromYear: 1998, costUsd: 25_000, durationDays: 35, prerequisiteIds: [], unlockIds: ["graphics.3d"] },
  { id: "sse", category: "cpu", eraId: "pc-foundation", availableFromYear: 1999, costUsd: 18_000, durationDays: 30, prerequisiteIds: ["mmx"], unlockIds: ["cpu.sse"] },
  { id: "ddr", category: "memory", eraId: "connected-computing", availableFromYear: 2000, costUsd: 20_000, durationDays: 30, prerequisiteIds: [], unlockIds: ["memory.ddr"] },
  { id: "lpddr", category: "memory", eraId: "connected-computing", availableFromYear: 2001, costUsd: 28_000, durationDays: 40, prerequisiteIds: ["ddr"], unlockIds: ["memory.lpddr"] },
  { id: "ddr2", category: "memory", eraId: "connected-computing", availableFromYear: 2003, costUsd: 30_000, durationDays: 35, prerequisiteIds: ["ddr"], unlockIds: ["memory.ddr2"] },
  { id: "multicore", category: "cpu", eraId: "connected-computing", availableFromYear: 2005, costUsd: 50_000, durationDays: 60, prerequisiteIds: ["out-of-order"], unlockIds: ["cpu.multicore"] },
  { id: "neon", category: "cpu", eraId: "connected-computing", availableFromYear: 2005, costUsd: 35_000, durationDays: 45, prerequisiteIds: ["arm-isa"], unlockIds: ["cpu.neon"] },
  { id: "ddr3", category: "memory", eraId: "connected-computing", availableFromYear: 2007, costUsd: 45_000, durationDays: 45, prerequisiteIds: ["ddr2"], unlockIds: ["memory.ddr3"] },
  { id: "risc-v-isa", category: "cpu", eraId: "mobile-cloud", availableFromYear: 2010, costUsd: 45_000, durationDays: 55, prerequisiteIds: [], unlockIds: ["cpu.risc-v-isa"] },
  { id: "cloud-computing", category: "network", eraId: "mobile-cloud", availableFromYear: 2010, costUsd: 65_000, durationDays: 60, prerequisiteIds: ["internet-protocol"], unlockIds: ["cloud.computing"] },
  { id: "mobile-soc", category: "mobile", eraId: "mobile-cloud", availableFromYear: 2012, costUsd: 90_000, durationDays: 90, prerequisiteIds: ["arm-isa", "lpddr", "multicore"], unlockIds: ["mobile.soc"] },
  { id: "avx2", category: "cpu", eraId: "mobile-cloud", availableFromYear: 2013, costUsd: 70_000, durationDays: 70, prerequisiteIds: ["sse"], unlockIds: ["cpu.avx2"] },
  { id: "ddr4", category: "memory", eraId: "mobile-cloud", availableFromYear: 2014, costUsd: 90_000, durationDays: 65, prerequisiteIds: ["ddr3"], unlockIds: ["memory.ddr4"] },
  { id: "avx512", category: "cpu", eraId: "mobile-cloud", availableFromYear: 2016, costUsd: 120_000, durationDays: 90, prerequisiteIds: ["avx2"], unlockIds: ["cpu.avx512"] },
  { id: "chiplets", category: "cpu", eraId: "mobile-cloud", availableFromYear: 2017, costUsd: 130_000, durationDays: 100, prerequisiteIds: ["multicore"], unlockIds: ["cpu.chiplets"] },
  { id: "hybrid-cores", category: "cpu", eraId: "accelerated-ai", availableFromYear: 2020, costUsd: 180_000, durationDays: 100, prerequisiteIds: ["multicore", "out-of-order"], unlockIds: ["cpu.hybrid-cores"] },
  { id: "ddr5", category: "memory", eraId: "accelerated-ai", availableFromYear: 2020, costUsd: 200_000, durationDays: 100, prerequisiteIds: ["ddr4"], unlockIds: ["memory.ddr5"] },
  { id: "risc-v-vector", category: "cpu", eraId: "accelerated-ai", availableFromYear: 2020, costUsd: 130_000, durationDays: 80, prerequisiteIds: ["risc-v-isa"], unlockIds: ["cpu.risc-v-vector"] },
  { id: "machine-learning", category: "ai", eraId: "accelerated-ai", availableFromYear: 2020, costUsd: 250_000, durationDays: 120, prerequisiteIds: ["cloud-computing", "three-dimensional-graphics"], unlockIds: ["ai.machine-learning"] },
  { id: "ai-accelerators", category: "ai", eraId: "accelerated-ai", availableFromYear: 2025, costUsd: 500_000, durationDays: 150, prerequisiteIds: ["machine-learning"], unlockIds: ["ai.accelerators"] },
  { id: "robotics", category: "robotics", eraId: "autonomous-systems", availableFromYear: 2035, costUsd: 800_000, durationDays: 180, prerequisiteIds: ["ai-accelerators", "mobile-soc"], unlockIds: ["robotics.control"] },
  { id: "autonomous-systems", category: "robotics", eraId: "autonomous-systems", availableFromYear: 2040, costUsd: 1_500_000, durationDays: 240, prerequisiteIds: ["robotics"], unlockIds: ["robotics.autonomy"] },
  { id: "future-computing", category: "future", eraId: "future-computing", availableFromYear: 2050, costUsd: 3_000_000, durationDays: 365, prerequisiteIds: ["autonomous-systems"], unlockIds: ["future.computing"] },
] as const satisfies readonly ResearchTechnologyDefinition[];

export type ResearchTechnologyId = (typeof RESEARCH_TECHNOLOGIES)[number]["id"];

export interface ResearchCatalog<T extends ResearchTechnologyDefinition = ResearchTechnologyDefinition> {
  definitions: readonly T[];
  byId: ReadonlyMap<string, T>;
}

export type ResearchCatalogIssue =
  | { code: "duplicate-technology"; technologyId: string }
  | { code: "invalid-cost"; technologyId: string }
  | { code: "invalid-duration"; technologyId: string }
  | { code: "invalid-year"; technologyId: string }
  | { code: "invalid-category"; technologyId: string }
  | { code: "invalid-era"; technologyId: string }
  | { code: "unknown-prerequisite"; technologyId: string; prerequisiteId: string }
  | { code: "duplicate-prerequisite"; technologyId: string }
  | { code: "self-dependency"; technologyId: string }
  | { code: "dependency-cycle"; technologyId: string }
  | { code: "unknown-unlock"; technologyId: string; unlockId: string }
  | { code: "duplicate-unlock"; technologyId: string };

export class InvalidResearchCatalogError extends Error {
  constructor(readonly issues: readonly ResearchCatalogIssue[]) {
    super("Research catalog contains invalid definitions.");
    this.name = "InvalidResearchCatalogError";
  }
}

export function validateResearchCatalog(
  definitions: readonly ResearchTechnologyDefinition[],
  eras: readonly { id: string; startYear: number; endYear: number | null }[] = RESEARCH_ERAS,
): ResearchCatalogIssue[] {
  const issues: ResearchCatalogIssue[] = [];
  const knownIds = new Set<string>();
  const eraIds = new Set(eras.map((era) => era.id));
  const categoryIds = new Set<string>(RESEARCH_CATEGORIES);
  const unlockIds = new Set<string>(RESEARCH_UNLOCK_IDS);

  for (const technology of definitions) {
    if (knownIds.has(technology.id)) {
      issues.push({ code: "duplicate-technology", technologyId: technology.id });
    }
    knownIds.add(technology.id);

    if (!Number.isFinite(technology.costUsd) || technology.costUsd <= 0) {
      issues.push({ code: "invalid-cost", technologyId: technology.id });
    }
    if (!Number.isInteger(technology.durationDays) || technology.durationDays < 1) {
      issues.push({ code: "invalid-duration", technologyId: technology.id });
    }
    if (!Number.isInteger(technology.availableFromYear) || technology.availableFromYear < 1995) {
      issues.push({ code: "invalid-year", technologyId: technology.id });
    }
    if (!categoryIds.has(technology.category)) {
      issues.push({ code: "invalid-category", technologyId: technology.id });
    }
    if (!eraIds.has(technology.eraId)) {
      issues.push({ code: "invalid-era", technologyId: technology.id });
    }
    if (new Set(technology.prerequisiteIds).size !== technology.prerequisiteIds.length) {
      issues.push({ code: "duplicate-prerequisite", technologyId: technology.id });
    }
    if (new Set(technology.unlockIds).size !== technology.unlockIds.length) {
      issues.push({ code: "duplicate-unlock", technologyId: technology.id });
    }
    for (const unlockId of technology.unlockIds) {
      if (!unlockIds.has(unlockId)) {
        issues.push({ code: "unknown-unlock", technologyId: technology.id, unlockId });
      }
    }
  }

  for (const technology of definitions) {
    for (const prerequisiteId of technology.prerequisiteIds) {
      if (prerequisiteId === technology.id) {
        issues.push({ code: "self-dependency", technologyId: technology.id });
      } else if (!knownIds.has(prerequisiteId)) {
        issues.push({ code: "unknown-prerequisite", technologyId: technology.id, prerequisiteId });
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const byId = new Map(definitions.map((technology) => [technology.id, technology]));
  const cycleIssues = new Set<string>();

  function visit(technologyId: string) {
    if (visiting.has(technologyId)) {
      if (!cycleIssues.has(technologyId)) {
        issues.push({ code: "dependency-cycle", technologyId });
        cycleIssues.add(technologyId);
      }
      return;
    }
    if (visited.has(technologyId)) {
      return;
    }

    visiting.add(technologyId);
    const technology = byId.get(technologyId);
    for (const prerequisiteId of technology?.prerequisiteIds ?? []) {
      if (byId.has(prerequisiteId)) {
        visit(prerequisiteId);
      }
    }
    visiting.delete(technologyId);
    visited.add(technologyId);
  }

  for (const technology of definitions) {
    visit(technology.id);
  }

  return issues;
}

export function createResearchCatalog<T extends ResearchTechnologyDefinition>(
  definitions: readonly T[],
): ResearchCatalog<T> {
  const issues = validateResearchCatalog(definitions);
  if (issues.length > 0) {
    throw new InvalidResearchCatalogError(issues);
  }

  return {
    definitions: [...definitions],
    byId: new Map(definitions.map((technology) => [technology.id, technology])),
  };
}

export const RESEARCH_CATALOG = createResearchCatalog(RESEARCH_TECHNOLOGIES);

export interface ActiveResearchProject {
  technologyId: ResearchTechnologyId;
  startedOn: string;
  progressDays: number;
  costPaidUsd: number;
}

export interface ResearchState {
  completedTechnologyIds: ResearchTechnologyId[];
  legacyUnlockIds: ResearchUnlockId[];
  activeProject: ActiveResearchProject | null;
  totalInvestedUsd: number;
}

export class InvalidResearchDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidResearchDataError";
  }
}

export function createInitialResearchState(legacyUnlockIds: readonly ResearchUnlockId[] = []): ResearchState {
  return {
    completedTechnologyIds: [],
    legacyUnlockIds: [...new Set(legacyUnlockIds)],
    activeProject: null,
    totalInvestedUsd: 0,
  };
}

export function parseResearchState(value: unknown, gameDate: string): ResearchState {
  if (!isRecord(value) || !Array.isArray(value.completedTechnologyIds) || !Array.isArray(value.legacyUnlockIds)) {
    throw new InvalidResearchDataError("Research state is incomplete.");
  }
  if (typeof value.totalInvestedUsd !== "number" || !Number.isFinite(value.totalInvestedUsd) || value.totalInvestedUsd < 0) {
    throw new InvalidResearchDataError("Research spending total is invalid.");
  }

  const completedTechnologyIds = value.completedTechnologyIds.map(parseTechnologyId);
  if (new Set(completedTechnologyIds).size !== completedTechnologyIds.length) {
    throw new InvalidResearchDataError("Research state contains duplicate completed technologies.");
  }
  const completed = new Set<string>(completedTechnologyIds);
  for (const technologyId of completedTechnologyIds) {
    const technology = RESEARCH_CATALOG.byId.get(technologyId);
    if (!technology || technology.prerequisiteIds.some((prerequisiteId) => !completed.has(prerequisiteId))) {
      throw new InvalidResearchDataError("Completed research is missing a prerequisite.");
    }
  }

  const legacyUnlockIds = value.legacyUnlockIds.map(parseResearchUnlockId);
  if (new Set(legacyUnlockIds).size !== legacyUnlockIds.length) {
    throw new InvalidResearchDataError("Research state contains duplicate legacy unlocks.");
  }

  let activeProject: ActiveResearchProject | null = null;
  if (value.activeProject !== null) {
    if (!isRecord(value.activeProject)) {
      throw new InvalidResearchDataError("Active research project is invalid.");
    }
    const technologyId = parseTechnologyId(value.activeProject.technologyId);
    const technology = RESEARCH_CATALOG.byId.get(technologyId);
    const { startedOn, progressDays, costPaidUsd } = value.activeProject;
    if (
      !technology ||
      typeof startedOn !== "string" ||
      !isValidDateOnly(startedOn) ||
      startedOn > gameDate ||
      Number(startedOn.slice(0, 4)) < technology.availableFromYear ||
      typeof progressDays !== "number" ||
      !Number.isInteger(progressDays) ||
      progressDays < 0 ||
      progressDays >= technology.durationDays ||
      typeof costPaidUsd !== "number" ||
      !Number.isFinite(costPaidUsd) ||
      costPaidUsd !== technology.costUsd ||
      value.totalInvestedUsd < costPaidUsd ||
      completed.has(technologyId) ||
      technology.prerequisiteIds.some((prerequisiteId) => !completed.has(prerequisiteId))
    ) {
      throw new InvalidResearchDataError("Active research project violates its definition.");
    }

    activeProject = { technologyId, startedOn, progressDays, costPaidUsd };
  }

  return {
    completedTechnologyIds,
    legacyUnlockIds,
    activeProject,
    totalInvestedUsd: roundUsd(value.totalInvestedUsd),
  };
}

export function getTechnology(id: string): (typeof RESEARCH_TECHNOLOGIES)[number] | undefined {
  return RESEARCH_CATALOG.byId.get(id);
}

export function getUnlockedResearchIds(research: ResearchState): ResearchUnlockId[] {
  const unlocked = new Set<ResearchUnlockId>(research.legacyUnlockIds);
  for (const technologyId of research.completedTechnologyIds) {
    const technology = getTechnology(technologyId);
    for (const unlockId of technology?.unlockIds ?? []) {
      unlocked.add(unlockId);
    }
  }
  return [...unlocked];
}

export function getRequiredCpuResearchUnlocks(configuration: CpuConfiguration): ResearchUnlockId[] {
  const required = new Set<ResearchUnlockId>();
  if (configuration.isa === "arm") required.add("cpu.arm-isa");
  if (configuration.isa === "risc-v") required.add("cpu.risc-v-isa");
  if (configuration.architecture === "chiplet") required.add("cpu.chiplets");
  if (configuration.microarchitecture === "out-of-order") required.add("cpu.out-of-order");
  if (configuration.microarchitecture === "hybrid") required.add("cpu.hybrid-cores");
  if (configuration.coreCount > 1) required.add("cpu.multicore");

  const memoryUnlock: Partial<Record<CpuMemoryStandard, ResearchUnlockId>> = {
    ddr: "memory.ddr",
    ddr2: "memory.ddr2",
    ddr3: "memory.ddr3",
    ddr4: "memory.ddr4",
    ddr5: "memory.ddr5",
    lpddr: "memory.lpddr",
  };
  const memoryId = memoryUnlock[configuration.memoryStandard];
  if (memoryId) required.add(memoryId);

  const simdUnlock: Record<CpuSimdExtension, ResearchUnlockId> = {
    mmx: "cpu.mmx",
    sse: "cpu.sse",
    avx2: "cpu.avx2",
    avx512: "cpu.avx512",
    neon: "cpu.neon",
    rvv: "cpu.risc-v-vector",
  };
  for (const extension of configuration.simdExtensions) {
    required.add(simdUnlock[extension]);
  }

  return [...required];
}

export function getLegacyCpuResearchUnlocks(projects: readonly CpuProject[]): ResearchUnlockId[] {
  const unlocks = new Set<ResearchUnlockId>();
  for (const project of projects) {
    for (const version of project.versions) {
      for (const unlock of getRequiredCpuResearchUnlocks(version.configuration)) {
        unlocks.add(unlock);
      }
    }
  }
  return [...unlocks];
}

function parseTechnologyId(value: unknown): ResearchTechnologyId {
  if (typeof value !== "string" || !RESEARCH_CATALOG.byId.has(value)) {
    throw new InvalidResearchDataError("Research state references an unknown technology.");
  }
  return value as ResearchTechnologyId;
}

function parseResearchUnlockId(value: unknown): ResearchUnlockId {
  if (typeof value !== "string" || !RESEARCH_UNLOCK_IDS.includes(value as ResearchUnlockId)) {
    throw new InvalidResearchDataError("Research state references an unknown unlock.");
  }
  return value as ResearchUnlockId;
}

function roundUsd(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
