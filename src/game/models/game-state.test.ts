import { describe, expect, it } from "vitest";
import { createInitialGameState, InvalidGameStateError, parseGameState } from "./game-state";
import { createCpuProject, createDefaultCpuConfiguration } from "./cpu";
import { createDefaultOsConfiguration, createOsProject } from "./os";

describe("game state validation", () => {
  it("round-trips a valid starting state", () => {
    const state = createInitialGameState();

    expect(parseGameState(state)).toEqual(state);
  });

  it("rejects invalid dates and unknown schema versions", () => {
    const state = createInitialGameState();

    expect(() => parseGameState({ ...state, gameDate: "1995-02-30" })).toThrow(InvalidGameStateError);
    expect(() => parseGameState({ ...state, schemaVersion: 8 })).toThrow(InvalidGameStateError);
  });

  it("migrates a Stage 1 save without losing company, date, or settings", () => {
    const current = createInitialGameState();
    const legacyStageOneSave = {
      schemaVersion: 1,
      gameDate: current.gameDate,
      company: current.company,
      settings: current.settings,
    };

    const migrated = parseGameState(legacyStageOneSave);

    expect(migrated.schemaVersion).toBe(7);
    expect(migrated.gameDate).toBe(current.gameDate);
    expect(migrated.company).toEqual(current.company);
    expect(migrated.settings).toEqual(current.settings);
    expect(migrated.cpuProjects).toEqual([]);
    expect(migrated.componentProjects).toEqual([]);
    expect(migrated.osProjects).toEqual([]);
    expect(migrated.research).toEqual(current.research);
    expect(migrated.finance).toEqual(current.finance);
    expect(migrated.market).toEqual(current.market);
  });

  it("migrates schema-2 saves and preserves CPU history as legacy unlocks", () => {
    const current = createInitialGameState();
    const legacyConfiguration = {
      ...createDefaultCpuConfiguration(),
      isa: "arm" as const,
      memoryStandard: "ddr" as const,
      simdExtensions: ["neon" as const],
    };
    const cpuProject = createCpuProject("cpu-1", "Legacy Processor", legacyConfiguration, current.gameDate);
    const migrated = parseGameState({
      schemaVersion: 2,
      gameDate: current.gameDate,
      company: current.company,
      cpuProjects: [cpuProject],
      settings: current.settings,
    });

    expect(migrated.schemaVersion).toBe(7);
    expect(migrated.cpuProjects).toEqual([cpuProject]);
    expect(migrated.componentProjects).toEqual([]);
    expect(migrated.osProjects).toEqual([]);
    expect(migrated.finance).toEqual(current.finance);
    expect(migrated.market).toEqual(current.market);
    expect(migrated.research.completedTechnologyIds).toEqual([]);
    expect(migrated.research.legacyUnlockIds).toEqual(
      expect.arrayContaining(["cpu.arm-isa", "memory.ddr", "cpu.neon"]),
    );
  });

  it("migrates schema-3 saves by initializing finance and market at the saved date", () => {
    const current = createInitialGameState();
    const legacySave = {
      schemaVersion: 3,
      gameDate: "1998-06-15",
      company: { ...current.company, balance: 250_000 },
      cpuProjects: [],
      research: current.research,
      settings: current.settings,
    };

    const migrated = parseGameState(legacySave);

    expect(migrated.schemaVersion).toBe(7);
    expect(migrated.gameDate).toBe("1998-06-15");
    expect(migrated.osProjects).toEqual([]);
    expect(migrated.finance).toEqual(current.finance);
    expect(migrated.market.products).toEqual([]);
    expect(migrated.market.componentProducts).toEqual([]);
    expect(migrated.market.dailySummaries).toEqual([]);
    expect(migrated.market.competitors).toHaveLength(6);
    expect(migrated.market.competitors[0]?.nextActionOn).toBe("1998-06-22");
  });

  it("migrates schema-4 saves without losing finance, market, or legacy summaries", () => {
    const current = createInitialGameState();
    const legacySummary = {
      date: "1995-01-01",
      totalDemandUnits: 6_000,
      playerUnits: 120,
      competitorUnits: 5_880,
      playerRevenueUsd: 36_000,
      marketShare: 0.02,
      segments: {},
    };
    const legacySave = {
      schemaVersion: 4,
      gameDate: current.gameDate,
      company: { ...current.company, balance: 123_456 },
      cpuProjects: [],
      research: current.research,
      finance: current.finance,
      market: {
        ...current.market,
        dailySummaries: [legacySummary],
        marketingBudgetUsdPerDay: 500,
      },
      settings: current.settings,
    };

    const migrated = parseGameState(legacySave);

    expect(migrated.schemaVersion).toBe(7);
    expect(migrated.company.balance).toBe(123_456);
    expect(migrated.componentProjects).toEqual([]);
    expect(migrated.osProjects).toEqual([]);
    expect(migrated.market.componentProducts).toEqual([]);
    expect(migrated.market.marketingBudgetUsdPerDay).toBe(500);
    expect(migrated.market.dailySummaries[0]).toEqual(expect.objectContaining({
      playerUnits: 120,
      componentUnits: 0,
      componentDemandUnits: 0,
      componentRevenueUsd: 0,
      componentManufacturingUsd: 0,
    }));
  });

  it("migrates schema-5 saves by initializing the OS project list", () => {
    const state = createInitialGameState();
    const stageFiveState = {
      schemaVersion: 5,
      gameDate: state.gameDate,
      company: state.company,
      cpuProjects: state.cpuProjects,
      componentProjects: state.componentProjects,
      research: state.research,
      finance: state.finance,
      market: state.market,
      settings: state.settings,
    };
    const migrated = parseGameState(stageFiveState);

    expect(migrated.schemaVersion).toBe(7);
    expect(migrated.osProjects).toEqual([]);
    expect(migrated.componentProjects).toEqual(state.componentProjects);
  });

  it("migrates schema-6 OS projects by filling the system-service defaults", () => {
    const state = createInitialGameState();
    const modern = createDefaultOsConfiguration();
    const legacyConfiguration = {
      targetPlatform: modern.targetPlatform,
      kernelType: modern.kernelType,
      bootloader: modern.bootloader,
      scheduler: modern.scheduler,
      memoryManager: modern.memoryManager,
      virtualMemory: modern.virtualMemory,
      ipcModel: modern.ipcModel,
      syscallCount: modern.syscallCount,
      moduleSupport: modern.moduleSupport,
      driverModel: modern.driverModel,
      addressBits: modern.addressBits,
      maxProcesses: modern.maxProcesses,
      supportedArchitectures: modern.supportedArchitectures,
    };
    const project = {
      id: "os-1",
      name: "Legacy OS",
      configuration: legacyConfiguration,
      versions: [{ version: 1, savedOn: state.gameDate, configuration: legacyConfiguration }],
    };
    const migrated = parseGameState({
      ...state,
      schemaVersion: 6,
      osProjects: [project],
    });

    expect(migrated.schemaVersion).toBe(7);
    expect(migrated.osProjects[0]?.configuration).toEqual(
      expect.objectContaining({
        filesystem: "fat",
        driverFramework: "legacy",
        networkStack: "basic",
        permissions: "permissions",
        encryption: "none",
        updateModel: "manual",
        packageManager: "none",
        diagnostics: "logs",
      }),
    );
  });

  it("preserves valid OS projects in current saves", () => {
    const state = createInitialGameState();
    const project = createOsProject(
      "os-1",
      "Dynasty OS",
      createDefaultOsConfiguration(),
      state.gameDate,
    );
    const parsed = parseGameState({ ...state, osProjects: [project] });

    expect(parsed.osProjects).toEqual([project]);
  });

  it("rejects invalid OS projects in the current save schema", () => {
    const state = createInitialGameState();

    expect(() => parseGameState({ ...state, osProjects: [{ id: "bad" }] })).toThrow(
      InvalidGameStateError,
    );
  });

  it("rejects invalid component projects in the current save schema", () => {
    const state = createInitialGameState();

    expect(() => parseGameState({ ...state, componentProjects: [{ id: "bad" }] })).toThrow(
      InvalidGameStateError,
    );
  });

  it("rejects invalid CPU projects in the current save schema", () => {
    const state = createInitialGameState();

    expect(() => parseGameState({ ...state, cpuProjects: [{ id: "bad" }] })).toThrow(InvalidGameStateError);
  });
});
