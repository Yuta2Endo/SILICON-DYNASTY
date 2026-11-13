import type { GameState } from "../../game/models/game-state";
import type { GameStateRepository } from "./GameStateRepository";

export const SAVE_SLOT_IDS = ["slot-1", "slot-2", "slot-3"] as const;
export type SaveSlotId = (typeof SAVE_SLOT_IDS)[number];

export interface SaveMetadata {
  savedAt: string | null;
  gameDate: string;
  companyName: string;
  balanceUsd: number;
  schemaVersion: number;
}

export interface SaveSlotInfo extends SaveMetadata {
  slotId: string;
}

export interface SaveOverview {
  supported: boolean;
  autosave: SaveMetadata | null;
  backup: SaveMetadata | null;
  slots: SaveSlotInfo[];
}

export interface SaveManagementRepository extends GameStateRepository {
  getSaveOverview(): Promise<SaveOverview>;
  saveSlot(slotId: string, state: GameState): Promise<void>;
  loadSlot(slotId: string): Promise<GameState | null>;
  deleteSlot(slotId: string): Promise<void>;
  restoreBackup(): Promise<GameState | null>;
}

export function createSaveMetadata(state: GameState, savedAt: string | null): SaveMetadata {
  return {
    savedAt,
    gameDate: state.gameDate,
    companyName: state.company.name,
    balanceUsd: state.company.balance,
    schemaVersion: state.schemaVersion,
  };
}

export function isSaveManagementRepository(
  repository: GameStateRepository,
): repository is SaveManagementRepository {
  const candidate = repository as Partial<SaveManagementRepository>;
  return (
    typeof candidate.getSaveOverview === "function"
    && typeof candidate.saveSlot === "function"
    && typeof candidate.loadSlot === "function"
    && typeof candidate.deleteSlot === "function"
    && typeof candidate.restoreBackup === "function"
  );
}

export function createUnsupportedSaveOverview(): SaveOverview {
  return {
    supported: false,
    autosave: null,
    backup: null,
    slots: [],
  };
}
