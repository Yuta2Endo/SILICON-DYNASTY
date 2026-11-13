import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyFinanceTransaction, createInitialFinanceState } from "../../game/models/finance";
import { createInitialGameState } from "../../game/models/game-state";
import { translations } from "../../localization/messages";
import { AnalyticsPanel } from "./AnalyticsPanel";

const copy = translations.ru.analytics;

function stateWithFinance() {
  const base = createInitialGameState();
  let finance = createInitialFinanceState();
  finance = applyFinanceTransaction(
    finance,
    { date: "1995-01-01", category: "sales", amountUsd: 10_000 },
    110_000,
  );
  finance = applyFinanceTransaction(
    finance,
    { date: "1995-01-01", category: "manufacturing", amountUsd: -2_000 },
    108_000,
  );
  return {
    ...base,
    gameDate: "1995-01-03",
    finance,
    market: {
      ...base.market,
      dailySummaries: [{
        date: "1995-01-01",
        totalDemandUnits: 6_000,
        playerUnits: 600,
        competitorUnits: 5_400,
        playerRevenueUsd: 10_000,
        marketShare: 0.1,
        componentDemandUnits: 0,
        componentUnits: 0,
        componentRevenueUsd: 0,
        componentManufacturingUsd: 0,
        segments: {
          budget: { playerUnits: 600, totalUnits: 6_000, share: 0.1 },
        },
      }],
    },
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AnalyticsPanel", () => {
  it("renders financial, market and technology sections from real state", () => {
    render(<AnalyticsPanel state={stateWithFinance()} />);

    expect(screen.getByRole("heading", { name: copy.title })).toBeTruthy();
    expect(screen.getByText(copy.kpis.revenue)).toBeTruthy();
    expect(screen.getByRole("heading", { name: copy.chart.title })).toBeTruthy();
    expect(screen.getByText(copy.corporate.title)).toBeTruthy();
    expect(screen.getByText(copy.market.title)).toBeTruthy();
    expect(screen.getByText(copy.technology.title)).toBeTruthy();
    expect(screen.getByText("Бюджетный")).toBeTruthy();
  });

  it("switches the report range and exports CSV", () => {
    const state = stateWithFinance();
    const createObjectURL = vi.fn(() => "blob:analytics");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, configurable: true });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<AnalyticsPanel state={state} />);

    const weekButton = screen.getByRole("button", { name: copy.ranges.d7 });
    fireEvent.click(weekButton);
    expect(weekButton.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: copy.exportCsv }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:analytics");
    expect(click).toHaveBeenCalledTimes(1);
    expect(screen.getByText(copy.exportSuccess)).toBeTruthy();
  });

  it("shows an empty chart state before the first financial record", () => {
    render(<AnalyticsPanel state={createInitialGameState()} />);
    expect(screen.getByText(copy.chart.empty)).toBeTruthy();
  });
});
