# Competitors, Financial Pressure and Market Exit

## Scope

Stage 3 «Все конкурируют» deepens the six CPU-market competitors. Each rival now
has a persistent balance, reputation, daily operating cost, observable last
result and an active/retired status. Weak rivals become less aggressive; a rival
whose balance reaches zero exits the market and stops competing.

All numbers are deterministic game simulation values, not real financial data.
No schema field was added; competitor finance lives inside the existing
`market.competitors` array.

## Profiles

| Competitor | Strategy | Initial balance | Operating cost/day | Reputation |
| --- | --- | ---: | ---: | ---: |
| Apex Microsystems | premium | $6,000,000 | $45,000 | 68 |
| Nova Semiconductors | volume | $4,000,000 | $35,000 | 52 |
| Vector Logic | aggressive | $3,500,000 | $30,000 | 48 |
| Northbridge | balanced | $5,500,000 | $38,000 | 58 |
| Titan Works | performance | $5,000,000 | $42,000 | 62 |
| Meridian Systems | enterprise | $7,000,000 | $50,000 | 72 |

Profiles are keyed by strategy in `COMPETITOR_FINANCE_PROFILES` and exported by
`getCompetitorFinanceProfile`.

## Daily behavior

1. Active competitors apply their normal strategy action on their interval.
2. Financial health is
   `clamp(balance / initialBalance, 0.4, 1.2)`.
3. Action aggression is
   `economicCycle.competitorAggression × (0.7 + 0.3 × health)`.
   Price cuts, price increases, performance refreshes and campaigns scale by
   this value.
4. Retired competitors are skipped for actions and excluded from competitor
   appeal/demand allocation.
5. After player and competitor sales, each active competitor gets:
   - revenue = its allocated units × segment reference price × 0.12;
   - cost = its daily operating cost;
   - balance += revenue − cost.
6. Competitor reputation moves by
   `(marketShare − 1/6) × 0.35`, clamped to 0–100 and rounded to two decimals.
7. If balance reaches 0 or below, the rival becomes `retired`, records a
   `market-exit` action with `valuePercent = 0`, and stops acting on later days.

Competitor revenue is an estimate of wholesale market value at a 12% margin
proxy; it is not posted to the player's ledger.

## Persistence

Save schema 15 adds the following fields to each saved competitor:

```ts
{
  balanceUsd: number;
  reputation: number;
  status: "active" | "retired";
  lastRevenueUsd: number;
  lastCostUsd: number;
}
```

Schema 14 and older saves migrate by filling the profile defaults, `active`
status, and zero last-result values. Schema 15+ parsing is strict for these
fields. Schema 16 is rejected.

## UI

Market competitor cards now show:

- active/withdrawn status;
- balance and reputation;
- last revenue and cost;
- net result;
- the existing strategy, indices, next action and latest action.

Withdrawn rivals are visually muted. A market-exit event appears in the market
action history and dashboard activity without a percentage.

## Tests

- `src/game/engine/market.test.ts`: price-cut aggression scales with health;
  a bankrupt rival retires and records `market-exit`.
- `src/features/market/MarketPage.test.tsx`: competitor finance labels and
  withdrawn status.
- `e2e/ui-regression.spec.ts`: competitor finance/status visible after a day.
- `src/game/models/game-state.test.ts`, repository and migration tests: schema
  15 expectations and schema-14 migration filling competitor finance.

## Limitations

- No competitor re-entry, bailouts, acquisitions or new rivals.
- Competitor revenue uses a fixed 12% price proxy rather than full product
  economics.
- No product refresh cadence beyond the existing strategy actions.
- Market exit is permanent for the current save.
