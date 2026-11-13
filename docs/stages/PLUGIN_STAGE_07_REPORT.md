# Plugin Stage 07 — QA and Optimization Report

**Date:** 2026-11-14
**Status:** COMPLETED WITH KNOWN ISSUES

## Git state

- **Branch before/after:** `main`
- **HEAD before/after:** `b48f190bad443a9ec7a22b722d5e3926626a6259` (unchanged)
- Stage 07 work remains uncommitted. No commit or push was performed.

## Initial repository audit

- Stage 06 Android Integration was committed and pushed as `b48f190`.
- Baseline was 56 test files / 283 tests, save schema v11, and no `test:e2e` script.
- `docs/QA_STRATEGY.md` documented a manual end-to-end scenario but still reported `test:e2e` as **NOT AVAILABLE**.
- Existing tests covered save migrations and a 30-day session; there was no property-based testing, browser E2E execution, 400-day session cap check, or automated export-download verification.
- Android sync/debug builds passed in Stage 06; no physical device was attached.

## Completed work

- Added dev-only `fast-check` for deterministic property tests.
- Added dev-only `@playwright/test` and a Chromium desktop project.
- Added Playwright E2E coverage for two real download flows:
  - Market → Analytics → 7-day range → CSV export.
  - Settings → JSON save export.
- Added property tests for finance ledger invariants, market price/marketing monotonicity, positive segment demand, and save export/import round-trip.
- Added a 400-day long-session test that checks date advancement, history caps and exported-save size below the 5 MiB import limit.
- Excluded `e2e/**` from Vitest so Playwright specs are collected only by Playwright.
- Updated `docs/QA_STRATEGY.md` with property-test and Playwright commands, desktop-only coverage and Android limitations.
- No save-schema or simulation change was made.

## Files added or updated

- **Added:** `playwright.config.ts`, `e2e/core-loop.spec.ts`, `src/game/models/finance.property.test.ts`, `src/game/formulas/market.property.test.ts`, `src/game/application/save-transfer.property.test.ts`, `src/game/engine/long-session.test.ts`, `docs/stages/PLUGIN_STAGE_07_REPORT.md`.
- **Updated:** `package.json`, `package-lock.json`, `.gitignore`, `vite.config.ts`, `docs/QA_STRATEGY.md`.
- No UI source or game model was changed.

## Dependencies

- **Added:** `fast-check` 4.10.2 (dev), `@playwright/test` 1.65.0 (dev).
- Playwright Chromium and its headless shell were installed locally for test execution.
- No runtime dependency was added.

## Architecture decisions

- **Desktop browser E2E only.** Playwright runs against the Vite dev server on port 4173 at 1000×700 and is not a substitute for Android WebView testing.
- **Property tests stay in Vitest.** Deterministic seeded fast-check runs cover accounting and market invariants without a second test runner.
- **Vitest owns unit/integration tests.** `e2e/**` is explicitly excluded so Playwright and Vitest cannot collect the same spec.
- **Long-session checks use the real daily pipeline.** The 400-day test advances `advanceGameDay` and verifies the existing caps and export-size guard rather than simulating separate rules.

## Verification

| Command/check | Result |
| --- | --- |
| `npm run test` | PASS — 60 files, 289 tests, Vitest 5.1.0, 16.92 s |
| `npm run test:e2e` | PASS — 2 Chromium tests, 3.8 s |
| `npm run typecheck` | PASS — app and node configs |
| `npm run lint` | PASS — ESLint, `--max-warnings 0` |
| `npm run build` | PASS — Vite 8.3.8, 2,166 modules, 711 ms, no chunk-size warning |
| `npx cap sync android` | PASS — 5 plugins, 0.139 s |
| `gradlew assembleDebug --no-daemon` | PASS — 244 tasks (24 executed, 220 up-to-date), 22 s |
| `adb devices` | Empty device list; no physical Android device attached |
| `git diff --check` | PASS — only LF→CRLF advisory warnings |

### Build output

- CSS `index-DAv72vfG.css` 127.85 kB (gzip 23.99 kB)
- React vendor `react-vendor-Db-_YT-E.js` 218.77 kB (gzip 68.25 kB)
- Main `index-D1F85mLq.js` 376.99 kB (gzip 102.68 kB)
- Market page chunk 57.08 kB
- No Vite chunk-size warning.

### E2E coverage

- Market → Analytics tab renders the report title, switches to the 7-day range, and downloads a CSV named `silicon-dynasty-analytics-*.csv`.
- Settings renders save management and downloads a JSON file matching `silicon-dynasty-YYYY-MM-DD.json`.
- Both tests run against a real browser with the production UI, not mocked DOM.

### Long-session result

- 400 daily advances complete with the expected date.
- Finance daily records remain capped at 365; transactions at 120; market summaries at 180.
- Exported save remains below `MAX_SAVE_IMPORT_BYTES` (5 MiB).

## Known issues and limitations

- No physical Android device was available, so native install/launch, Back-button lifecycle, app resume and native share were not device-tested.
- No Android startup, memory, battery, thermal or long-session WebView profiling was performed.
- Playwright coverage is desktop Chromium only; it does not validate Android WebView layout, touch behavior or safe areas.
- E2E coverage is limited to analytics CSV and save JSON export; the full new-game → research → product → sale loop is still covered at integration level rather than browser level.
- No visual regression, screenshot comparison or automated accessibility audit was added.
- Property tests are deterministic and bounded; they do not prove financial correctness for every possible input.
- Stage 07 work is uncommitted.

## Incomplete requirements

- No mandatory Stage 07 implementation criterion is incomplete.
- Device-level Android verification and profiling remain unverified and are recorded as known issues.

## Recommendation

Stage 07 is complete as a QA/tooling slice. Stop for review before any further work. A checkpoint commit is appropriate after review. Release hardening should next prioritize physical Android device testing and profiling; Playwright results must not be presented as Android coverage. No commit or push was performed.
