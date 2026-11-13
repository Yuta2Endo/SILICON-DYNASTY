import type { GameState } from "../../game/models/game-state";

export interface GameStateRepository {
  load(): Promise<GameState | null>;
  save(state: GameState): Promise<void>;
}
