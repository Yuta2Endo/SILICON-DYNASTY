# COMPONENTS - Stage 06

This document defines the component domain introduced in Stage 06: GPUs, memory,
SSDs, motherboards, AI accelerators and networking adapters. All values are game
model inputs, not decorative display data.

## Scope

- Six component types share one project/version model.
- Each type has a strict configuration schema, numeric bounds, option lists and
  a baseline configuration from 1995.
- Build compatibility is checked by one engine for CPU + components.
- Component products are released to their own market, sold daily and settled
  through the existing finance ledger.
- GPU performance uses the existing four GPU benchmark workloads: gaming,
  rendering, compute and AI.

## Persistence model

`ComponentProject`:

```ts
{
  id: string;                 // component-N
  name: string;               // 2..40 characters
  type: ComponentType;
  configuration: ComponentConfiguration;
  versions: Array<{
    version: number;          // starts at 1, strictly increasing
    savedOn: string;          // YYYY-MM-DD
    configuration: ComponentConfiguration;
  }>;
}
```

`GameState.componentProjects` is persisted with save schema v5. Component market
products are stored in `MarketState.componentProducts`:

```ts
{
  id: string;                 // component-product-N
  name: string;
  projectId: string;
  projectVersion: number;
  componentType: ComponentType;
  configuration: ComponentConfiguration;
  releaseDate: string;
  priceUsd: number;
  manufacturingCostUsd: number;
  performanceScore: number;
  unitsSold: number;
  revenueUsd: number;
  status: "active" | "discontinued";
}
```

Component products use just-in-time production: there is no component inventory
or production order in Stage 06. Each sold unit charges manufacturing cost on the
same day before sales revenue is posted.

## Configuration fields and bounds

### GPU

`bus`, `computeUnits` 1..4096, `clockMHz` 100..6000,
`operationsPerCyclePerUnit` 0.1..512,
`memoryCapacityGb` 1..4096, `memoryBandwidthGbPerSecond` 0.1..100000,
`processNodeNm` 2..1000, `dieAreaMm2` 1..4000, `tdpW` 1..5000,
`rayTracing` boolean.

Default: PCI, 8 compute units, 100 MHz, 2 ops/cycle, 8 GB, 1.6 GB/s,
350 nm, 80 mm², 25 W, no ray tracing.

### Memory (RAM)

`memoryStandard` (SDR/DDR/DDR2/DDR3/DDR4/DDR5/LPDDR), `capacityGb` 1..4096,
`speedMTs` 100..20000, `channels` 1..16, `latencyCl` 1..100,
`tdpW` 1..500.

Default: DDR, 8 GB, 400 MT/s, 1 channel, CL3, 5 W.

### SSD

`interface` (SATA/NVMe), `formFactor` (2.5-inch/M.2), `capacityGb` 16..100000,
`sequentialReadMbps`/`sequentialWriteMbps` 50..100000,
`randomReadIops` 1000..100000000, `enduranceTbw` 1..100000, `tdpW` 1..100.

Default: SATA, 2.5-inch, 64 GB, 500/450 MB/s, 50k IOPS, 50 TBW, 3 W.

### Motherboard

`supportedIsa` (x86/ARM/RISC-V), `memoryStandard`, `formFactor`
(ATX/Micro-ATX/Mini-ITX/E-ATX), `memorySlots` 1..16, `maxMemoryGb` 1..4096,
`pcieGeneration` 1..5, `pcieLanes` 1..256, `m2Slots` 0..16,
`sataPorts` 0..32, `networkGbps` 1..400, `tdpW` 1..200.

Default: x86, DDR, ATX, 4 slots, 16 GB maximum, PCIe 1, 20 lanes, 0 M.2,
4 SATA, 1 Gbps, 20 W.

### AI accelerator

`interconnect` (PCIe/NVLink), `computeUnits` 1..8192, `clockMHz` 100..6000,
`operationsPerCyclePerUnit` 0.1..512, `memoryCapacityGb` 1..4096,
`memoryBandwidthGbPerSecond` 0.1..100000, `precisions` (FP32/FP16/BF16/FP8/INT8),
`processNodeNm` 2..1000, `dieAreaMm2` 1..4000, `tdpW` 1..5000.

Default: PCIe, 16 compute units, 200 MHz, 4 ops/cycle, 16 GB, 256 GB/s,
FP16 + INT8, 350 nm, 180 mm², 120 W.

### Networking adapter

`bus` (PCI/PCIe 3/PCIe 4/PCIe 5), `ports` 1..128, `speedGbps` 1..1600,
`medium` (copper/fiber), `standard` (Ethernet/InfiniBand), `tdpW` 1..1000.

Default: PCIe 3, 2 ports, 1 Gbps, copper, Ethernet, 10 W.

## Performance model

Every component type has a raw score normalized against its default 1995
configuration, so the default configuration scores exactly **1.000**.

- **GPU**: composite of benchmark tasks/s: gaming 35%, rendering 30%, compute
  20%, AI 15%.
- **RAM**: `capacityGb * (speedMTs / 100) * channels / latencyCl`.
- **SSD**: average sequential throughput + random-read contribution
  (`iops / 1000 * 2`) + capacity and endurance bonuses.
- **Motherboard**: memory capacity/slots, PCIe lanes/generation, M.2, SATA and
  network capacity.
- **AI accelerator**: AI benchmark tasks/s with a small bonus per supported
  precision format.
- **Networking**: ports × port speed × standard multiplier × medium multiplier.

GPU workloads remain distinct: gaming, rendering, compute and AI have different
operation counts, data sizes, working sets and utilization. The benchmark engine
also applies memory-capacity support, bandwidth limits, power/thermal throttling
and per-workload task throughput.

## Manufacturing cost

All results are rounded to cents and have a floor of **$5** for components.

### Silicon-based GPU and AI accelerator

Die cost reuses the Stage 05 `estimateSiliconDie` model:

- wafer cost = `1200 * (350 / nodeNm)^0.45`, clamped $300..$60,000;
- wafer diameter 150/200/300 mm by process node;
- gross dies = `floor(waferArea / dieArea * 0.9)`;
- yield = `0.98 / (1 + dieArea * 0.006 * defectFactor)`, clamped 0.12..0.98,
  with defect factor 1.15 at 65 nm or below;
- die cost = wafer cost / (gross dies × yield).

GPU: memory $1.2/GB + board $15 + packaging $5 + test
`1 + dieArea * 0.015` + logistics $1.2.

AI accelerator: memory $9.5/GB + board $40 + packaging $18 + the same test and
logistics terms.

### RAM

`capacity * 1.4 + capacity * speedMTs * 0.0004 + 8 + channels * 2 + test + 1.2`,
where test = `0.8 + capacity * 0.02`.

### SSD

`capacity * 0.03 + controller + board + test + 1.2`, where controller is
`6` (SATA) or `12` (NVMe), board is `10 + 4` (SATA) or `10 + 12` (NVMe), and
test = `1 + capacity * 0.001`.

### Motherboard

`18 + lanes * 0.45 + pcieGeneration * 5 + m2Slots * 2 + sataPorts * 0.5 +
memorySlots * 1.2 + networkGbps * 0.4 + test + 1.2`,
where test = `1.5 + lanes * 0.02`.

### Networking

`12 + ports * portSpeed * 0.8 + portSpeed * 0.3 + fiber 8 + InfiniBand 35 +
test + 1.2`, where test = `0.8 + ports * 0.15`.

Suggested price = `max(unitCost * 2.5, referencePrice * 0.9)`, rounded to $5,
minimum $5. Gross margin = `(price - unitCost) / price`.

## Build compatibility

`checkBuildCompatibility({ cpu?, components? })` returns
`{ compatible, issues[] }`. Issues have a code, severity, affected components and
optional details. `compatible` is true when no issue has severity `error`.

Checks:

- A motherboard is required when any other component or CPU is selected.
- CPU ISA must equal motherboard `supportedIsa`.
- CPU and motherboard memory standards must match.
- RAM standard must match the motherboard.
- RAM capacity must fit `maxMemoryGb`; channels must fit `memorySlots`.
- A CPU without RAM produces a warning, not an error.
- PCIe generation required by GPU/networking/AI must not exceed the motherboard
  generation; PCI is compatible with any board.
- SATA SSD needs at least one SATA port.
- NVMe SSD needs at least one M.2 slot and must use the M.2 form factor.
- AI accelerator PCIe requires a PCIe-capable board; NVLink maps to the PCI path
  until a dedicated interconnect model exists.

Codes: `missing-motherboard`, `missing-memory`, `cpu-isa-mismatch`,
`cpu-memory-mismatch`, `memory-standard-mismatch`, `memory-capacity-exceeded`,
`memory-slots-exceeded`, `gpu-bus-incompatible`, `ai-bus-incompatible`,
`storage-interface-unavailable`, `storage-form-factor-incompatible`,
`networking-bus-incompatible`.

## Component market

Profiles:

| Type | Base daily demand | Growth/year | Reference price | Price elasticity | Performance elasticity | Competitor appeal |
|---|---:|---:|---:|---:|---:|---:|
| GPU | 1,800 | 6.5% | $300 | 1.10 | 0.55 | 50 |
| RAM | 3,500 | 4.0% | $120 | 1.20 | 0.35 | 45 |
| SSD | 1,600 | 8.0% | $180 | 1.15 | 0.45 | 40 |
| Motherboard | 1,400 | 4.0% | $160 | 1.05 | 0.40 | 35 |
| AI accelerator | 200 | 12.0% | $4,000 | 0.80 | 0.70 | 30 |
| Networking | 700 | 6.0% | $240 | 0.95 | 0.45 | 25 |

Daily demand grows from 1995-01-01 by
`baseDailyUnits * (1 + annualGrowthRate)^(days / 365.25)`.

Appeal per product:

`0.35 * priceFactor * performanceFactor * reputationFactor *
marketingFactor * launchRamp * freshness`

- price factor = clamp `(referencePrice / price)^priceElasticity`, 0.08..5;
- performance factor = clamp
  `(performance / referencePerformance)^performanceElasticity`, 0.15..3;
- reputation factor = clamp `0.5 + reputation / 100`, 0.5..1.5;
- marketing factor = `1 + min(0.6, sqrt(marketingBudget / 1000) * 0.3)`;
- launch ramp = `0.2 + 0.8 * min(1, daysSinceRelease / 45)`;
- freshness = clamp `1.1 - daysSinceRelease / 2000`, 0.6..1.1.

Player units per type = `floor(demand * playerAppeal / (playerAppeal +
competitorAppeal + siblingProductAppeals))`. Units are then capped by available
cash: `floor(balance / manufacturingCost)`.

For each sale the engine posts manufacturing cost first, then sales revenue, and
records units sold in the daily finance record. Sales are aggregated into
`MarketDaySummary.componentDemandUnits`, `componentUnits`,
`componentRevenueUsd` and `componentManufacturingUsd`.

Component products have no inventory and no production lead time in Stage 06, so
there is no stockout penalty. Reputation gain includes component units:
`min(0.1, (CPU units + component units) / 5000)`.

## UI

- CPU screen has a product-workspace switcher: Processors / Components.
- Component designer: create project by type, edit schema-driven fields, validate,
  show manufacturing cost/performance/suggested price, save versions, load old
  versions.
- Build compatibility panel: choose saved CPU/component projects and inspect
  errors or the compatible state.
- Market screen: component KPIs, component release form, component product cards
  with price updates, demand forecast, market share and discontinuation.
- Dashboard daily units include CPU and component sales; daily revenue comes from
  the finance ledger.

## Persistence and migration

- Save schema v5 adds `componentProjects` and `market.componentProducts`, plus
  four component fields on each market daily summary.
- Schema v4 saves preserve company, CPU projects, research, finance, market
  products/orders/competitors/actions and marketing budget. Missing component
  arrays and component summary fields migrate to empty/zero values.
- Schema v1-v3 migrations keep their prior behavior and produce empty component
  project/product arrays.
- Strict parsing validates configurations against the type schema, project and
  version uniqueness, product/config type equality, actor references and summary
  arithmetic. Newer schemas are rejected.

## Tests

- `src/game/models/components.test.ts`: all six defaults/projects persist; bounds;
  project type mismatch; compatibility success and mismatch codes; missing board.
- `src/game/formulas/components.test.ts`: normalization to 1; four distinct GPU
  workloads; cost growth from die/memory; suggested price; demand sensitivity to
  price, performance and time.
- `src/game/engine/component-market.test.ts`: launch fee, duplicate rejection,
  JIT sales, finance posting, price sensitivity, cash cap, reprice/discontinue.
- `src/game/engine/time.test.ts`: component sales run inside the daily pipeline.
- `src/game/models/game-state.test.ts`: v4 -> v5 migration and component project
  validation.
- `src/game/application/game-application.test.ts`: create/version/release/reprice/
  discontinue persistence.
- `src/features/components/ComponentDesignerPage.test.tsx`: create, save, validate,
  workspace switch.
- `src/features/market/MarketPage.test.tsx`: component launch form.
