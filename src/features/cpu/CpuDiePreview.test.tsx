import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createDefaultCpuConfiguration } from "../../game/models/cpu";
import { translations } from "../../localization/messages";
import { CpuDiePreview } from "./CpuDiePreview";

afterEach(cleanup);

describe("CpuDiePreview", () => {
  it("renders the floorplan, legend and thermal metrics", () => {
    const copy = translations.ru.cpu.diePreview;
    render(<CpuDiePreview configuration={createDefaultCpuConfiguration()} locale="ru" />);

    expect(screen.getByRole("heading", { name: copy.title })).toBeTruthy();
    expect(screen.getByRole("img", { name: copy.canvasLabel })).toBeTruthy();
    expect(screen.getByText(copy.metrics.dieArea)).toBeTruthy();
    expect(screen.getAllByText(copy.metrics.hotspot).length).toBeGreaterThan(0);
    expect(screen.getByText(copy.simulationBadge)).toBeTruthy();
    expect(screen.getByLabelText(copy.legend)).toBeTruthy();
  });

  it("selects a block and shows its localized name", () => {
    const copy = translations.ru.cpu.diePreview;
    const { container } = render(
      <CpuDiePreview configuration={createDefaultCpuConfiguration()} locale="ru" />,
    );

    fireEvent.click(screen.getByRole("button", { name: new RegExp(copy.blocks.l2) }));

    const selected = container.querySelector(".cpu-die-preview__selected");
    expect(selected).toBeTruthy();
    expect(within(selected as HTMLElement).getByText(copy.blocks.l2)).toBeTruthy();
  });

  it("shows a hotter hotspot for a high-power processor", () => {
    render(
      <CpuDiePreview
        configuration={{ ...createDefaultCpuConfiguration(), tdpW: 150 }}
        locale="ru"
      />,
    );

    expect(screen.getByText("100/100")).toBeTruthy();
  });
});
