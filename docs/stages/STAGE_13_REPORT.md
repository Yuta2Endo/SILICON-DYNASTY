# Stage 13 — Save System & Game Experience Report

**Date:** 2026-11-13
**Status:** COMPLETED

## Git state

- **Branch before/after:** `main`
- **HEAD before/after:** `a59df02726a506d5eba7f052625333a1b8826402` (unchanged)
- Stage 13 work remains uncommitted. No commit or push was performed.

## Initial repository audit

- Stage 12 was completed, committed and pushed. The working tree was clean at the start of Stage 13; save schema was v11.
- The initial baseline was 36 test files / 212 tests. Available scripts were `dev`, `build`, `preview`, `typecheck`, `lint` and `test`; `test:e2e` was not defined.
- The repository already had full game-state persistence, schema migrations, autosave after commands, Settings language/theme controls and all simulation domains through devices/cloud.
- There were no manual slots, save metadata, recovery backup, import/export, fixture-based migration suite, tutorial checklist or achievements.
- The stage brief, architecture, save-system, balance, UI specification and roadmap were reviewed before implementation.

## Completed work

- Added an optional save-management contract on top of the existing repository interface: save overview, three manual slots, slot deletion and recovery-backup restore.
- Implemented save management for both IndexedDB and localStorage, preserving the existing current-save keys and legacy migration path.
- Autosave now keeps the previous valid current save as a recovery backup. A corrupt current save is never copied over a valid backup.
- Added slot metadata: save time, game date, company name, balance and schema version.
- Added versioned JSON export and validated import. Import accepts the wrapper or a raw state and parses/migrates through `parseGameState` before any write.
- Invalid, malformed or newer-schema imports leave both the in-memory state and stored autosave unchanged.
- Added startup recovery for a failed current-save load and backup restoration from Settings.
- Added a derived tutorial checklist with nine steps and ten achievements. No schema fields or balance effects were added.
- Added the “Saves and recovery” Settings section with autosave status, backup restore, three slots, import/export, inline confirmations and loading/empty/error/success states.
- Added complete RU/EN localization and responsive/dark-theme styling.
- Added fixture saves for schemas 1, 5, 7, 10 and 11, migration coverage, future-schema rejection and a 30-day long-session round trip.
- Fixed two issues found during browser QA: the load/delete confirmation showed an unresolved `{number}` placeholder, and failed imports also triggered a redundant global save-error alert.

## Files added or updated for Stage 13

- **Added:** `docs/SAVE_GAME_EXPERIENCE.md`, `docs/stages/STAGE_13_REPORT.md`, `src/storage/repositories/SaveManagement.ts`, `src/game/application/save-transfer.ts`, `src/game/application/save-transfer.test.ts`, `src/game/application/save-management.test.ts`, `src/game/models/game-experience.ts`, `src/game/models/game-experience.test.ts`, `src/features/settings/GameJourney.tsx`, `src/features/settings/SettingsPage.test.tsx`, `src/storage/fixtures/legacy-saves.ts`, `src/storage/save-migrations.test.ts`.
- **Updated:** `docs/ARCHITECTURE.md`, `docs/GAME_BALANCE.md`, `docs/SAVE_SYSTEM.md`, `docs/stages/STAGE_13.md`, `src/app/App.tsx`, `src/features/settings/SettingsPage.tsx`, `src/game/application/game-application.ts`, `src/localization/messages.ts`, `src/storage/repositories/BrowserGameStateRepository.ts`, `src/storage/repositories/BrowserGameStateRepository.test.ts`, `src/styles.css`.
- No dependencies were added.

## Architecture decisions

- **Save management is a storage concern.** Slots, timestamps, backups and metadata live outside `GameState`; the save schema remains v11 and no economic or simulation data changed.
- **Additive repository contract.** `SaveManagementRepository` extends the existing load/save interface, so simple test repositories remain valid while browser storage exposes the full feature set.
- **Safe overwrite order.** A valid current save is copied to backup before a new autosave replaces it. Corrupt current data never overwrites the backup.
- **Validate before commit.** Slot loads, backup restores and imports parse and migrate the source first; invalid imports never reach persistence.
- **Versioned transfer format.** Export wraps the state in a named/versioned envelope, while import also accepts raw states for compatibility and validates both paths.
- **Derived game experience.** Tutorial progress and achievements are computed from existing projects, sales, research and releases, avoiding duplicate progress state and schema churn.
- **Inline errors for save actions.** Import/load/restore failures are shown in Settings without a redundant global save-error banner; normal simulation commands retain the global error state.

## Verification

| Command/check | Result |
| --- | --- |
| `npm run test` | PASS — 41 files, 237 tests, Vitest 5.1.0, 15.84 s |
| `npm run typecheck` | PASS — app and node configs |
| `npm run lint` | PASS — ESLint, `--max-warnings 0` |
| `npm run build` | PASS — Vite 8.3.8, 2,133 modules; CSS 95.49 kB (gzip 15.03), JS 748.85 kB (gzip 198.90), built in 1.13 s |
| `npm run test:e2e` | **NOT AVAILABLE** — no such script in `package.json` |
| `git diff --check` | PASS — no whitespace errors; only LF→CRLF advisory warnings |

The build reports the existing warning that the JavaScript chunk exceeds 500 kB; it is not a build failure.

### Browser QA

- Desktop 1000×700, no console errors and no horizontal overflow (`scrollWidth === innerWidth === 1000`).
- Settings showed autosave metadata for 1995-01-05, no backup yet, three slots, import/export and tutorial progress 8/9.
- Saved the current state to slot 1; the slot immediately displayed game date, company, balance and save timestamp with success feedback.
- Opened the load confirmation. It initially exposed the unresolved `{number}` placeholder; after the fix it correctly read «Загрузить слот 1?». Confirming loaded the slot and showed «Сохранение загружено.».
- Imported a malformed JSON file. Settings showed the inline rejection message and the current save stayed unchanged. After suppressing the redundant global alert, only the inline error remained.
- The dev server and browser tab were closed after QA.
- Mobile viewport testing, screenshot review and automated accessibility auditing were not performed.

## Acceptance criteria

| Criterion | Result |
| --- | --- |
| Full game state survives restart. | PASS — autosave stores the complete validated state; slot save/load, export/import and 30-day round-trip tests preserve all project, market, finance and settings data. |
| Migrations are tested with fixture saves. | PASS — fixture saves for schemas 1, 5, 7, 10 and 11 migrate through the current parser, preserve existing data, fill documented defaults and reject schema 12. |
| Invalid imports cannot overwrite working saves. | PASS — import validates format and domain state before commit; tests and browser QA confirm malformed/future saves leave the current state and raw autosave unchanged. |
| Autosave and recovery have clear UI states. | PASS — Settings and startup expose saving, saved, load failure, backup restore, slot metadata, empty slots and inline import/slot errors with confirmations. |

## Known issues and risks

- Saves are local to the browser/device; there is no cloud sync, account backup or cross-device merge.
- Import/export uses JSON only and has no dedicated file-size limit beyond browser/storage constraints.
- IndexedDB/localStorage quota limits still apply; the UI surfaces failures but does not estimate remaining quota.
- Save metadata is derived from sidecar records when available and from the state when legacy metadata is missing; very old saves may show “time unknown”.
- Tutorial and achievements are informational and do not grant rewards or affect balance.
- No end-to-end automation, mobile browser QA, automated accessibility audit or Android validation was performed. `test:e2e` is unavailable.
- Stage 13 work is uncommitted; a checkpoint commit should be made after review.

## Incomplete requirements

- No mandatory Stage 13 acceptance criterion is incomplete or unverified.
- Missing end-to-end, mobile, accessibility and native-device validation is noted above.

## Recommendation

Stage 13 is complete. Stop for review before starting Stage 14 Android Release & Final QA. If approved, make a checkpoint commit of the Stage 13 work, then continue with the next roadmap stage under separate authorization. No commit or push was performed.
