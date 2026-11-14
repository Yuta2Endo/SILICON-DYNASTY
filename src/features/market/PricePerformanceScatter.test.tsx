import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { translations } from "../../localization/messages";
import type { PricePerformancePoint } from "../../game/formulas/market-visuals";
import { PricePerformanceScatter } from "./PricePerformanceScatter";

afterEach(cleanup);

const copy = translations.ru.market.scatter;
const segmentNames = translations.ru.market.segmentNames;
const points: PricePerformancePoint[] = [
  {
    id: "product-1",
    name: "Dynasty One",
    kind: "player",
    segmentId: "budget",
    priceUsd: 300,
    performanceScore: 1.1,
    sourceName: "Dynasty One",
  },
  {
    id: "apex:apex-a4",
    name: "Apex A4-66",
    kind: "competitor",
    segmentId: "budget",
    priceUsd: 260,
    performanceScore: 0.72,
    sourceName: "Apex Microsystems",
  },
];

describe("PricePerformanceScatter", () => {
  it("renders player and competitor points with a selected detail", () => {
    render(
      <PricePerformanceScatter
        copy={copy}
        locale="ru"
        points={points}
        segmentNames={segmentNames}
      />,
    );

    expect(screen.getByRole("img", { name: /Карта цена/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Dynasty One/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Apex A4-66/ })).toBeTruthy();
    expect(screen.getByText(copy.selected)).toBeTruthy();
    expect(screen.getAllByText("Dynasty One").length).toBeGreaterThan(0);
  });

  it("switches the detail panel when a competitor point is selected", async () => {
    const user = userEvent.setup();
    render(
      <PricePerformanceScatter
        copy={copy}
        locale="ru"
        points={points}
        segmentNames={segmentNames}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Apex A4-66/ }));

    expect(screen.getAllByText("Apex A4-66").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Apex Microsystems").length).toBeGreaterThan(0);
  });

  it("shows an empty state without products", () => {
    render(
      <PricePerformanceScatter
        copy={copy}
        locale="ru"
        points={[]}
        segmentNames={segmentNames}
      />,
    );

    expect(screen.getByText(copy.emptyTitle)).toBeTruthy();
  });
});
