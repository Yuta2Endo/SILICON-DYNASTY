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
Screen sizes, safe areas, keyboard/forms, background/resume, Back handling, memory pressure, long sessions, large lists and chart performance.

## Commands
`npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:e2e`, `npm run build`. Report exact output/status. Missing scripts are NOT AVAILABLE.

## Definition of Done
Acceptance criteria met, no known critical regression, checks actually executed, documentation updated, changed files listed, known issues recorded and no next stage started without approval.
