import { describe, expect, it } from "vitest";
import { advanceGameDay } from "./time";
import { startResearchProject } from "./research";
import { getTechnology, getUnlockedResearchIds } from "../models/research";
import { createInitialGameState } from "../models/game-state";

describe("research during game time", () => {
  it("advances one day at a time and unlocks the technology at completion", () => {
    const initialState = createInitialGameState();
    const technology = getTechnology("out-of-order");

    if (!technology) {
      throw new Error("The out-of-order technology must exist in the research catalog.");
    }

    const started = startResearchProject(
      technology.id,
      initialState.research,
      initialState.gameDate,
      initialState.company.balance,
    );
    const startedState = {
      ...initialState,
      company: { ...initialState.company, balance: started.companyBalance },
      research: started.research,
    };
    const firstDay = advanceGameDay(startedState);

    expect(firstDay.research.activeProject?.progressDays).toBe(1);

    let completedState = firstDay;
    for (let day = 1; day < technology.durationDays; day += 1) {
      completedState = advanceGameDay(completedState);
    }

    expect(completedState.research.activeProject).toBeNull();
    expect(completedState.research.completedTechnologyIds).toContain(technology.id);
    expect(getUnlockedResearchIds(completedState.research)).toContain("cpu.out-of-order");
    expect(completedState.gameDate).not.toBe(initialState.gameDate);
  });
});
