import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrendSparkline } from "./TrendSparkline";

describe("TrendSparkline", () => {
  it("renders an accessible trend line for a series", () => {
    render(<TrendSparkline label="Выручка: 10 → 30" tone="green" values={[10, 20, 30]} />);

    const chart = screen.getByRole("img", { name: "Выручка: 10 → 30" });
    expect(chart.getAttribute("class")).toContain("trend-sparkline--green");
    expect(chart.querySelector("polyline")?.getAttribute("points")?.split(" ")).toHaveLength(3);
  });

  it("draws a zero baseline for negative values", () => {
    const { container } = render(
      <TrendSparkline label="Прибыль" tone="danger" values={[-10, 5, -2]} />,
    );

    expect(container.querySelector(".trend-sparkline__baseline")).toBeTruthy();
  });

  it("renders nothing for an empty series", () => {
    const { container } = render(<TrendSparkline label="Нет данных" values={[]} />);

    expect(container.firstChild).toBeNull();
  });
});
