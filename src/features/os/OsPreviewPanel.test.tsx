import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createDefaultOsConfiguration } from "../../game/models/os";
import { translations } from "../../localization/messages";
import { OsPreviewPanel } from "./OsPreviewPanel";

const ru = translations.ru.os.preview;

afterEach(cleanup);

describe("OsPreviewPanel", () => {
  it("renders a terminal for a CLI system", () => {
    render(
      <OsPreviewPanel
        configuration={createDefaultOsConfiguration()}
        locale="ru"
        project={null}
      />,
    );

    expect(screen.getByRole("heading", { name: ru.title })).toBeTruthy();
    expect(screen.getByText(ru.terminalBoot)).toBeTruthy();
    expect(screen.getByText((_, node) => node?.textContent === `${ru.apps}: 1/6`)).toBeTruthy();
  });

  it("shows a desktop shell and opens a compatible application", async () => {
    const user = userEvent.setup();
    render(
      <OsPreviewPanel
        configuration={{ ...createDefaultOsConfiguration(), gui: "desktop-shell" }}
        locale="ru"
        project={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Заметки" }));

    expect(screen.getByRole("dialog", { name: "Заметки" })).toBeTruthy();
    expect(screen.getByText(ru.running)).toBeTruthy();
  });

  it("shows a lock reason for an incompatible application", async () => {
    const user = userEvent.setup();
    render(
      <OsPreviewPanel
        configuration={{ ...createDefaultOsConfiguration(), gui: "desktop-shell" }}
        locale="ru"
        project={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Офисный пакет/ }));

    expect(screen.getByRole("dialog", { name: "Офисный пакет" })).toBeTruthy();
    expect(screen.getByText(ru.locked)).toBeTruthy();
    expect(screen.getByText("Требуется более полный SDK.")).toBeTruthy();
  });
});
