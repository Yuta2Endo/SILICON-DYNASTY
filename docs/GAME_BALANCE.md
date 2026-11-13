# Game Balance & Simulation Rules

## Principles
All formulas must have documented inputs, units, bounds and tests. Separate base values, modifiers, penalties and final outputs. Avoid division by zero, overflow and unexplained random results. Use seeded RNG only for explicitly stochastic systems.

## CPU
A conceptual throughput baseline may use IPC × effective frequency × effective cores, but final calculations must account for workload parallelism, memory, threads, power and thermal constraints. Do not assume every workload scales linearly across all cores. Stage 2 stores the target unit cost as an explicit project input; it is not presented as a calculated manufacturing cost. Stage 3 implements the deterministic CPU/GPU workload formulas in [`BENCHMARK_ENGINE.md`](BENCHMARK_ENGINE.md); results are simulated task throughput, not real hardware scores.

## GPU
Account for compute units, clock, architecture efficiency (represented by the validated operations-per-cycle-per-unit input), memory bandwidth/capacity, workload type and power/thermal limits. Gaming, rendering, compute and AI must not collapse into one universal score.

## Manufacturing
Unit cost may depend on die area, process, wafer/cycle cost, yield, packaging, testing and logistics. Low yield should increase effective cost in a transparent way.

## AI training
Progress depends on architecture, model scale, data volume/quality, compute, VRAM/RAM, precision, batch size, learning rate, time and budget. Loss and evaluation metrics are game approximations and must be labeled as simulated.

## OS quality
Performance, stability, security, UX, compatibility and app availability derive from architecture, drivers, testing, team and ecosystem.

## Market
Demand considers price, specs, reputation, availability, compatibility, marketing, segment, competitors and era. No single stat should dominate all sales.

## Progression
Older products may retain niche value. Research has opportunity cost. Growth increases organizational overhead. Avoid runaway exponential profit. Buying licenses and specializing must remain viable alternatives to building everything.

Research uses a static, validated technology catalog. Only one project may be active. Starting research requires the full catalog cost in available company funds and deducts that amount immediately; the balance cannot become negative. Each `advanceGameDay` call advances the active project by exactly one research day. It completes after its catalogued duration and grants only its declared unlock IDs. Progress and cumulative spending are persisted; research cannot be cancelled or refunded. Unavailable technologies cannot be started until their availability year and prerequisites are satisfied.

Research uses a static technology catalog with explicit prerequisites, historical availability years, nominal USD costs, game-day durations, and declared unlock IDs. Only one project can run at a time. Starting a project requires the full cost to be affordable and debits it up front; the company cannot overdraw, and this stage has no cancellation or refund. Each Next Day advances active research by exactly one game day; the technology completes at its catalog duration. Only the catalogued unlock IDs are granted. Progress, active cost and cumulative research spending are persisted.

## Economy and market (Stage 05)

All money is nominal USD and every balance change is posted through the finance ledger. Sales and loan proceeds are positive; manufacturing, payroll, overhead, marketing, research, release, interest, tax and loan repayment are negative. No transaction may make the balance negative.

Daily fixed costs are $120 per employee, $80 overhead, the chosen marketing budget and loan interest (`principal × annualRate / 365`). Profit tax is 18% of positive `revenue − operatingExpenses − interest` for that date. Daily records include revenue, each expense category, financing, net profit, net cash flow, closing balance, units produced and units sold. Loans are capped at $1,000,000 and normally cost 12% annually. If cash cannot cover fixed daily costs, emergency financing borrows in $1,000 increments at 18%; an existing loan keeps its contracted rate.

Manufacturing unit cost uses process node, die area, wafer cost, gross dies per wafer, yield, packaging, test and logistics:

```text
waferCost = clamp(1200 × (350 / nodeNm)^0.45, 300, 60000)
grossDies = max(1, floor(π × (waferDiameter / 2)² / dieArea × 0.9))
yield = clamp(0.98 / (1 + dieArea × 0.006 × defectFactor), 0.12, 0.98)
unitCost = max(3, waferCost / (grossDies × yield) + package + test + 1.2)
```

Wafer diameter is 150 mm above 250 nm, 200 mm above 90 nm and 300 mm otherwise. Advanced nodes at or below 65 nm use a 1.15 defect factor. The project field `unitCostUsd` remains a design input and is not the calculated manufacturing cost.

Market demand varies by segment, era and price. Daily segment demand grows from the 1995 base at 3–5.5% per year. Product appeal is the product of bounded price elasticity, performance elasticity, reputation (0.5–1.5×), marketing (1–1.6×), ISA preference, a 60-day launch ramp and freshness. A base appeal of 0.35 keeps competitor appeal relevant; player units are allocated in proportion to appeal and capped by inventory. Lost sales are not negative inventory. Market share is player units divided by total segment demand.

Competitor strategies are deterministic and observable: volume and aggressive competitors cut price by 1.5% and 3% per action, premium and enterprise competitors alternate price/performance or performance/campaign actions, balanced competitors run campaigns, and the performance competitor refreshes performance by 2.5%. Multipliers are capped, and actions are recorded with date, type and value.

The fixed daily order is research progress, production delivery, competitor actions, market sales, finance settlement, reputation update, then date advancement. This order is covered by tests. Full formulas, bounds and command validation are in [`ECONOMY_MARKET.md`](ECONOMY_MARKET.md).
