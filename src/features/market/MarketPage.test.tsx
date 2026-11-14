import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultCpuConfiguration, createCpuProject } from "../../game/models/cpu";
import { createComponentProject, createDefaultComponentConfiguration } from "../../game/models/components";
import { createInitialGameState } from "../../game/models/game-state";
import type { MarketDaySummary } from "../../game/models/market";
import type { CommercialOffer } from "../../game/models/commercial";
import type { ReleaseProductInput } from "../../game/engine/market";
import type { ReleaseComponentProductInput } from "../../game/engine/component-market";
import { translations } from "../../localization/messages";
import { MarketPage } from "./MarketPage";

afterEach(cleanup);

const ru = translations.ru;
const state = createInitialGameState();
const project = createCpuProject(
  "cpu-1",
  "Dynasty Core",
  createDefaultCpuConfiguration(),
  state.gameDate,
);
const stateWithProject = { ...state, cpuProjects: [project] };
const componentProject = createComponentProject(
  "component-1",
  "Dynasty Graphics",
  "gpu",
  createDefaultComponentConfiguration("gpu"),
  state.gameDate,
);
const stateWithComponentProject = { ...stateWithProject, componentProjects: [componentProject] };
const noop = async () => true;

function renderMarket(overrides: Partial<Parameters<typeof MarketPage>[0]> = {}) {
  return render(
    <MarketPage
      activeView="market"
      isSaving={false}
      onDiscontinueProduct={noop}
      onDiscontinueComponentProduct={noop}
      onOrderProduction={noop}
      onReleaseProduct={noop}
      onReleaseComponentProduct={noop}
      onRepayLoan={noop}
      onTakeLoan={noop}
      onAcceptOemContract={noop}
      onDeclineOemContract={noop}
      onAcceptCommercialOffer={noop}
      onDeclineCommercialOffer={noop}
      onUpdateMarketingBudget={noop}
      onUpdateComponentPrice={noop}
      onUpdatePrice={noop}
      onViewChange={() => undefined}
      state={stateWithProject}
      {...overrides}
    />,
  );
}

describe("Market screen", () => {
  it("launches a saved CPU version with a validated name and price", async () => {
    const user = userEvent.setup();
    const onReleaseProduct = vi.fn(async (input: ReleaseProductInput) => input.name.length > 0);
    renderMarket({ onReleaseProduct });

    await user.type(screen.getByRole("textbox", { name: ru.market.release.name }), "Dynasty One");
    await user.click(screen.getByRole("button", { name: ru.market.release.submit }));

    await waitFor(() => expect(onReleaseProduct).toHaveBeenCalledTimes(1));
    expect(onReleaseProduct).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "cpu-1",
      projectVersion: 1,
      name: "Dynasty One",
      segmentId: "budget",
      priceUsd: expect.any(Number),
    }));
  });

  it("launches a component version with its own price and market", async () => {
    const user = userEvent.setup();
    const onReleaseComponentProduct = vi.fn(
      async (input: ReleaseComponentProductInput) => input.name.length > 0,
    );
    renderMarket({ state: stateWithComponentProject, onReleaseComponentProduct });

    await user.type(
      screen.getByRole("textbox", { name: ru.market.componentMarket.release.name }),
      "Dynasty Graphics 100",
    );
    await user.click(screen.getByRole("button", { name: ru.market.componentMarket.release.submit }));

    await waitFor(() => expect(onReleaseComponentProduct).toHaveBeenCalledTimes(1));
    expect(onReleaseComponentProduct).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "component-1",
      projectVersion: 1,
      name: "Dynasty Graphics 100",
      priceUsd: expect.any(Number),
    }));
  });

  it("shows a clear empty state when there is no saved CPU version", () => {
    renderMarket({ state });

    expect(screen.getByText(ru.market.release.noProjects)).toBeTruthy();
    expect(screen.queryByRole("button", { name: ru.market.release.submit })).toBeNull();
  });

  it("shows the current economic cycle and its multipliers", () => {
    renderMarket();

    expect(screen.getByRole("heading", { name: ru.market.cycle.title })).toBeTruthy();
    expect(screen.getByText(ru.market.cycle.phases.stable)).toBeTruthy();
    expect(screen.getByText(ru.market.cycle.demand)).toBeTruthy();
  });

  it("shows and accepts a commercial contract offer", async () => {
    const user = userEvent.setup();
    const onAcceptCommercialOffer = vi.fn(async () => true);
    const offer: CommercialOffer = {
      id: "commercial-offer-1",
      partnerId: "orbit-devices",
      partnerName: "Orbit Devices",
      channel: "os-license",
      assetId: "os-license:os-1:os-release-1",
      assetName: "Dynasty OS",
      createdOn: "1995-01-01",
      expiresOn: "1995-01-22",
      durationDays: 180,
      signingBonusUsd: 2_000,
      dailyRevenueUsd: 120,
      dailyCostUsd: 0,
      minimumReputation: 0,
      qualityScore: 72,
    };

    renderMarket({
      onAcceptCommercialOffer,
      state: {
        ...stateWithProject,
        commercialContracts: {
          offers: [offer],
          active: [],
          lastOfferOn: "1995-01-01",
        },
      },
    });

    expect(screen.getByRole("heading", { name: ru.market.commercial.title })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: ru.market.commercial.accept }));
    await waitFor(() => expect(onAcceptCommercialOffer).toHaveBeenCalledWith("commercial-offer-1"));
  });

  it("shows market pulse sparklines from recent daily summaries", () => {
    const summaries: MarketDaySummary[] = [
      {
        date: "1995-01-01",
        totalDemandUnits: 100,
        playerUnits: 10,
        competitorUnits: 90,
        playerRevenueUsd: 3_000,
        marketShare: 0.1,
        segments: {},
        componentDemandUnits: 0,
        componentUnits: 0,
        componentRevenueUsd: 0,
        componentManufacturingUsd: 0,
      },
      {
        date: "1995-01-02",
        totalDemandUnits: 100,
        playerUnits: 12,
        competitorUnits: 88,
        playerRevenueUsd: 3_600,
        marketShare: 0.12,
        segments: {},
        componentDemandUnits: 0,
        componentUnits: 0,
        componentRevenueUsd: 0,
        componentManufacturingUsd: 0,
      },
    ];
    renderMarket({
      state: {
        ...stateWithProject,
        market: { ...stateWithProject.market, dailySummaries: summaries },
      },
    });

    expect(screen.getByRole("heading", { name: ru.market.pulse.title })).toBeTruthy();
    expect(screen.getAllByRole("img", { name: ru.market.pulse.share }).length).toBe(1);
    expect(screen.getAllByRole("img", { name: ru.market.pulse.revenue }).length).toBe(1);
    expect(screen.getAllByRole("img", { name: ru.market.pulse.units }).length).toBe(1);
    expect(screen.getAllByText(ru.market.pulse.window).length).toBe(3);
  });

  it("shows an OEM offer and forwards the accept action", async () => {
    const user = userEvent.setup();
    const onAcceptOemContract = vi.fn(async () => true);
    renderMarket({
      onAcceptOemContract,
      state: {
        ...stateWithProject,
        oemContracts: {
          offers: [{
            id: "oem-offer-1",
            customerId: "orbit",
            customerName: "Orbit Devices",
            productId: "product-1",
            productName: "Dynasty One",
            segmentId: "budget",
            createdOn: "1995-01-01",
            expiresOn: "1995-01-22",
            durationDays: 180,
            upfrontUsd: 12_500,
            demandBonusPercent: 15,
            minimumReputation: 0,
          }],
          active: [],
          lastOfferOn: "1995-01-01",
        },
      },
    });

    expect(screen.getByRole("heading", { name: ru.market.contracts.title })).toBeTruthy();
    expect(screen.getByText("Orbit Devices")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: ru.market.contracts.accept }));

    expect(onAcceptOemContract).toHaveBeenCalledWith("oem-offer-1");
  });

  it("switches to the analytics tab", async () => {
    const user = userEvent.setup();
    const onViewChange = vi.fn();
    renderMarket({ onViewChange });

    await user.click(screen.getByRole("tab", { name: ru.market.tabAnalytics }));
    expect(onViewChange).toHaveBeenCalledWith("analytics");
  });

  it("switches to finance and explains the absence of daily records", async () => {
    const user = userEvent.setup();
    const onViewChange = vi.fn();
    const { rerender } = renderMarket({ onViewChange });

    await user.click(screen.getByRole("tab", { name: ru.market.tabFinance }));
    expect(onViewChange).toHaveBeenCalledWith("finance");

    rerender(
      <MarketPage
        activeView="finance"
        isSaving={false}
        onDiscontinueProduct={noop}
        onDiscontinueComponentProduct={noop}
        onOrderProduction={noop}
        onReleaseProduct={noop}
        onReleaseComponentProduct={noop}
        onRepayLoan={noop}
        onTakeLoan={noop}
        onAcceptOemContract={noop}
        onDeclineOemContract={noop}
        onAcceptCommercialOffer={noop}
        onDeclineCommercialOffer={noop}
        onUpdateMarketingBudget={noop}
        onUpdateComponentPrice={noop}
        onUpdatePrice={noop}
        onViewChange={onViewChange}
        state={stateWithProject}
      />,
    );

    expect(screen.getByRole("tab", { name: ru.market.tabFinance }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText(ru.market.finance.noRecord)).toBeTruthy();
  });
});
