# QA Strategy

## Unit tests
CPU/GPU formulas, benchmark, power/thermal, economy, research dependencies, market, press reviews, commercial contracts, manufacturing capacity/inventory, competitor finance and market exit, company legacy/reputation/doctrine, OS quality, AI training simulation, compatibility and save migrations.

## Integration tests
Hardware + benchmark; hardware + manufacturing; research + unlocks; OS + devices; AI + GPU; cloud + AI; ecosystem + market; finance + manufacturing; component production + inventory + sales; OEM contracts + market demand and finance; commercial contracts + finance ledger and expiry; competitor finance + aggression scaling + market exit; doctrine + manufacturing/commercial/market effects.

## End-to-end scenario
New game → create company → research technology → design CPU → benchmark → manufacture → release → sales → create OS → create AI project → assemble device → save → restart → load → continue.

Current Playwright coverage: `e2e/core-loop.spec.ts` verifies analytics CSV and settings JSON export flows; `e2e/commercial.spec.ts` verifies an OS commercial contract and dashboard revenue mix; `e2e/ui-regression.spec.ts` verifies mobile navigation/More sheet, horizontally scrollable product tabs, market tabs and 14-day pulse, OS editor sections, saved-version comparison, accepting an OEM design-win offer, ordering a component production batch, and choosing a permanent company doctrine. All run in desktop Chromium only.

## Save QA
Test each data type, corrupted data, interrupted writes, autosave restart, migrations, invalid imports and backup recovery.

## Mobile QA
Screen sizes, safe areas, keyboard/forms, background/resume, Back handling, memory pressure, long sessions, large lists and chart performance. Android QA additionally covers signed APK/AAB install, cold start, offline launch after the first load, process death, WebView storage persistence, battery/heat and the device checklist in `ANDROID_RELEASE.md`. Plugin Stage 07 added desktop Playwright flows at 1000×700; they do not cover Android WebView. No physical Android device or Android profiling was available in Stage 07, so device QA remains pending.

## Commands
`npm run typecheck`, `npm run lint`, `npm run test` (Vitest unit/integration plus deterministic fast-check property tests), `npm run test:e2e` (Playwright Chromium desktop flows), `npm run build`. Playwright requires `npx playwright install chromium` once and runs against the Vite dev server on port 4173. It is desktop-only and must not be reported as Android WebView coverage. Android builds use the Gradle commands in `ANDROID_RELEASE.md`. Report exact output/status.

## Definition of Done
Acceptance criteria met, no known critical regression, checks actually executed, documentation updated, changed files listed, known issues recorded and no next stage started without approval. A release is not done until the signed Android artifact passes real-device install/launch and save-lifecycle QA.
