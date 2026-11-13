import { describe, expect, it } from "vitest";
import type { GameState } from "../models/game-state";
import { createDefaultCpuConfiguration } from "../models/cpu";
import { createDefaultComponentConfiguration, type GpuConfiguration } from "../models/components";
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
