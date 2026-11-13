import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createDefaultOsConfiguration, createOsProject, saveOsVersion } from "../../game/models/os";
import { translations } from "../../localization/messages";
import { OsVersionCompare } from "./OsVersionCompare";

const ru = translations.ru;
const base = createDefaultOsConfiguration();
const project = saveOsVersion(
  createOsProject("os-1", "Dynasty OS", base, "1995-01-01"),
  "Dynasty OS",
  { ...base, syscallCount: 256 },
  "1995-01-02",
);

describe("OS version comparison", () => {
  it("shows changed fields and metric deltas between two saved versions", () => {
    render(<OsVersionCompare locale="ru" project={project} />);

    expect(screen.getByRole("heading", { name: ru.os.versionCompare.title })).toBeTruthy();
    expect(screen.getByText(ru.os.versionCompare.changed.replace("{count}", "1"))).toBeTruthy();
    expect(screen.getByText(ru.os.fields.syscallCount)).toBeTruthy();
    expect(screen.getByText("128")).toBeTruthy();
    expect(screen.getByText("256")).toBeTruthy();
  });

  it("shows an empty hint when only one version exists", () => {
    const singleVersion = createOsProject("os-1", "Dynasty OS", base, "1995-01-01");
    render(<OsVersionCompare locale="ru" project={singleVersion} />);

    expect(screen.getByText(ru.os.versionCompare.emptyHint)).toBeTruthy();
  });
});
