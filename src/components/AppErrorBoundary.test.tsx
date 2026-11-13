import { Component, type ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { translations } from "../localization/messages";
import { AppErrorBoundary } from "./AppErrorBoundary";

class Thrower extends Component<{ children: ReactNode }> {
  render(): ReactNode {
    throw new Error("Test crash");
  }
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AppErrorBoundary", () => {
  it("renders a localized fallback when a child crashes", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <AppErrorBoundary locale="ru">
        <Thrower>content</Thrower>
      </AppErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByRole("heading", { name: translations.ru.errors.crashTitle })).toBeTruthy();
    expect(screen.getByRole("button", { name: translations.ru.errors.crashReload })).toBeTruthy();
  });

  it("renders children while healthy", () => {
    render(
      <AppErrorBoundary locale="en">
        <p>Healthy app</p>
      </AppErrorBoundary>,
    );

    expect(screen.getByText("Healthy app")).toBeTruthy();
  });
});
