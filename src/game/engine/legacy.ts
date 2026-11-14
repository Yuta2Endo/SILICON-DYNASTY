import type { GameState } from "../models/game-state";
import { isCompanyDoctrineId, type CompanyDoctrineId } from "../models/legacy";

export type LegacyOperationCode = "doctrine-locked" | "invalid-doctrine";

export class LegacyOperationError extends Error {
  constructor(readonly code: LegacyOperationCode, message: string) {
    super(message);
    this.name = "LegacyOperationError";
  }
}

export function chooseCompanyDoctrine(
  state: GameState,
  doctrine: CompanyDoctrineId,
): GameState {
  if (!isCompanyDoctrineId(doctrine)) {
    throw new LegacyOperationError("invalid-doctrine", "Company doctrine is invalid.");
  }
  if (state.legacy.doctrine !== null) {
    throw new LegacyOperationError(
      "doctrine-locked",
      "Company doctrine has already been chosen.",
    );
  }

  return {
    ...state,
    legacy: { doctrine },
  };
}
