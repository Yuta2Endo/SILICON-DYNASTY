import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  createCpuProject,
  createDefaultCpuConfiguration,
  saveCpuProjectVersion,
} from "../../game/models/cpu";
import { translations } from "../../localization/messages";
import { CpuVersionCompare } from "./CpuVersionCompare";

const ru = translations.ru.cpu;

afterEach(cleanup);

describe("CpuVersionCompare", () => {
  it("shows an empty hint until a second version is saved", () => {
    const project = createCpuProject(
      "cpu-1",
      "Dynasty CPU",
      createDefaultCpuConfiguration(),
      "1995-01-01",
    );

    render(<CpuVersionCompare locale="ru" project={project} />);
    expect(screen.getByText(ru.versionCompare.title)).toBeTruthy();
    expect(screen.getByText(ru.versionCompare.emptyHint)).toBeTruthy();
  });

  it("compares metrics and changed configuration fields", () => {
    const project = createCpuProject(
      "cpu-1",
      "Dynasty CPU",
      createDefaultCpuConfiguration(),
      "1995-01-01",
    );
    const updated = saveCpuProjectVersion(
      project,
      "Dynasty CPU",
      { ...project.configuration, coreCount: 2, threadCount: 2, clockMHz: 200 },
      "1995-02-01",
    );

    render(<CpuVersionCompare locale="ru" project={updated} />);

    expect(screen.getByText(ru.versionCompare.title)).toBeTruthy();
    expect(screen.getByText(ru.versionCompare.changed.replace("{count}", "3"))).toBeTruthy();
    expect(screen.getByText(ru.fields.coreCount)).toBeTruthy();
    expect(screen.getByText(ru.fields.threadCount)).toBeTruthy();
    expect(screen.getByText(ru.fields.clockMHz)).toBeTruthy();
    expect(screen.getByText(ru.versionCompare.metrics.performanceScore)).toBeTruthy();
    expect(screen.getByText(ru.versionCompare.metrics.unitCostUsd)).toBeTruthy();
  });
});
