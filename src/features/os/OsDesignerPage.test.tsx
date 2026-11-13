import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialGameState } from "../../game/models/game-state";
import { createCpuProject, createDefaultCpuConfiguration } from "../../game/models/cpu";
import {
  createDefaultOsConfiguration,
  createOsProject,
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
    expect(await screen.findByText(ru.os.compatibility.incompatible)).toBeTruthy();
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
