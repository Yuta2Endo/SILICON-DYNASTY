# Save System & Game Experience

## Scope

Stage 13 adds safe save management and a lightweight game-experience layer:

- automatic save after every successful game command;
- a recovery backup of the previous valid autosave;
- three manual save slots with metadata;
- versioned JSON export and validated import;
- recovery from a damaged current save;
- fixture-based migration tests for legacy schemas;
- a derived tutorial checklist and achievements.

The save schema remains v11. Slot metadata and backup records live outside `GameState`; no game rules or balance values changed in this stage.

## Storage model

`SaveManagementRepository` extends the existing `GameStateRepository` with:

```ts
getSaveOverview(): Promise<SaveOverview>;
saveSlot(slotId, state): Promise<void>;
loadSlot(slotId): Promise<GameState>;
deleteSlot(slotId): Promise<void>;
restoreBackup(): Promise<GameState>;
```

`SaveOverview` contains the current autosave metadata, recovery-backup metadata and the three manual slots. Metadata is `savedAt`, game date, company name, balance and schema version.

The browser implementation supports IndexedDB and the localStorage fallback.

### IndexedDB keys

- `current` — autosave state;
- `backup` — previous valid autosave;
- `slot:slot-1` … `slot:slot-3` — manual slots;
- matching `meta:*` records for timestamps and summaries.

### localStorage keys

- `silicon-dynasty:save` — autosave state;
- `silicon-dynasty:save:v1` — legacy key still read during migration;
- `silicon-dynasty:save:backup` — recovery backup;
- `silicon-dynasty:save:meta` and `...:backup:meta`;
- `silicon-dynasty:save:slot:slot-N` and slot metadata.

A successful save validates the state, copies the previous valid current save to backup, then writes the new current save and metadata. A corrupt current save is never copied over a valid backup. Loading a legacy or older-schema save parses it through the normal migration path and writes the migrated state.

## Autosave and recovery

- Every successful application command is committed and autosaved.
- The UI exposes saving, saved, load-failure and save-failure states.
- The previous valid autosave remains available as a recovery backup.
- `restoreBackup` validates and parses the backup before writing it to current; the backup itself is left intact.
- A startup load failure offers a recovery action instead of silently discarding data.
- Invalid or newer-schema saves are rejected without replacing the working save.

## Manual slots

Three slots are available: `slot-1`, `slot-2`, `slot-3`. Each slot stores a full validated `GameState` plus metadata. Loading a slot backs up the current autosave before replacing it. Deleting a slot removes only that slot and its metadata.

The Settings screen shows slot state, game date, company, balance and save time, with save, load and delete actions. Load, delete and backup restore require inline confirmation.

## Import and export

Export produces a pretty-printed JSON wrapper:

```json
{
  "format": "silicon-dynasty-save",
  "formatVersion": 1,
  "exportedAt": "2026-11-13T00:00:00.000Z",
  "state": { "schemaVersion": 11, "...": "..." }
}
```

Import accepts the wrapper or a raw `GameState`. The file is parsed and validated with `parseGameState` before any write. Errors distinguish invalid JSON, invalid format and invalid state. Future schemas are rejected. An invalid import leaves both the current in-memory state and the stored autosave unchanged.

## Migrations and fixtures

`src/storage/fixtures/legacy-saves.ts` provides representative saves for schemas 1, 5, 7, 10 and 11. Tests migrate them through the current parser and verify that existing company, CPU, component, research, finance, market, OS, AI, device and cloud data is preserved while new fields receive documented defaults.

The fixture suite also rejects schema 12 (future), runs a 30-day session, exports and reimports the result, and checks that bounded history limits survive a JSON round trip.

## Game experience

The tutorial and achievements are derived from existing state, so they do not add schema fields or duplicate progress data.

Tutorial steps: design a CPU, component, OS and AI model; build a device; advance a day; start research; release a product; make a sale.

Achievements: first CPU, first OS, first AI project, first device, cloud builder, researcher, first sale, profitable, stable OS release and full-stack company.

Progress is shown in Settings as a checklist with a completion bar and achievement list.

## UI

Settings includes:

- language and appearance controls;
- save-management card with autosave, recovery backup and three slots;
- import/export controls with inline validation and success/error feedback;
- confirmation for destructive or state-replacing actions;
- game-journey checklist and achievements;
- local-storage notice.

All user-facing text is available in Russian and English. The layout is mobile-first, uses existing design tokens and provides disabled, loading, empty and error states.

## Tests

- `src/storage/repositories/BrowserGameStateRepository.test.ts` — autosave metadata, backup preservation, slot lifecycle, restore after corruption, invalid slot IDs.
- `src/game/application/save-transfer.test.ts` — wrapper/raw round trip, invalid JSON/format/version, future schema, invalid state.
- `src/game/application/save-management.test.ts` — slot load/save, backup, invalid import leaves current state and raw save unchanged, unsupported repository behavior.
- `src/game/models/game-experience.test.ts` — tutorial progress and achievements.
- `src/features/settings/SettingsPage.test.tsx` — save UI, slot actions, import errors, load confirmation, unsupported storage.
- `src/storage/save-migrations.test.ts` — fixture migrations, future-schema rejection and long-session round trip.

## Verification

At the end of Stage 13:

- `npm run test` — 41 files / 237 tests passed;
- `npm run typecheck` — both configurations passed;
- `npm run lint` — passed with `--max-warnings 0`;
- `npm run build` — Vite production build passed;
- `npm run test:e2e` — NOT AVAILABLE;
- `git diff --check` — passed with only LF→CRLF advisory warnings.
