import type { GameState } from "../models/game-state";

export function advanceGameDay(state: GameState): GameState {
  const date = new Date(`${state.gameDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);

  return {
    ...state,
    gameDate: date.toISOString().slice(0, 10),
  };
}
