import { describe, expect, it } from "vitest";
import { createInitialResearchState, getTechnology, type ResearchTechnologyId } from "../models/research";
import {
  advanceResearchDay,
  getResearchAvailability,
  ResearchUnavailableError,
  startResearchProject,
} from "./research";

const gameDate = "1995-01-01";

describe("research availability", () => {
  it("distinguishes future, prerequisite-locked, busy, unaffordable and unknown technologies", () => {
    const initialResearch = createInitialResearchState();

    expect(getResearchAvailability("ddr", initialResearch, gameDate, 100_000).status).toBe("future");
    expect(getResearchAvailability("sse", initialResearch, "2001-01-01", 100_000)).toMatchObject({
      status: "locked",
      missingPrerequisiteIds: ["mmx"],
    });
    expect(getResearchAvailability("out-of-order", initialResearch, gameDate, 0).status).toBe("unaffordable");
    expect(getResearchAvailability("not-a-technology", initialResearch, gameDate, 100_000).status).toBe("unknown");

    const technology = getTechnology("out-of-order");
    if (!technology) {
      throw new Error("The baseline out-of-order technology must exist.");
    }
    const started = startResearchProject(
      technology.id,
      initialResearch,
      gameDate,
      technology.costUsd + 100,
    );
    expect(getResearchAvailability("arm-isa", started.research, gameDate, started.companyBalance).status).toBe("busy");
  });

  it("charges the catalog cost and rejects unavailable starts", () => {
    const initialResearch = createInitialResearchState();
    const technology = getTechnology("out-of-order");
    if (!technology) {
      throw new Error("The baseline out-of-order technology must exist.");
    }

    const started = startResearchProject(
      technology.id,
      initialResearch,
      gameDate,
      technology.costUsd + 100,
    );
    expect(started.companyBalance).toBe(100);
    expect(started.research.activeProject).toMatchObject({
      technologyId: technology.id,
      startedOn: gameDate,
      progressDays: 0,
      costPaidUsd: technology.costUsd,
    });
    expect(started.research.totalInvestedUsd).toBe(technology.costUsd);
    expect(() => startResearchProject("out-of-order", initialResearch, gameDate, 0)).toThrow(ResearchUnavailableError);
  });

  it("advances one day at a time and unlocks the technology only at completion", () => {
    const technology = getTechnology("out-of-order");
    if (!technology) {
      throw new Error("The baseline out-of-order technology must exist.");
    }
    const started = startResearchProject(
      technology.id,
      createInitialResearchState(),
      gameDate,
      technology.costUsd + 100,
    );
    let research = started.research;

    for (let day = 1; day < technology.durationDays; day += 1) {
      research = advanceResearchDay(research);
    }
    expect(research.activeProject?.progressDays).toBe(technology.durationDays - 1);
    expect(research.completedTechnologyIds).not.toContain(technology.id);

    research = advanceResearchDay(research);
    expect(research.activeProject).toBeNull();
    expect(research.completedTechnologyIds).toContain(technology.id);
    expect(getResearchAvailability(technology.id, research, "1995-12-31", started.companyBalance).status).toBe("completed");
  });

  it("safely returns unchanged state when no project is active", () => {
    const research = createInitialResearchState();

    expect(advanceResearchDay(research)).toBe(research);
  });

  it("accepts only known technology IDs at the typed boundary", () => {
    const id: ResearchTechnologyId = "out-of-order";

    expect(getResearchAvailability(id, createInitialResearchState(), gameDate, 100_000).status).toBe("available");
  });
});
