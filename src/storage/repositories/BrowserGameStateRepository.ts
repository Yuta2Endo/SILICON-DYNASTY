import { parseGameState, type GameState } from "../../game/models/game-state";
import type { GameStateRepository } from "./GameStateRepository";

const DATABASE_NAME = "silicon-dynasty";
const DATABASE_VERSION = 1;
const OBJECT_STORE_NAME = "game-saves";
const SAVE_KEY = "current";
const LOCAL_STORAGE_KEY = "silicon-dynasty:save";
const LEGACY_LOCAL_STORAGE_KEY_V1 = "silicon-dynasty:save:v1";

export class IndexedDbGameStateRepository implements GameStateRepository {
  private databasePromise: Promise<IDBDatabase> | null = null;

  constructor(private readonly factory: IDBFactory) {}

  async load(): Promise<GameState | null> {
    const database = await this.openDatabase();

    const value = await new Promise<unknown | null>((resolve, reject) => {
      const transaction = database.transaction(OBJECT_STORE_NAME, "readonly");
      const request = transaction.objectStore(OBJECT_STORE_NAME).get(SAVE_KEY);

      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error ?? new Error("Unable to read the save."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Save read was aborted."));
    });

    if (value === null) {
      return null;
    }

    const state = parseGameState(value);
    if (getSchemaVersion(value) !== state.schemaVersion) {
      await this.save(state);
    }
    return state;
  }

  async save(state: GameState): Promise<void> {
    const validatedState = parseGameState(state);
    const database = await this.openDatabase();

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(OBJECT_STORE_NAME, "readwrite");
      transaction.objectStore(OBJECT_STORE_NAME).put(validatedState, SAVE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Unable to write the save."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Save write was aborted."));
    });
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (this.databasePromise) {
      return this.databasePromise;
    }

    this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = this.factory.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(OBJECT_STORE_NAME)) {
          database.createObjectStore(OBJECT_STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Unable to open game storage."));
      request.onblocked = () => reject(new Error("Game storage upgrade is blocked."));
    });

    return this.databasePromise;
  }
}

export class LocalStorageGameStateRepository implements GameStateRepository {
  constructor(private readonly storage: Storage) {}

  async load(): Promise<GameState | null> {
    const currentSerialized = this.storage.getItem(LOCAL_STORAGE_KEY);
    const sourceKey = currentSerialized === null ? LEGACY_LOCAL_STORAGE_KEY_V1 : LOCAL_STORAGE_KEY;
    const serialized = currentSerialized ?? this.storage.getItem(LEGACY_LOCAL_STORAGE_KEY_V1);
    if (serialized === null) {
      return null;
    }

    let value: unknown;
    try {
      value = JSON.parse(serialized) as unknown;
    } catch {
      throw new Error("Saved game data is not valid JSON.");
    }

    const state = parseGameState(value);
    if (sourceKey !== LOCAL_STORAGE_KEY || getSchemaVersion(value) !== state.schemaVersion) {
      await this.save(state);
    }
    return state;
  }

  async save(state: GameState): Promise<void> {
    const validatedState = parseGameState(state);
    this.storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(validatedState));
  }
}

export function createBrowserGameStateRepository(): GameStateRepository {
  if (typeof globalThis.indexedDB !== "undefined") {
    return new IndexedDbGameStateRepository(globalThis.indexedDB);
  }

  if (typeof globalThis.localStorage !== "undefined") {
    return new LocalStorageGameStateRepository(globalThis.localStorage);
  }

  throw new Error("No supported browser storage is available.");
}

function getSchemaVersion(value: unknown): number | null {
  if (typeof value !== "object" || value === null || !("schemaVersion" in value)) {
    return null;
  }
  return typeof value.schemaVersion === "number" ? value.schemaVersion : null;
}
