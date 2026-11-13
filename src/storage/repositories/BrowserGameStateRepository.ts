import { parseGameState, type GameState } from "../../game/models/game-state";
import type { GameStateRepository } from "./GameStateRepository";
import {
  createSaveMetadata,
  isSaveManagementRepository,
  SAVE_SLOT_IDS,
  type SaveManagementRepository,
  type SaveMetadata,
  type SaveOverview,
  type SaveSlotInfo,
} from "./SaveManagement";

const DATABASE_NAME = "silicon-dynasty";
const DATABASE_VERSION = 1;
const OBJECT_STORE_NAME = "game-saves";
const SAVE_KEY = "current";
const BACKUP_KEY = "backup";
const SLOT_KEY_PREFIX = "slot:";
const AUTOSAVE_META_KEY = "meta:current";
const BACKUP_META_KEY = "meta:backup";
const SLOT_META_KEY_PREFIX = "meta:slot:";
const LOCAL_STORAGE_KEY = "silicon-dynasty:save";
const LEGACY_LOCAL_STORAGE_KEY_V1 = "silicon-dynasty:save:v1";
const LOCAL_STORAGE_BACKUP_KEY = "silicon-dynasty:save:backup";
const LOCAL_STORAGE_META_KEY = "silicon-dynasty:save:meta";
const LOCAL_STORAGE_BACKUP_META_KEY = "silicon-dynasty:save:backup:meta";
const LOCAL_STORAGE_SLOT_KEY_PREFIX = "silicon-dynasty:save:slot:";
const LOCAL_STORAGE_SLOT_META_KEY_PREFIX = "silicon-dynasty:save:slot:meta:";

export class IndexedDbGameStateRepository implements SaveManagementRepository {
  private databasePromise: Promise<IDBDatabase> | null = null;

  constructor(private readonly factory: IDBFactory) {}

  async load(): Promise<GameState | null> {
    const value = await this.readValue(SAVE_KEY);

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
    const savedAt = new Date().toISOString();
    const existing = await this.readValue(SAVE_KEY);

    if (existing !== null) {
      try {
        const previousState = parseGameState(existing);
        const previousMetadata = await this.readMetadata(AUTOSAVE_META_KEY, SAVE_KEY)
          ?? createSaveMetadata(previousState, null);
        await this.writeValue(BACKUP_KEY, previousState);
        await this.writeValue(BACKUP_META_KEY, previousMetadata);
      } catch {
        // A corrupted current save is not copied over the last known-good backup.
      }
    }

    await this.writeValue(SAVE_KEY, validatedState);
    await this.writeValue(AUTOSAVE_META_KEY, createSaveMetadata(validatedState, savedAt));
  }

  async getSaveOverview(): Promise<SaveOverview> {
    return readSaveOverview(
      {
        readValue: (key) => this.readValue(key),
        readMetadata: (metaKey, stateKey) => this.readMetadata(metaKey, stateKey),
      },
      {
        autosave: SAVE_KEY,
        backup: BACKUP_KEY,
        autosaveMeta: AUTOSAVE_META_KEY,
        backupMeta: BACKUP_META_KEY,
        slot: slotKey,
        slotMeta: slotMetaKey,
      },
    );
  }

  async saveSlot(slotId: string, state: GameState): Promise<void> {
    assertSaveSlotId(slotId);
    const validatedState = parseGameState(state);
    const savedAt = new Date().toISOString();
    await this.writeValue(slotKey(slotId), validatedState);
    await this.writeValue(slotMetaKey(slotId), createSaveMetadata(validatedState, savedAt));
  }

  async loadSlot(slotId: string): Promise<GameState | null> {
    assertSaveSlotId(slotId);
    const value = await this.readValue(slotKey(slotId));
    return value === null ? null : parseGameState(value);
  }

  async deleteSlot(slotId: string): Promise<void> {
    assertSaveSlotId(slotId);
    await this.deleteValue(slotKey(slotId));
    await this.deleteValue(slotMetaKey(slotId));
  }

  async restoreBackup(): Promise<GameState | null> {
    const value = await this.readValue(BACKUP_KEY);
    if (value === null) {
      return null;
    }

    const state = parseGameState(value);
    const metadata = await this.readMetadata(BACKUP_META_KEY, BACKUP_KEY)
      ?? createSaveMetadata(state, new Date().toISOString());
    await this.writeValue(SAVE_KEY, state);
    await this.writeValue(AUTOSAVE_META_KEY, metadata);
    return state;
  }

  private async readMetadata(metaKey: string, stateKey: string): Promise<SaveMetadata | null> {
    const meta = await this.readValue(metaKey);
    if (isSaveMetadata(meta)) {
      return meta;
    }

    const stateValue = await this.readValue(stateKey);
    if (stateValue === null) {
      return null;
    }

    try {
      return createSaveMetadata(parseGameState(stateValue), null);
    } catch {
      return null;
    }
  }

  private async readValue(key: string): Promise<unknown | null> {
    const database = await this.openDatabase();
    return new Promise<unknown | null>((resolve, reject) => {
      const transaction = database.transaction(OBJECT_STORE_NAME, "readonly");
      const request = transaction.objectStore(OBJECT_STORE_NAME).get(key);

      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error ?? new Error("Unable to read the save."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Save read was aborted."));
    });
  }

  private async writeValue(key: string, value: unknown): Promise<void> {
    const database = await this.openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(OBJECT_STORE_NAME, "readwrite");
      transaction.objectStore(OBJECT_STORE_NAME).put(value, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Unable to write the save."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Save write was aborted."));
    });
  }

  private async deleteValue(key: string): Promise<void> {
    const database = await this.openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(OBJECT_STORE_NAME, "readwrite");
      transaction.objectStore(OBJECT_STORE_NAME).delete(key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Unable to delete the save."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Save delete was aborted."));
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

export class LocalStorageGameStateRepository implements SaveManagementRepository {
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
    const savedAt = new Date().toISOString();
    const currentSerialized = this.storage.getItem(LOCAL_STORAGE_KEY);

    if (currentSerialized !== null) {
      try {
        const previousState = parseGameState(JSON.parse(currentSerialized) as unknown);
        const previousMetadata = this.readMetadata(LOCAL_STORAGE_META_KEY, LOCAL_STORAGE_KEY)
          ?? createSaveMetadata(previousState, null);
        this.storage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify(previousState));
        this.storage.setItem(LOCAL_STORAGE_BACKUP_META_KEY, JSON.stringify(previousMetadata));
      } catch {
        // A corrupted current save is not copied over the last known-good backup.
      }
    }

    this.storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(validatedState));
    this.storage.setItem(LOCAL_STORAGE_META_KEY, JSON.stringify(createSaveMetadata(validatedState, savedAt)));
  }

  async getSaveOverview(): Promise<SaveOverview> {
    return readSaveOverview(
      {
        readValue: async (key) => this.readValue(key),
        readMetadata: async (metaKey, stateKey) => this.readMetadata(metaKey, stateKey),
      },
      {
        autosave: LOCAL_STORAGE_KEY,
        backup: LOCAL_STORAGE_BACKUP_KEY,
        autosaveMeta: LOCAL_STORAGE_META_KEY,
        backupMeta: LOCAL_STORAGE_BACKUP_META_KEY,
        slot: localSlotKey,
        slotMeta: localSlotMetaKey,
      },
    );
  }

  async saveSlot(slotId: string, state: GameState): Promise<void> {
    assertSaveSlotId(slotId);
    const validatedState = parseGameState(state);
    const savedAt = new Date().toISOString();
    this.storage.setItem(localSlotKey(slotId), JSON.stringify(validatedState));
    this.storage.setItem(localSlotMetaKey(slotId), JSON.stringify(createSaveMetadata(validatedState, savedAt)));
  }

  async loadSlot(slotId: string): Promise<GameState | null> {
    assertSaveSlotId(slotId);
    const serialized = this.storage.getItem(localSlotKey(slotId));
    if (serialized === null) {
      return null;
    }

    let value: unknown;
    try {
      value = JSON.parse(serialized) as unknown;
    } catch {
      throw new Error("Saved slot data is not valid JSON.");
    }
    return parseGameState(value);
  }

  async deleteSlot(slotId: string): Promise<void> {
    assertSaveSlotId(slotId);
    this.storage.removeItem(localSlotKey(slotId));
    this.storage.removeItem(localSlotMetaKey(slotId));
  }

  async restoreBackup(): Promise<GameState | null> {
    const serialized = this.storage.getItem(LOCAL_STORAGE_BACKUP_KEY);
    if (serialized === null) {
      return null;
    }

    let value: unknown;
    try {
      value = JSON.parse(serialized) as unknown;
    } catch {
      throw new Error("Backup save data is not valid JSON.");
    }

    const state = parseGameState(value);
    const metadata = this.readMetadata(LOCAL_STORAGE_BACKUP_META_KEY, LOCAL_STORAGE_BACKUP_KEY)
      ?? createSaveMetadata(state, new Date().toISOString());
    this.storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    this.storage.setItem(LOCAL_STORAGE_META_KEY, JSON.stringify(metadata));
    return state;
  }

  private readValue(key: string): unknown | null {
    const serialized = this.storage.getItem(key);
    if (serialized === null) {
      return null;
    }

    try {
      return JSON.parse(serialized) as unknown;
    } catch {
      return null;
    }
  }

  private readMetadata(metaKey: string, stateKey: string): SaveMetadata | null {
    const meta = this.readValue(metaKey);
    if (isSaveMetadata(meta)) {
      return meta;
    }

    const value = this.readValue(stateKey);
    if (value === null) {
      return null;
    }

    try {
      return createSaveMetadata(parseGameState(value), null);
    } catch {
      return null;
    }
  }
}

export function createBrowserGameStateRepository(): SaveManagementRepository {
  if (typeof globalThis.indexedDB !== "undefined") {
    return new IndexedDbGameStateRepository(globalThis.indexedDB);
  }

  if (typeof globalThis.localStorage !== "undefined") {
    return new LocalStorageGameStateRepository(globalThis.localStorage);
  }

  throw new Error("No supported browser storage is available.");
}

export function isSaveManagementAvailable(repository: GameStateRepository): boolean {
  return isSaveManagementRepository(repository);
}

interface SaveReader {
  readValue(key: string): Promise<unknown | null>;
  readMetadata(metaKey: string, stateKey: string): Promise<SaveMetadata | null>;
}

interface SaveKeys {
  autosave: string;
  backup: string;
  autosaveMeta: string;
  backupMeta: string;
  slot(slotId: string): string;
  slotMeta(slotId: string): string;
}

async function readSaveOverview(reader: SaveReader, keys: SaveKeys): Promise<SaveOverview> {
  const autosaveState = await reader.readValue(keys.autosave);
  const autosave = autosaveState === null
    ? null
    : (await reader.readMetadata(keys.autosaveMeta, keys.autosave))
      ?? await deriveMetadata(autosaveState);

  const backupState = await reader.readValue(keys.backup);
  const backup = backupState === null
    ? null
    : (await reader.readMetadata(keys.backupMeta, keys.backup))
      ?? await deriveMetadata(backupState);

  const slots: SaveSlotInfo[] = [];
  for (const slotId of SAVE_SLOT_IDS) {
    const stateKey = keys.slot(slotId);
    const stateValue = await reader.readValue(stateKey);
    if (stateValue === null) {
      continue;
    }

    const metadata = (await reader.readMetadata(keys.slotMeta(slotId), stateKey))
      ?? await deriveMetadata(stateValue);
    if (metadata) {
      slots.push({ ...metadata, slotId });
    }
  }

  return {
    supported: true,
    autosave,
    backup,
    slots,
  };
}

async function deriveMetadata(value: unknown): Promise<SaveMetadata | null> {
  try {
    return createSaveMetadata(parseGameState(value), null);
  } catch {
    return null;
  }
}

function isSaveMetadata(value: unknown): value is SaveMetadata {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<SaveMetadata>;
  return (
    (typeof candidate.savedAt === "string" || candidate.savedAt === null)
    && typeof candidate.gameDate === "string"
    && typeof candidate.companyName === "string"
    && typeof candidate.balanceUsd === "number"
    && typeof candidate.schemaVersion === "number"
  );
}

function assertSaveSlotId(slotId: string): void {
  if (!(SAVE_SLOT_IDS as readonly string[]).includes(slotId)) {
    throw new Error("Unknown save slot.");
  }
}

function slotKey(slotId: string): string {
  return `${SLOT_KEY_PREFIX}${slotId}`;
}

function slotMetaKey(slotId: string): string {
  return `${SLOT_META_KEY_PREFIX}${slotId}`;
}

function localSlotKey(slotId: string): string {
  return `${LOCAL_STORAGE_SLOT_KEY_PREFIX}${slotId}`;
}

function localSlotMetaKey(slotId: string): string {
  return `${LOCAL_STORAGE_SLOT_META_KEY_PREFIX}${slotId}`;
}

function getSchemaVersion(value: unknown): number | null {
  if (typeof value !== "object" || value === null || !("schemaVersion" in value)) {
    return null;
  }
  return typeof value.schemaVersion === "number" ? value.schemaVersion : null;
}
