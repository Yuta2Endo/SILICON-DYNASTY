# Stage 06 — GPU & Components Report

**Date:** 2026-11-13
**Status:** COMPLETED

## Git state

- **Branch before/after:** `main`
- **HEAD before/after:** `039c2fb80ecd85c8fadbda1e6f4f985648d4356c` (unchanged)
- Stage 06 work remains uncommitted. No commit or push was performed.

## Initial repository audit

- Stage 05 was completed, committed and pushed. The working tree was clean at the start of Stage 06; save schema was v4.
- The initial baseline was 20 test files / 84 tests. Available scripts were `dev`, `build`, `preview`, `typecheck`, `lint` and `test`; `test:e2e` was not defined.
- The repository already contained the CPU designer, research, finance ledger, CPU market and a GPU benchmark engine with `gaming`, `rendering`, `compute` and `ai` workloads.
- There was no shared component domain, component project persistence, build-compatibility mechanism, component manufacturing/market model or component designer UI.
- The stage brief, GDD, architecture, balance, save-system, UI specification and roadmap were reviewed before implementation.

## Completed work

- Added a shared, strictly validated component domain for GPU, RAM, SSD, motherboard, AI accelerator and networking products. Each project supports named versions, type-matched configurations, defaults, bounds, step and option validation, equality checks and strict save parsing.
- Added schema v5 with `componentProjects`. Saves from v1–v4 migrate without losing existing company, CPU, research, finance or market data. Component projects and component-market fields are initialized empty for older saves.
- Added a consistent compatibility mechanism for ISA, memory standard/capacity/slots, motherboard presence, PCIe/bus generation, storage interface/form factor and networking. Issues have stable codes, severity, involved components and detail values.
- Reused the existing GPU benchmark engine for gaming, rendering, compute and AI workloads. Component performance is normalized against each type's default configuration; GPU market performance combines the four workloads.
- Added manufacturing-cost models for all six component types using die yield, wafer cost, memory, board, packaging, testing and logistics inputs. Added suggested pricing, gross margin and bounded demand/appeal formulas.
- Added component product release, launch fee, price updates, discontinuation and just-in-time daily sales. Manufacturing cost and sales revenue use the existing finance ledger; daily summaries include component demand, units, revenue and manufacturing cost.
- Extended the fixed daily pipeline to include component sales after CPU-market sales and before finance settlement. Reputation now considers CPU and component units.
- Added atomic application commands for creating/saving component projects and releasing, repricing and discontinuing component products.
- Added the Components designer with all six product types, schema-driven fields, project/version history, validation, cost/performance/suggested-price previews, build-compatibility panel and unsaved-draft protection.
- Added CPU/Components workspace tabs, component market release and product management on the Market screen, dashboard component-unit totals, RU/EN localization and responsive/dark-theme styling.
- Added model, formula, compatibility, market-engine, schema-migration, application and UI tests. Added `docs/COMPONENTS.md`; updated architecture, balance, save-system and stage documentation.

## Files added or updated for Stage 6

- **Added:** `docs/COMPONENTS.md`, `docs/stages/STAGE_06_REPORT.md`, `src/components/ProductWorkspaceTabs.tsx`, `src/features/components/ComponentDesignerPage.tsx`, `src/features/components/ComponentDesignerPage.test.tsx`, `src/game/models/components.ts`, `src/game/models/components.test.ts`, `src/game/formulas/components.ts`, `src/game/formulas/components.test.ts`, `src/game/engine/component-market.ts`, `src/game/engine/component-market.test.ts`.
- **Updated:** `docs/ARCHITECTURE.md`, `docs/GAME_BALANCE.md`, `docs/SAVE_SYSTEM.md`, `docs/stages/STAGE_06.md`, `src/app/App.tsx`, `src/app/AppShell.tsx`, `src/app/navigation.ts`, `src/features/cpu/CPUDesignerPage.tsx`, `src/features/dashboard/DashboardPage.tsx`, `src/features/market/MarketPage.tsx`, `src/features/market/MarketPage.test.tsx`, `src/game/application/game-application.ts`, `src/game/application/game-application.test.ts`, `src/game/engine/market.ts`, `src/game/engine/market.test.ts`, `src/game/engine/time.ts`, `src/game/engine/time.test.ts`, `src/game/formulas/market.ts`, `src/game/models/game-state.ts`, `src/game/models/game-state.test.ts`, `src/game/models/market.ts`, `src/localization/messages.ts`, `src/storage/repositories/BrowserGameStateRepository.test.ts`, `src/styles.css`.
- No dependencies were added.

## Architecture decisions

- **One component domain.** All six product types use a discriminated `ComponentConfiguration` union and shared project/version model, avoiding six unrelated implementations.
- **Schema-driven validation and UI.** `COMPONENT_FIELD_SCHEMAS` is the single source for bounds, options and rendering, so save parsing and the designer cannot drift apart.
- **Pure compatibility service.** `checkBuildCompatibility` returns stable issue objects and is independent of React and persistence.
- **Shared economic primitives.** CPU and component manufacturing reuse the same silicon-die estimate; component performance is normalized per product type and bounded demand factors prevent runaway values.
- **Single balance path.** Component launches, manufacturing and sales use `postFinanceTransaction`; no component-specific cash mutation exists.
- **Just-in-time component production.** Component sales are limited by daily demand and available cash rather than inventory. This is an explicit Stage 06 simplification.
- **Safe schema migration.** v5 adds component projects and market fields without inventing historical component sales or changing v4 economic data.
- **No economic formulas in React.** UI previews call domain formulas used by the simulation engine.

## Verification

| Command/check | Result |
| --- | --- |
| `npm run test` | PASS — 24 files, 108 tests, Vitest 5.1.0 |
| `npm run typecheck` | PASS — app and node configs |
| `npm run lint` | PASS — ESLint, `--max-warnings 0` |
| `npm run build` | PASS — Vite 8.3.8, 2,115 modules; CSS 66.61 kB (gzip 11.63), JS 495.28 kB (gzip 137.36), built in 719 ms |
| `npm run test:e2e` | **NOT AVAILABLE** — no such script in `package.json` |
| `git diff --check` | PASS — no whitespace errors; Git emitted only LF→CRLF advisory warnings |

### Browser QA

- Desktop 1000×700 dashboard rendered all eight metrics and six navigation destinations without console errors or horizontal overflow.
- The CPU workspace tabs switched to Components. A GPU project «Dynasty GPU» was created, persisted and displayed with version 1, calculated unit cost, performance score, suggested price and compatibility panel.
- A component product «Dynasty Graphics 100» was released at $270 and appeared in the component market with margin, demand forecast, market share and price/discontinue controls.
- Advancing to 1995-01-02 produced component sales: $270 revenue, one unit, finance rows for launch fee, manufacturing, sales and operating costs. Balance was $95,028 and the dashboard showed −$4,972 net profit, matching the simulated ledger.
- No console errors or horizontal overflow were observed. The dev server and browser tab were closed after QA.
- Mobile viewport testing, screenshot review and automated accessibility auditing were not performed.

## Acceptance criteria

| Criterion | Result |
| --- | --- |
| Create and persist each product type. | PASS — all six types create, validate, save versions and persist in game state; schema-v5 migration and component application commands are covered by model, application and UI tests. |
| Compatibility uses a consistent domain mechanism. | PASS — one `checkBuildCompatibility` service validates CPU, motherboard, RAM, GPU, AI accelerator, storage and networking combinations with stable issue codes and severity. |
| GPU workloads distinguish gaming, rendering, compute and AI. | PASS — all four workloads run through the existing GPU benchmark engine and produce distinct throughput results; the GPU market score combines them with workload weights. |
| Cost and specs influence market simulation. | PASS — component appeal and demand depend on manufacturing cost/price, normalized performance/specs, reputation, marketing, product age/ramp and competitor appeal; component sales post real manufacturing cost and revenue to finance. |

## Known issues and risks

- Components use just-in-time production: there is no component inventory, production order, lead time or stockout penalty. CPU products retain the full production workflow.
- AI accelerator NVLink is validated through the PCIe-generation path because the compatibility model does not yet represent dedicated NVLink slots.
- Compatibility covers major platform constraints but not physical dimensions, PSU capacity, cooling capacity or multi-GPU lane allocation.
- GPU workload differentiation is visible through performance scores and market outcomes, but there is no component benchmark panel showing all four workload results separately in the UI.
- Component markets are organized by component type, not by the same customer segments used for CPUs. There are no component-specific campaigns or segment preferences yet.
- Demand/cost baselines are first-pass balance values. Long-horizon profitability, competitor pressure and component mix require playtesting.
- No end-to-end automation, mobile browser QA, automated accessibility audit or Android validation was performed. `test:e2e` is unavailable.
- Stage 06 work is uncommitted; a checkpoint commit should be made after review.

## Incomplete requirements

- No mandatory Stage 06 acceptance criterion is incomplete or unverified.
- Missing end-to-end, mobile, accessibility and native-device validation is noted above.

## Recommendation

Stage 06 is complete. Stop for review before starting Stage 07. If approved, make a checkpoint commit of the Stage 06 work, then continue with the next roadmap stage under separate authorization. No commit or push was performed.
