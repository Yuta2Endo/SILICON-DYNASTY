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
- Domain systems: hardware, benchmark, research, economy, market, component compatibility, OS, AI, software, devices, cloud and ecosystem.

## Command flow
UI action → application command → domain validation → domain system → updated state → persistence boundary → UI refresh.

## Simulation order

The implemented daily pipeline is fixed and tested: advance research; deliver due CPU production orders; apply due competitor actions; simulate CPU sales and market share; simulate component sales against component demand, price, performance, reputation, marketing and available cash; advance active AI training jobs deterministically; settle finance (operating costs, loan interest, emergency funding and profit tax); update reputation; advance the game date. Changing the order may alter balance and requires tests for the affected stage. Stage 05 economy details are in [`ECONOMY_MARKET.md`](ECONOMY_MARKET.md); Stage 06 components and compatibility are in [`COMPONENTS.md`](COMPONENTS.md).

The OS Lab does not run in the daily pipeline yet. `src/game/models/os.ts` owns OS configuration types, project/version/release rules, historical gates, system-service validation, hardware-driver compatibility and strict parsing; `src/game/models/os-applications.ts` owns the application catalog and requirement checks; `src/game/formulas/os.ts` owns deterministic kernel, system, ecosystem and release calculations; `src/game/engine/os-release.ts` charges staged release costs through the finance ledger. `OsDesignerPage` is a third tab in the product-development workspace and calls application commands; it is explicitly presented as a game simulation. Stage 07 details are in [`OS_LAB.md`](OS_LAB.md); Stage 08 system services and hardware-driver checks are in [`OS_SYSTEMS.md`](OS_SYSTEMS.md); Stage 09 ecosystem, application and release rules are in [`OS_ECOSYSTEM.md`](OS_ECOSYSTEM.md).

The AI Lab is the fourth product-development tab. `src/game/models/ai.ts` owns AI configurations, dataset validation, project versions, training/deployment snapshots and strict parsing; `src/game/formulas/ai.ts` owns model-quality, dataset, appeal, GPU/VRAM/RAM/storage requirements, deterministic training progress and optimization/deployment metrics; `src/game/engine/ai-training.ts` charges training, optimization and deployment costs through the finance ledger. Active training jobs advance once per game day before finance settlement. `AiDesignerPage` calls application commands and presents itself as a game simulation. Stage 10 details are in [`AI_LAB.md`](AI_LAB.md); Stage 11 training/deployment rules are in [`AI_TRAINING.md`](AI_TRAINING.md).

Devices and cloud are the fifth product-development tab. `src/game/models/devices.ts` owns device references, platform matching, slot rules, version histories and strict parsing; `src/game/models/cloud.ts` owns cloud configuration, server references and limits. `src/game/formulas/devices.ts` derives device metrics, cost, power, thermal load and ecosystem synergy from canonical CPU/component/OS/AI projects; `src/game/formulas/cloud.ts` derives capacity, availability, operating cost and capex from a saved server device. Device and cloud projects do not yet run in the daily sales pipeline. Stage 12 details are in [`DEVICES_CLOUD.md`](DEVICES_CLOUD.md).

## Save management

`src/storage/repositories/SaveManagement.ts` defines the optional save-management contract on top of `GameStateRepository`: overview, manual slots, slot deletion and backup restore. Both the IndexedDB and localStorage repositories implement it with separate autosave, recovery-backup, slot and metadata records. `src/game/application/save-transfer.ts` owns the versioned JSON export/import format; imports are validated with `parseGameState` before any commit. `src/game/application/game-application.ts` exposes save-management commands and never overwrites the current save with an invalid import. Tutorial and achievement progress is derived from existing state in `src/game/models/game-experience.ts`, not persisted separately. Stage 13 details are in [`SAVE_GAME_EXPERIENCE.md`](SAVE_GAME_EXPERIENCE.md).

## Analytics

`src/game/formulas/analytics.ts` derives corporate, market and technology reports from existing finance records, market summaries, research state and product projects. It does not persist a report snapshot and does not change the daily pipeline. `src/features/analytics/AnalyticsPanel.tsx` renders the third Market/Finance tab with 7/30/90-day ranges, an accessible SVG revenue/expense chart and local CSV export. Details are in [`ANALYTICS.md`](ANALYTICS.md).

## UI resilience and limits

`src/app/useGameSession.ts` owns game-state loading, command execution, save overview, backup restore, command feedback and native status-bar synchronization; `App.tsx` keeps navigation, draft guards and menu state. `src/components/AppErrorBoundary.tsx` wraps the application and renders a localized reload screen after an uncaught render error. Project version histories are capped at 100 new versions, CPU market products at 100 and component products at 60. Imported save payloads are capped at 5 MiB before parsing. These caps are enforced on new writes and releases, not in save parsers, so existing saves remain loadable. Every application command autosaves; native Back-button and app-state lifecycle handling is deferred to the Android integration stage with `@capacitor/app`. Stage 02 details are in [`stages/PLUGIN_STAGE_02_REPORT.md`](stages/PLUGIN_STAGE_02_REPORT.md).

## Worker boundary
Workers receive serializable snapshots and explicit commands. They must not access React state or mutate the database outside a documented protocol.

## Avoid
God objects, formulas in UI components, domain logic in hooks, hidden global mutation, duplicate sources of truth and circular imports.
