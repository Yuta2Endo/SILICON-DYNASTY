# Stage 07 — OS Architecture & Kernel Lab Report

**Date:** 2026-11-13
**Status:** COMPLETED

## Git state

- **Branch before/after:** `main`
- **HEAD before/after:** `554c3521f48ceb1b72101b523a1efb7719925461` (unchanged)
- Stage 07 work remains uncommitted. No commit or push was performed.

## Initial repository audit

- Stage 06 was completed, committed and pushed. The working tree was clean at the start of Stage 07; save schema was v5.
- The initial baseline was 24 test files / 108 tests. Available scripts were `dev`, `build`, `preview`, `typecheck`, `lint` and `test`; `test:e2e` was not defined.
- The repository already contained CPU and component designers, research, the finance ledger, CPU/component markets and product-workspace tabs.
- There was no OS project domain, kernel-architecture formula model, OS requirement validation, OS persistence or OS designer UI.
- The stage brief, GDD, architecture, balance, save-system, UI specification and roadmap were reviewed before implementation.

## Completed work

- Added a strictly validated OS domain covering target platform, kernel type, bootloader, scheduler, memory manager, virtual memory, IPC model, syscall count, module support, driver model, address width, process limit and supported architectures.
- Added cross-field and era constraints: 64-bit requires 2003, UEFI requires 2005, coreboot requires 1999; microkernels cannot use pipe/shared-memory IPC or in-kernel drivers; monolithic kernels cannot use user-space drivers; user-space modules require a microkernel; modular kernels require modules; virtual memory requires paging; process limits depend on address width.
- Added deterministic kernel metrics: boot time, memory footprint, performance, stability, security, compatibility, energy efficiency, maintainability, IPC latency, syscall overhead, process capacity and weighted overall score.
- Added platform requirement checklists for desktop, mobile, server, gaming and universal targets, with live pass/fail evaluation in the designer.
- Added OS projects with named versions and atomic application commands for creating a project and saving a new version. Project IDs use `os-1`, `os-2`, and versions begin at 1.
- Added save schema v6 with `osProjects`. Saves from v1–v5 migrate without losing company, CPU, component, research, finance or market data; older saves initialize an empty OS project list.
- Added the OS Lab as a third tab in the existing CPU/Components product workspace. The bottom navigation remains six destinations and mobile targets stay at least 44×44 px.
- Added the OS designer with create panel, project picker, all 13 configuration fields, field and cross-constraint errors, metric cards, compact metric list, platform requirements, version history, unsaved-draft confirmation and `beforeunload` protection.
- Added an explicit simulation banner: the UI states that this is a game simulation, not a real operating system.
- Added complete RU/EN localization and responsive/dark-theme styling using existing design tokens.
- Added model, formula, schema-migration, application and UI tests. Added `docs/OS_LAB.md`; updated architecture, balance, save-system and stage documentation.

## Files added or updated for Stage 7

- **Added:** `docs/OS_LAB.md`, `docs/stages/STAGE_07_REPORT.md`, `src/features/os/OsDesignerPage.tsx`, `src/features/os/OsDesignerPage.test.tsx`, `src/game/models/os.ts`, `src/game/models/os.test.ts`, `src/game/formulas/os.ts`, `src/game/formulas/os.test.ts`.
- **Updated:** `docs/ARCHITECTURE.md`, `docs/GAME_BALANCE.md`, `docs/SAVE_SYSTEM.md`, `docs/stages/STAGE_07.md`, `src/app/App.tsx`, `src/app/App.test.tsx`, `src/app/AppShell.tsx`, `src/app/navigation.ts`, `src/components/ProductWorkspaceTabs.tsx`, `src/features/components/ComponentDesignerPage.tsx`, `src/features/cpu/CPUDesignerPage.tsx`, `src/game/application/game-application.ts`, `src/game/application/game-application.test.ts`, `src/game/models/game-state.ts`, `src/game/models/game-state.test.ts`, `src/localization/messages.ts`, `src/storage/repositories/BrowserGameStateRepository.test.ts`, `src/styles.css`.
- No dependencies were added.

## Architecture decisions

- **Pure OS domain and formulas.** `src/game/models/os.ts` owns configuration types, defaults, validation and strict persistence parsing; `src/game/formulas/os.ts` owns all metrics and requirement checks. Neither depends on React.
- **Deterministic trade-offs, not a real OS.** Profiles encode architecture trade-offs: monolithic kernels favor performance and footprint, while microkernels favor stability and security but cost IPC latency and boot time.
- **Explicit constraint layer.** Subsystem compatibility and era gates are validated in the domain, so the designer and save parser share one source of truth.
- **Third product-workspace tab.** OS Lab reuses the existing CPU/Components workspace pattern instead of adding a seventh crowded bottom-nav item.
- **Safe schema migration.** Schema v6 adds `osProjects` without inventing historical projects or changing economic data. Unknown newer schemas are rejected.
- **Simulation-only scope.** OS projects persist and calculate metrics but are not yet released as products or connected to the daily market/finance pipeline.

## Verification

| Command/check | Result |
| --- | --- |
| `npm run test` | PASS — 27 files, 131 tests, Vitest 5.1.0, 8.45 s |
| `npm run typecheck` | PASS — app and node configs |
| `npm run lint` | PASS — ESLint, `--max-warnings 0` |
| `npm run build` | PASS — Vite 8.3.8, 2,118 modules; CSS 71.33 kB (gzip 12.19), JS 542.27 kB (gzip 148.43), built in 558 ms |
| `npm run test:e2e` | **NOT AVAILABLE** — no such script in `package.json` |
| `git diff --check` | PASS — no whitespace errors; Git emitted only LF→CRLF advisory warnings |

The build reports the existing warning that the JavaScript chunk exceeds 500 kB; it is not a build failure.

### Browser QA

- Desktop 1000×700. No console errors and no horizontal overflow (`scrollWidth === innerWidth === 1000`) throughout.
- The CPU screen switched to the OS tab and showed «Лаборатория ОС» with the visible disclaimer «Это игровая симуляция, а не настоящая ОС».
- Created the project «Dynasty OS» with the default configuration. The project picker, editor, metrics, 5/5 desktop requirements and version 1 rendered correctly.
- Switched to microkernel, message-passing and user-space drivers. Metrics changed as expected and requirements fell to 4/5 because performance was 33. Saving created version 2 while keeping version 1 in history.
- The save button became disabled when there were no changes; the version-history date spacing was verified after fixing a missing separator.
- The dev server and browser tab were closed after QA.
- Mobile viewport testing, screenshot review and automated accessibility auditing were not performed.

## Acceptance criteria

| Criterion | Result |
| --- | --- |
| Create and version an OS project. | PASS — projects are created through the application command and UI, versions begin at 1, new versions increment, and schema-v6 persistence plus version history are covered by model, application, migration and UI tests. |
| Architecture choices affect calculated metrics. | PASS — kernel, bootloader, scheduler, memory, IPC, module, driver and address-width profiles change metrics deterministically; tests cover monolithic vs microkernel trade-offs and bootloader/address/architecture effects. |
| Requirements and constraints are validated. | PASS — field bounds, integer checks, duplicate/empty architecture selections, subsystem constraints, era gates and per-platform requirements are validated and surfaced as errors or checklist failures. |
| The UI clearly presents this as a game simulation, not a real OS. | PASS — the OS Lab displays a persistent simulation banner and status pill explaining that metrics and architecture choices are game mechanics, not a real operating system. |

## Known issues and risks

- OS projects are not yet released as products and do not participate in the daily market, finance or reputation pipeline.
- Formula baselines and platform requirement thresholds are first-pass balance values; long-horizon playtesting is required.
- The OS designer has no benchmark suite beyond the calculated kernel metrics and no OS-specific competitor simulation.
- Driver, filesystem, security, UI and ecosystem mechanics from later roadmap stages are out of scope.
- No end-to-end automation, mobile browser QA, automated accessibility audit or Android validation was performed. `test:e2e` is unavailable.
- Stage 07 work is uncommitted; a checkpoint commit should be made after review.

## Incomplete requirements

- No mandatory Stage 07 acceptance criterion is incomplete or unverified.
- Missing end-to-end, mobile, accessibility and native-device validation is noted above.

## Recommendation

Stage 07 is complete. Stop for review before starting Stage 08. If approved, make a checkpoint commit of the Stage 07 work, then continue with the next roadmap stage under separate authorization. No commit or push was performed.
