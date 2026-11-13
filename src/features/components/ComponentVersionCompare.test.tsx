import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  createComponentProject,
  createDefaultComponentConfiguration,
  saveComponentVersion,
  type GpuConfiguration,
} from "../../game/models/components";
import { translations } from "../../localization/messages";
import { ComponentVersionCompare } from "./ComponentVersionCompare";

const ru = translations.ru;

afterEach(cleanup);

function projectWithVersions(count: number) {
  const before = createDefaultComponentConfiguration("gpu") as GpuConfiguration;
  const project = createComponentProject(
    "component-1",
    "Compare GPU",
    "gpu",
    before,
    "1995-01-01",
  );
  if (count > 1) {
    return saveComponentVersion(
      project,
      project.name,
      { ...before, computeUnits: 12, clockMHz: 150 },
      "1995-01-02",
    );
  }
  return project;
}

describe("ComponentVersionCompare", () => {
  it("explains how to unlock comparison with one saved version", () => {
    render(<ComponentVersionCompare locale="ru" project={projectWithVersions(1)} />);
    expect(screen.getByText(ru.components.versionCompare.title)).toBeTruthy();
    expect(screen.getByText(ru.components.versionCompare.emptyHint)).toBeTruthy();
  });

  it("shows metric deltas and changed fields for two versions", () => {
    const { container } = render(
      <ComponentVersionCompare locale="ru" project={projectWithVersions(2)} />,
    );

    expect(container.querySelectorAll(".version-compare__metric")).toHaveLength(5);
    expect(screen.getByText(ru.components.versionCompare.metrics.performanceScore)).toBeTruthy();
    expect(screen.getByText(ru.components.versionCompare.metrics.grossMargin)).toBeTruthy();
    expect(screen.getByText("Изменено полей: 2")).toBeTruthy();
    expect(screen.getByText(ru.components.fields.computeUnits)).toBeTruthy();
    expect(screen.getByText(ru.components.fields.clockMHz)).toBeTruthy();
  });
});
