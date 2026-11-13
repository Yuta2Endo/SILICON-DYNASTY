# Economy & Market System

Stage 05 turns the company into an operating business. The system is deterministic: the same state and date always produce the same production, competitor, sales, finance and reputation results. All money is nominal USD before any future inflation system.

## Scope

Implemented:

- company cash ledger, daily payroll, overhead, marketing, loan interest and profit tax;
- manufacturing cost from CPU die area, process node, wafer cost, yield, packaging, test and logistics;
- product releases from saved CPU project versions;
- paid production orders with lead time and inventory;
- six market segments with price- and performance-sensitive demand;
- six competitors with observable, periodic strategies;
- daily sales, inventory depletion, market share and sales revenue;
- loans, repayment, emergency financing and finance history;
- Market and Finance screens plus dashboard indicators.

Not implemented in this stage: marketing campaigns beyond a daily budget, retail channels, regional markets, product age-based discontinuation, inflation, employee hiring, and contracts.

## Financial model

### Single balance rule

`company.balance` is the only spendable cash value. Every change goes through `postFinanceTransaction(state, category, amountUsd, note?)` in `src/game/engine/finance.ts`:

1. the amount is finite and rounded to cents;
2. the resulting balance must be non-negative;
3. the transaction and daily record are updated together with the balance.

Engine commands never change `company.balance` directly. `startResearch` also records its up-front cost in the ledger, so research is no longer a balance-only deduction.

### Transaction categories and signs

| Category | Sign | Meaning |
| --- | --- | --- |
| `sales` | positive | processor revenue |
| `manufacturing` | negative | production order cost |
| `payroll` | negative | salaries |
| `overhead` | negative | facilities and administration |
| `marketing` | negative | daily marketing budget |
| `research` | negative | up-front research cost |
| `release` | negative | product launch fee |
| `interest` | negative | loan interest |
| `tax` | negative | profit tax |
| `loan-proceeds` | positive | borrowed cash |
| `loan-repayment` | negative | principal repayment |

Income categories cannot be negative and expense categories cannot be positive. Invalid signs are rejected.

### Daily costs

Constants in `FINANCE_DAILY_RULES`:

| Rule | Value | Unit |
| --- | --- | --- |
| Salary | 120 | USD per employee per game day |
| Overhead | 80 | USD per game day |
| Profit tax | 18% | of positive daily taxable profit |
| Bank loan rate | 12% | annual, simple daily accrual |
| Emergency financing rate | 18% | annual for new emergency debt |
| Emergency increment | 1,000 | USD |

Daily tax base:

```text
expensesBeforeTax =
  manufacturing + payroll + overhead + marketing +
  research + release + interest

taxableProfit = revenue - expensesBeforeTax
tax = round2(max(0, taxableProfit) * 0.18)
```

Tax is charged after operating expenses and interest on the same simulation date. Loan proceeds and principal repayments are financing cash flows, not profit.

`advanceGameDay` does not advance the date until the whole economy step has completed. A command that would overdraw cash is rejected, except that fixed daily costs trigger emergency financing automatically.

### Loans

- Total principal is capped at USD 1,000,000.
- A normal loan uses the 12% annual rate. Interest per day is `principal * annualRate / 365`, rounded to cents.
- Repayment reduces principal and cannot exceed available cash. The loan is removed at zero.
- If cash cannot cover payroll, overhead, marketing, interest, or tax, emergency financing borrows in USD 1,000 increments at the emergency rate. An existing loan keeps its contracted rate.
- Emergency financing also fails if it would exceed the debt cap.

### Ledger and history

Each finance transaction records date, category, signed amount and optional note. Daily records aggregate:

`revenue`, `manufacturing`, `payroll`, `overhead`, `marketing`, `research`, `release`, `interest`, `tax`, `financing`, `netProfit`, `netCashFlow`, `closingBalance`, `unitsSold`, `unitsProduced`.

`netProfit = revenue - all operating expenses and tax`. `netCashFlow = netProfit + financing`. History is newest-first for transactions and chronological for daily records, capped at 120 transactions and 365 days.

## Manufacturing cost

Implemented in `estimateManufacturingCost` (`src/game/formulas/market.ts`). Inputs come from the released CPU version.

```text
nodeNm = configuration.processNodeNm
waferCost = clamp(1200 * (350 / nodeNm)^0.45, 300, 60000) USD
waferDiameter = 150 mm if nodeNm > 250
                 200 mm if 90 < nodeNm <= 250
                 300 mm otherwise
waferArea = pi * (waferDiameter / 2)^2
grossDies = max(1, floor((waferArea / dieArea) * 0.9))
defectFactor = 1.15 if nodeNm <= 65 else 1
yield = clamp(0.98 / (1 + dieArea * 0.006 * defectFactor), 0.12, 0.98)
dieCost = waferCost / (grossDies * yield)
packageCost = 5 + sqrt(dieArea) * 0.18
testCost = 1 + dieArea * 0.015
unitCost = round2(max(3, dieCost + packageCost + testCost + 1.2))
```

Units: process node in nm, die area in mm², money in USD. The formula rewards smaller dies and older, cheaper nodes, while advanced nodes have higher wafer cost and a defect penalty. Low yield raises the effective unit cost. The Stage 2 `unitCostUsd` field remains a project input and is not used as the manufacturing estimate.

Suggested retail price:

```text
suggested = max(5, roundTo5(max(unitCost * 2.5, segmentReferencePrice * 0.9)))
grossMargin = (price - unitCost) / price
```

These are recommendations only. Price is a player decision.

## Market segments

| Segment | Base units/day | Annual growth | Reference price | Reference performance | Price elasticity | Performance elasticity |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Budget | 6,000 | 3.5% | $260 | 0.70 | 1.15 | 0.40 |
| Mainstream | 4,200 | 5.0% | $580 | 1.00 | 1.00 | 0.50 |
| Performance | 1,800 | 5.5% | $1,300 | 1.55 | 0.90 | 0.60 |
| Enthusiast | 800 | 4.5% | $2,300 | 2.20 | 0.80 | 0.65 |
| Workstation | 380 | 4.0% | $3,600 | 2.00 | 0.70 | 0.55 |
| Enterprise | 220 | 3.0% | $5,200 | 1.40 | 0.60 | 0.50 |

Daily segment demand grows from the 1995 base:

```text
days = max(0, date - 1995-01-01) in days
demand = round(baseDailyUnits * (1 + annualGrowth)^(days / 365.25))
```

ISA appeal is a per-segment multiplier: x86 is strongest in performance, enthusiast, workstation and enterprise; ARM is strongest in budget; RISC-V is slightly weaker overall.

## Product appeal and sales

### Performance score

`calculateCpuMarketPerformanceScore` runs the existing deterministic CPU benchmark and combines:

```text
raw = integer * 0.35 + floatingPoint * 0.45 + memory * 0.20
score = raw / raw(default 1995 CPU)
```

The default 1995 configuration therefore scores exactly 1.0. This is a market-normalized simulated score, not a hardware benchmark.

### Appeal factors

For one active product on a date:

```text
priceFactor = clamp((referencePrice / price)^priceElasticity, 0.08, 5)
performanceFactor = clamp((score / referenceScore)^performanceElasticity, 0.15, 3)
reputationFactor = clamp(0.5 + reputation / 100, 0.5, 1.5)
marketingFactor = 1 + min(0.6, sqrt(marketingBudget / 1000) * 0.3)
launchRamp = 0.15 + 0.85 * min(1, daysSinceRelease / 60)
freshness = clamp(1.15 - daysSinceRelease / 2500, 0.55, 1.15)
appeal = 0.35 * priceFactor * performanceFactor *
         reputationFactor * marketingFactor *
         segmentIsaMultiplier * launchRamp * freshness
```

The launch ramp starts at 15% and reaches full strength after 60 days. Freshness slowly declines over roughly seven years but never falls below 55%. Marketing has diminishing returns and caps at +60% appeal. Reputation contributes from 50% to 150%. No single factor can carry sales: each factor is bounded.

Competitor appeal uses the same price and performance factors plus the competitor's catalog `appealStrength` and current marketing multiplier.

### Daily allocation

For each segment:

```text
totalDemand = getSegmentDailyDemand(segment, date)
playerAppeal = sum(active player product appeals in segment)
competitorAppeal = sum(competitor product appeals in segment)
playerDemand = floor(totalDemand * playerAppeal / (playerAppeal + competitorAppeal))
```

Player demand is split across products in proportion to their appeal. Each product can sell only its available inventory:

```text
sold = min(floor(playerDemand * productAppeal / playerAppeal), inventory)
revenue = sold * price
```

Unmet player demand is treated as lost to competitors. That is why stockouts are harmful: inventory is not negative, and the missed units still count in the segment's total demand. A product with zero inventory can still lower reputation through a stockout penalty.

Market share is:

```text
share = playerUnits / totalDemand
```

The summary stores total demand, competitor units, player units, player revenue, overall share and per-segment results.

### Reputation effect of sales

After sales:

```text
gain = min(0.1, playerUnits / 5000)
stockoutPenalty = 0.01 if any active product has zero inventory and its segment has demand
reputation = clamp(reputation + gain - stockoutPenalty, 0, 100)
```

## Competitors

Competitor definitions in `src/game/models/market.ts` include strategy, action interval, first action offset and products. Actions are deterministic and recorded newest-first (maximum 60).

| Competitor | Strategy | Interval | First action | Observable behavior |
| --- | --- | ---: | ---: | --- |
| Apex Microsystems | Premium | 45 days | +7 days | Alternates +1.2% price (cap 1.4x) and +2% performance (cap 1.6x) |
| Nova Semiconductors | Volume | 30 days | +3 days | Cuts price 1.5% per action (floor 0.75x) |
| Vector Logic | Aggressive | 25 days | +5 days | Cuts price 3% per action (floor 0.65x) |
| Northbridge Computing | Balanced | 60 days | +11 days | Marketing campaign +4% (cap 1.4x) |
| Titan Works | Performance | 90 days | +17 days | Performance refresh +2.5% (cap 1.7x) |
| Meridian Systems | Enterprise | 120 days | +23 days | Alternates +1.5% performance (cap 1.5x) and +3% marketing (cap 1.4x) |

The next action date is `current action date + interval`, not the missed scheduled date. Actions alter current multipliers used by the same day's sales simulation. The UI exposes each competitor's strategy, multipliers, next action date and recent actions.

## Fixed daily simulation order

`advanceGameDay` in `src/game/engine/time.ts` performs, for the current simulation date:

1. advance active research by one day;
2. deliver production orders whose `readyOn` date has arrived;
3. apply due competitor actions;
4. simulate production, sales, revenue, inventory and market share;
5. settle daily finance: emergency funding if needed, payroll, overhead, marketing, interest, then profit tax and closing balance;
6. update reputation from the day's units and stockouts;
7. advance `gameDate` by one day.

The order is intentional. Production becomes available before sales; competitor actions affect that day's appeal; finance records the sales and production of the same date; the date advances last. Tests pin this behavior.

## Commands and validation

All commands go through `GameApplication` and persist validated state.

| Command | Validation |
| --- | --- |
| `releaseProduct` | existing project/version, name 2–40, valid segment, price $1–$1,000,000, no duplicate project version, enough cash for $5,000 launch fee |
| `orderProduction` | active product, integer 1–100,000, at most 40 open orders, enough cash for unit cost × quantity |
| `updateProductPrice` | existing product, finite price $1–$1,000,000 |
| `discontinueProduct` | existing product, no open production orders |
| `updateMarketingBudget` | $0–$20,000 per day |
| `takeLoan` | positive amount, total principal ≤ $1,000,000 |
| `repayLoan` | active loan, positive amount, enough cash |
| `startResearch` | existing catalog rules; cost is posted to the finance ledger |

Production is paid when the order is placed. Delivery after five game days adds inventory without a second charge. The launch fee is charged when the product is released.

## Persistence and migration

Save schema version 4 adds `finance` and `market`. `GameState` order is company, game date, CPU projects, research, finance, market, settings.

Migration behavior:

- schema 1: no CPU projects, initial research, initial finance and market;
- schema 2: preserve CPU projects, derive legacy research unlocks, initialize finance and market;
- schema 3: preserve research, initialize finance and market at the saved game date;
- schema 4: validate finance and market strictly.

Strict parsing rejects invalid transaction signs, inconsistent daily totals, duplicate IDs/dates, inventory that does not equal produced minus sold, unknown products in production orders, missing/extra competitors, duplicated competitor actions, invalid summary totals and out-of-range marketing budgets.

## UI

- **Market** (`MarketPage`, tab `market`): share, daily units/revenue, active products, release form with live cost/performance estimate, product pricing and production controls, orders, segments, competitor strategies/actions, recent market days.
- **Finance** (same page, tab `finance`): balance, lifetime revenue/expenses, latest profit, debt, 14-day SVG revenue/expense chart, latest daily breakdown, loan controls, marketing budget, recent transactions.
- **Dashboard**: adds daily revenue, daily net profit, market share and daily units; activity shows recent competitor actions.

The Finance tab is not a separate bottom-nav item. Finance highlights Market in navigation, keeping the mobile bar at six destinations.

## Tests

| Area | Test file |
| --- | --- |
| Signed transactions, totals, history validation | `src/game/models/finance.test.ts` |
| Loans, repayment, tax, emergency financing | `src/game/engine/finance.test.ts` |
| Manufacturing cost, performance normalization, price/marketing appeal, demand growth | `src/game/formulas/market.test.ts` |
| Release, production lead time, sales cap, competitors, discontinuation, reputation | `src/game/engine/market.test.ts` |
| Daily pipeline and date advancement | `src/game/engine/time.test.ts` |
| Schema 3→4 migration | `src/game/models/game-state.test.ts`, `src/storage/repositories/BrowserGameStateRepository.test.ts` |
| Market UI release, empty state, Finance tab | `src/features/market/MarketPage.test.tsx` |

Run `npm run test`, `npm run typecheck`, `npm run lint` and `npm run build`. There is no end-to-end test script in this repository.

## Balance constraints

- Marketing appeal is capped, so spending cannot buy unlimited share.
- Price and performance have bounded elasticities and clamped factors.
- Competitor appeal is always present; a player product never receives 100% of demand purely from its specs.
- Fixed daily costs create pressure to sell, and profit tax limits runaway net income.
- Emergency financing prevents an instant dead end but creates debt and interest.
- Production is paid up front and has a five-day lead time, so overproduction ties up cash.
