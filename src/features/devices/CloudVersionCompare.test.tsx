import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createInitialGameState } from "../../game/models/game-state";
import {
  createCloudProject,
  createDefaultCloudConfiguration,
  saveCloudVersion,
  type CloudProject,
} from "../../game/models/cloud";
import { translations } from "../../localization/messages";
import { CloudVersionCompare } from "./CloudVersionCompare";

afterEach(cleanup);

function createProject(versionCount: 1 | 2): CloudProject {
  const first = {
    ...createDefaultCloudConfiguration(),
    serverDeviceProjectId: "device-missing",
  };
  const project = createCloudProject("cloud-1", "Compare cloud", first, "1995-01-01");
  if (versionCount === 1) return project;

  return saveCloudVersion(project, "Compare cloud", {
    ...first,
    dataCenters: 2,
    redundancy: 3,
  }, "1995-01-02");
}

function renderCompare(versionCount: 1 | 2) {
  const project = createProject(versionCount);
  const state = {
    ...createInitialGameState(),
    cloudProjects: [project],
  };

  return render(
    <CloudVersionCompare locale="ru" project={project} state={state} />,
  );
}

describe("CloudVersionCompare", () => {
  it("explains that a second version is required", () => {
    renderCompare(1);
    expect(screen.getByText(translations.ru.devices.cloud.versionCompare.title)).toBeTruthy();
    expect(screen.getByText(translations.ru.devices.cloud.versionCompare.emptyHint)).toBeTruthy();
    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
  });

  it("shows six capacity comparisons and changed cloud fields", () => {
    const { container } = renderCompare(2);

    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    expect(container.querySelectorAll(".version-compare__metric")).toHaveLength(6);
    expect(screen.getByText(translations.ru.devices.cloud.fields.dataCenters)).toBeTruthy();
    expect(screen.getByText(translations.ru.devices.cloud.fields.redundancy)).toBeTruthy();
    expect(screen.getByText(translations.ru.devices.cloud.versionCompare.metrics.capacityScore)).toBeTruthy();
  });
});
