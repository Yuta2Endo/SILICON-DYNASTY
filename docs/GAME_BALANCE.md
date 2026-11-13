# Game Balance & Simulation Rules

## Principles
All formulas must have documented inputs, units, bounds and tests. Separate base values, modifiers, penalties and final outputs. Avoid division by zero, overflow and unexplained random results. Use seeded RNG only for explicitly stochastic systems.

## CPU
A conceptual throughput baseline may use IPC × effective frequency × effective cores, but final calculations must account for workload parallelism, memory, threads, power and thermal constraints. Do not assume every workload scales linearly across all cores. Stage 2 stores the target unit cost as an explicit project input; it is not presented as a calculated manufacturing cost. CPU benchmark formulas belong to Stage 3.

## GPU
Account for compute units, clock, architecture efficiency, memory bandwidth/capacity, workload type and power/thermal limits. Gaming, rendering, compute and AI must not collapse into one universal score.

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
