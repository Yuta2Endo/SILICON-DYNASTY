# Stage 02 Report — CPU Designer

**Date:** 2026-11-13  
**Status:** COMPLETED WITH KNOWN ISSUES

## Initial audit

- The Stage 1 React/TypeScript/Vite foundation, dashboard, company screen, settings screen, browser repository, and localization were present. No CPU domain model, CPU feature screen, or CPU project persistence existed.
- Project scripts: `dev`, `build`, `preview`, `typecheck`, `lint`, and `test`. `test:e2e` was not defined.
- Stage 2, GDD, TDD, architecture, game-balance, and UI/UX specifications were reviewed before changes.
- `git status`, `git branch`, and `git rev-parse HEAD` reported that this directory is not a Git repository. Branch and HEAD are unavailable before and after the stage.

## Completed work

- Added a React-independent CPU domain model for ISA, topology, microarchitecture, cores/threads, clock, IPC, cache, memory controller, SIMD, process, voltage, TDP, die area, and target unit cost.
- Added typed field validation with unit/range checks, a four-threads-per-core ceiling, and ISA/SIMD compatibility rules.
- Added CPU projects with ordered, immutable configuration snapshots. New projects start at version 1; saving edits appends a version; prior versions can be loaded into the editor as drafts.
- Added application commands to create CPU projects and save versions through the existing repository boundary.
- Added a localized responsive CPU Designer route with inline validation, derived cache/thread summaries, version history, project selection, and unsaved-change confirmation for navigation and project/version changes.
- Advanced the game-state schema from v1 to v2. Stage 1 saves retain company, date, and settings and receive an empty CPU project list. Repositories persist the migrated state without deleting the legacy localStorage copy.
- Documented CPU constraints and stage boundaries in `docs/CPU_DESIGN.md`, updated `docs/GAME_BALANCE.md` and `README.md`, and wrote this report.

## Changed files

- Domain and persistence: `src/game/models/cpu.ts`, `src/game/models/cpu.test.ts`, `src/game/models/game-state.ts`, `src/game/models/game-state.test.ts`, `src/game/application/game-application.ts`, `src/game/application/game-application.test.ts`, `src/storage/repositories/BrowserGameStateRepository.ts`, `src/storage/repositories/BrowserGameStateRepository.test.ts`.
- App and UI: `src/app/App.tsx`, `src/app/App.test.tsx`, `src/app/navigation.ts`, `src/features/cpu/CPUDesignerPage.tsx`, `src/components/ConfirmationBottomSheet.tsx`, `src/styles.css`.
- Localization: `src/localization/messages.ts`, `src/localization/formatters.ts`.
- Documentation: `README.md`, `docs/GAME_BALANCE.md`, `docs/CPU_DESIGN.md`, `docs/stages/STAGE_02_REPORT.md`.
- No dependency changes were needed.

## Architecture decisions

1. CPU models, validation, configuration parsing, and version snapshots live in `src/game/models/cpu.ts` and have no React dependency.
2. CPU configuration edits remain a UI draft until a typed application command saves a new version. The current project configuration must equal its latest saved snapshot.
3. Version dates use the current in-game date. Restoring an older version does not rewrite history; saving it creates a new version.
4. The target unit cost is an explicit USD input, not a claimed manufacturing-cost calculation. Benchmark formulas are deferred to Stage 3; research/era gates to Stage 4; manufacturing costs to Stage 5.
5. Save schema v2 migrates v1 state by preserving existing fields and adding `cpuProjects: []`. Invalid or unsupported saves are rejected rather than overwritten.
6. Numeric limits form a broad Stage 2 design envelope and are documented in `docs/CPU_DESIGN.md`; they are not yet tied to the research timeline.

## Verification

| Command / check | Result |
| --- | --- |
| `npm run typecheck` | PASS. |
| `npm run lint` | PASS; no warnings. |
| `npm test` | PASS; 8 test files, 28 tests. |
| `npm run build` | PASS; Vite 8.3.8 production build completed. |
| `npm audit` | PASS; 0 vulnerabilities. |
| `npm run test:e2e` | NOT AVAILABLE; confirmed the script is missing. |
| Development/production browser smoke checks | PASS: create project, edit clock, save a version, reload, and load an older version into the editor. Navigation while dirty shows a confirmation sheet. |
| Stage 1 IndexedDB migration smoke check | PASS in an isolated browser profile: a synthetic v1 save reloaded as schema v2 with company, game date, locale, and theme preserved; the stored record had `cpuProjects: []`. |
| Responsive/accessibility check | PASS at 320×780: document and content widths remained 320 px; axe reported 0 violations and 0 incomplete checks on the CPU screen in light and dark themes. |
| Browser errors | None reported during the smoke checks. |
| Git branch / HEAD before and after | NOT AVAILABLE; this directory is not a Git repository. No Git operations were performed. |

## Acceptance criteria

- Create, edit, save, and load a CPU project: **PASS**.
- Domain validation rejects invalid configurations: **PASS**.
- Invalid configurations show clear field-level reasons: **PASS**.
- CPU domain models do not depend on React: **PASS**.

## Known issues and uncompleted requirements

- There is no automated `test:e2e` script; CPU UI coverage is provided by React Testing Library plus manual browser smoke checks.
- The CPU range envelope is not research- or era-gated yet. CPU benchmarks and performance formulas remain in Stage 3.
- Target unit cost is entered by the player; yield and manufacturing cost calculations are deferred to Stage 5.
- No real-device Android build or test was part of Stage 2.
- Full save slots and general migration tooling remain in the later save-system stage.

## Recommendation

Stage 02 is complete with the limitations above. Stop here and wait for approval before beginning Stage 03 (Simulation & Benchmark Engine).
