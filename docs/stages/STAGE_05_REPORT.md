# Stage 05 — Economy & Market Report

**Date:** 2026-11-13  
**Status:** COMPLETED

## Git state

- **Branch before/after:** `main`
- **HEAD before/after:** `86babf69357486cf8b77c2d9d0fe13019917d368` (unchanged)
- Stage 3, Stage 4 and Stage 5 work remains uncommitted and unpushed. No commit or push was performed.

## Initial repository audit

- The repository contained the Stage 1 company/dashboard/settings foundation, Stage 2 CPU Designer, Stage 3 benchmark work and Stage 4 research, with save schema v3. Stage 3 and Stage 4 changes were already uncommitted and were preserved.
- There was no finance ledger, manufacturing cost model, product release/production flow, market demand model, competitor simulation or Market/Finance UI. `advanceGameDay` advanced research and the date only. The CPU `unitCostUsd` field was an explicit design input, not a calculated manufacturing cost.
- The initial test baseline was 15 test files / 56 tests. Available scripts were `dev`, `build`, `preview`, `typecheck`, `lint` and `test`; `test:e2e` was not defined.
- `AGENTS.md`, `docs/UI_UX_SPECIFICATION.md`, the stage brief, GDD, architecture, balance, save-system and roadmap documents were read before implementation.

## Completed work

- Added a typed finance domain and engine with one balance-mutation path. Transactions are dated, categorized, signed, retained in a bounded ledger, aggregated into daily records and lifetime totals, and validated on load. Cash cannot go negative.
- Added payroll, overhead, marketing, loan interest, profit tax, loan proceeds/repayment and emergency financing. Loans are capped at $1,000,000 with a 12% annual rate; emergency financing uses 18%. Daily profit tax is 18% of positive operating profit.
- Added a manufacturing-cost model driven by process node, die area, wafer cost, gross dies per wafer, die yield, packaging, testing and logistics. The existing target unit cost remains a design input and does not replace the calculated production cost.
- Added deterministic market performance normalization from the existing CPU benchmark model, suggested pricing and gross margin.
- Added six market segments with demand growth, reference price/performance, price and performance elasticities, and ISA preference. Demand allocation considers price, specifications, company reputation, marketing, product age/ramp, availability (inventory), segment and competitor appeal.
- Added product release, launch fee, production orders, lead-time delivery, inventory, sales, revenue, market share and daily market history. Sales are capped by available inventory; unmet demand is attributed to competitors.
- Added six competitors with observable strategies and bounded deterministic actions (price cuts/increases, performance refreshes and marketing campaigns), action history and next-action dates. Reputation changes with sales and stockouts.
- Integrated the fixed daily pipeline: research progress → due production delivery → competitor actions → market sales/share → finance settlement → reputation → date advancement.
- Advanced save schema to v4. Schema v1–v3 saves migrate without losing company, date, settings, CPU projects or research. Finance and market state are initialized at the saved game date; no historical transactions or sales are fabricated.
- Added atomic application commands for release, price update, production ordering, discontinuation, marketing budget, loans and repayment. Research spending now also appears in the finance ledger.
- Added Market and Finance screens with tabs, release form, live cost/performance/pricing estimates, product management, production orders, segment/competitor/history views, finance KPIs, a real SVG 14-day revenue/expense chart, loan and marketing controls, and transaction history. All displayed values come from game state.
- Expanded the dashboard from four to eight metrics (daily revenue, daily profit, market share, daily units sold added) and replaced the empty activity card with recent observable competitor actions.
- Added RU/EN localization, the Market navigation destination and six-item mobile navigation, responsive/dark-theme styling and accessible tab/status/form semantics.
- Added finance, manufacturing, market engine, schema-migration, repository, application and UI tests. Added `docs/ECONOMY_MARKET.md`; updated the architecture, balance and save-system documentation and the stage brief.

## Files added or updated for Stage 5

- **Added:** `docs/ECONOMY_MARKET.md`, `docs/stages/STAGE_05_REPORT.md`, `src/features/market/MarketPage.tsx`, `src/features/market/MarketPage.test.tsx`, `src/game/models/date.ts`, `src/game/models/finance.ts`, `src/game/models/finance.test.ts`, `src/game/models/market.ts`, `src/game/formulas/market.ts`, `src/game/formulas/market.test.ts`, `src/game/engine/finance.ts`, `src/game/engine/finance.test.ts`, `src/game/engine/market.ts`, `src/game/engine/market.test.ts`.
- **Updated:** `docs/ARCHITECTURE.md`, `docs/GAME_BALANCE.md`, `docs/SAVE_SYSTEM.md`, `docs/stages/STAGE_05.md`, `src/app/App.tsx`, `src/app/App.test.tsx`, `src/app/AppShell.tsx`, `src/app/navigation.ts`, `src/features/dashboard/DashboardPage.tsx`, `src/game/application/game-application.ts`, `src/game/application/game-application.test.ts`, `src/game/engine/time.ts`, `src/game/engine/time.test.ts`, `src/game/models/game-state.ts`, `src/game/models/game-state.test.ts`, `src/localization/formatters.ts`, `src/localization/messages.ts`, `src/storage/repositories/BrowserGameStateRepository.test.ts`, `src/styles.css`.
- No dependencies were added. Pre-existing uncommitted Stage 3/4 work was preserved.

## Architecture decisions

- **Single financial mutation path.** `postFinanceTransaction` validates the signed amount, updates the balance and ledger together, and rejects overdrafts. The application commits validated state only after the complete domain operation succeeds.
- **Calculated manufacturing cost.** Manufacturing cost is derived from physical design/process inputs; the CPU target unit cost remains a planning input. This avoids treating a design target as an actual supplier cost.
- **Deterministic simulation.** Demand, competitor actions and production use deterministic rules with no hidden random numbers, so results are reproducible and testable. Bounds keep every appeal factor finite and prevent runaway values.
- **Inventory-limited sales.** Demand is allocated across player products and competitors, then capped by on-hand inventory. Stockouts create a reputation penalty instead of backorders.
- **Bounded history.** Transaction, daily-record, order, action and market-summary histories have explicit caps so saves do not grow without limit.
- **Safe schema migration.** v4 initializes empty finance/market state at the saved date; it does not invent past sales, expenses or competitor movements.
- **Finance as a Market tab.** The mobile bottom navigation stays at six destinations. Finance has its own `ScreenId`, heading and tab but does not add a seventh bottom-navigation item.
- **No formula logic in React.** UI pricing previews call the same domain formula functions used by the engine and never contain duplicate economic formulas.

## Verification

| Command/check | Result |
| --- | --- |
| `npm run test` | PASS — 20 files, 84 tests, Vitest 5.1.0 |
| `npm run typecheck` | PASS — app and node configs |
| `npm run lint` | PASS — ESLint, `--max-warnings 0` |
| `npm run build` | PASS — Vite 8.3.8, 2,110 modules; CSS 61.30 kB (gzip 10.92), JS 426.35 kB (gzip 122.62) |
| `npm run test:e2e` | **NOT AVAILABLE** — no such script in `package.json` |
| `git diff --check` | PASS — no whitespace errors; Git emitted only LF→CRLF advisory warnings |

### Browser QA

- Desktop 1000×700: dashboard rendered all eight metrics and six navigation destinations; Market rendered its tabs, empty states, six segment cards and six competitor cards; Finance rendered five KPIs, empty chart/record states, loan and marketing forms, and the empty transaction list.
- No console errors and no horizontal overflow were observed on the dashboard, Market or Finance screens.
- The isolated browser session and dev server were closed after the checks.
- Screenshot capture was unavailable because the desktop browser window was not visible. No mobile-viewport run and no automated axe audit were performed for Stage 5.

## Acceptance criteria

| Criterion | Result |
| --- | --- |
| Financial operations are consistent and tested. | PASS — signed ledger, daily totals, loan, interest, tax, emergency funding and overdraft rejection are covered by finance model/engine tests and recomputed during save validation. |
| Production and sales affect company finances and market state. | PASS — launch fees and production orders charge cash immediately; deliveries create inventory; sales add revenue, reduce inventory, update product totals, daily records and market history; engine and application tests cover the flow. |
| Demand considers price, specifications, availability and competition. | PASS — appeal includes bounded price, performance, reputation, marketing, ISA, launch-ramp and freshness factors; sales are inventory-capped and share is computed against competitor appeal and total segment demand. |
| Competitor actions follow observable strategies. | PASS — six catalogued competitors act on fixed intervals using bounded, deterministic strategies; each action is dated, typed and displayed with its magnitude. |

## Known issues and risks

- Initial economic values (segment demand, costs, taxes, loan rates and competitor appeal) are first-pass balance values and require playtesting. Daily fixed costs continue even when the company has no products.
- Emergency financing is automatic when fixed costs cannot be paid and is more expensive than a planned loan. There is no bankruptcy, game-over or restructuring flow yet.
- Marketing is a daily global budget with a simple bounded effect; there are no campaigns, durations or per-segment allocation.
- The competitor catalog and product lines are static; competitors do not enter/exit segments, launch new products or respond to the player dynamically.
- Sales are daily and anonymous. There are no contracts, channel inventory, returns, regional markets or enterprise deal cycles.
- Manufacturing models node, die area, yield and packaging but does not separately model chiplet partitioning, wafer contracts, capacity limits or factory ownership.
- Demand/price elasticities and reference values have not been calibrated against long-run simulations. Runaway profit is bounded by appeal caps, inventory, taxes and costs but still needs a long-horizon balance pass.
- Save histories are capped (120 transactions, 365 daily finance records, 180 market summaries, 40 production orders, 60 competitor actions). Older records are intentionally trimmed.
- `test:e2e` is unavailable, mobile viewport/browser QA was not performed, no automated accessibility audit was run, and no Android device/emulator validation was performed.
- Stage 3–5 work remains uncommitted; a checkpoint commit should be made before large cross-stage changes.

## Incomplete requirements

- No mandatory Stage 5 acceptance criterion is incomplete.
- End-to-end automation, automated accessibility auditing and native Android validation are unavailable/unperformed as noted above.

## Recommendation

Stage 05 is complete. Stop here pending review and a checkpoint commit of the Stage 3–5 work. The next roadmap stage is Stage 06 (GPU & Components), but it should begin only after separate authorization. No commit or push was performed.
