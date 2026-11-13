# Simulation Depth: Economic Cycles and Product Lifecycle

**Scope:** Plugin Stage 04. This is a deterministic game simulation, not an economic forecast or a real product-aging model. No save-schema change and no new dependencies.

## Economic cycle

`src/game/formulas/economy.ts` derives a phase from the game year. The eight-year pattern starts in 1995 and repeats:

| Phase | Years in cycle | Demand | Costs | Competitor aggression |
| --- | --- | --- | --- | --- |
| Stable | 0–1 | ×1.00 | ×1.00 | ×1.00 |
| Expansion | 2–3 | ×1.06 | ×1.02 | ×1.05 |
| Peak | 4–5 | ×1.12 | ×1.05 | ×1.10 |
| Contraction | 6 | ×0.94 | ×0.98 | ×1.15 |
| Trough | 7 | ×0.88 | ×0.96 | ×1.20 |

The first cycle therefore covers 1995–2002. 1995 is neutral, preserving the existing 1995 balance and tests.

### Integration

- **Demand:** `getSegmentDailyDemand` multiplies the growth-adjusted segment demand by the cycle demand multiplier and rounds the result.
- **Operating costs:** daily payroll and overhead in `settleDailyFinance` are multiplied by the cost multiplier and rounded to cents. Marketing, loan interest, taxes and one-off project costs are unchanged.
- **Competitors:** `runCompetitorDay` passes the aggression multiplier into every competitor action. Both the reported percentage change and the actual price/performance/marketing multiplier are scaled, so aggressive phases produce larger moves without changing deterministic scheduling.

## Product lifecycle

`getProductLifecycle(releaseDate, date)` returns a stage, factor and days on market:

| Stage | Days on market | Appeal factor |
| --- | --- | --- |
| Launch | 0–29 | ×1.00 |
| Growth | 30–179 | ×1.05 |
| Mature | 180–729 | ×1.00 |
| Decline | 730–1,824 | ×0.90 |
| Legacy | 1,825+ | ×0.70 |

The lifecycle factor multiplies product appeal alongside price, performance, reputation, marketing, ISA, launch ramp and freshness. A product is automatically discontinued after `PRODUCT_LIFECYCLE_RETIRE_AFTER_DAYS = 3,650` days (ten years) if it has no open production order. Products with an in-production order remain active until the order is delivered.

## Market UI

The Market screen shows an «Экономический цикл» card with the current phase and the demand, cost and competitor-aggression multipliers. The card is informational only; all effects are already included in the calculated market and finance results.

## Explicit limitations

This stage deliberately does not implement the following Stage 04 audit items:

- Employee hiring, departments, specialists and management decisions. These require new persistent company state and a save-schema migration.
- Process-node research gating. The research catalog does not yet contain process-node technologies, and adding them would change CPU availability.
- Commercial sales for OS, AI, devices and cloud projects. Those products remain design/release systems without a daily revenue pipeline.

These remain candidates for later simulation stages. Cycle baselines and lifecycle thresholds are first-pass balance values and require long-session playtesting.

## Verification

- `npm run test`: PASS — 53 files / 274 tests.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS — 2,153 modules; no chunk-size warning.
- Android `cap sync` and debug build: PASS.
- Browser QA: Market cycle card renders at desktop width without console errors or horizontal overflow.
- `test:e2e`: NOT AVAILABLE.
