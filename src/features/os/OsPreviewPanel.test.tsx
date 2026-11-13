import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createDefaultOsConfiguration, createOsProject, type OsRelease } from "../../game/models/os";
import { translations } from "../../localization/messages";
import { OsPreviewPanel } from "./OsPreviewPanel";

const ru = translations.ru.os.preview;
const stages = translations.ru.os.releases.stages;

afterEach(cleanup);

function release(overrides: Partial<OsRelease> = {}): OsRelease {
  return {
    id: "os-release-1",
    version: 1,
    stage: "alpha",
    createdOn: "1995-01-01",
    configuration: createDefaultOsConfiguration(),
    qualityScore: 42.5,
    appealScore: 38.1,
    costUsd: 25_000,
    ...overrides,
  };
}

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

  it("switches the preview to a saved release from the history selector", async () => {
    const user = userEvent.setup();
    const currentConfiguration = { ...createDefaultOsConfiguration(), gui: "modern-desktop" as const };
    const alphaConfiguration = { ...createDefaultOsConfiguration(), gui: "desktop-shell" as const };
    const project = {
      ...createOsProject("os-1", "Dynasty OS", currentConfiguration, "2001-01-01"),
      releases: [
        release({ configuration: alphaConfiguration }),
        release({
          id: "os-release-2",
          version: 2,
          stage: "beta",
          configuration: currentConfiguration,
          qualityScore: 61.2,
        }),
      ],
    };

    render(
      <OsPreviewPanel
        configuration={currentConfiguration}
        locale="ru"
        project={project}
      />,
    );

    expect(screen.getByLabelText(ru.historyTitle)).toBeTruthy();
    expect(document.querySelector(".os-preview-stage")?.textContent).toBe(stages.beta);

    await user.selectOptions(screen.getByLabelText(ru.historyTitle), "os-release-1");

    expect(document.querySelector(".os-preview-stage")?.textContent).toBe(stages.alpha);
    expect(screen.getByText(ru.shells["desktop-shell"])).toBeTruthy();
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
