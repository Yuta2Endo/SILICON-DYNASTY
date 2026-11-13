import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialGameState } from "../../game/models/game-state";
import { createCpuProject, createDefaultCpuConfiguration } from "../../game/models/cpu";
import {
  createDefaultOsConfiguration,
  createOsProject,
  type OsRelease,
} from "../../game/models/os";
import { translations } from "../../localization/messages";
import { OsDesignerPage } from "./OsDesignerPage";

afterEach(cleanup);

const ru = translations.ru;
const baseState = createInitialGameState();
const osProject = createOsProject(
  "os-1",
  "Dynasty OS",
  createDefaultOsConfiguration(),
  baseState.gameDate,
);
const stateWithProject = { ...baseState, osProjects: [osProject] };

function renderDesigner(overrides: Partial<Parameters<typeof OsDesignerPage>[0]> = {}) {
  return render(
    <OsDesignerPage
      isSaving={false}
      onCreateProject={async () => null}
      onDirtyChange={() => undefined}
      onOpenComponents={() => undefined}
      onOpenCpu={() => undefined}
      onSaveVersion={async () => true}
      state={stateWithProject}
      {...overrides}
    />,
  );
}

describe("OS designer", () => {
  it("creates an OS project with the default kernel configuration", async () => {
    const user = userEvent.setup();
    const onCreateProject = vi.fn(async () => null);
    renderDesigner({ state: baseState, onCreateProject });

    await user.type(screen.getByRole("textbox", { name: ru.os.createName }), "Dynasty OS");
    await user.click(screen.getByRole("button", { name: ru.os.createButton }));

    await waitFor(() => expect(onCreateProject).toHaveBeenCalledTimes(1));
    expect(onCreateProject).toHaveBeenCalledWith("Dynasty OS", createDefaultOsConfiguration());
  });

  it("switches configuration sections with accessible tabs", async () => {
    const user = userEvent.setup();
    renderDesigner();

    const coreTab = screen.getByRole("tab", { name: ru.os.editorTabs.core });
    const systemsTab = screen.getByRole("tab", { name: ru.os.editorTabs.systems });

    expect(coreTab.getAttribute("aria-selected")).toBe("true");
    expect(document.getElementById("os-panel-systems")?.hasAttribute("hidden")).toBe(true);

    await user.click(systemsTab);

    expect(systemsTab.getAttribute("aria-selected")).toBe("true");
    expect(document.getElementById("os-panel-systems")?.hasAttribute("hidden")).toBe(false);
    expect(document.getElementById("os-panel-core")?.hasAttribute("hidden")).toBe(true);
  });

  it("saves a changed, valid kernel configuration as a new version", async () => {
    const user = userEvent.setup();
    const onSaveVersion = vi.fn(async () => true);
    renderDesigner({ onSaveVersion });

    await user.selectOptions(
      screen.getByLabelText(ru.os.fields.kernelType),
      "microkernel",
    );
    await user.selectOptions(
      screen.getByLabelText(ru.os.fields.ipcModel),
      "message-passing",
    );
    await user.selectOptions(
      screen.getByLabelText(ru.os.fields.driverModel),
      "user-space",
    );
    await user.click(screen.getByRole("button", { name: ru.os.saveVersion }));

    await waitFor(() => expect(onSaveVersion).toHaveBeenCalledTimes(1));
    expect(onSaveVersion).toHaveBeenCalledWith(
      "os-1",
      "Dynasty OS",
      expect.objectContaining({
        kernelType: "microkernel",
        ipcModel: "message-passing",
        driverModel: "user-space",
      }),
    );
  });

  it("shows a constraint error and blocks saving an invalid kernel configuration", async () => {
    const user = userEvent.setup();
    const onSaveVersion = vi.fn(async () => true);
    renderDesigner({ onSaveVersion });

    await user.selectOptions(
      screen.getByLabelText(ru.os.fields.kernelType),
      "microkernel",
    );

    expect(await screen.findByText(ru.os.validation.microkernelIpc)).toBeTruthy();
    expect(await screen.findByText(ru.os.validation.microkernelDrivers)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: ru.os.saveVersion }).hasAttribute("disabled"),
    ).toBe(true);
    expect(onSaveVersion).not.toHaveBeenCalled();
  });

  it("saves system-service capabilities as part of the configuration", async () => {
    const user = userEvent.setup();
    const onSaveVersion = vi.fn(async () => true);
    renderDesigner({ onSaveVersion });

    await user.click(screen.getByRole("tab", { name: ru.os.editorTabs.systems }));
    await user.selectOptions(screen.getByLabelText(ru.os.fields.filesystem), "ext2");
    await user.selectOptions(screen.getByLabelText(ru.os.fields.driverFramework), "unified");
    await user.selectOptions(screen.getByLabelText(ru.os.fields.diagnostics), "crash-dumps");
    await user.click(screen.getByRole("button", { name: ru.os.saveVersion }));

    await waitFor(() => expect(onSaveVersion).toHaveBeenCalledTimes(1));
    expect(onSaveVersion).toHaveBeenCalledWith(
      "os-1",
      "Dynasty OS",
      expect.objectContaining({
        filesystem: "ext2",
        driverFramework: "unified",
        diagnostics: "crash-dumps",
      }),
    );
  });

  it("reports incompatible hardware drivers for the selected configuration", async () => {
    const armCpu = createCpuProject(
      "cpu-arm",
      "ARM Processor",
      { ...createDefaultCpuConfiguration(), isa: "arm" },
      baseState.gameDate,
    );
    renderDesigner({
      state: { ...baseState, cpuProjects: [armCpu], osProjects: [osProject] },
    });

    expect(await screen.findByText(ru.os.compatibility.title)).toBeTruthy();
    expect(
      await screen.findByText(ru.os.compatibility.issues["unsupported-architecture"]),
    ).toBeTruthy();
    expect((await screen.findAllByText(ru.os.compatibility.incompatible)).length).toBeGreaterThan(0);
  });

  it("applies a platform profile and saves the resulting ecosystem configuration", async () => {
    const user = userEvent.setup();
    const onSaveVersion = vi.fn(async () => true);
    renderDesigner({ onSaveVersion });

    await user.click(screen.getByRole("button", { name: ru.os.profiles.mobile }));
    await user.click(screen.getByRole("button", { name: ru.os.saveVersion }));

    await waitFor(() => expect(onSaveVersion).toHaveBeenCalledTimes(1));
    expect(onSaveVersion).toHaveBeenCalledWith(
      "os-1",
      "Dynasty OS",
      expect.objectContaining({
        targetPlatform: "mobile",
        kernelType: "microkernel",
        driverModel: "user-space",
        supportedArchitectures: ["arm"],
      }),
    );
  });

  it("saves developer ecosystem capabilities as part of the configuration", async () => {
    const user = userEvent.setup();
    const onSaveVersion = vi.fn(async () => true);
    renderDesigner({
      onSaveVersion,
      state: { ...baseState, gameDate: "2010-01-01", osProjects: [osProject] },
    });

    await user.click(screen.getByRole("tab", { name: ru.os.editorTabs.ecosystem }));
    await user.selectOptions(screen.getByLabelText(ru.os.fields.gui), "modern-desktop");
    await user.selectOptions(screen.getByLabelText(ru.os.fields.sdk), "full");
    await user.selectOptions(screen.getByLabelText(ru.os.fields.api), "hybrid");
    await user.selectOptions(screen.getByLabelText(ru.os.fields.developerTools), "ide");
    await user.selectOptions(screen.getByLabelText(ru.os.fields.appStore), "open");
    await user.click(screen.getByRole("button", { name: ru.os.saveVersion }));

    await waitFor(() => expect(onSaveVersion).toHaveBeenCalledTimes(1));
    expect(onSaveVersion).toHaveBeenCalledWith(
      "os-1",
      "Dynasty OS",
      expect.objectContaining({
        gui: "modern-desktop",
        sdk: "full",
        api: "hybrid",
        developerTools: "ide",
        appStore: "open",
      }),
    );
  });

  it("reports application requirements that the configuration does not satisfy", async () => {
    renderDesigner();

    expect(await screen.findByText(ru.os.applications.title)).toBeTruthy();
    expect((await screen.findAllByText(ru.os.applications.issues["gui-required"])).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(ru.os.applications.issues["sdk-required"])).length).toBeGreaterThan(0);
  });

  it("starts and advances an OS release lifecycle", async () => {
    const user = userEvent.setup();
    const onStartRelease = vi.fn(async () => true);
    const onAdvanceRelease = vi.fn(async () => true);
    const release: OsRelease = {
      id: "os-release-1",
      version: 1,
      stage: "alpha",
      createdOn: "1995-01-01",
      configuration: createDefaultOsConfiguration(),
      qualityScore: 40,
      appealScore: 45,
      costUsd: 25_000,
    };
    const releasedProject = { ...osProject, releases: [release] };

    const { unmount } = renderDesigner({ onStartRelease });
    await user.click(screen.getByRole("button", { name: ru.os.releases.start }));
    await waitFor(() => expect(onStartRelease).toHaveBeenCalledWith("os-1"));
    unmount();

    renderDesigner({
      onAdvanceRelease,
      state: { ...baseState, osProjects: [releasedProject] },
    });
    await user.click(
      screen.getByRole("button", {
        name: ru.os.releases.advance.replace("{stage}", ru.os.releases.stages.beta),
      }),
    );
    await waitFor(() =>
      expect(onAdvanceRelease).toHaveBeenCalledWith("os-1", "os-release-1"),
    );
  });

  it("switches from the OS workspace to processors and components", async () => {
    const user = userEvent.setup();
    const onOpenCpu = vi.fn();
    const onOpenComponents = vi.fn();
    renderDesigner({ onOpenCpu, onOpenComponents });

    await user.click(screen.getByRole("button", { name: ru.productWorkspace.cpu }));
    await user.click(screen.getByRole("button", { name: ru.productWorkspace.components }));

    expect(onOpenCpu).toHaveBeenCalledTimes(1);
    expect(onOpenComponents).toHaveBeenCalledTimes(1);
  });
});
