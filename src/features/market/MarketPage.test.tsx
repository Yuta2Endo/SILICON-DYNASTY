import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultCpuConfiguration, createCpuProject } from "../../game/models/cpu";
import { createComponentProject, createDefaultComponentConfiguration } from "../../game/models/components";
import { createInitialGameState } from "../../game/models/game-state";
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
