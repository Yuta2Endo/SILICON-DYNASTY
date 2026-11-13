import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialGameState } from "../../game/models/game-state";
import { translations } from "../../localization/messages";
import { MainMenu } from "./MainMenu";

afterEach(cleanup);

describe("MainMenu", () => {
  it("shows the current campaign and continues", async () => {
    const user = userEvent.setup();
    const state = {
      ...createInitialGameState(),
      company: { ...createInitialGameState().company, name: "Dynasty Labs", balance: 125_000 },
    };
    const onContinue = vi.fn();

    render(
      <MainMenu
        error={false}
        isSaving={false}
        onContinue={onContinue}
        onNewGame={vi.fn()}
        onSettings={vi.fn()}
        state={state}
      />,
    );

    expect(screen.getByRole("dialog", { name: "SILICON DYNASTY" })).toBeTruthy();
    expect(screen.getByText("Dynasty Labs")).toBeTruthy();
    expect(screen.getByText(/125/).textContent).toContain("125");

    await user.click(screen.getByRole("button", { name: "Продолжить" }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("confirms a new game before resetting progress", async () => {
    const user = userEvent.setup();
    const onNewGame = vi.fn();

    render(
      <MainMenu
        error={false}
        isSaving={false}
        onContinue={vi.fn()}
        onNewGame={onNewGame}
        onSettings={vi.fn()}
        state={createInitialGameState()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Новая игра" }));
    expect(screen.getByRole("dialog", { name: "Начать новую игру?" })).toBeTruthy();
    expect(onNewGame).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Начать заново" }));
    expect(onNewGame).toHaveBeenCalledOnce();
  });

  it("opens settings and exposes a load error", async () => {
    const user = userEvent.setup();
    const onSettings = vi.fn();

    render(
      <MainMenu
        error
        isSaving={false}
        onContinue={vi.fn()}
        onNewGame={vi.fn()}
        onSettings={onSettings}
        state={createInitialGameState()}
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain("Текущий прогресс не изменён");
    await user.click(screen.getByRole("button", { name: "Настройки" }));
    expect(onSettings).toHaveBeenCalledOnce();
  });

  it("keeps keyboard focus inside the menu and closes with Escape", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    const copy = translations.ru.mainMenu;

    render(
      <MainMenu
        error={false}
        isSaving={false}
        onContinue={onContinue}
        onNewGame={vi.fn()}
        onSettings={vi.fn()}
        state={createInitialGameState()}
      />,
    );

    const continueButton = screen.getByRole("button", { name: copy.continue });
    expect(document.activeElement).toBe(continueButton);

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: copy.settings }));

    await user.tab();
    expect(document.activeElement).toBe(continueButton);

    await user.keyboard("{Escape}");
    expect(onContinue).toHaveBeenCalledOnce();
  });
});
