import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { releaseProduct } from "../../game/engine/market";
import { advanceGameDay } from "../../game/engine/time";
import { createCpuProject, createDefaultCpuConfiguration } from "../../game/models/cpu";
import { createInitialGameState, type GameState } from "../../game/models/game-state";
import { DashboardPage } from "./DashboardPage";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function renderDashboard(state: GameState = createInitialGameState()) {
  const onNavigate = vi.fn();
  const onAdvanceDay = vi.fn();
  render(
    <DashboardPage
      isSaving={false}
      onAdvanceDay={onAdvanceDay}
      onNavigate={onNavigate}
      state={state}
    />,
  );
  return { onNavigate, onAdvanceDay };
}

describe("DashboardPage", () => {
  it("shows the next first-run step and opens its workspace", () => {
    const { onNavigate } = renderDashboard();

    expect(screen.getByText("0 из 9 шагов")).toBeTruthy();
    expect(screen.getByText("Создайте проект процессора")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Перейти" }));
    expect(onNavigate).toHaveBeenCalledWith("cpu");
  });

  it("dismisses the quick start hint and remembers the choice", () => {
    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "Скрыть подсказку быстрого старта" }));

    expect(screen.queryByText("Быстрый старт")).toBeNull();
    expect(window.localStorage.getItem("silicon-dynasty:quick-start-dismissed")).toBe("1");
  });

  it("shows actionable signals and navigates to the relevant screen", () => {
    const { onNavigate } = renderDashboard();

    expect(screen.getByText("Нет активных продуктов. Пора выходить на рынок.")).toBeTruthy();
    expect(screen.getByText("Исследования ещё не запущены.")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Открыть" })[0]!);
    expect(onNavigate).toHaveBeenCalledWith("market");
  });

  it("opens a workspace from the command center quick actions", () => {
    const { onNavigate } = renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "Новый процессор" }));
    expect(onNavigate).toHaveBeenCalledWith("cpu");
  });

  it("shows real finance and market trends in the company pulse", () => {
    let state = createInitialGameState();
    state = advanceGameDay(state);
    state = advanceGameDay(state);

    renderDashboard(state);

    expect(screen.getByText("Пульс компании")).toBeTruthy();
    expect(screen.getByRole("img", { name: /^Выручка:/ })).toBeTruthy();
    expect(screen.getByRole("img", { name: /^Прибыль:/ })).toBeTruthy();
    expect(screen.getByRole("img", { name: /^Доля рынка:/ })).toBeTruthy();
    expect(screen.getAllByText("За 14 дней")).toHaveLength(3);
  });

  it("shows press reviews once a released product reaches the market", () => {
    let state = createInitialGameState();
    state = {
      ...state,
      cpuProjects: [
        createCpuProject("cpu-1", "Dynasty CPU", createDefaultCpuConfiguration(), "1995-01-01"),
      ],
    };
    state = releaseProduct(state, {
      projectId: "cpu-1",
      projectVersion: 1,
      name: "Dynasty One",
      segmentId: "budget",
      priceUsd: 300,
    });
    state = { ...state, gameDate: "1995-03-01" };

    renderDashboard(state);

    expect(screen.getByText("Пресса")).toBeTruthy();
    expect(screen.getByText(/\/100/)).toBeTruthy();
    expect(screen.getAllByText(/Dynasty One/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Открыть рынок" })).toBeTruthy();
  });
});
