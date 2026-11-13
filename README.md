# SILICON-DYNASTY

## SILICON DYNASTY — Documentation Package
Version 2.0 | Android | React + TypeScript + Vite + Capacitor | RU/EN

## Contents
- docs/GDD.md — game design
- docs/TDD.md — technical requirements
- docs/ARCHITECTURE.md — application and simulation architecture
- docs/ROADMAP.md — 14 development stages
- docs/UI_UX_SPECIFICATION.md — interface specification
- docs/GAME_BALANCE.md — simulation and balance rules
- docs/CPU_DESIGN.md — CPU project model and validation limits
- docs/QA_STRATEGY.md — testing strategy
- docs/SAVE_SYSTEM.md — persistence and migrations
- docs/LOCALIZATION.md — Russian and English
- docs/ANDROID_RELEASE.md — Android release
- docs/stages/STAGE_01.md … STAGE_14.md — stage briefs

Important: OS development and AI training are in-game simulations, not real OS builds or real large-model training on the Android device. Complete one stage at a time and stop for approval.

## Run the application

Requirements: Node.js 22.12+ and npm.

```bash
npm install
npm run dev
```

Available checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Current implementation

Stages 1–2 establish the React + TypeScript + Vite application, Capacitor configuration, responsive navigation, RU/EN settings, company profile, and the CPU Designer. CPU configurations are domain-validated and saved as versioned project snapshots. Stage 2 migrates Stage 1 saves without discarding company, date, or settings. IndexedDB is the primary browser save store; localStorage is used only where IndexedDB is unavailable. Save data is validated when read and written.

Game-domain code is kept outside React:

- `src/game/models/` — company and versioned game-state models.
- `src/game/models/cpu.ts` — CPU configuration, compatibility rules, project versions, and validation.
- `src/game/engine/` — deterministic simulation primitives.
- `src/game/application/` — typed commands that validate and persist state.
- `src/storage/repositories/` — storage boundary and browser adapters.
- `src/features/` — dashboard, company profile, CPU Designer, and settings screens.
- `src/localization/` — centralized Russian and English UI strings and formatters.

CPU performance benchmarks, research gates, manufacturing cost calculations, and later game systems are intentionally left to their roadmap stages; the dashboard does not use mock metrics for them.
