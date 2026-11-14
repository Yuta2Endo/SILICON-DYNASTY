import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import {
  createDefaultComponentConfiguration,
  type GpuConfiguration,
} from "../../game/models/components";
import { translations } from "../../localization/messages";
import { GpuBoardPreview } from "./GpuBoardPreview";

afterEach(cleanup);

const ru = translations.ru;
const copy = ru.components.gpuPreview;
const defaultGpu = createDefaultComponentConfiguration("gpu") as GpuConfiguration;

describe("GPU board preview", () => {
  it("renders the board with VRAM modules and board metrics", () => {
    const { container } = render(<GpuBoardPreview configuration={defaultGpu} locale="ru" />);

    expect(screen.getByRole("heading", { name: copy.title })).toBeTruthy();
    expect(screen.getByRole("img", { name: copy.canvasLabel })).toBeTruthy();
    expect(container.querySelectorAll(".gpu-board__module--vram")).toHaveLength(4);
    expect(screen.getByText(copy.metrics.bus)).toBeTruthy();
    expect(screen.getByText(copy.metrics.psu)).toBeTruthy();
  });

  it("switches to the die view and exposes compute blocks", async () => {
    const user = userEvent.setup();
    const { container } = render(<GpuBoardPreview configuration={defaultGpu} locale="ru" />);

    await user.click(screen.getByRole("button", { name: copy.views.die }));

    expect(container.querySelectorAll(".gpu-die__block--compute")).toHaveLength(8);
    expect(container.querySelector(".gpu-die__block--rt")).toBeNull();
    expect(screen.getByText(copy.metrics.compute)).toBeTruthy();
  });

  it("shows ray-tracing and power connectors for a flagship configuration", async () => {
    const user = userEvent.setup();
    const configuration: GpuConfiguration = {
      ...defaultGpu,
      computeUnits: 64,
      tdpW: 300,
      rayTracing: true,
    };
    const { container } = render(<GpuBoardPreview configuration={configuration} locale="ru" />);

    expect(container.querySelector(".gpu-board__module--power")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: copy.views.die }));
    expect(container.querySelector(".gpu-die__block--rt")).toBeTruthy();
  });
});
