# Improvement Stage 02 Report — Component Manufacturing

## Stage

**Stage:** 2 — «Всё производится» / Component manufacturing  
**Date:** 2026-11-14  
**Status:** COMPLETED WITH KNOWN ISSUES  
**Branch:** `main`  
**HEAD before:** `3ede6278ed5ba0459e9215eef374e9ef78e5616e`  
**HEAD after:** `3ede6278ed5ba0459e9215eef374e9ef78e5616e` (implementation uncommitted)

## Objective

Replace component just-in-time sales with a real manufacturing loop:

- factory level and daily capacity;
- paid production batches with lead time;
- component inventory and stockouts;
- sales limited by stock;
- factory upgrade path;
- visible production queue and inventory in the Market UI.

## Completed work

### Domain and simulation

- Added `src/game/models/manufacturing.ts`:
  - factory levels 1–5 with 1,000 → 16,000 units/day capacity;
  - upgrade costs $150,000 × current level;
  - component production orders, ready-date calculation and strict parsing;
  - capacity/lead-time helpers.
- Added `src/game/engine/manufacturing.ts`:
  - batch ordering with immediate `manufacturing` charge;
  - delivery into component inventory and `unitsProduced`;
  - finance daily produced-units recording;
  - factory upgrades with level cap and funds check.
- Component products now store `inventoryUnits` and `unitsProduced`; the parser
  enforces `unitsProduced = unitsSold + inventoryUnits`.
- Component market sales now use `min(demand, inventory)` and no longer charge
  manufacturing cost on the sale day.
- Daily pipeline order is research → CPU delivery → component delivery → OEM →
  commercial → competitors → CPU market → component market → AI → finance →
  reputation → date.

### UI

- Market screen adds a «Производство» panel with level, capacity, queue size,
  next upgrade cost and active batches.
- Component product cards show stock, produced, sold, out-of-stock state, batch
  order form, batch cost and lead time.
- RU/EN copy and responsive CSS added.

### Persistence

- Save schema 14 adds `manufacturing: { factoryLevel, componentOrders }`.
- v1–v13 saves migrate with a level-1 factory and empty queue.
- v13 component products without stock migrate with `inventoryUnits = 0` and
  `unitsProduced = unitsSold`.
- Saves from schema 15 or newer are rejected.

## Files

Added:

- `src/game/models/manufacturing.ts`
- `src/game/models/manufacturing.test.ts`
- `src/game/engine/manufacturing.ts`
- `src/game/engine/manufacturing.test.ts`
- `docs/MANUFACTURING.md`
- `docs/stages/IMPROVEMENT_STAGE_02_REPORT.md`

Updated:

- `src/game/models/market.ts`
- `src/game/models/game-state.ts`
- `src/game/models/game-state.test.ts`
- `src/game/engine/component-market.ts`
- `src/game/engine/component-market.test.ts`
- `src/game/engine/time.ts`
- `src/game/engine/time.test.ts`
- `src/game/application/game-application.ts`
- `src/features/market/MarketPage.tsx`
- `src/features/market/MarketPage.test.tsx`
- `src/app/App.tsx`
- `src/localization/messages.ts`
- `src/styles.css`
- `src/storage/fixtures/legacy-saves.ts`
- `src/storage/save-migrations.test.ts`
- `src/storage/repositories/BrowserGameStateRepository.test.ts`
- `e2e/ui-regression.spec.ts`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/COMPONENTS.md`
- `docs/GAME_BALANCE.md`
- `docs/QA_STRATEGY.md`
- `docs/SAVE_SYSTEM.md`
- `docs/UI_UX_SPECIFICATION.md`

## Verification

- `npm run test`: **PASS — 85 files / 380 tests**, Vitest 5.1.0, 28.84 s.
- `npm run typecheck`: **PASS** both configurations.
- `npm run lint`: **PASS** with `--max-warnings 0`.
- `npm run build`: **PASS** — Vite 8.3.8, 2,192 modules, 1.08 s; CSS
  166.71 kB (gzip 30.68); main 403.32 kB (gzip 110.55); MarketPage 70.34 kB; no
  chunk-size warning.
- `npm run test:e2e`: **PASS — 14 Chromium tests**, 20.5 s, including the new
  component production queue flow and 390 px overflow check.
- Android: `npx cap sync android` PASS; `gradlew assembleDebug --no-daemon`
  **BUILD SUCCESSFUL in 42 s**, 244 tasks.
- `adb devices -l`: empty — no physical-device QA.
- `git diff --check`: **PASS** — exit 0; only LF→CRLF advisory warnings.

## Acceptance

| Criterion | Result |
| --- | --- |
| Production has capacity and lead time | **PASS** — factory levels and `4 + ceil(qty/capacity)` lead time. |
| Manufacturing costs are paid and reconciled | **PASS** — batch cost posts to `manufacturing`; produced units are recorded in finance. |
| Inventory and stockouts affect sales | **PASS** — sales capped by inventory; zero-stock products cannot sell. |
| Factory upgrades persist | **PASS** — schema 14 state, application command and parser. |
| Existing saves migrate | **PASS** — v13 migration fixture and schema tests. |
| RU/EN and mobile UI | **PASS** — both dictionaries, responsive card/panel, E2E mobile overflow check. |

## Known issues and limitations

- Batches arrive whole on the ready date; no daily partial delivery.
- Factory maintenance, energy and tooling costs are not modeled.
- Upgrade only improves lead time; order-slot count and quality are unchanged.
- CPU production still uses its older order model and does not consume factory
  capacity.
- Devices, cloud capacity and AI hardware are not yet manufactured through this
  queue.
- No physical Android device was attached for on-device QA.
- Implementation is uncommitted.

## Incomplete requirements

The core Stage 2 manufacturing loop is complete. Extending the same capacity model
to CPU/device/cloud production remains future work.

## Recommendation

Commit/push Stage 2 after review. Then proceed to Stage 3 «Все конкурируют»:
deeper competitor behavior, product refreshes, market entry/exit and rival
financial pressure.
