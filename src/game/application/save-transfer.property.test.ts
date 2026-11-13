import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { exportGameState, parseImportedGameState } from "./save-transfer";
import { createInitialGameState } from "../models/game-state";

describe("save transfer property invariants", () => {
  it("round-trips valid company settings through the export format", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{1,39}$/),
        fc.integer({ min: 0, max: 1_000_000_000 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 1_000 }),
        (name, balance, reputation, employeeCount) => {
          const state = createInitialGameState();
          state.company = {
            ...state.company,
            name,
            balance,
            reputation,
            employeeCount,
          };

          const restored = parseImportedGameState(exportGameState(state));
          expect(restored.company).toEqual(state.company);
          expect(restored.schemaVersion).toBe(state.schemaVersion);
          expect(restored.gameDate).toBe(state.gameDate);
        },
      ),
      { numRuns: 30 },
    );
  });
});
