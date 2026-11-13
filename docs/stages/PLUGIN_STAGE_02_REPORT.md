# Plugin Stage 02 — Core Improvements Report

**Date:** 2026-11-14
**Status:** COMPLETED

## Git state

- **Branch before/after:** `main`
- **HEAD before/after:** `0096f660cb4f329ff93839eb6becdb291f4cb4e3` (unchanged)
- Stage 02 work remains uncommitted. No commit or push was performed.

## Initial repository audit

- Stage 01 dependency audit was committed and pushed as `0096f66`.
- Baseline was 44 test files / 251 tests; save schema was v11; scripts were `dev`, `build`, `preview`, `typecheck`, `lint` and `test`; `test:e2e` was not defined.
- `App.tsx` owned game-session loading, command execution, save overview, backup restore, native status-bar synchronization and UI navigation in one component.
- There was no application error boundary, no project-version or market-product caps, no import file-size guard and no consolidated finance-invariant test.
- `RELEASE_NOTES.md` and `ANDROID_RELEASE.md` still described the pre-code-splitting bundle and a 500 kB warning.
- Android sync/debug build passed before the stage; no physical device was attached.

## Completed work

- Extracted game-session state and command wiring into `useGameSession`, covering loading, saving, command feedback, save overview, backup restore, document language and native status-bar synchronization. `App.tsx` now keeps navigation, draft guards, menu state and screen composition.
- Added an application error boundary with a localized fallback and reload action; `main.tsx` wraps the app with it.
- Added shared project version capacity limits: 100 versions per project. The limit is enforced by CPU, component, OS, AI, device and cloud save commands, while parsers remain backward-compatible with existing saves.
- Added market product caps: 100 CPU products and 60 component products. Releases reject overflow with a stable `product-limit` error before charging a launch fee.
- Added a 5 MiB import payload limit in the save-transfer parser and in the Settings file picker. Oversized files are rejected before reading or parsing and leave the current save unchanged.
- Added a deterministic finance invariant test covering 48 transactions, lifetime totals, daily net cash flow, net profit and export/import round-trip.
- Added tests for the session hook, error boundary, project limits, market caps, import size guard and finance invariants.
- Updated release/Android documentation to the current split production build and added an architecture note for session wiring, error handling and limits.
- No dependencies were added.

## Files added or updated for Stage 2

- **Added:** `src/app/useGameSession.ts`, `src/app/useGameSession.test.tsx`, `src/components/AppErrorBoundary.tsx`, `src/components/AppErrorBoundary.test.tsx`, `src/game/models/project-limits.ts`, `src/game/models/project-limits.test.ts`, `src/game/models/finance.invariants.test.ts`, `docs/stages/PLUGIN_STAGE_02_REPORT.md`.
- **Updated:** `src/app/App.tsx`, `src/main.tsx`, `src/features/settings/SettingsPage.tsx`, `src/features/settings/SettingsPage.test.tsx`, `src/game/application/save-transfer.ts`, `src/game/application/save-transfer.test.ts`, `src/game/engine/market.ts`, `src/game/engine/market.test.ts`, `src/game/engine/component-market.ts`, `src/game/engine/component-market.test.ts`, `src/game/models/cpu.ts`, `src/game/models/components.ts`, `src/game/models/os.ts`, `src/game/models/ai.ts`, `src/game/models/devices.ts`, `src/game/models/cloud.ts`, `src/game/models/market.ts`, `src/localization/messages.ts`, `docs/RELEASE_NOTES.md`, `docs/ANDROID_RELEASE.md`, `docs/ARCHITECTURE.md`.
- No save-schema change was made.

## Architecture decisions

- **Session hook, not a state library.** `useGameSession` extracts command and persistence wiring without introducing Zustand, XState or a second source of truth.
- **Top-level error containment.** `AppErrorBoundary` catches render failures and offers a localized reload instead of leaving a blank screen.
- **Caps at write boundaries.** Version and product caps are enforced when creating new versions or releasing products, not while parsing existing saves. Old saves remain loadable.
- **One shared version-limit primitive.** `PROJECT_LIMITS` and `isProjectVersionLimitReached` keep the six product domains aligned.
- **Early import rejection.** The byte limit is checked in both the UI and the parser so an oversized file cannot consume parsing memory or replace the current save.
- **Deterministic invariants.** Finance tests derive expected totals from the transaction ledger instead of hard-coded balances.

## Verification

| Command/check | Result |
| --- | --- |
| `npm run test` | PASS — 48 files, 261 tests, Vitest 5.1.0, 13.33 s |
| `npm run typecheck` | PASS — app and node configs |
| `npm run lint` | PASS — ESLint, `--max-warnings 0` |
| `npm run build` | PASS — Vite 8.3.8, 2,150 modules, built 643 ms |
| `npm run test:e2e` | **NOT AVAILABLE** — no such script in `package.json` |
| `git diff --check` | PASS — no whitespace errors; Git emitted only LF→CRLF advisory warnings |

### Build output

- `dist/index.html` 0.95 kB (gzip 0.50 kB)
- CSS `index-BlLRP9ix.css` 121.57 kB (gzip 22.86 kB)
- Main `index-CPMfXU1_.js` 364.94 kB (gzip 99.26 kB)
- React vendor `react-vendor-Db-_YT-E.js` 218.77 kB (gzip 68.25 kB)
- Feature chunks: Company 3.33, Research 9.13, Component Designer 12.58, Settings 14.35, CPU Designer 21.24, AI Designer 28.25, OS Designer 28.31, Device Designer 32.42, Market 38.71 kB.
- No Vite chunk-size warning.

### Android compatibility

- `npx cap sync android`: PASS — 2 Capacitor plugins, 0.128 s.
- `gradlew assembleDebug --no-daemon`: **BUILD SUCCESSFUL in 53 s**, 153 tasks (27 executed, 126 up-to-date).
- No Android source or plugin change was made. No physical device was attached for native QA.

### Browser QA

- Desktop 1000×700; no console errors and no horizontal overflow (`scrollWidth === innerWidth === 1000`).
- Main menu continued into the dashboard, which rendered 8 metric cards and the command center.
- «Следующий день» advanced the game, showed «Изменения сохранены» and preserved the session through the extracted hook.
- The lazy-loaded Settings screen opened with save management and the import file input.
- Dev server and browser tab were closed after QA. No mobile viewport, screenshot review or automated accessibility audit was performed.

## Performance impact

- Main entry grew from 356.76 kB to 364.94 kB (+8.18 kB) after adding the session hook, error boundary and limit wiring.
- React vendor and CSS sizes are unchanged; feature chunks remain lazy-loaded and no chunk-size warning is emitted.

## Known issues and risks

- Caps apply to new writes; existing saves with more than the cap remain loadable and are not truncated.
- The error boundary covers render errors, not asynchronous failures inside commands; those still use inline and application-level error states.
- Import size is limited to 5 MiB; very large long-session saves above that limit must be reduced or split externally.
- Native Back-button and app-state lifecycle handling remains deferred to Stage 06 with `@capacitor/app`.
- No end-to-end automation, mobile browser QA, automated accessibility audit or Android device validation was performed.
- Stage 02 work is uncommitted; a checkpoint commit should be made after review.

## Incomplete requirements

- No mandatory Stage 02 acceptance criterion is incomplete or unverified.
- Missing end-to-end, mobile, accessibility and native-device validation is noted above.

## Recommendation

Stage 02 is complete. Stop for review before starting Stage 03 Analytics. If approved, make a checkpoint commit of the Stage 02 work, then continue with the next plugin stage under separate authorization. No commit or push was performed.
