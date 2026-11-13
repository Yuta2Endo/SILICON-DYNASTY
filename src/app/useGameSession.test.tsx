import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { GameApplication } from "../game/application/game-application";
import { createInitialGameState } from "../game/models/game-state";
import { useGameSession } from "./useGameSession";

function createApplication(): GameApplication {
  const state = createInitialGameState();
  return {
    load: vi.fn(async () => state),
    getSaveInfo: vi.fn(async () => ({
      supported: true,
      autosave: null,
      backup: null,
      slots: [],
    })),
    restoreBackup: vi.fn(async () => state),
  } as unknown as GameApplication;
}

describe("useGameSession", () => {
  it("loads the current save and exposes it to the caller", async () => {
    const application = createApplication();
    const { result } = renderHook(() => useGameSession(application));

    await waitFor(() => expect(result.current.state).not.toBeNull());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasLoadError).toBe(false);
    expect(application.load).toHaveBeenCalledTimes(1);
  });

  it("runs commands and reports failures without replacing state", async () => {
    const application = createApplication();
    const { result } = renderHook(() => useGameSession(application));
    await waitFor(() => expect(result.current.state).not.toBeNull());
    const loadedState = result.current.state;

    let succeeded: unknown;
    await act(async () => {
      succeeded = await result.current.runCommand(async () => ({
        ...createInitialGameState(),
        gameDate: "1995-01-02",
      }));
    });
    expect(succeeded).not.toBeNull();
    expect(result.current.state?.gameDate).toBe("1995-01-02");

    let failed: unknown;
    await act(async () => {
      failed = await result.current.runCommand(async () => {
        throw new Error("command failed");
      });
    });
    expect(failed).toBeNull();
    expect(result.current.hasCommandError).toBe(true);
    expect(result.current.state?.gameDate).toBe("1995-01-02");
    expect(loadedState).not.toBeNull();
  });
});
