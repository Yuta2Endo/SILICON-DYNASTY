# Stage 04 — Research & Timeline Report

**Date:** 2026-11-13  
**Status:** COMPLETED WITH KNOWN ISSUES

## Git state

- **Branch before/after:** `main` tracking `origin/main`
- **HEAD before/after:** `86babf69357486cf8b77c2d9d0fe13019917d368` (unchanged)
- Stage 3 and Stage 4 work is uncommitted and unpushed. No commit or push was performed.

## Initial repository audit

- The repository contained the Stage 1 company/dashboard/settings foundation and Stage 2 CPU Designer, with save schema v2 and no research catalog, research state, research application command or Research screen.
- Stage 3 benchmark changes were already present as uncommitted work. They were preserved; this stage also extended the CPU Designer and shared styles/localization without replacing the benchmark panel.
- `GameApplication` followed the existing application-command → domain → state validation → repository persistence pattern. `advanceGameDay` initially advanced only the game date.
- Available scripts: `dev`, `build`, `preview`, `typecheck`, `lint`, `test`. `test:e2e` is not defined.
- `AGENTS.md` and the complete `docs/UI_UX_SPECIFICATION.md` were read before Research UI changes.

## Completed work

- Added a typed, validated catalog of 27 technologies across six historical/future eras and eight categories, with nominal USD costs, durations, prerequisites and explicit unlock IDs. Catalog validation rejects invalid references and dependency cycles.
- Added pure research availability and progression logic: future/prerequisite/funds/busy states are explicit; only one project may run; cost is charged up front without allowing a negative balance; each `advanceGameDay` adds one progress day; completion grants only the catalogued effects. Cancellation/refunds are not implemented.
- Advanced save schema to v3. Schema v1 and v2 saves migrate while preserving existing company/date/settings and CPU project history. Legacy CPU capabilities are the union of capabilities found across saved CPU-version snapshots; migration does not fabricate completed research or change company funds.
- Added atomic application-level research start/persistence and research gates for CPU ISA, topology, microarchitecture, multicore, non-SDR memory and SIMD capabilities. Existing default 1995 designs remain valid; missing capabilities are shown in the CPU Designer and block version saves.
- Added the responsive, localized Research route with era/category filters, prerequisites, costs, durations, unlocks, availability reasons, active-project progress and legacy capability notices. RU/EN strings and accessible status/progress semantics are included.
- Added research model, engine, application, daily-progression, migration/repository and UI tests. Updated `docs/RESEARCH_SYSTEM.md`, `docs/CPU_DESIGN.md`, `docs/GAME_BALANCE.md` and `docs/SAVE_SYSTEM.md`.

## Files added or updated for Stage 4

- Added: `docs/RESEARCH_SYSTEM.md`, `docs/stages/STAGE_04_REPORT.md`, `src/features/research/ResearchPage.tsx`, `src/app/Research.test.tsx`, `src/game/models/research.ts`, `src/game/models/research.test.ts`, `src/game/engine/research.ts`, `src/game/engine/research.test.ts`, `src/game/engine/research-time.test.ts`, `src/game/application/research-application.test.ts`.
- Updated: `docs/CPU_DESIGN.md`, `docs/GAME_BALANCE.md`, `docs/SAVE_SYSTEM.md`, `src/app/App.tsx`, `src/app/navigation.ts`, `src/features/cpu/CPUDesignerPage.tsx`, `src/game/application/game-application.ts`, `src/game/engine/time.ts`, `src/game/models/game-state.ts`, `src/game/models/game-state.test.ts`, `src/localization/messages.ts`, `src/storage/repositories/BrowserGameStateRepository.test.ts`, `src/styles.css`.
- No dependencies were added. Existing uncommitted Stage 3 files remain preserved in the working tree.

## Architecture decisions

- Research catalog, validation, availability, unlock mapping and day progression are framework-independent domain code; React only presents state and dispatches application commands.
- Active research, completed technology IDs, legacy unlock IDs and cumulative spending live in the versioned game save. Starting a project validates and charges cost in the same committed state transition.
- Schema migration preserves old CPU designs by granting only the mapped legacy capabilities found across their saved versions, rather than marking unrelated technologies complete.
- The catalog already contains network, graphics, mobile, AI, robotics and future unlock IDs. Their downstream product systems are outside Stage 4 and were not fabricated here.

## Verification

| Command/check | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS (`--max-warnings 0`) |
| `npm test` | PASS — 15 files, 56 tests |
| `npm run build` | PASS — Vite 8.3.8, 2,103 modules |
| `npm run test:e2e` | **NOT AVAILABLE** — npm reports missing script |
| `git diff --check` | PASS — no whitespace errors; Git emitted only LF→CRLF advisory warnings |

### Browser QA

- Research UI axe 4.12.1 at desktop 1280×900: 0 violations, 0 incomplete checks; `innerWidth`, document and body widths were all 1280.
- Research UI axe 4.12.1 at mobile 320×780: 0 violations, 0 incomplete checks; `innerWidth`, document and body widths were all 320.
- Browser runtime errors: none. The isolated browser session was closed and no process remained on port 5173.
- Reload persistence: after a browser reload, the game date remained 1995-01-02, balance remained $88,000, and out-of-order research remained active at 1/20 days with $12,000 invested/paid (`aria-valuenow=1`, `aria-valuemax=20`).

## Acceptance criteria

| Criterion | Result |
| --- | --- |
| Unavailable technologies cannot be researched. | PASS — availability checks, disabled UI actions and command-level rejection are tested. |
| Completed research unlocks only defined items. | PASS — effects come only from the catalog unlock IDs and are covered by tests. |
| Progress and costs persist. | PASS — application/repository tests and browser reload verification cover both. |
| Dependency cycles are detected or prevented. | PASS — catalog cycle detection and a two-node cycle test. |

## Known issues and risks

- `npm run test:e2e` is **NOT AVAILABLE**; verification used unit/integration tests and browser smoke/accessibility checks instead.
- No Android device/emulator validation was performed.
- Research costs/durations are static initial balance values and need later balance playtesting. There is no cancellation or refund flow.
- CPU research gates cover the explicitly mapped architectural capabilities; other numeric CPU fields retain their existing design limits. Non-CPU unlocks are catalogued/persisted but their downstream systems belong to later stages.

## Incomplete requirements

- No mandatory Stage 4 acceptance criterion remains incomplete. End-to-end automation and native Android validation are unavailable/unperformed as noted above.

## Recommendation

Stop here and wait for separate authorization before Stage 05 (Economy & Market). Do not begin the next stage as part of this work.
