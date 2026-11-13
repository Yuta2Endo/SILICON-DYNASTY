import { describe, expect, it } from "vitest";
import type { GameState } from "../models/game-state";
import { createInitialGameState } from "../models/game-state";
import { createCpuProject, createDefaultCpuConfiguration } from "../models/cpu";
import {
  createComponentProject,
  createDefaultComponentConfiguration,
  type ComponentConfiguration,
  type ComponentType,
  type GpuConfiguration,
} from "../models/components";
import { createDefaultOsConfiguration, createOsProject } from "../models/os";
import {
  buildSuggestedDeviceConfiguration,
  createDeviceProject,
  type DeviceReferenceContext,
} from "../models/devices";
import { buildSuggestedCloudConfiguration } from "../models/cloud";
import { createDefaultAiConfiguration, createDefaultAiDataset } from "../models/ai";
import { getFinanceDailyRecord } from "../models/finance";
import { createGameApplication } from "./game-application";
import type { GameStateRepository } from "../../storage/repositories/GameStateRepository";

class MemoryGameStateRepository implements GameStateRepository {
  state: GameState | null = null;

  async load(): Promise<GameState | null> {
    return this.state;
  }

  async save(state: GameState): Promise<void> {
    this.state = state;
  }
}

describe("game application commands", () => {
  it("creates and persists a starting state on first load", async () => {
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);

    const state = await application.load();

    expect(state.gameDate).toBe("1995-01-01");
    expect(repository.state).toEqual(state);
  });

  it("advances time and persists company name and settings updates", async () => {
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);

    await application.load();
    await application.advanceDay();
    await application.renameCompany("Dynasty Labs");
    const updated = await application.updateSettings({ locale: "en", theme: "dark" });

    expect(updated.gameDate).toBe("1995-01-02");
    expect(updated.company.name).toBe("Dynasty Labs");
    expect(updated.settings).toEqual({ locale: "en", theme: "dark" });
    expect(repository.state).toEqual(updated);
  });

  it("does not persist an invalid company name", async () => {
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);
    const initial = await application.load();

    await expect(application.renameCompany(" ")).rejects.toThrow();
    expect(repository.state).toEqual(initial);
  });

  it("creates, versions, saves, and reloads a CPU project", async () => {
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);
    const initial = createDefaultCpuConfiguration();

    await application.load();
    await application.createCpuProject("Dynasty Core", initial);
    await application.saveCpuVersion("cpu-1", "Dynasty Core", { ...initial, clockMHz: 120 });

    const reloaded = await createGameApplication(repository).load();
    const project = reloaded.cpuProjects[0];

    expect(project?.name).toBe("Dynasty Core");
    expect(project?.configuration.clockMHz).toBe(120);
    expect(project?.versions.map((version) => version.version)).toEqual([1, 2]);
  });

  it("rejects invalid CPU configurations without persisting them", async () => {
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);
    const initial = await application.load();
    const invalidConfiguration = {
      ...createDefaultCpuConfiguration(),
      isa: "arm" as const,
      simdExtensions: ["avx2" as const],
    };

    await expect(application.createCpuProject("Dynasty Core", invalidConfiguration)).rejects.toThrow();
    expect(repository.state).toEqual(initial);
  });

  it("persists component projects and component market commands", async () => {
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);
    const configuration = createDefaultComponentConfiguration("gpu") as GpuConfiguration;

    await application.createComponentProject("gpu", "Dynasty Graphics", configuration);
    await application.saveComponentVersion("component-1", "Dynasty Graphics", {
      ...configuration,
      computeUnits: 16,
    });
    await application.releaseComponentProduct({
      projectId: "component-1",
      projectVersion: 2,
      name: "Dynasty Graphics 200",
      priceUsd: 450,
    });
    await application.updateComponentProductPrice("component-product-1", 425);
    await application.discontinueComponentProduct("component-product-1");

    const reloaded = await createGameApplication(repository).load();
    const project = reloaded.componentProjects[0];
    const product = reloaded.market.componentProducts[0];

    expect(project?.configuration.type).toBe("gpu");
    expect(project?.versions.map((version) => version.version)).toEqual([1, 2]);
    expect((project?.configuration as GpuConfiguration | undefined)?.computeUnits).toBe(16);
    expect(product).toEqual(expect.objectContaining({
      projectVersion: 2,
      priceUsd: 425,
      status: "discontinued",
      componentType: "gpu",
    }));
    expect(reloaded.company.balance).toBe(95_000);
  });

  it("rejects invalid component configurations without persisting them", async () => {
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);
    const initial = await application.load();
    const invalidConfiguration = {
      ...createDefaultComponentConfiguration("gpu"),
      computeUnits: 0,
    } as GpuConfiguration;

    await expect(
      application.createComponentProject("gpu", "Broken GPU", invalidConfiguration),
    ).rejects.toThrow();
    expect(repository.state).toEqual(initial);
  });

  it("creates, versions, saves, and reloads an OS project", async () => {
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);
    const initial = createDefaultOsConfiguration();

    await application.load();
    await application.createOsProject("Dynasty OS", initial);
    await application.saveOsVersion("os-1", "Dynasty OS", {
      ...initial,
      kernelType: "microkernel",
      ipcModel: "message-passing",
      driverModel: "user-space",
      moduleSupport: "user-space",
      filesystem: "ext2",
      driverFramework: "unified",
      networkStack: "tcp-ip",
      permissions: "permissions",
      encryption: "disk",
      updateModel: "package-manager",
      packageManager: "centralized",
      diagnostics: "crash-dumps",
    });

    const reloaded = await createGameApplication(repository).load();
    const project = reloaded.osProjects[0];

    expect(project?.name).toBe("Dynasty OS");
    expect(project?.configuration.kernelType).toBe("microkernel");
    expect(project?.configuration.filesystem).toBe("ext2");
    expect(project?.configuration.driverFramework).toBe("unified");
    expect(project?.configuration.diagnostics).toBe("crash-dumps");
    expect(project?.versions.map((version) => version.version)).toEqual([1, 2]);
  });

  it("rejects invalid OS configurations without persisting them", async () => {
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);
    const initial = await application.load();
    const invalidConfiguration = {
      ...createDefaultOsConfiguration(),
      kernelType: "microkernel" as const,
      ipcModel: "pipes" as const,
    };

    await expect(application.createOsProject("Broken OS", invalidConfiguration)).rejects.toThrow();
    expect(repository.state).toEqual(initial);
  });

  it("persists OS ecosystem settings and release lifecycle commands", async () => {
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);
    const configuration = {
      ...createDefaultOsConfiguration(),
      gui: "desktop-shell" as const,
      sdk: "basic" as const,
      api: "proprietary" as const,
      developerTools: "compiler" as const,
      appStore: "none" as const,
    };

    await application.load();
    await application.createOsProject("Dynasty OS", configuration);
    const started = await application.startOsRelease("os-1");
    const release = started.osProjects[0]?.releases[0];
    const advanced = await application.advanceOsRelease("os-1", release?.id ?? "");
    const reloaded = await createGameApplication(repository).load();

    expect(release?.stage).toBe("alpha");
    expect(advanced.company.balance).toBe(40_000);
    expect(reloaded.osProjects[0]?.configuration).toMatchObject({
      gui: "desktop-shell",
      sdk: "basic",
      api: "proprietary",
      developerTools: "compiler",
      appStore: "none",
    });
    expect(reloaded.osProjects[0]?.releases[0]).toMatchObject({
      stage: "beta",
      costUsd: 60_000,
    });
    expect(getFinanceDailyRecord(reloaded.finance, "1995-01-01")?.releaseUsd).toBe(60_000);
  });

  it("creates, versions, saves, and reloads an AI project", async () => {
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);
    const configuration = createDefaultAiConfiguration();
    const dataset = createDefaultAiDataset("dataset-1");

    await application.load();
    await application.createAiProject("Dynasty Vision", configuration);
    const saved = await application.saveAiVersion(
      "ai-1",
      "Dynasty Vision",
      { ...configuration, architecture: "cnn", layers: 4 },
      [dataset],
    );
    const reloaded = await createGameApplication(repository).load();

    expect(saved.aiProjects[0]?.versions).toHaveLength(2);
    expect(reloaded.aiProjects[0]?.configuration).toMatchObject({ architecture: "cnn", layers: 4 });
    expect(reloaded.aiProjects[0]?.datasets).toEqual([dataset]);
  });

  it("persists AI training, optimization and deployment", async () => {
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);

    await application.load();
    await application.createAiProject("Dynasty Vision", createDefaultAiConfiguration());
    const started = await application.startAiTraining("ai-1", { seed: 7, hardwareProjectId: null });
    const job = started.aiProjects[0]?.trainingJobs[0];

    expect(job?.stage).toBe("training");
    for (let day = 0; day < (job?.totalDays ?? 0); day += 1) {
      await application.advanceDay();
    }

    const optimized = await application.applyAiOptimization("ai-1", job?.id ?? "", "quantization");
    const deployed = await application.deployAiModel("ai-1", job?.id ?? "");
    const reloaded = await createGameApplication(repository).load();

    expect(optimized.aiProjects[0]?.trainingJobs[0]).toMatchObject({
      stage: "completed",
      optimizations: [expect.objectContaining({ type: "quantization" })],
    });
    expect(deployed.aiProjects[0]?.deployments[0]).toMatchObject({
      trainingJobId: job?.id,
      optimizationTypes: ["quantization"],
    });
    expect(reloaded.aiProjects[0]?.deployments[0]?.id).toBe("ai-deployment-1");
    expect(reloaded.company.balance).toBe(deployed.company.balance);
  });

  it("persists device and cloud projects with canonical component references", async () => {
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);
    const base = createInitialGameState();
    const osConfiguration = {
      ...createDefaultOsConfiguration(),
      targetPlatform: "universal" as const,
      driverFramework: "acpi" as const,
    };
    const osBase = createOsProject("os-1", "Dynasty Everywhere", osConfiguration, base.gameDate);
    const osProjects = [{
      ...osBase,
      releases: [{
        id: "os-release-1",
        version: 1,
        stage: "stable" as const,
        createdOn: base.gameDate,
        configuration: osConfiguration,
        qualityScore: 60,
        appealScore: 55,
        costUsd: 80_000,
      }],
    }];
    const context: DeviceReferenceContext = {
      cpuProjects: [createCpuProject("cpu-1", "Dynasty Core", {
        ...createDefaultCpuConfiguration(),
        memoryStandard: "ddr",
      }, base.gameDate)],
      componentProjects: (["motherboard", "ram", "ssd", "networking"] as ComponentType[])
        .map((type) => createComponentProject(
          `component-${type}`,
          `${type} project`,
          type,
          type === "motherboard"
            ? ({ ...createDefaultComponentConfiguration("motherboard"), pcieGeneration: 3 } as ComponentConfiguration)
            : createDefaultComponentConfiguration(type),
          base.gameDate,
        )),
      osProjects,
      aiProjects: [],
    };
    const serverConfiguration = {
      ...buildSuggestedDeviceConfiguration("server", context),
      gpuProjectId: null,
      aiAcceleratorProjectId: null,
    };
    const server = createDeviceProject("device-1", "Dynasty Server", serverConfiguration, base.gameDate);
    repository.state = {
      ...base,
      cpuProjects: [...context.cpuProjects],
      componentProjects: [...context.componentProjects],
      osProjects,
      deviceProjects: [server],
    };

    await application.load();
    const desktopConfiguration = {
      ...buildSuggestedDeviceConfiguration("desktop", context),
      gpuProjectId: null,
      networkingProjectId: null,
      aiAcceleratorProjectId: null,
    };
    await application.createDeviceProject("Dynasty Desktop", desktopConfiguration);
    await application.createCloudProject(
      "Dynasty Cloud",
      buildSuggestedCloudConfiguration([server]),
    );

    const reloaded = await createGameApplication(repository).load();
    const desktop = reloaded.deviceProjects.find((project) => project.name === "Dynasty Desktop");
    const cloud = reloaded.cloudProjects[0];

    expect(desktop?.configuration.cpuProjectId).toBe("cpu-1");
    expect(desktop?.configuration.osReleaseId).toBe("os-release-1");
    expect(cloud?.configuration.serverDeviceProjectId).toBe("device-1");
    expect(reloaded.deviceProjects).toHaveLength(2);
  });

  it("posts research spending to the finance ledger", async () => {
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);

    const state = await application.startResearch("out-of-order");

    expect(state.company.balance).toBe(88_000);
    expect(state.research.activeProject?.technologyId).toBe("out-of-order");
    expect(getFinanceDailyRecord(state.finance, "1995-01-01")).toMatchObject({
      researchUsd: 12_000,
      netProfitUsd: -12_000,
      closingBalanceUsd: 88_000,
    });
  });

  it("persists release, pricing, production, marketing, and loan commands", async () => {
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);
    const configuration = createDefaultCpuConfiguration();

    await application.createCpuProject("Dynasty Core", configuration);
    const released = await application.releaseProduct({
      projectId: "cpu-1",
      projectVersion: 1,
      name: "Dynasty One",
      segmentId: "mainstream",
      priceUsd: 600,
    });
    await application.orderProduction("product-1", 25);
    await application.updateProductPrice("product-1", 575);
    await application.updateMarketingBudget(250);
    const withLoan = await application.takeLoan(5_000);

    const reloaded = await createGameApplication(repository).load();
    const product = reloaded.market.products[0];
    const daily = getFinanceDailyRecord(reloaded.finance, "1995-01-01");

    expect(released.market.products[0]?.releaseDate).toBe("1995-01-01");
    expect(product?.priceUsd).toBe(575);
    expect(reloaded.market.productionOrders[0]).toMatchObject({ quantity: 25, status: "in-production" });
    expect(reloaded.market.marketingBudgetUsdPerDay).toBe(250);
    expect(withLoan.finance.loan?.principalUsd).toBe(5_000);
    expect(daily?.releaseUsd).toBe(5_000);
    expect(daily?.manufacturingUsd).toBeGreaterThan(0);
    expect(daily?.financingUsd).toBe(5_000);
    expect(reloaded.company.balance).toBe(withLoan.company.balance);
  });
});
