# Architecture — SILICON DYNASTY

## Layers
1. Presentation: React screens, components, forms and charts.
2. Application: commands, queries and use-case orchestration.
3. Domain: models, rules, formulas and game systems.
4. Simulation Core: time, events, dependencies and world updates.
5. Infrastructure: IndexedDB, repositories, migrations and Capacitor adapters.

## Suggested source layout
```text
src/
  app/ components/ features/
  game/
    engine/ models/ systems/ formulas/ events/ progression/ balance/
  localization/ru/ localization/en/
  storage/database/ storage/repositories/ storage/migrations/ storage/save/
  workers/
  styles/ utils/
```

Feature modules: dashboard, company, CPU, GPU, components, research, benchmark, economy, manufacturing, market, operating-system, ai-lab, software-studio, devices, cloud, ecosystem and settings.

## Core services
- SimulationEngine: orchestrates deterministic simulation steps.
- TimeEngine: game date, pause and time speed.
- EventEngine: event conditions and effects.
- DependencyEngine: technology and product prerequisites.
- Domain systems: hardware, benchmark, research, economy, market, OS, AI, software, devices, cloud and ecosystem.

## Command flow
UI action → application command → domain validation → domain system → updated state → persistence boundary → UI refresh.

## Simulation order
Document and keep a fixed order, for example: events; research/development; manufacturing; delivery/sales; finance; competitors; reputation/ecosystem; date advancement. Changing order may alter balance and must be tested.

## Worker boundary
Workers receive serializable snapshots and explicit commands. They must not access React state or mutate the database outside a documented protocol.

## Avoid
God objects, formulas in UI components, domain logic in hooks, hidden global mutation, duplicate sources of truth and circular imports.
