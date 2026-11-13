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
- docs/ANDROID_RELEASE.md — Android build, signing and release QA
- docs/RELEASE_NOTES.md — release notes and known limitations
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

Stages 1-14 are implemented. Stage 14 provides the Android release candidate;
the debug APK passed real-device install, launch and save-lifecycle QA, while
signed release artifacts and Android profiling remain release-gate tasks. The game includes the company
dashboard, research, finance and CPU market; CPU and component designers; OS
architecture, system services, drivers, security, updates and Alpha/Beta/RC/Stable
releases; software ecosystem and app compatibility; AI model/data lab with
deterministic training and deployment; device and cloud configurators; save slots,
backup, import/export and recovery; tutorial, achievements and RU/EN localization.

Save data is validated when read and written. IndexedDB is the primary browser
store; localStorage is used only where IndexedDB is unavailable. The current
save schema is 11 and older saves migrate without discarding existing data.

Game-domain code is kept outside React:

- `src/game/models/` — versioned game-state models and validation.
- `src/game/formulas/` — deterministic simulation and balance formulas.
- `src/game/engine/` — daily pipeline, market, finance, OS releases and AI training.
- `src/game/application/` — typed commands that validate and persist state.
- `src/storage/repositories/` — storage boundary, browser adapters and save management.
- `src/features/` — dashboard, designers, market, settings and supporting screens.
- `src/localization/` — centralized Russian and English UI strings and formatters.

## Android build

The Capacitor Android project is in `android/`. See `docs/ANDROID_RELEASE.md`
for prerequisites, signing, artifacts and the device QA checklist.

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
npm run build
npx cap sync android
Set-Location android
.\gradlew.bat assembleDebug --no-daemon
```

The debug APK is written to
`android/app/build/outputs/apk/debug/app-debug.apk`. Release APK/AAB builds are
unsigned until a private upload key is configured. The debug APK passed
real-device install, launch and save-lifecycle QA; the signed release artifact
still needs device verification.
