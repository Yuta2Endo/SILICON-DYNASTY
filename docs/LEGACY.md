# Company Legacy and Doctrine

## Scope

Stage 4 adds lasting strategic identity to the company:

- reputation tiers with commercial contract bonuses;
- a permanent company doctrine chosen once per campaign;
- a derived legacy score that summarizes long-term progress;
- Company-screen presentation of all three.

The system is deterministic, uses existing save and finance data, and does not
change the daily pipeline order. Legacy itself is derived; only the chosen
doctrine is persisted.

## Doctrine

A doctrine can be chosen once. After selection it is locked for the campaign.

| Doctrine | Manufacturing cost | Commercial revenue | Reputation gain | Market appeal |
| --- | ---: | ---: | ---: | ---: |
| Innovator | ×1.10 | ×1.00 | ×1.00 | ×1.12 |
| Cost leader | ×0.82 | ×1.00 | ×0.90 | ×0.94 |
| Ecosystem | ×1.05 | ×1.18 | ×1.05 | ×0.98 |
| Prestige | ×1.08 | ×1.08 | ×1.30 | ×1.03 |

Effects apply to:

- CPU production orders and component production orders — effective unit cost;
- commercial-contract offer revenue;
- positive reputation gains from OEM contracts, commercial contracts and daily
  market performance;
- CPU product appeal in market simulation and demand estimates.

Stockout reputation penalties are not reduced by a doctrine. No doctrine means
all multipliers are `1`.

## Reputation tiers

| Tier | Minimum reputation | Contract revenue multiplier |
| --- | ---: | ---: |
| Unknown | 0 | ×1.00 |
| Rising | 25 | ×1.02 |
| Respected | 50 | ×1.05 |
| Elite | 75 | ×1.08 |
| Legend | 90 | ×1.12 |

The commercial revenue multiplier used when generating offers is
`doctrine commercial multiplier × reputation contract multiplier`.

## Legacy score

The score is clamped to `0..1000` and derived from the current campaign:

```text
reputation × 2
+ min(180, lifetimeRevenueUsd / 1,000,000 × 18)
+ marketShare × 400
+ completedResearch × 4
+ activeOrHistoricalCpuProducts × 3
+ componentProducts × 2
+ OS releases × 8
+ AI deployments × 8
+ deviceProjects × 6
+ cloudProjects × 6
+ commercialContracts × 5
```

Market share is the latest daily market summary. The score is recalculated on
render and is not a second source of truth for company progress.

## Persistence

Save schema 16 adds:

```ts
interface LegacyState {
  doctrine: "innovator" | "cost-leader" | "ecosystem" | "prestige" | null;
}
```

Schema 1–15 saves migrate with `doctrine: null`. Schema 17 and newer are
rejected. The parser accepts only known doctrine IDs.

## UI

The Company screen includes «Наследие компании»:

- legacy score `/1000` and current reputation tier;
- progress to the next tier, or a max-tier state;
- current contract multiplier;
- four doctrine cards with their exact trade-offs;
- a permanent-choice confirmation sheet;
- active doctrine state and locked cards after selection.

All strings exist in RU and EN. The layout is responsive and uses the existing
design tokens and confirmation sheet.

## Tests

- `src/game/models/legacy.test.ts` — effects, tiers, score bounds and parser.
- `src/game/formulas/legacy.test.ts` — derived score from game state.
- `src/game/engine/legacy.test.ts` — doctrine choice, lock and invalid ID;
  commercial revenue, market appeal and manufacturing cost effects.
- `src/features/company/CompanyPage.test.tsx` — doctrine confirmation flow.
- `e2e/ui-regression.spec.ts` — permanent doctrine flow and mobile overflow.
- Schema migration tests cover v15 → v16 and reject schema 17.
