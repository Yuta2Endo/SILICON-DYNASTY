import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createDefaultCpuConfiguration } from "../../game/models/cpu";
import { CPUBenchmarkPanel } from "./CPUBenchmarkPanel";

afterEach(cleanup);

describe("CPUBenchmarkPanel", () => {
  it("runs all CPU workloads and clears stale results when the draft changes", async () => {
    const user = userEvent.setup();
    const configuration = createDefaultCpuConfiguration();
    const { rerender } = render(
      <CPUBenchmarkPanel configuration={configuration} configurationIsValid locale="ru" />,
    );

    await user.click(screen.getByRole("button", { name: "Запустить тесты" }));

    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "Целочисленные задачи" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Вещественные вычисления" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Нагрузка на память" })).toBeTruthy();

    rerender(
      <CPUBenchmarkPanel
        configuration={{ ...configuration, clockMHz: 125 }}
        configurationIsValid
        locale="ru"
      />,
    );

    await waitFor(() => {
      expect(screen.queryAllByRole("article")).toHaveLength(0);
      expect(screen.getByText("Запустите тесты, чтобы увидеть расчётные результаты.")).toBeTruthy();
    });
  });

  it("disables simulation while the draft configuration is invalid", () => {
    render(
      <CPUBenchmarkPanel
        configuration={createDefaultCpuConfiguration()}
        configurationIsValid={false}
        locale="en"
      />,
    );

    expect(screen.getByRole("button", { name: "Run benchmarks" })).toHaveProperty("disabled", true);
    expect(screen.getByText("Fix configuration errors before running the simulation.")).toBeTruthy();
  });
});
