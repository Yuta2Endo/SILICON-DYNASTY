import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import type { GameState } from "../game/models/game-state";
import { createGameApplication } from "../game/application/game-application";
import { getTechnology } from "../game/models/research";
import type { GameStateRepository } from "../storage/repositories/GameStateRepository";
import { App } from "./App";
import { translations } from "../localization/messages";

class MemoryGameStateRepository implements GameStateRepository {
  currentState: GameState | null = null;

  async load(): Promise<GameState | null> {
    return this.currentState;
  }

  async save(state: GameState): Promise<void> {
    this.currentState = state;
  }
}

afterEach(cleanup);

describe("Research screen", () => {
  it("starts a project and shows persisted day-by-day progress", async () => {
    const user = userEvent.setup();
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);
    render(<App application={application} />);

    await user.click(await screen.findByRole("button", { name: translations.ru.navigation.research }));

    const technology = getTechnology("out-of-order");
    if (!technology) {
      throw new Error("The out-of-order technology must exist in the research catalog.");
    }

    const technologyName = translations.ru.research.technologies[technology.id].name;
    const technologyHeading = await screen.findByRole("heading", { name: technologyName, level: 4 });
    const technologyCard = technologyHeading.closest("article");
    expect(technologyCard).not.toBeNull();

    await user.click(within(technologyCard as HTMLElement).getByRole("button", {
      name: translations.ru.research.startResearch,
    }));

    const progressBar = await screen.findByRole("progressbar");
    expect(progressBar.getAttribute("aria-valuenow")).toBe("0");
    await waitFor(() => expect(repository.currentState?.research.activeProject?.technologyId).toBe(technology.id));
    expect(repository.currentState?.company.balance).toBe(
      Math.round((100_000 - technology.costUsd) * 100) / 100,
    );

    await user.click(screen.getByRole("button", { name: translations.ru.navigation.dashboard }));
    await user.click(screen.getByRole("button", { name: translations.ru.dashboard.advanceDay }));
    await user.click(screen.getByRole("button", { name: translations.ru.navigation.research }));

    await waitFor(() => {
      expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("1");
    });
    expect(repository.currentState?.research.activeProject?.progressDays).toBe(1);
  });
});
