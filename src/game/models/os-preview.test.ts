import { describe, expect, it } from "vitest";
import {
  createDefaultOsConfiguration,
  createOsProject,
  type OsRelease,
} from "./os";
import { buildOsPreviewModel } from "./os-preview";

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

describe("os preview model", () => {
  it("starts as a terminal for the default configuration", () => {
    const model = buildOsPreviewModel(createDefaultOsConfiguration());

    expect(model.shell).toBe("terminal");
    expect(model.device).toBe("desktop");
    expect(model.stage).toBe("development");
    expect(model.nextShell).toBe("desktop-shell");
    expect(model.hasTaskbar).toBe(false);
    expect(model.compatibleApps).toBe(1);
    expect(model.apps.find((app) => app.id === "notes")?.compatible).toBe(true);
    expect(model.apps.find((app) => app.id === "web-browser")?.issues).toContain("gui-required");
  });

  it("unlocks shell capabilities and release stage from the current configuration", () => {
    const configuration = { ...createDefaultOsConfiguration(), gui: "modern-desktop" as const };
    const project = {
      ...createOsProject("os-1", "Dynasty OS", configuration, "2001-01-01"),
      releases: [release({ createdOn: "2001-01-01", stage: "beta", qualityScore: 61.2, appealScore: 57.4 })],
    };
    const model = buildOsPreviewModel(configuration, project);

    expect(model.shell).toBe("modern-desktop");
    expect(model.hasTaskbar).toBe(true);
    expect(model.hasWidgets).toBe(true);
    expect(model.hasWindowChrome).toBe(true);
    expect(model.nextShell).toBe("adaptive");
    expect(model.stage).toBe("beta");
    expect(model.versionLabel).toBe("1.0");
    expect(model.quality).toBe(61.2);
    expect(model.appeal).toBe(57.4);
  });

  it("maps target platforms to device frames and accents", () => {
    expect(buildOsPreviewModel({ ...createDefaultOsConfiguration(), targetPlatform: "mobile" }))
      .toMatchObject({ device: "mobile", accent: "green" });
    expect(buildOsPreviewModel({ ...createDefaultOsConfiguration(), targetPlatform: "server" }))
      .toMatchObject({ device: "server", accent: "violet" });
    expect(buildOsPreviewModel({ ...createDefaultOsConfiguration(), targetPlatform: "gaming" }))
      .toMatchObject({ device: "gaming", accent: "amber" });
  });

  it("reaches the adaptive shell without a next step", () => {
    const model = buildOsPreviewModel({ ...createDefaultOsConfiguration(), gui: "adaptive" });

    expect(model.shell).toBe("adaptive");
    expect(model.nextShell).toBeNull();
    expect(model.hasWidgets).toBe(true);
  });
});
