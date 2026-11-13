# QA Strategy

## Unit tests
CPU/GPU formulas, benchmark, power/thermal, economy, research dependencies, market, OS quality, AI training simulation, compatibility and save migrations.

## Integration tests
Hardware + benchmark; hardware + manufacturing; research + unlocks; OS + devices; AI + GPU; cloud + AI; ecosystem + market; finance + manufacturing.

## End-to-end scenario
New game → create company → research technology → design CPU → benchmark → manufacture → release → sales → create OS → create AI project → assemble device → save → restart → load → continue.

## Save QA
Test each data type, corrupted data, interrupted writes, autosave restart, migrations, invalid imports and backup recovery.

## Mobile QA
Screen sizes, safe areas, keyboard/forms, background/resume, Back handling, memory pressure, long sessions, large lists and chart performance. Android QA additionally covers signed APK/AAB install, cold start, offline launch after the first load, process death, WebView storage persistence, battery/heat and the device checklist in `ANDROID_RELEASE.md`.

## Commands
`npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`. `test:e2e` is **NOT AVAILABLE** in this repository; do not report it as a pass. Android builds use the Gradle commands in `ANDROID_RELEASE.md`. Report exact output/status.

## Definition of Done
Acceptance criteria met, no known critical regression, checks actually executed, documentation updated, changed files listed, known issues recorded and no next stage started without approval. A release is not done until the signed Android artifact passes real-device install/launch and save-lifecycle QA.
