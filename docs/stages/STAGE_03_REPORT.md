# Stage 03 Report — Simulation & Benchmark Engine

**Date:** 2026-11-13  
**Status:** COMPLETED WITH KNOWN ISSUES

## Git state and initial audit

- Branch before/after: `main`.
- HEAD before/after: `86babf69357486cf8b77c2d9d0fe13019917d368` (`Merge remote-tracking branch 'origin/main'`). No commit was created during this stage.
- Initial working tree was clean and tracked `origin/main`.
- The repository had the Stage 2 CPU Designer and CPU project persistence (save schema v2), but no benchmark formulas, benchmark UI, or GPU product model.
- Relevant Stage 3, UI/UX, GDD, TDD, architecture, and game-balance documents were reviewed before changes. Existing scripts: `dev`, `build`, `preview`, `typecheck`, `lint`, `test`; `test:e2e` is not defined.

## Completed work

- Added pure, deterministic CPU and GPU benchmark formulas in `src/game/formulas/benchmark.ts`. CPU profiles distinguish integer, floating-point, and memory workloads; GPU profiles distinguish gaming, rendering, compute, and AI.
- CPU calculations validate the existing CPU model, use Amdahl's law for multicore scaling, account for limited SMT contribution and supported SIMD width, cap throughput by memory bandwidth, and report whether the workload fits configured memory.
- GPU calculations accept a bounded explicit configuration, calculate compute- and memory-limited task rates, and report VRAM capacity support.
- Both paths return task throughput, memory bandwidth, power, temperature, effective clock, and thermal throttle state. Profile assumptions, units, bounds, formulas, and limitations are documented.
- Added an on-demand CPU benchmark panel to the CPU Designer. It runs against the current valid draft, clears stale results when that draft changes, and does not persist calculated output.
- Added CPU/GPU formula tests and CPU panel tests. Added `docs/BENCHMARK_ENGINE.md`, updated `docs/GAME_BALANCE.md`, and wrote this report.

## Changed files

- Added: `src/game/formulas/benchmark.ts`, `src/game/formulas/benchmark.test.ts`.
- Added: `src/features/benchmark/CPUBenchmarkPanel.tsx`, `src/features/benchmark/CPUBenchmarkPanel.test.tsx`.
- Modified: `src/features/cpu/CPUDesignerPage.tsx`, `src/localization/messages.ts`, `src/styles.css`, `docs/GAME_BALANCE.md`.
- Added: `docs/BENCHMARK_ENGINE.md`, `docs/stages/STAGE_03_REPORT.md`.
- No dependency, game-state schema, or persistence changes.

## Architecture decisions

1. Formulas and workload definitions live outside React; they use explicit configuration and fixed profiles with no time, random, DOM, or storage dependency.
2. CPU results are calculated only when requested and cleared when the edited configuration changes; they are not saved as if they were product data.
3. A persisted GPU project/configuration does not yet exist. GPU calculations therefore expose a validated input contract for the future GPU Designer; no placeholder GPU project or fabricated result UI was added.
4. GPU architecture-specific throughput is supplied as `operationsPerCyclePerUnit`; the engine does not apply a second architecture multiplier.
5. Power and temperature use a documented steady-state approximation and workload intensities. CPU voltage, process node, cache, topology, and microarchitecture are not independently multiplied into results; IPC/SIMD and TDP are explicit inputs.

## Verification

| Command / check | Result |
| --- | --- |
| `npm run typecheck` | PASS. |
| `npm run lint` | PASS; no warnings. |
| `npm test` | PASS; 10 test files, 39 tests. |
| `npm run build` | PASS; includes typecheck; Vite 8.3.8 transformed 2,100 modules. |
| `npm run test:e2e` | NOT AVAILABLE; npm reports `Missing script: "test:e2e"`. |
| `git diff --check` | PASS; no whitespace errors. Git emitted only LF-to-CRLF advisory warnings for modified text files. |
| Browser benchmark smoke test | PASS. Ran all CPU workloads with the default design, changed draft clock from 100 to 200 MHz, verified old results cleared and new throughput recomputed. The memory workload correctly reports unavailable when required 1.5 GB exceeds configured 1 GB. No page or console errors. |
| Responsive/accessibility check | PASS at desktop and 320×780. No horizontal overflow; axe reported 0 violations and 0 incomplete checks (39 desktop passes, 40 mobile passes). |
| Browser/dev server cleanup | PASS; browser session closed and no process remained on port 5173. |

## Acceptance criteria

- Same inputs produce the same CPU/GPU results: **PASS** (determinism tests).
- Formulas document their inputs, units, bounds, and assumptions: **PASS** (`docs/BENCHMARK_ENGINE.md`).
- Critical calculations have unit and boundary tests: **PASS** (10 files / 39 tests, including memory, SIMD, scaling, thermal, and GPU bounds).
- Benchmarks distinguish workload types: **PASS** (three CPU and four GPU profiles with distinct inputs/results).

## Known issues, risks, and uncompleted requirements

- Automated end-to-end testing is not configured: `test:e2e` is **NOT AVAILABLE**. Browser validation was manual.
- GPU formulas are ready for a future validated GPU configuration, but this repository does not yet have a persisted GPU product or GPU benchmark screen; no fabricated configuration was introduced in this stage.
- Workload profiles and static thermal estimates are transparent game approximations, not measurements or scores comparable to real hardware benchmarks.
- No Android device/native build validation was performed.
- No Stage 3 acceptance requirement remains uncompleted; GPU UI/persistence belongs with the later GPU product stage.

## Recommendation

Stage 03 is complete with the limitations above. Stop and wait for separate approval before beginning Stage 04 (research and technology progression).
