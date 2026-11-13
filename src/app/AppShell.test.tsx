import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialGameState } from "../game/models/game-state";
import { AppShell } from "./AppShell";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function useMobileViewport() {
  vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query: string) => ({
    matches: query === "(max-width: 899px)",
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
}

describe("AppShell mobile navigation", () => {
  it("shows four primary destinations plus a More menu", async () => {
    useMobileViewport();
    const onNavigate = vi.fn();
    const user = userEvent.setup();

    render(
      <AppShell
        activeScreen="dashboard"
        alert={null}
        announcement={null}
        onNavigate={onNavigate}
        onOpenMenu={() => undefined}
        state={createInitialGameState()}
      >
        <p>content</p>
      </AppShell>,
    );

    expect(screen.getByRole("button", { name: "Обзор" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Наука" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Процессор" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Рынок" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Настройки" })).not.toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Ещё" }));

    expect(screen.getByRole("dialog", { name: "Ещё" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Настройки" }));

    expect(onNavigate).toHaveBeenCalledWith("settings");
    expect(screen.queryByRole("dialog", { name: "Ещё" })).not.toBeTruthy();
  });
});
