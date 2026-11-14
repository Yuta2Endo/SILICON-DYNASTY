# Improvement Stage 04 Report — Company Legacy and Doctrine

## Stage

**Stage:** 4 — «Всё имеет значение» / Company legacy and doctrine  
**Date:** 2026-11-14  
**Status:** COMPLETED  
**Branch:** `main`  
**HEAD before:** `b69d71d` (Stage 3 checkpoint)  
**HEAD after:** `b69d71d` (Stage 4 implementation uncommitted)

## Objective

Give long-term company progress visible strategic meaning:

- reputation tiers that improve commercial outcomes;
- a permanent doctrine with real trade-offs across departments;
- a derived legacy score that reflects the whole campaign;
- a Company-screen presentation with a deliberate, irreversible choice.

## Initial state

- 85 test files / 384 tests, 15 Playwright E2E tests, save schema 15.
- Company page contained only profile, balance/reputation/team metrics and renaming.
- Reputation affected demand and contract availability but had no tier progression.
- No permanent strategic identity or legacy summary.

## Completed work

### Domain and application

- Added `src/game/models/legacy.ts`:
  - four doctrine IDs and exact multipliers;
  - neutral doctrine defaults;
  - reputation tiers with contract revenue multipliers;
  - bounded 0–1000 legacy score formula;
  - strict/optional legacy parser and `InvalidLegacyDataError`.
- Added `src/game/formulas/legacy.ts` to derive the score from projects, releases,
  deployments, research, contracts, products and market share.
- Added `src/game/engine/legacy.ts` with `chooseCompanyDoctrine`; a doctrine can
  be selected only once and unknown IDs are rejected.
- Added application command `chooseDoctrine`.

### Doctrine effects in existing systems

- CPU and component production orders use the doctrine manufacturing multiplier.
- Commercial offer generation multiplies revenue by doctrine and reputation-tier
  multipliers.
- OEM and commercial acceptance reputation gains use the doctrine reputation
  multiplier.
- CPU product appeal in market simulation and demand estimates uses the doctrine
  appeal multiplier.
- Positive daily market reputation gain is scaled; stockout penalties are not.

### Company UI

- New «Наследие компании» section with:
  - legacy score `/1000` and reputation tier;
  - progress to the next tier, or max-tier state;
  - current contract multiplier;
  - four doctrine cards with exact trade-offs;
  - permanent-choice confirmation sheet;
  - active doctrine and locked state after selection.
- RU/EN localization and responsive CSS.
- E2E test covers choosing Innovator, confirming, active state and 390 px overflow.

### Persistence and docs

- Schema 16 adds `legacy.doctrine`; v1–v15 saves migrate with `null`; schema 17+
  is rejected.
- Added `docs/LEGACY.md`.
- Updated SAVE_SYSTEM, ARCHITECTURE, GAME_BALANCE, UI_UX_SPECIFICATION,
  QA_STRATEGY and README.
- Added `docs/stages/IMPROVEMENT_STAGE_04_REPORT.md`.

## Architecture decisions

- Doctrine is the only persisted legacy field; score, tier and progress remain
  derived from existing state.
- Effects are applied inside existing engines instead of creating a parallel
  economy or market.
- The choice is permanent and confirmed through the existing bottom sheet.
- Reputation-tier contract multipliers are combined multiplicatively with the
  doctrine commercial multiplier.

## Verification

- `npm run test`: **PASS — 89 files / 396 tests**, Vitest 5.1.0, 23.72 s.
- `npm run typecheck`: **PASS** both configurations.
- `npm run lint`: **PASS** with `--max-warnings 0`.
- `npm run build`: **PASS** — Vite 8.3.8, 2,195 modules, 902 ms; CSS 169.74 kB
  (gzip 31.08); main 412.98 kB (gzip 113.53); CompanyPage 8.31 kB; no chunk
  warning.
- `npm run test:e2e`: **PASS — 16 Chromium tests**, 20.7 s, including the
  permanent doctrine flow and 390 px overflow check.
- Android: `npx cap sync android` PASS (5 plugins); `gradlew assembleDebug
  --no-daemon` **BUILD SUCCESSFUL in 49 s**, 244 tasks.
- `adb devices -l`: empty. No physical-device QA.
- `git diff --check`: PASS, only LF→CRLF advisory warnings.

## Acceptance

| Criterion | Result |
| --- | --- |
| Reputation tiers affect commercial outcomes | **PASS** — five tiers, contract multipliers ×1.00–×1.12. |
| Permanent doctrine with trade-offs | **PASS** — four doctrines, choose-once engine guard, confirmation UI. |
| Legacy score reflects campaign progress | **PASS** — derived formula across products, releases, research, contracts and share. |
| Company UI presents tier, score and doctrine | **PASS** — score, progress, multiplier, cards and locked state. |
| Persistence and migration | **PASS** — schema 16, v15 migration, schema 17 rejection. |
| RU/EN parity | **PASS** — both dictionaries compile with identical shapes. |
| No new dependencies | **PASS** — no package changes. |

## Known issues and limitations

- Doctrine cannot be reset or changed within a campaign by design; there is no
  “new game plus” or respec option.
- Legacy score is a single aggregate; it does not yet show a per-category
  breakdown or historical graph.
- Tier progress is derived from reputation only; it does not add separate tier
  perks beyond the contract multiplier.
- No physical Android device was attached for on-device QA.
- Stage 4 changes are uncommitted.

## Incomplete requirements

None of the Stage 4 acceptance criteria are incomplete.

## Recommendation

Commit/push Stage 4 after review. Then proceed to Stage 5 «Всё ощущается»:
polish, visual feedback, mobile/Android QA, accessibility and final regression.
