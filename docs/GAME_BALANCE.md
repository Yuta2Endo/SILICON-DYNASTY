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

## Components (Stage 06)

Stage 06 adds six component families: GPU, RAM, SSD, motherboard, AI
accelerator and networking adapter. Each has versioned projects, schema-based
bounds and a default 1995 configuration. Full field lists and formulas live in
`docs/COMPONENTS.md`.

- Performance is normalized so every default component scores exactly 1.000.
- GPU performance is a weighted composite of the four existing GPU workloads:
  gaming 35%, rendering 30%, compute 20%, AI 15%. Workload operation counts,
  memory working sets and utilization remain distinct.
- Component manufacturing cost is explicit:
  - GPU/AI: silicon die from the Stage 05 wafer/yield model + memory + board +
    packaging + test + logistics;
  - RAM/SSD/motherboard/networking: bill-of-materials formulas based on capacity,
    speed, interface, slots, lanes and ports.
- Suggested price = max(2.5x unit cost, 0.9x segment reference), rounded to $5.
- Component demand has type-specific base demand, annual growth, reference price,
  price/performance elasticity and a fixed competitor appeal. Appeal also includes
  reputation, marketing, launch ramp and freshness.
- Component production is just-in-time: unit cost is charged before sales revenue
  on the same day, and units are capped by available cash. There is no component
  inventory or stockout penalty in Stage 06.
- One compatibility engine checks ISA, memory standard/capacity/slots, PCIe
  generation, SATA/M.2 availability, storage form factor and motherboard presence.
  Errors block compatibility; a missing RAM module is a warning.
- Component sales are part of the daily pipeline and post to the same finance
  ledger and market summaries as CPU sales.

## OS kernel lab (Stage 07)

Stage 07 adds simulated OS projects with version history. All results are game
models, not measurements of a real kernel. Configuration covers target platform,
kernel type, bootloader, scheduler, memory manager, virtual memory, IPC, syscall
count, module/driver model, address width, process limit and supported CPU
architectures. Full fields, bounds, profiles and formulas are in
[`OS_LAB.md`](OS_LAB.md).

- Kernel architecture is a multiplier profile, not a single win button. Monolithic
  favors performance and footprint; microkernel favors isolation, stability and
  maintainability but pays IPC latency; hybrid balances; modular favors
  compatibility and maintenance.
- Boot time is `bootloader seconds + 2 + footprint / 85 + module/driver overhead +
  syscalls / 600 + address overhead + virtual-memory overhead + kernel boot factor`,
  clamped to 1..600 seconds.
- Memory footprint starts from 24 MB, then applies kernel, memory-manager, module,
  driver, virtual-memory, syscall, process-count, architecture-count and address
  overhead, clamped to 16..4,096 MB.
- Performance, stability, security, compatibility, energy and maintainability are
  products of kernel/subsystem multiplier profiles and bounded factors. IPC latency
  and syscall overhead are separate latency outputs.
- Overall score uses platform-specific weights: desktop values stability and
  performance; mobile values energy; server values stability/security; gaming values
  performance and IPC latency; universal balances the categories.
- Requirements are platform-specific thresholds over the same metrics. A failed
  requirement shows comparator, target and actual value.
- Constraints are validated: virtual memory needs paging; microkernel needs
  message-passing/hybrid IPC and user-space/hybrid drivers; monolithic cannot use
  user-space drivers; user-space modules need microkernel/hybrid; modular needs
  modules; processes are capped by address width; UEFI (2005), coreboot (1999) and
  64-bit addressing (2003) are year-gated.
- OS projects are not yet part of the daily market/finance pipeline. They persist in
  save schema v6 with lightweight migration from v5.
