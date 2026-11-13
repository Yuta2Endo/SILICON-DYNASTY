import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createInitialGameState } from "../../game/models/game-state";
import {
  createDefaultDeviceConfiguration,
  type DeviceProject,
} from "../../game/models/devices";
import { translations } from "../../localization/messages";
import { DeviceVersionCompare } from "./DeviceVersionCompare";

afterEach(cleanup);

function createProject(versionCount: 1 | 2): DeviceProject {
  const first = createDefaultDeviceConfiguration("desktop");
  const second = {
    ...first,
    type: "laptop" as const,
    cpuVersion: 2,
  };

  return {
    id: "device-1",
    name: "Compare device",
    configuration: versionCount === 2 ? second : first,
    versions: [
      { version: 1, savedOn: "1995-01-01", configuration: first },
      ...(versionCount === 2
        ? [{ version: 2, savedOn: "1995-01-02", configuration: second }]
        : []),
    ],
  };
}

function renderCompare(versionCount: 1 | 2) {
  const project = createProject(versionCount);
  const state = {
    ...createInitialGameState(),
    deviceProjects: [project],
  };

  return render(
    <DeviceVersionCompare locale="ru" project={project} state={state} />,
  );
}

describe("DeviceVersionCompare", () => {
  it("explains that a second version is required", () => {
    renderCompare(1);
    expect(screen.getByText(translations.ru.devices.versionCompare.title)).toBeTruthy();
    expect(screen.getByText(translations.ru.devices.versionCompare.emptyHint)).toBeTruthy();
    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
  });

  it("shows six metric comparisons and changed fields", () => {
    const { container } = renderCompare(2);

    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    expect(container.querySelectorAll(".version-compare__metric")).toHaveLength(6);
    expect(screen.getByText(translations.ru.devices.fields.type)).toBeTruthy();
    expect(screen.getByText(translations.ru.devices.fields.cpuVersion)).toBeTruthy();
    expect(screen.getByText(translations.ru.devices.versionCompare.metrics.overallScore)).toBeTruthy();
    expect(screen.getByText(translations.ru.devices.deviceTypes.laptop)).toBeTruthy();
  });
});
