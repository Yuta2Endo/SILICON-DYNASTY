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

## OS systems and drivers (Stage 08)

Stage 08 extends OS projects with filesystems, driver frameworks, networking,
permissions, encryption, update/package management and diagnostics. Full profiles,
rules and formulas are in [`OS_SYSTEMS.md`](OS_SYSTEMS.md).

- Each capability level trades a cost against a benefit. Modern filesystems and
  encryption raise integrity/security but add footprint, cost and update overhead;
  certified driver frameworks raise coverage/compatibility but cost more to maintain.
- System quality is a weighted blend of driver coverage 24%, data integrity 20%,
  network capability 18%, diagnostics 12%, update readiness 14% and security 12%.
- Update latency falls from 180 days for manual updates to 7 days for rolling updates;
  package managers reduce it by another 20% and add a small encryption bonus.
- Annual maintenance is $120 plus 45 per maintenance-cost unit across the eight
  system-service profiles. The 1995 default costs $345/year.
- Hardware compatibility is checked against saved CPU/component projects: CPU ISA,
  PCIe generation, SATA/NVMe/M.2 storage, PCIe/NVLink accelerators and fiber/InfiniBand
  networking each have explicit driver-framework or network-stack requirements.
- Constraints: ZFS needs 64-bit addressing; encryption needs a permission model;
  rolling updates need a package manager; all advanced options are year-gated.
- System fields persist in save schema v7. Version 6 OS projects migrate with 1995
  defaults. OS projects still do not participate in the daily market/finance pipeline.

## OS interface and software ecosystem (Stage 09)

Stage 09 adds platform profiles, GUI/SDK/API/developer-tools/app-store choices,
six catalog applications and a staged OS release lifecycle. Full rules and tables
are in [`OS_ECOSYSTEM.md`](OS_ECOSYSTEM.md).

- Ecosystem scores are fixed capability profiles: GUI 20/55/78/92, SDK 10/45/75/92,
  API 35/62/58/82, developer tools 20/48/72/90 and app store 10/50/75/68.
- Ecosystem score is a weighted blend of SDK 32%, API 23%, GUI 20%, developer
  tools 15% and app store 10%.
- Application coverage is the share of the six catalog applications whose GUI,
  SDK, API, architecture, memory, security and developer-tools requirements are
  met. Coverage contributes 25% of platform appeal; the kernel contributes 30%,
  ecosystem score 30% and app-store score 15%.
- Applications use real calculated kernel footprint and security. Address width
  caps usable memory at 16 MB, 4,096 MB or 1,000,000 MB.
- Release stages are Alpha, Beta, RC and Stable with costs $25k, $35k, $50k and
  $80k and quality/appeal factors 0.78, 0.88, 0.95 and 1.0. Advancing a release
  from Alpha to Stable costs $190k and posts to the finance ledger.
- Release quality blends kernel overall 40% with platform appeal 60%, then applies
  the stage factor. Appeal is platform appeal times the stage factor.
- Constraints: app stores, IDEs and suites require an SDK; suites require a full
  or professional SDK; web APIs require a non-basic network stack. All advanced
  options are year-gated.
- OS releases persist in save schema v8. They remain a design/simulation feature
  and do not enter the daily market, finance or reputation pipeline.

## AI architecture and data (Stage 10)

Stage 10 adds AI model projects, architecture/parameter configuration, datasets,
data quality/licensing and calculated hardware requirements. Full rules and
formulas are in [`AI_LAB.md`](AI_LAB.md).

- Architectures are Transformer, RNN, CNN, Diffusion, MoE, Multimodal and Custom.
  They trade quality against training cost, inference efficiency and memory use.
- Model quality combines architecture quality, parameter scale, dataset quality,
  diversity, context window and precision. Dataset quality and diversity are
  weighted by dataset size.
- Licenses affect commercial readiness: proprietary 1.00, permissive 0.98,
  research 0.65 and restricted 0.35 compliance. Restricted data therefore lowers
  commercial readiness and appeal without changing raw model quality.
- Quantization reduces model size and inference VRAM: INT8 uses 1 byte per
  parameter and INT4 uses 0.5 byte; FP32/FP16/BF16/FP8 use 4/2/2/1 bytes.
- Hardware requirements are calculated from parameters, layers, context, hidden
  dimension, precision, quantization and dataset size: training VRAM, inference
  VRAM, system RAM, storage, minimum GPU TFLOPS and recommended VRAM.
- Historical gates: Transformer 2017, MoE 2019, Diffusion 2020, Multimodal 2021,
  FP16 2008, BF16 2018, FP8 2022, INT8 2015, INT4 2022.
- AI projects persist in save schema v9 with configuration and dataset snapshots
  per version. They do not enter the daily market, finance or reputation pipeline.
  Training and deployment are reserved for Stage 11.

## AI training and deployment (Stage 11)

Stage 11 adds deterministic training runs, simulated loss/validation progress,
hardware plans, post-training optimization and model deployment. Full rules,
costs and formulas are in [`AI_TRAINING.md`](AI_TRAINING.md).

- Training hardware is either the reference cluster (20 TFLOPS, 16 GB) or a saved
  GPU/AI-accelerator component. Component TFLOPS are derived from its calculated
  performance score; VRAM is its memory capacity.
- A training plan requires the calculated minimum GPU TFLOPS and training VRAM.
  Incompatible hardware is rejected before any cost is charged.
- Duration is `clamp(ceil(2 + parametersM/1000 + trainingVRAM/8 + datasetGB/100), 1, 60)`
  days. Daily cost is `$120 + TFLOPS*6 + VRAM*9`; the full cost is charged upfront
  through the finance ledger under research.
- Loss and validation are deterministic functions of the seed, day, model,
  datasets and optimizations. The same seed and inputs always produce the same
  result; loss falls with progress while validation rises.
- Optimization costs: quantization $12k, pruning $18k, distillation $30k and
  fine-tuning $22k. Quantization/pruning/distillation reduce model size and raise
  inference efficiency at a quality cost; fine-tuning raises quality and
  commercial readiness. Each type can be applied once to a completed run.
- Deployment costs $15k, requires a completed run, and creates an immutable
  deployment snapshot with version, quality, appeal and applied optimizations.
  A training run can be deployed once.
- Training/deployment persist in save schema v10. Active jobs advance once per
  game day after component sales and before finance settlement. Deployment does
  not yet affect the market or reputation pipeline.

## Devices and cloud (Stage 12)

Stage 12 adds device configurators and cloud infrastructure. Full rules and
formulas are in [`DEVICES_CLOUD.md`](DEVICES_CLOUD.md).

- Devices reference canonical CPU, component, OS-release and AI-deployment
  projects. They do not copy component specifications, so compatibility and
  metrics always use the saved source projects.
- Required slots are CPU + version, motherboard, RAM, SSD, and OS project +
  release. Gaming additionally requires a GPU, servers require networking, and
  AI devices require an AI accelerator, AI project and AI deployment.
- The OS release must target the device platform or `universal`. Device saving
  reuses both build compatibility and OS hardware-driver compatibility.
- Device performance combines CPU/GPU/RAM/storage/network scores with OS release
  quality. OS integration also uses ecosystem score and platform match; AI
  capability combines deployment quality and accelerator score.
- Power is component TDP plus platform overhead; thermal load uses a type-specific
  capacity. Efficiency, reliability and compatibility are bounded game scores.
- Overall device score uses type-specific weights (desktop favors CPU/OS, gaming
  favors GPU, server favors networking/reliability, AI device favors AI).
- Ecosystem synergy combines CPU 15%, GPU 10%, AI 20%, OS integration 20%,
  application coverage 20%, network 5% and platform match 10%.
- Cloud projects reference a saved server device/version and add data centers,
  servers per center, storage, network, AI units and redundancy. Compute, memory,
  AI TFLOPS, availability, efficiency, daily operating cost, capex and capacity
  are derived from the server device rather than duplicated.
- Device and cloud projects persist in save schema v11 but are not yet sold in the
  daily market pipeline. They are explicitly presented as game simulations.

## Save system and game experience (Stage 13)

Stage 13 does not change economic formulas or balance values. It adds safe
save management and a derived experience layer; full details are in
[`SAVE_GAME_EXPERIENCE.md`](SAVE_GAME_EXPERIENCE.md).

- Every successful command autosaves. The previous valid autosave is retained
  as a recovery backup; three manual slots store full states with metadata.
- Slots, backup restore and imports validate and migrate the source state before
  replacing the current save. Invalid or newer-schema imports cannot overwrite a
  working save.
- Export uses a versioned JSON wrapper; import accepts the wrapper or a raw
  state. Save schema remains v11.
- Tutorial progress and achievements are derived from existing projects, sales,
  research and OS releases, so they add no economic effects or schema fields.
- Fixture-based migration tests cover schemas 1, 5, 7, 10 and 11, reject schema
  12, and verify a 30-day session survives export/import.
