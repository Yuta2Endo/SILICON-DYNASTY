import { describe, expect, it } from "vitest";
import { createInitialGameState, type GameState } from "../models/game-state";
import { getFinanceDailyRecord } from "../models/finance";
import { createDefaultOsConfiguration, createOsProject } from "../models/os";
import {
  advanceOsRelease,
  OsReleaseOperationError,
  startOsRelease,
} from "./os-release";

function stateWithProject(): GameState {
  const initial = createInitialGameState();

  return {
    ...initial,
    company: { ...initial.company, balance: 500_000 },
    osProjects: [
      createOsProject(
        "os-1",
        "Dynasty OS",
        createDefaultOsConfiguration(),
        "1995-01-01",
      ),
    ],
  };
}

describe("OS release engine", () => {
  it("starts an alpha release, charges its cost, and records finance", () => {
    const state = startOsRelease(stateWithProject(), "os-1");
    const release = state.osProjects[0]?.releases[0];

    expect(state.company.balance).toBe(475_000);
    expect(release).toMatchObject({
      id: "os-release-1",
      version: 1,
      stage: "alpha",
      createdOn: "1995-01-01",
      costUsd: 25_000,
    });
    expect(release?.qualityScore).toBeGreaterThan(0);
    expect(release?.appealScore).toBeGreaterThan(0);
    expect(getFinanceDailyRecord(state.finance, "1995-01-01")?.releaseUsd).toBe(25_000);
  });

  it("advances through beta, release candidate, and stable with cumulative costs", () => {
    const alpha = startOsRelease(stateWithProject(), "os-1");
    const beta = advanceOsRelease(alpha, "os-1", "os-release-1");
    const rc = advanceOsRelease(beta, "os-1", "os-release-1");
    const stable = advanceOsRelease(rc, "os-1", "os-release-1");
    const release = stable.osProjects[0]?.releases[0];

    expect(beta.osProjects[0]?.releases[0]?.stage).toBe("beta");
    expect(rc.osProjects[0]?.releases[0]?.stage).toBe("rc");
    expect(release?.stage).toBe("stable");
    expect(release?.costUsd).toBe(190_000);
    expect(stable.company.balance).toBe(310_000);
    expect(release?.qualityScore).toBeGreaterThan(alpha.osProjects[0]?.releases[0]?.qualityScore ?? 0);
    expect(release?.appealScore).toBeGreaterThan(alpha.osProjects[0]?.releases[0]?.appealScore ?? 0);
    expect(getFinanceDailyRecord(stable.finance, "1995-01-01")?.releaseUsd).toBe(190_000);
  });

  it("rejects missing projects, missing releases, and further stable advancement", () => {
    const state = stateWithProject();

    expect(() => startOsRelease(state, "missing")).toThrow(OsReleaseOperationError);
    expect(() => advanceOsRelease(state, "os-1", "missing")).toThrow(OsReleaseOperationError);

    const alpha = startOsRelease(state, "os-1");
    const beta = advanceOsRelease(alpha, "os-1", "os-release-1");
    const rc = advanceOsRelease(beta, "os-1", "os-release-1");
    const stable = advanceOsRelease(rc, "os-1", "os-release-1");

    expect(() => advanceOsRelease(stable, "os-1", "os-release-1")).toThrow(
      OsReleaseOperationError,
    );
  });
});
