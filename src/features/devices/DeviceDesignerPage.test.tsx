import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeviceDesignerPage } from "./DeviceDesignerPage";
import { createInitialGameState, type GameState } from "../../game/models/game-state";
import {
  buildSuggestedDeviceConfiguration,
  createDeviceProject,
  type DeviceConfiguration,
  type DeviceReferenceContext,
} from "../../game/models/devices";
import {
  createComponentProject,
  createDefaultComponentConfiguration,
  type ComponentConfiguration,
  type ComponentType,
} from "../../game/models/components";
import { createCpuProject, createDefaultCpuConfiguration } from "../../game/models/cpu";
import { createDefaultOsConfiguration, createOsProject, type OsProject } from "../../game/models/os";
import { translations } from "../../localization/messages";

const DATE = "1995-01-01";
const copy = translations.ru.devices;

afterEach(cleanup);

function createContext(): DeviceReferenceContext {
  const osConfiguration = {
    ...createDefaultOsConfiguration(),
    targetPlatform: "universal" as const,
    driverFramework: "acpi" as const,
  };
  const baseOs = createOsProject("os-1", "Dynasty OS", osConfiguration, DATE);
  const osProjects: OsProject[] = [{
    ...baseOs,
    releases: [{
      id: "os-release-1",
      version: 1,
      stage: "stable",
      createdOn: DATE,
      configuration: osConfiguration,
      qualityScore: 60,
      appealScore: 55,
      costUsd: 80_000,
    }],
  }];
  return {
    cpuProjects: [createCpuProject("cpu-1", "Dynasty Core", {
      ...createDefaultCpuConfiguration(),
      memoryStandard: "ddr",
    }, DATE)],
    componentProjects: (["motherboard", "ram", "ssd", "networking"] as ComponentType[])
      .map((type) => createComponentProject(
        `component-${type}`,
        `${type} project`,
        type,
        type === "motherboard"
          ? ({ ...createDefaultComponentConfiguration("motherboard"), pcieGeneration: 3 } as ComponentConfiguration)
          : createDefaultComponentConfiguration(type),
        DATE,
      )),
    osProjects,
    aiProjects: [],
  };
}

function createState(): GameState {
  const base = createInitialGameState();
  const context = createContext();
  const serverConfiguration: DeviceConfiguration = {
    ...buildSuggestedDeviceConfiguration("server", context),
    gpuProjectId: null,
    aiAcceleratorProjectId: null,
  };
  const server = createDeviceProject("device-1", "Dynasty Server", serverConfiguration, DATE);
  return {
    ...base,
    cpuProjects: [...context.cpuProjects],
    componentProjects: [...context.componentProjects],
    osProjects: [...context.osProjects],
    deviceProjects: [server],
  };
}

function renderPage(overrides: Partial<Parameters<typeof DeviceDesignerPage>[0]> = {}) {
  const state = createState();
  const props = {
    state,
    isSaving: false,
    onDirtyChange: vi.fn(),
    onCreateDevice: vi.fn().mockResolvedValue("device-2"),
    onSaveDevice: vi.fn().mockResolvedValue(true),
    onCreateCloud: vi.fn().mockResolvedValue("cloud-1"),
    onSaveCloud: vi.fn().mockResolvedValue(true),
    onOpenCpu: vi.fn(),
    onOpenComponents: vi.fn(),
    onOpenOs: vi.fn(),
    onOpenAi: vi.fn(),
    ...overrides,
  };
  render(<DeviceDesignerPage {...props} />);
  return props;
}

describe("DeviceDesignerPage", () => {
  it("shows the device configurator, simulation notice and saved projects", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: copy.simulationTitle })).toBeTruthy();
    expect(screen.getByRole("tab", { name: copy.tabs.device })).toBeTruthy();
    expect(screen.getByRole("tab", { name: copy.tabs.cloud })).toBeTruthy();
    expect(screen.getAllByText("Dynasty Server").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: copy.createButton })).toBeTruthy();
  });

  it("creates a device from a compatible suggested configuration", async () => {
    const user = userEvent.setup();
    const props = renderPage();

    await user.type(screen.getByLabelText(copy.createName), "Dynasty Desktop");
    await user.click(screen.getByRole("button", { name: copy.createButton }));

    expect(props.onCreateDevice).toHaveBeenCalledWith(
      "Dynasty Desktop",
      expect.objectContaining({
        type: "desktop",
        cpuProjectId: "cpu-1",
        osReleaseId: "os-release-1",
      }),
    );
  });

  it("switches to cloud and creates a cloud project from the server device", async () => {
    const user = userEvent.setup();
    const props = renderPage();

    await user.click(screen.getByRole("tab", { name: copy.tabs.cloud }));
    expect(screen.getByRole("heading", { name: copy.cloud.createTitle })).toBeTruthy();
    await user.type(screen.getByLabelText(copy.createName), "Dynasty Cloud");
    await user.click(screen.getByRole("button", { name: copy.createButton }));

    expect(props.onCreateCloud).toHaveBeenCalledWith(
      "Dynasty Cloud",
      expect.objectContaining({ serverDeviceProjectId: "device-1" }),
    );
  });
});
