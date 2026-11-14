# Improvement Stage 01 Report — Commercial Channels

## Stage

**Stage:** 1 — «Всё продаётся» / Commercial channels  
**Date:** 2026-11-14  
**Status:** COMPLETED  
**Branch:** `main`  
**HEAD before:** `56d4b33cf70dd62b70b74bd5bd9db8c3fb5f7616`  
**HEAD after:** `56d4b33cf70dd62b70b74bd5bd9db8c3fb5f7616` (implementation uncommitted)

## Objective

Remove dead-end designers by connecting every major product family to a
commercial channel:

- OS licensing;
- AI API / inference access;
- device supply;
- cloud capacity;
- app-store distribution;
- dashboard revenue mix and offer signals.

All revenue and modeled operating costs must pass through the existing finance
ledger, be deterministic, persist in the save, and work on RU/EN and mobile.

## Initial state

- 81 test files / 362 tests, 12 Playwright E2E tests, schema 12.
- Existing OEM design-win contracts covered released CPUs only.
- OS, AI, device, cloud and app-store projects had no recurring commercial
  revenue path.
- No dashboard revenue-mix view.

## Completed work

### Domain and simulation

- Added `src/game/models/commercial.ts`:
  - five channels, ten deterministic partners and reputation gates;
  - offer generation with occupied-asset protection, limits and expiry;
  - signing bonus, daily revenue, `dailyCostUsd`, duration and totals;
  - strict persistence parser.
- Added `src/game/engine/commercial.ts`:
  - asset discovery from OS releases, app stores, AI deployments, devices and
    cloud projects;
  - daily expiry, recurring revenue, cloud operating cost and device supply
    cost posting, offer generation;
  - accept/decline commands with duplicate and availability guards.
- Integrated the commercial day into the fixed daily pipeline after OEM
  contracts and before market/finance settlement.
- Save schema 13 adds `commercialContracts`; v1–v12 saves migrate with an empty
  state.

### Application and UI

- Added `acceptCommercialOffer` / `declineCommercialOffer` commands.
- Market screen now has «Коммерческие контракты» with offers, active contracts,
  recurring revenue, signing bonus, daily cost, net per day, term and expiry.
- Dashboard adds:
  - a pending commercial-offer signal;
  - «Коммерческая выручка» revenue-mix panel by channel from active contracts.
- RU/EN localization and responsive CSS are complete.

### Tests and documentation

- Commercial model tests: deterministic offers, occupied assets, channel sums,
  expiry, parser round-trip and tamper rejection.
- Commercial engine tests: OS/app-store assets, daily revenue, cloud cost and
  finance reconciliation, accept/decline and error cases.
- Market UI test for offer rendering and acceptance.
- Application persistence and schema-13 migration/E2E coverage.
- New `e2e/commercial.spec.ts` covers a released OS → commercial offer → accepted
  contract → dashboard revenue mix, including 390 px overflow check.
- Documentation: `COMMERCIAL_CHANNELS.md`, `SAVE_SYSTEM`, `ARCHITECTURE`,
  `GAME_BALANCE`, `UI_UX_SPECIFICATION`, `QA_STRATEGY`, `README`.

## Architecture decisions

- One generic contract system instead of five separate engines.
- Assets are derived from existing project/release/deployment data; no copied
  product configuration in commercial contracts.
- Commercial revenue remains finance category `sales`; modeled daily costs use
  `overhead`. The finance ledger and analytics stay the single source of truth.
- Offers are deterministic for a given date/state/assets and expire on the daily
  tick. No real-time negotiation or random event dependency.
- Save schema advances to 13 because accepted offers and active contracts must
  persist.

## Verification

- `npm run test`: **PASS — 83 files / 372 tests** (Vitest 5.1.0, 14.72 s).
- `npm run typecheck`: **PASS** both configurations.
- `npm run lint`: **PASS** with `--max-warnings 0`.
- `npm run build`: **PASS** — Vite 8.3.8, 2,190 modules, 538 ms; CSS 165.31 kB
  (gzip 30.44); main 397.21 kB (gzip 109.13); MarketPage 67.00 kB; no chunk-size
  warning.
- `npm run test:e2e`: **PASS — 13 Chromium tests** (12.8 s), including the
  commercial contract flow at desktop and 390 px mobile width.
- Android: `npx cap sync android` PASS (5 plugins); `gradlew assembleDebug
  --no-daemon` **BUILD SUCCESSFUL in 19 s**, 244 tasks.
- `adb devices -l`: empty. No physical-device install/QA was performed.
- `git diff --check`: **PASS** — exit 0; only LF→CRLF advisory warnings.

## Acceptance

| Criterion | Result |
| --- | --- |
| Every product family has a commercial channel | **PASS** — OS, AI, device, cloud, app store via commercial contracts; CPU via OEM contracts. |
| Revenue and modeled operating costs reconcile in finance/analytics | **PASS** — daily revenue and cloud/device costs post through `postFinanceTransaction`; engine test checks daily revenue/overhead/balance. |
| Dashboard shows revenue mix and pending offers | **PASS** — channel mix panel and commercial-offer alert. |
| Offers/contracts persist and expire | **PASS** — schema 13, parser, daily expiry, migration tests. |
| RU/EN parity | **PASS** — both dictionaries updated and TypeScript shape-checked. |
| No new dependencies | **PASS** — no package changes. |

## Known issues and limitations

- OS, AI API and app-store contracts currently have no modeled daily operating
  cost; their costs are treated as absorbed by existing company overhead.
- Device supply charges the referenced device unit cost once per active contract
  day, not a full units-sold/BOM simulation.
- Dashboard revenue mix is gross recurring revenue; per-contract cards show
  daily cost and net.
- Offers are deterministic and generated weekly; there is no negotiation,
  competitor counter-offer or contract cancellation UI.
- Commercial contracts are not yet included in a dedicated analytics breakdown
  beyond finance categories `sales`/`overhead`.
- No physical Android device was attached for on-device QA.
- Implementation is uncommitted.

## Incomplete requirements

None of the Stage 1 acceptance criteria are incomplete.

## Recommendation

Commit/push Stage 1 after review. Then proceed to Stage 2 «Всё производится»:
inventory, factories/fabs, capacity, lead times and stockout consequences for
components, devices and cloud capacity.
