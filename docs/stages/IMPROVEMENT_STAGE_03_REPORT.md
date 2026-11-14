# Improvement Stage 03 Report — Competitors

## Stage

**Stage:** 3 — «Все конкурируют» / Competitor pressure  
**Date:** 2026-11-14  
**Status:** COMPLETED WITH KNOWN ISSUES  
**Branch:** `main`  
**HEAD before:** `569f640` (Stage 2 checkpoint)  
**HEAD after:** `569f640` (implementation uncommitted)

## Objective

Make the six CPU-market rivals behave like persistent companies rather than
fixed appeal multipliers:

- persistent rival finances and reputation;
- weaker rivals acting less aggressively;
- visible revenue, cost and net result;
- market exit when a rival runs out of money;
- retired rivals excluded from demand and actions;
- all state persisted and migrated safely.

## Initial state

- Stage 1 commercial channels and Stage 2 component manufacturing were committed
  and pushed.
- 85 test files / 380 tests, 14 Playwright E2E tests, save schema 14.
- Competitors had strategy multipliers, next-action dates and action history, but
  no balance, costs, reputation or exit state.

## Completed work

### Domain and engine

- Added competitor finance profiles and fields:
  - initial balance, daily operating cost and reputation;
  - `balanceUsd`, `reputation`, `status`, `lastRevenueUsd`, `lastCostUsd`.
- Competitor aggression now scales with financial health:
  `cycleAggression × (0.7 + 0.3 × clamp(balance / initialBalance, 0.4, 1.2))`.
- Leftover segment demand is allocated to active rivals by appeal.
- Rival revenue uses a 12% proxy of segment reference price; operating cost is
  charged daily.
- Rival reputation moves toward market share relative to 1/6.
- A rival at or below zero balance is marked `retired`, stops acting and records
  a `market-exit` action.
- Retired rivals are excluded from competitor appeal and demand allocation.

### Persistence

- Save schema 15 adds competitor finance fields inside `market.competitors`.
- Version 1–14 saves migrate with profile defaults, active status and zero last
  results.
- Strict v15 parsing validates money, reputation, status and market-exit action
  percentages. Schema 16+ is rejected.

### UI and documentation

- Competitor cards show status, balance, reputation, last revenue/cost and net
  result; withdrawn rivals are muted.
- `market-exit` events render without a percentage in the Market history and
  dashboard activity.
- New `docs/COMPETITORS.md`; updated SAVE_SYSTEM, ARCHITECTURE, GAME_BALANCE,
  UI_UX_SPECIFICATION, QA_STRATEGY and README.

## Decisions

- Competitor finance is stored inside the existing market competitor state; no
  second simulation engine or parallel competitor collection.
- Revenue is a bounded proxy, not posted to the player's finance ledger.
- Exit is permanent for the save; no re-entry or acquisition in this slice.
- Existing deterministic strategies and economic-cycle aggression remain the
  action source.

## Verification

- `npm run test`: **PASS — 85 files / 384 tests**, Vitest 5.1.0, 22.92 s.
- `npm run typecheck`: **PASS** both configurations.
- `npm run lint`: **PASS** with `--max-warnings 0`.
- `npm run build`: **PASS** — Vite 8.3.8, 2,192 modules, 935 ms; CSS 166.84 kB
  (gzip 30.70); main 406.31 kB (gzip 111.52); MarketPage 71.16 kB; no chunk-size
  warning.
- `npm run test:e2e`: **PASS — 15 Chromium tests**, 18.8 s, including competitor
  finances/status and mobile overflow.
- Android: `npx cap sync android` PASS (5 plugins); `gradlew assembleDebug
  --no-daemon` **BUILD SUCCESSFUL in 21 s**, 244 up-to-date tasks.
- `adb devices -l`: empty. No physical-device QA.
- `git diff --check`: **PASS** — exit 0, only LF→CRLF advisories.

## Acceptance

| Criterion | Result |
| --- | --- |
| Deeper competitor behavior | **PASS** — financial health scales all strategy actions; retired rivals stop acting. |
| Rival financial pressure | **PASS** — daily revenue/cost, balance and reputation; low balance reduces aggression. |
| Market exit | **PASS** — balance <= 0 retires the rival and records a market-exit action. |
| Persistence/migration | **PASS** — schema 15, v14 migration fills profile defaults, strict parser. |
| UI visibility | **PASS** — balance, reputation, status, last result and net result on competitor cards. |
| RU/EN parity | **PASS** — both dictionaries updated and type-checked. |
| No new dependencies | **PASS** — no package changes. |

## Known issues and limitations

- No competitor re-entry, bailout, acquisition or mid-game new entrant.
- No new product-refresh cadence beyond the existing `performance-refresh`
  strategy action.
- Rival revenue is a 12% reference-price proxy, not full product economics.
- Retired rivals remain in the save and UI; they are skipped, not deleted.
- No competitor-vs-competitor campaign interaction beyond shared demand.
- No physical Android device was attached.
- Implementation is uncommitted.

## Incomplete requirements

No mandatory Stage 3 criterion is incomplete. Product-refresh cadence and
re-entry are explicitly deferred.

## Recommendation

Commit/push Stage 3 after review. Then proceed to Stage 4 «Всё имеет значение»:
connect products, press, contracts and rival pressure into deeper reputation,
legacy and strategic consequences.
