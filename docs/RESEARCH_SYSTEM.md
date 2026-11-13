# Technology Research

Stage 4 adds deterministic, in-game technology research. It does not perform real-world operating-system development, AI training, or hardware design. `src/game/models/research.ts` is the source of truth for technology definitions, and `src/game/engine/research.ts` owns availability, cost and progress rules.

## Eras and categories

| Era | Game years |
| --- | --- |
| PC foundation | 1995–1999 |
| Connected computing | 2000–2009 |
| Mobile and cloud | 2010–2019 |
| Accelerated AI | 2020–2034 |
| Autonomous systems | 2035–2049 |
| Future computing | 2050 onward |

Categories are CPU, memory, graphics, network, mobile, AI, robotics, and future computing. Availability is based on the technology's catalog year, not merely the current era label.

## Technology catalog

Costs are nominal in-game USD. Durations are Next Day ticks; a project starts at zero progress. A dash means no prerequisite.

| Technology | Year | Category | Cost | Days | Prerequisites | Declared unlock |
| --- | ---: | --- | ---: | ---: | --- | --- |
| Out-of-order execution | 1995 | CPU | $12,000 | 20 | — | `cpu.out-of-order` |
| ARM ISA | 1995 | CPU | $10,000 | 25 | — | `cpu.arm-isa` |
| MMX | 1996 | CPU | $8,000 | 15 | — | `cpu.mmx` |
| Internet protocols | 1995 | Network | $10,000 | 20 | — | `network.internet` |
| 3D graphics | 1998 | Graphics | $25,000 | 35 | — | `graphics.3d` |
| SSE | 1999 | CPU | $18,000 | 30 | MMX | `cpu.sse` |
| DDR memory | 2000 | Memory | $20,000 | 30 | — | `memory.ddr` |
| LPDDR memory | 2001 | Memory | $28,000 | 40 | DDR | `memory.lpddr` |
| DDR2 memory | 2003 | Memory | $30,000 | 35 | DDR | `memory.ddr2` |
| Multicore processors | 2005 | CPU | $50,000 | 60 | Out-of-order execution | `cpu.multicore` |
| ARM NEON | 2005 | CPU | $35,000 | 45 | ARM ISA | `cpu.neon` |
| DDR3 memory | 2007 | Memory | $45,000 | 45 | DDR2 | `memory.ddr3` |
| RISC-V ISA | 2010 | CPU | $45,000 | 55 | — | `cpu.risc-v-isa` |
| Cloud computing | 2010 | Network | $65,000 | 60 | Internet protocols | `cloud.computing` |
| Mobile SoC | 2012 | Mobile | $90,000 | 90 | ARM ISA, LPDDR, Multicore | `mobile.soc` |
| AVX2 | 2013 | CPU | $70,000 | 70 | SSE | `cpu.avx2` |
| DDR4 memory | 2014 | Memory | $90,000 | 65 | DDR3 | `memory.ddr4` |
| AVX-512 | 2016 | CPU | $120,000 | 90 | AVX2 | `cpu.avx512` |
| Chiplet design | 2017 | CPU | $130,000 | 100 | Multicore processors | `cpu.chiplets` |
| Hybrid cores | 2020 | CPU | $180,000 | 100 | Multicore processors, Out-of-order execution | `cpu.hybrid-cores` |
| DDR5 memory | 2020 | Memory | $200,000 | 100 | DDR4 | `memory.ddr5` |
| RISC-V Vector | 2020 | CPU | $130,000 | 80 | RISC-V ISA | `cpu.risc-v-vector` |
| Machine learning | 2020 | AI | $250,000 | 120 | Cloud computing, 3D graphics | `ai.machine-learning` |
| AI accelerators | 2025 | AI | $500,000 | 150 | Machine learning | `ai.accelerators` |
| Robotics | 2035 | Robotics | $800,000 | 180 | AI accelerators, Mobile SoC | `robotics.control` |
| Autonomous systems | 2040 | Robotics | $1,500,000 | 240 | Robotics | `robotics.autonomy` |
| Future computing | 2050 | Future | $3,000,000 | 365 | Autonomous systems | `future.computing` |

## Availability, cost and progress

The engine reports one of these availability states: unknown, completed, researching, future, locked, busy, unaffordable, or available. A technology can start only if it exists in the catalog, its availability year has arrived, all prerequisites are completed, no other project is active, and the current company balance covers the full cost. Starting research debits the catalog cost to cents and records it on the active project and in cumulative research spending; insufficient funds never make the balance negative.

Each `advanceGameDay` call advances the calendar by one day and active research by one progress day. When progress reaches the catalog duration, the project completes, is added to completed research, and its declared unlock IDs become available. No random rolls, wall-clock progress, staffing model, cancellation, or refund are used in this stage.

## Effects and CPU feature gates

Completed technologies grant only their listed unlock IDs. The following CPU capabilities are checked when creating a CPU project or saving a CPU version:

| CPU configuration feature | Required unlock |
| --- | --- |
| ARM ISA | `cpu.arm-isa` |
| RISC-V ISA | `cpu.risc-v-isa` |
| Out-of-order microarchitecture | `cpu.out-of-order` |
| Hybrid cores | `cpu.hybrid-cores` |
| More than one physical core | `cpu.multicore` |
| Chiplet topology | `cpu.chiplets` |
| MMX, SSE, AVX2, AVX-512, NEON, RISC-V Vector | Corresponding `cpu.*` unlock |
| DDR, DDR2, DDR3, DDR4, DDR5, LPDDR | Corresponding `memory.*` unlock |

The baseline x86, in-order, monolithic, single-core, SDR configuration needs no research. Other catalogued effects (graphics, network/cloud, mobile, AI, robotics and future computing) are persisted unlock IDs for later product systems; this stage does not fabricate GPU projects or claim those later systems are implemented.

## Save migration and catalog validation

Current save schema is v3. Schema v1 saves migrate with no CPU projects; schema v2 CPU projects and all saved versions are preserved. Migration derives `legacyUnlockIds` from capabilities found across all saved CPU version snapshots so existing designs remain usable. This does not mark their research technologies completed, alter the company balance, or grant unrelated effects. Active project metadata, progress, cost, completed technology IDs, legacy IDs and cumulative spending are validated and persisted.

The catalog validator rejects duplicate IDs, invalid years/costs/durations, unknown or duplicate prerequisite/unlock IDs, self-dependencies, and dependency cycles before the catalog can be used.
