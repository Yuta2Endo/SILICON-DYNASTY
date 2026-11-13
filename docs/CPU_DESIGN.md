# CPU Designer — Model and Validation

This document records the Stage 2 CPU project contract. It describes the domain model and validation boundaries, not a second UI/UX specification; visual and interaction rules remain in `docs/UI_UX_SPECIFICATION.md`.

## Project and version behavior

- A CPU project has an ID, editable name, current configuration, and an ordered version history.
- Creating a project stores a valid 1995-era baseline as version 1.
- Saving edits creates a new immutable configuration snapshot. Version numbers start at 1 and increase by one.
- Restoring a prior snapshot loads it into the editor as a draft. Saving that draft creates another version; it does not rewrite history.
- The current project configuration must match its latest saved version.
- CPU projects are part of the versioned game state and pass through `GameStateRepository`.

## Configuration fields and limits

| Field | Unit / options | Valid range or rule |
| --- | --- | --- |
| Project name | Text | 2–40 trimmed characters |
| ISA | x86, ARM, RISC-V | One supported option |
| Die topology | Monolithic, chiplet | One supported option |
| Microarchitecture | In-order, out-of-order, hybrid | One supported option |
| Physical cores | Cores | Integer 1–128 |
| Threads | Threads | Integer 1–512; at least one and no more than four per core |
| Base clock | MHz | Integer 25–10,000 |
| IPC | Instructions per cycle | 0.1–8.0 in 0.1 increments |
| L1 cache | KB per core | Integer 4–2,048 |
| L2 cache | MB per core | 0.125–64 in 0.125 increments |
| L3 cache | MB per CPU | 0–1,024 |
| Memory type | SDR SDRAM, DDR, DDR2–DDR5, LPDDR | One supported option |
| Memory channels | Channels | Integer 1–16 |
| Maximum memory | GB | Integer 1–4,096 |
| SIMD extensions | MMX/SSE/AVX2/AVX-512, NEON, RISC-V Vector | Must be compatible with the selected ISA; duplicates are rejected |
| Process node | nm | Integer 2–1,000 |
| Voltage | mV | Integer 250–5,000 |
| TDP | W | Integer 1–1,500 |
| Die area | mm² | 1–2,000 |
| Target unit cost | USD | 1–100,000 |

The numeric bounds define the Stage 2 game-design envelope. Era/research gating is not implemented yet and belongs to later progression stages.

## Default baseline

New projects use a small 1995-era configuration: x86, monolithic, in-order, one core/thread at 100 MHz, 350 nm, SDR memory, 16 KB L1/core, 0.25 MB L2/core, 10 W TDP, and an explicitly entered target cost of USD 80. These starting values are provisional and are not a balance result.

## Calculated values and non-goals

- The editor derives total cache capacity and threads per core from saved inputs. It does not invent a benchmark score.
- The target unit cost is an explicit design input, not a calculated manufacturing cost. Yield, packaging, manufacturing, and market price belong to later stages.
- Workload benchmarks and CPU performance formulas belong to Stage 3.
- Research prerequisites and historical technology unlocks belong to Stage 4.

## Save compatibility

Stage 2 advances the game-state schema from version 1 to version 2. A version 1 save is parsed into the same company/date/settings state with an empty `cpuProjects` list, then written in the new schema by the repository. Invalid or unsupported saves are rejected and left intact.
