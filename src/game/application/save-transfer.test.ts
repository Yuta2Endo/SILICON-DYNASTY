import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../models/game-state";
import {
  exportGameState,
  InvalidSaveImportError,
  parseImportedGameState,
  SAVE_EXPORT_FORMAT,
  SAVE_EXPORT_FORMAT_VERSION,
} from "./save-transfer";

describe("save transfer", () => {
  it("exports a versioned wrapper and imports it back", () => {
    const state = createInitialGameState();
    state.company.name = "Exported Dynasty";

    const serialized = exportGameState(state);
    const wrapper = JSON.parse(serialized) as {
      format: string;
      formatVersion: number;
      state: unknown;
    };

    expect(wrapper.format).toBe(SAVE_EXPORT_FORMAT);
    expect(wrapper.formatVersion).toBe(SAVE_EXPORT_FORMAT_VERSION);
    expect(wrapper.state).toBeTruthy();
    expect(parseImportedGameState(serialized)).toEqual(state);
  });

  it("accepts a raw game-state JSON document", () => {
    const state = createInitialGameState();
    expect(parseImportedGameState(JSON.stringify(state))).toEqual(state);
  });

  it("rejects malformed JSON, foreign formats and unsupported format versions", () => {
    expect(() => parseImportedGameState("{broken")).toThrowError(
      expect.objectContaining({ code: "invalid-json" }),
    );
    expect(() => parseImportedGameState(JSON.stringify({
      format: "another-game",
      formatVersion: 1,
      state: createInitialGameState(),
    }))).toThrowError(expect.objectContaining({ code: "invalid-format" }));
    expect(() => parseImportedGameState(JSON.stringify({
      format: SAVE_EXPORT_FORMAT,
      formatVersion: 99,
      state: createInitialGameState(),
    }))).toThrowError(expect.objectContaining({ code: "invalid-format" }));
  });

  it("rejects invalid and future-schema state without returning data", () => {
    expect(() => parseImportedGameState(JSON.stringify({
      format: SAVE_EXPORT_FORMAT,
      formatVersion: SAVE_EXPORT_FORMAT_VERSION,
      state: { schemaVersion: 12 },
    }))).toThrowError(expect.objectContaining({ code: "invalid-state" }));
    expect(() => parseImportedGameState(JSON.stringify({
      schemaVersion: 999,
      gameDate: "1995-01-01",
    }))).toThrowError(expect.objectContaining({ code: "invalid-state" }));
    expect(new InvalidSaveImportError("invalid-state", "bad").name).toBe("InvalidSaveImportError");
  });
});
