import { cleanup, render, screen, within } from "@testing-library/react";
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
    expect(screen.getByText(ru.windowContent.notes.title)).toBeTruthy();
  });

  it("opens system settings, files, task manager and updates windows", async () => {
    const user = userEvent.setup();
    const configuration = {
      ...createDefaultOsConfiguration(),
      gui: "desktop-shell" as const,
      filesystem: "ext2" as const,
      updateModel: "package-manager" as const,
      packageManager: "centralized" as const,
      encryption: "disk" as const,
    };

    render(
      <OsPreviewPanel
        configuration={configuration}
        locale="ru"
        project={null}
      />,
    );

    const system = translations.ru.os.preview.systemApps;

    await user.click(screen.getByRole("button", { name: system.settings.name }));
    expect(screen.getByRole("dialog", { name: system.settings.name })).toBeTruthy();
    expect(screen.getByText(system.settings.title)).toBeTruthy();
    expect(screen.getByText(system.settings.display)).toBeTruthy();

    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: system.files.name }));
    expect(screen.getByText(system.files.title)).toBeTruthy();
    expect(screen.getByText(system.files.encrypted)).toBeTruthy();

    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: system["task-manager"].name }));
    expect(screen.getByText(system["task-manager"].title)).toBeTruthy();
    expect(screen.getByText(system["task-manager"].performance)).toBeTruthy();

    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: system.updates.name }));
    expect(screen.getByText(system.updates.title)).toBeTruthy();
    expect(screen.getByText(system.updates.packages)).toBeTruthy();
  });

  it("changes theme, density and accent from system settings", async () => {
    const user = userEvent.setup();
    render(
      <OsPreviewPanel
        configuration={{ ...createDefaultOsConfiguration(), gui: "desktop-shell" }}
        locale="ru"
        project={null}
      />,
    );

    const system = translations.ru.os.preview.systemApps.settings;
    const previewScreen = document.querySelector(".os-preview-screen") as HTMLElement;

    await user.click(screen.getByRole("button", { name: system.name }));
    const dialog = screen.getByRole("dialog", { name: system.name });
    expect(within(dialog).getByText(system.appearance)).toBeTruthy();

    await user.click(within(dialog).getByRole("button", { name: system.themes.light }));
    expect(previewScreen.classList.contains("os-preview-screen--theme-light")).toBe(true);

    await user.click(screen.getByRole("button", { name: system.densities.compact }));
    expect(previewScreen.classList.contains("os-preview-screen--density-compact")).toBe(true);

    await user.click(screen.getByRole("button", { name: system.accents.violet }));
    expect(previewScreen.dataset.accent).toBe("violet");
    expect(previewScreen.style.getPropertyValue("--os-preview-accent")).toBe("#8b5cf6");
  });

  it("opens the security center and driver manager", async () => {
    const user = userEvent.setup();
    render(
      <OsPreviewPanel
        configuration={{
          ...createDefaultOsConfiguration(),
          gui: "desktop-shell",
          driverFramework: "certified",
          encryption: "full-disk",
          updateModel: "staged",
          packageManager: "signed",
          networkStack: "advanced",
          supportedArchitectures: ["x86", "arm"],
        }}
        locale="ru"
        project={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Безопасность" }));
    expect(screen.getByRole("dialog", { name: "Безопасность" })).toBeTruthy();
    expect(screen.getByText("Центр безопасности")).toBeTruthy();
    expect(screen.getAllByText("Включено").length).toBeGreaterThan(0);

    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Драйверы" }));
    expect(screen.getByRole("dialog", { name: "Драйверы" })).toBeTruthy();
    expect(screen.getByText("Менеджер драйверов")).toBeTruthy();
    expect(screen.getByText("PCIe 5.0")).toBeTruthy();
    expect(screen.getByText("InfiniBand")).toBeTruthy();
  });

  it("opens the App Store and Recovery mode from the Start menu", async () => {
    const user = userEvent.setup();
    render(
      <OsPreviewPanel
        configuration={{
          ...createDefaultOsConfiguration(),
          gui: "desktop-shell",
          appStore: "open",
          sdk: "full",
          api: "hybrid",
        }}
        locale="ru"
        project={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: ru.start }));
    await user.click(screen.getByRole("button", { name: "Магазин" }));
    expect(screen.getByRole("dialog", { name: "Магазин" })).toBeTruthy();
    expect(screen.getByText("Магазин приложений")).toBeTruthy();
    expect(screen.getByText("Совместимые приложения")).toBeTruthy();

    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: ru.start }));
    await user.click(screen.getByRole("button", { name: "Восстановление" }));
    expect(screen.getByRole("dialog", { name: "Восстановление" })).toBeTruthy();
    expect(screen.getByText("Режим восстановления")).toBeTruthy();
    expect(screen.getByText("Целостность данных")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Симулировать сбой" }));
    expect(screen.getByText("Система остановлена")).toBeTruthy();
    expect(screen.getByText("KERNEL_PANIC_MONOLITHIC")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: ru.screens.crashRestart }));
    expect(screen.getByText(ru.screens.bootTitle)).toBeTruthy();
  });

  it("shows configuration-driven notifications", async () => {
    const user = userEvent.setup();
    render(
      <OsPreviewPanel
        configuration={{ ...createDefaultOsConfiguration(), gui: "desktop-shell" }}
        locale="ru"
        project={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: ru.notifications.open }));

    expect(screen.getByRole("dialog", { name: ru.notifications.title })).toBeTruthy();
    expect(screen.getByText(ru.notifications.appsTitle)).toBeTruthy();
    expect(screen.getByText(/\d+ из 6/)).toBeTruthy();
  });

  it("opens mission control, minimizes windows and launches a system app", async () => {
    const user = userEvent.setup();
    render(
      <OsPreviewPanel
        configuration={{ ...createDefaultOsConfiguration(), gui: "desktop-shell" }}
        locale="ru"
        project={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Заметки" }));
    await user.click(screen.getByRole("button", { name: ru.missionControl.open }));

    expect(screen.getByRole("dialog", { name: ru.missionControl.title })).toBeTruthy();
    expect(screen.getAllByText("Заметки").length).toBeGreaterThan(0);
    expect(screen.getByText(/Открытых окон: 1/)).toBeTruthy();

    const mission = screen.getByRole("dialog", { name: ru.missionControl.title });
    await user.click(within(mission).getByRole("button", { name: ru.missionControl.minimizeAll }));
    expect(mission.querySelector(".os-preview-mission__empty strong")?.textContent).toBe(
      ru.missionControl.empty,
    );

    await user.click(within(mission).getByRole("button", { name: ru.systemApps.settings.name }));
    expect(screen.getByRole("dialog", { name: ru.systemApps.settings.name })).toBeTruthy();
  });

  it("changes wallpaper per desktop", async () => {
    const user = userEvent.setup();
    render(
      <OsPreviewPanel
        configuration={{ ...createDefaultOsConfiguration(), gui: "desktop-shell" }}
        locale="ru"
        project={null}
      />,
    );

    const desktopArea = () => document.querySelector(".os-preview-desktop-area");
    expect(desktopArea()?.classList.contains("os-preview-desktop-area--wallpaper-classic")).toBe(true);

    await user.click(screen.getByRole("button", { name: ru.missionControl.open }));
    let mission = screen.getByRole("dialog", { name: ru.missionControl.title });
    await user.click(within(mission).getByRole("button", { name: ru.missionControl.wallpapers.aurora }));
    await user.click(within(mission).getByRole("button", { name: ru.missionControl.close }));
    expect(desktopArea()?.classList.contains("os-preview-desktop-area--wallpaper-aurora")).toBe(true);

    await user.click(
      screen.getByRole("button", {
        name: ru.missionControl.desktop.replace("{number}", "2"),
      }),
    );
    await user.click(screen.getByRole("button", { name: ru.missionControl.open }));
    mission = screen.getByRole("dialog", { name: ru.missionControl.title });
    await user.click(within(mission).getByRole("button", { name: ru.missionControl.wallpapers.grid }));
    await user.click(within(mission).getByRole("button", { name: ru.missionControl.close }));
    expect(desktopArea()?.classList.contains("os-preview-desktop-area--wallpaper-grid")).toBe(true);

    await user.click(
      screen.getByRole("button", {
        name: ru.missionControl.desktop.replace("{number}", "1"),
      }),
    );
    expect(desktopArea()?.classList.contains("os-preview-desktop-area--wallpaper-aurora")).toBe(true);
  });

  it("keeps windows on separate desktops and moves a window between them", async () => {
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

    await user.click(
      screen.getByRole("button", {
        name: ru.missionControl.desktop.replace("{number}", "2"),
      }),
    );
    expect(screen.queryByRole("dialog", { name: "Заметки" })).toBeNull();

    await user.click(
      screen.getByRole("button", { name: translations.ru.os.preview.systemApps.settings.name }),
    );
    expect(
      screen.getByRole("dialog", { name: translations.ru.os.preview.systemApps.settings.name }),
    ).toBeTruthy();

    await user.click(
      screen.getByRole("button", {
        name: ru.missionControl.desktop.replace("{number}", "1"),
      }),
    );
    expect(screen.getByRole("dialog", { name: "Заметки" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: ru.missionControl.open }));
    const mission = screen.getByRole("dialog", { name: ru.missionControl.title });
    expect(within(mission).getByText(new RegExp(`${ru.missionControl.windows}: 2`))).toBeTruthy();

    await user.click(
      within(mission).getByRole("button", {
        name: `${ru.missionControl.moveTo} ${ru.missionControl.desktop.replace("{number}", "2")}`,
      }),
    );
    await user.click(within(mission).getByRole("button", { name: ru.missionControl.close }));
    expect(screen.getByRole("dialog", { name: "Заметки" })).toBeTruthy();
  });

  it("shows quick settings with configuration values", async () => {
    const user = userEvent.setup();
    render(
      <OsPreviewPanel
        configuration={{
          ...createDefaultOsConfiguration(),
          appStore: "curated",
          driverFramework: "unified",
          filesystem: "ext2",
          gui: "desktop-shell",
          networkStack: "tcp-ip",
          permissions: "role-based",
          updateModel: "staged",
        }}
        locale="ru"
        project={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: ru.quickSettings.open }));

    expect(screen.getByRole("dialog", { name: ru.quickSettings.title })).toBeTruthy();
    expect(screen.getByText(ru.quickSettings.network)).toBeTruthy();
    expect(screen.getByText(translations.ru.os.options.networkStack["tcp-ip"])).toBeTruthy();
    expect(screen.getByText(translations.ru.os.options.filesystem.ext2)).toBeTruthy();
  });

  it("walks through the boot and lock screens before the desktop", async () => {
    const user = userEvent.setup();
    render(
      <OsPreviewPanel
        configuration={{ ...createDefaultOsConfiguration(), gui: "desktop-shell" }}
        locale="ru"
        project={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: ru.screens.restart }));
    expect(screen.getByText(ru.screens.bootTitle)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: ru.screens.bootContinue }));
    expect(screen.getByText(ru.screens.lockSubtitle)).toBeTruthy();
    expect(screen.getByText(ru.screens.lockUser)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: ru.screens.unlock }));
    expect(screen.getByText(ru.search)).toBeTruthy();
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
