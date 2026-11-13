# Benchmark Engine

The benchmark engine is deterministic game simulation, not a measurement of real hardware. It lives in `src/game/formulas/benchmark.ts`; it has no React, DOM, storage, time or random-number dependencies. Inputs are configuration snapshots plus fixed workload profiles. Results are calculated on demand and are not persisted.

## CPU formulas

The CPU Designer validates configuration before running. Existing CPU field limits apply: 1–128 cores, 1–512 threads with 1–4 threads/core, 25–10,000 MHz, IPC 0.1–8 in 0.1 increments, 1–16 memory channels, 1–4,096 GB maximum memory and TDP 1–1,500 W. Unsupported SIMD/ISA combinations are rejected by the CPU model.

### Workload profiles

Each task is a synthetic unit of work; the constants define the workload and do not represent a real benchmark suite.

| Workload | Instructions/task (millions) | Data/task (MB) | Working set (GB) | Parallel fraction | Vectorizable fraction | Power intensity |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Integer | 120 | 8 | 0.25 | 0.65 | 0.15 | 0.55 |
| Floating point | 240 | 24 | 0.5 | 0.90 | 0.75 | 0.85 |
| Memory | 35 | 256 | 1.5 | 0.75 | 0.05 | 0.45 |

The default CPU has 1 GB maximum memory, so the memory workload is explicitly unavailable until the design supports its 1.5 GB working set.

### Throughput

- Effective clock: `base clock MHz × thermal throttle factor`.
- Scalar instruction throughput: `effective clock MHz × IPC`, in millions of instructions/second (MIPS).
- Effective thread capacity: `physical cores + 0.25 × (threads − physical cores)`. The 0.25 SMT contribution is a game assumption and applies to additional threads only.
- Multicore speedup uses Amdahl's law: `1 / ((1 − parallel fraction) + parallel fraction / effective thread capacity)`. It is not linear core scaling.
- SIMD lanes are modeled as MMX 2, SSE/NEON 4, AVX2/RVV 8 and AVX-512 16. The widest selected supported extension is used. Effective instructions/task: `instructions/task × ((1 − vectorizable fraction) + vectorizable fraction / lanes)`. Without SIMD, lanes = 1. RVV uses an assumed 256-bit baseline for this model.
- Single-core and multicore compute task rates: `corresponding MIPS / effective instructions per task (millions)`.
- Nominal memory bandwidth per channel, in decimal GB/s: SDR 1.06, DDR 2.13, DDR2 4.26, DDR3 8.53, DDR4 17.07, DDR5 38.4, LPDDR 25.6. Total theoretical bandwidth is the selected rate multiplied by channel count.
- Memory-limited task rate: `bandwidth GB/s × 1,000 / data MB per task`. Final task rate is the lower of compute-limited and memory-limited throughput. Achieved bandwidth is `multicore tasks/second × data MB/task / 1,000` and cannot exceed theoretical bandwidth.
- If the workload working set exceeds configured maximum memory, the result is marked unsupported, with zero task throughput and no active-load power estimate.

Outputs include single-core and multicore MIPS and tasks/second, theoretical and achieved memory bandwidth, required/available memory, estimated power, temperature, effective clock, throttle factor and throttle status. Rates are rounded to six decimal places.

## GPU formulas

The engine accepts an explicit `GpuBenchmarkConfiguration`; this is a formula input contract for the future GPU designer, not a saved GPU project or a fabricated in-game GPU. Bounds are: compute units 1–4,096 (integer), clock 100–6,000 MHz (integer), operations per cycle per unit 0.1–512, bandwidth 0.1–100,000 GB/s, capacity 1–4,096 GB and TDP 1–5,000 W (integer). `operationsPerCyclePerUnit` carries the validated architecture-specific throughput, so the engine does not apply a second architecture-efficiency multiplier.

| Workload | Operations/task (millions) | Data/task (MB) | Working set (GB) | Compute utilization | Power intensity |
| --- | ---: | ---: | ---: | ---: | ---: |
| Gaming | 750 | 256 | 4 | 0.75 | 0.80 |
| Rendering | 2,500 | 512 | 6 | 0.90 | 0.90 |
| Compute | 3,000 | 128 | 2 | 0.95 | 0.85 |
| AI | 1,800 | 128 | 8 | 0.95 | 0.95 |

- Compute throughput: `compute units × effective clock MHz × operations/cycle/unit × workload compute utilization`, in millions of operations/second (MOPS).
- Compute-limited tasks/second: `compute throughput MOPS / operations/task (millions)`.
- Memory-limited task rate: `bandwidth GB/s × 1,000 / data MB per task`. Final task rate is the lower of compute- and memory-limited rates.
- A workload is unavailable when its working set exceeds configured memory capacity; its task rate is zero and no active-load power is reported.

The four GPU workload types remain separate; the engine currently has no GPU UI because this stage does not yet define or persist a GPU product configuration. Future GPU work should map its validated configuration to this input contract rather than display placeholder results.

## Shared power and thermal approximation

Each workload's power intensity is a fixed profile value between 0 and 1. Demand is `TDP W × power intensity`. The static thermal model assumes 25 °C ambient temperature, 100 °C maximum temperature and 0.55 °C/W thermal resistance:

- Thermal power limit: `(100 °C − 25 °C) / 0.55 °C/W`.
- Throttle factor: `min(1, thermal power limit / demanded power)`.
- Estimated power: `demanded power × throttle factor`.
- Estimated temperature: `25 °C + estimated power × 0.55 °C/W`.
- Effective clock: `base clock × throttle factor`.

This is a steady-state, transparent game approximation. Voltage, process node, cache capacity, die area, ISA, topology and microarchitecture are not assigned additional multipliers in this first model; IPC and SIMD are explicit performance inputs, while TDP provides the power envelope. Do not compare these results to real-world benchmark scores.

## Determinism and tests

The functions are pure for a given configuration and workload. Boundary/behavior tests cover determinism, workload differentiation, Amdahl scaling, SIMD and memory effects, insufficient capacity, thermal limits, and GPU input bounds. UI results are recomputed only on user action and cleared when the draft configuration changes.
