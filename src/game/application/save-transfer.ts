import { parseGameState, type GameState } from "../models/game-state";

export const SAVE_EXPORT_FORMAT = "silicon-dynasty-save";
export const SAVE_EXPORT_FORMAT_VERSION = 1;

export type SaveImportErrorCode = "invalid-json" | "invalid-format" | "invalid-state";

export class InvalidSaveImportError extends Error {
  constructor(readonly code: SaveImportErrorCode, message: string) {
    super(message);
    this.name = "InvalidSaveImportError";
  }
}

export function exportGameState(state: GameState): string {
  return JSON.stringify(
    {
      format: SAVE_EXPORT_FORMAT,
      formatVersion: SAVE_EXPORT_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      state,
    },
    null,
    2,
  );
}

export function parseImportedGameState(serialized: string): GameState {
  let value: unknown;
  try {
    value = JSON.parse(serialized) as unknown;
  } catch {
    throw new InvalidSaveImportError("invalid-json", "The imported file is not valid JSON.");
  }

  if (!isRecord(value)) {
    throw new InvalidSaveImportError("invalid-format", "The imported file does not contain a save.");
  }

  if ("format" in value) {
    if (value.format !== SAVE_EXPORT_FORMAT) {
      throw new InvalidSaveImportError("invalid-format", "The imported file is not a Silicon Dynasty save.");
    }
    if (value.formatVersion !== SAVE_EXPORT_FORMAT_VERSION) {
      throw new InvalidSaveImportError("invalid-format", "The imported save format is not supported.");
    }
    if (!("state" in value)) {
      throw new InvalidSaveImportError("invalid-format", "The imported file is missing game state.");
    }
  }

  const stateValue = "format" in value ? value.state : value;

  try {
    return parseGameState(stateValue);
  } catch {
    throw new InvalidSaveImportError("invalid-state", "The imported save contains invalid game data.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
