# Plugin Integration Audit

**Date:** 2026-11-14
**Stage:** Plugin Stage 01 — Dependency Audit
**Status:** COMPLETED
**Scope:** audit only; no dependencies installed and no application source changed.

## Executive summary

SILICON DYNASTY already has a complete, tested game loop and a deliberately dependency-light stack. The proposed runtime libraries would duplicate existing state, storage, localization, animation, charting or networking mechanisms, or would add a large Android/WebView cost without a demonstrated product need. The recommended decision is therefore conservative:

- **Keep:** React 19, TypeScript 5.9, Vite 8, Capacitor 8, Vitest 5, `lucide-react`, `@fontsource-variable/manrope`, `@capacitor/haptics`, `@capacitor/status-bar`.
- **Adopt later:** `@capacitor/app` in Stage 06; `@capacitor/filesystem` and optionally `@capacitor/share` for native backup portability; `fast-check` and Playwright as dev-only tools in Stage 07.
- **Defer:** `decimal.js` until a reproducible precision defect exists.
- **Reject for now:** Zustand, XState, ECharts, echarts-for-react, Dexie, Motion, i18next/react-i18next, TanStack Query, Howler, Capacitor Preferences and Capacitor Network.
- **Do not change:** save schema 11, existing migrations, domain/formula/engine boundaries, RU/EN dictionary, design tokens, or the current deterministic daily pipeline.

The next stage should improve the existing architecture rather than replace it: reduce `App.tsx` wiring, add an error boundary and lifecycle handling, cap unbounded histories, guard import size, and add invariant/property tests.

## Method and constraints

The audit reviewed:

- `README.md`, `docs/GDD.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/SAVE_SYSTEM.md`, `docs/GAME_BALANCE.md`, `docs/UI_UX_SPECIFICATION.md`, `docs/QA_STRATEGY.md`, release and stage documents.
- `package.json`, `package-lock.json`, Vite and TypeScript configuration.
- `src/game/models`, `src/game/formulas`, `src/game/engine`, `src/game/application`, `src/storage`, `src/features`, `src/app` and the test suite.
- Current npm metadata and Bundlephobia estimates for candidate versions.
- The existing Android project, Capacitor plugin list and a debug build.

Constraints applied:

- No rewrite and no replacement of working domain logic.
- No save-schema increase for dependency work.
- No duplicate source of truth.
- No dependency without a measurable problem and a migration/rollback path.
- No claim of Android compatibility without a build or device check.
- No destructive Git operations.

## Baseline

| Check | Result |
| --- | --- |
| Branch / HEAD | `main` / `6f1de4b`, clean and in sync with `origin/main` |
| Save schema | 11, migrations 1–11 tested |
| Tests | **PASS — 44 files / 251 tests**, Vitest 5.1.0, 14.61 s |
| Typecheck | PASS — app and node configs |
| Lint | PASS — ESLint, `--max-warnings 0` |
| Production build | PASS — Vite 8.3.8, 2,147 modules, 665 ms |
| Main bundle | 356.76 kB (97.14 kB gzip) |
| React vendor | 218.77 kB (68.25 kB gzip) |
| CSS | 121.57 kB (22.86 kB gzip) |
| Lazy feature chunks | 3.33–38.71 kB |
| `test:e2e` | **NOT AVAILABLE** — no script |
| Android sync | PASS — 2 plugins, 0.121 s |
| Android debug build | PASS — 153 tasks, 19 s, APK 4,497,653 bytes |
| Android device | No device attached (`adb devices` empty) |

No bundle exceeds 500 kB after the existing code-splitting work, so the old release-note warning is stale.

## Existing architecture

### Layers and boundaries

- **Presentation:** `src/features/*`, `src/components/*`, `src/app/*`; React and DOM only.
- **Application:** `GameApplication` command facade; loads state, validates commands, commits through the repository.
- **Domain:** pure models for CPU, components, OS, AI, devices, cloud, market, finance, research and game state.
- **Simulation:** deterministic formulas and engine systems; no React dependency.
- **Infrastructure:** custom IndexedDB/localStorage repository with slots, backup, import/export and migrations.

The daily pipeline is fixed and tested:

1. Research progress.
2. CPU production delivery.
3. Competitor actions.
4. CPU market sales/share.
5. Component market sales.
6. AI training progress.
7. Finance settlement.
8. Reputation update.
9. Date advance.

OS releases, devices and cloud remain design/configurator systems and are not yet commercial daily systems.

### Existing capabilities that already solve proposed needs

| Proposed need | Existing implementation | Audit conclusion |
| --- | --- | --- |
| Client state management | Single `GameState`, `GameApplication` cache, command facade | Zustand/XState not justified |
| Persistent database | Custom IndexedDB repository with fallback, backup, slots, migrations | Dexie not justified |
| Charts | Accessible custom SVG finance chart | ECharts not justified |
| Localization | Typed RU/EN dictionary, Intl formatters | i18next migration not justified |
| Animation | CSS transitions/keyframes, reduced-motion support | Motion not justified |
| Remote data cache | No remote API or backend | TanStack Query not applicable |
| Audio | No audio assets or audio design | Howler not applicable |
| Native storage settings | Settings are part of `GameState` and save system | Preferences unsuitable |
| Network status | Game is offline-first | Network plugin not needed |
| Native lifecycle | Status bar/haptics exist; no Back/appState handler | `@capacitor/app` is the one clear native gap |
| Financial precision | Integer-cent-style rounding at transaction boundaries; $0.01 parser tolerance | Decimal.js deferred |
| Test runner | Vitest with 251 tests | Keep Vitest |
| E2E / invariants | No Playwright, no property testing | Add dev-only in Stage 07 |

## Dependency comparison

Bundle figures are Bundlephobia minified/gzip estimates for the proposed package alone; they are not measured additions to this application and do not account for tree-shaking. Compatibility is assessed against React 19.3, TypeScript 5.9, Vite 8.3 and Capacitor 8.6.

| Name | Current version | Proposed version | Purpose | Compatibility | Bundle size impact | Android impact | Integration complexity | Priority | Justification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Zustand | none | 5.1.0 | Global state store | React >=18; compatible | 833 B / 491 B gzip | Negligible | Medium | P3 reject | One state tree and a command facade already exist; adding a second store creates duplicate ownership. |
| XState | none | 5.33.4 | State machines | Framework-agnostic; compatible | 46.8 kB / 14.5 kB gzip | Moderate JS parse cost | High | P3 reject | Release/training workflows are already explicit domain state; no complex UI state machine justifies the dependency. |
| Decimal.js | none | 10.6.0 | Decimal arithmetic | Pure JS; compatible | 32.3 kB / 12.7 kB gzip | Small but avoidable | High | P2 defer | Current rounding is consistent and tested; changing all finance serialization/formulas needs a reproduced precision bug. |
| Apache ECharts | none | 6.1.0 | Charts | Framework-agnostic; compatible | 1.11 MB / 368 kB gzip | Large WebView/parse/memory cost | High | P3 reject | One 14-day SVG chart does not justify a large chart runtime; accessible SVG/CSS meets current needs. |
| echarts-for-react | none | 3.0.6 | React ECharts wrapper | React >=16; compatible | 10.2 kB / 3.6 kB gzip | Adds to ECharts cost | Medium | P3 reject | Rejected together with ECharts. |
| Dexie.js | none | 4.4.7 | IndexedDB wrapper | Browser/WebView; compatible | 97.9 kB / 31.1 kB gzip | Moderate | High | P3 reject | Custom repository already provides backup, slots, migrations and tests; replacement has no measurable benefit. |
| Motion | none | 14.14.0 | Animation library | React 18/19; compatible | 187.9 kB / 64.3 kB gzip | Moderate | Medium | P3 reject | CSS animation and reduced-motion support already exist; no gesture/layout animation requirement. |
| i18next | none | 27.1.1 | i18n runtime | Framework-agnostic; compatible | 49.0 kB / 15.4 kB gzip | Small but avoidable | High | P3 reject | Typed RU/EN dictionary already enforces shape parity; migration would risk every screen. |
| react-i18next | none | 18.0.1 | React i18n bindings | React >=18, i18next >=27 | 26.0 kB / 10.4 kB gzip | Small but avoidable | High | P3 reject | Rejected with i18next. |
| TanStack Query | none | 5.107.1 | Server-state cache | React 18/19; compatible | 46.2 kB / 13.3 kB gzip | Small but avoidable | Medium | P3 reject | No remote API, no backend, no cache invalidation problem. |
| Howler.js | none | 2.2.4 | Audio playback | Browser/WebView; compatible | 36.5 kB / 9.7 kB gzip | Small but unused | Low | P3 reject | No audio system or assets; adding playback alone does not create a feature. |
| fast-check | none | 4.10.2 | Property-based tests | Dev-only; Node/Vitest compatible | Dev-only 170.5 kB / 58.0 kB gzip | None in app bundle | Low | P1 adopt Stage 07 | Useful for finance totals, save round-trips, caps and formula invariants. |
| Playwright | none | 1.65.0 | Browser E2E | Dev-only; Node compatible | Dev-only 4.46 MB / 1.15 MB gzip | Does not test Android WebView | Medium | P1 adopt Stage 07 | Fills the missing `test:e2e` gap for desktop flows; not a substitute for Android device QA. |
| Vitest | 5.1.0 | 5.1.0 | Unit/UI tests | Current stack | Already installed | None | None | P0 retain | 44 files / 251 tests already use it. |
| @capacitor/preferences | none | 8.0.1 | Native key-value storage | Capacitor core >=8 | 354 B / 264 B gzip | Small | Medium | P3 reject | Settings are already in `GameState`; large saves must not be split across storage systems. |
| @capacitor/filesystem | none | 8.1.5 | Native file access | Capacitor core >=8 | 1.47 kB / 786 B gzip | Scoped-storage behavior needs device QA | Medium | P2 adopt Stage 06 | Native backup export/import is a real portability gap; keep web Blob path as fallback. |
| @capacitor/local-notifications | none | 8.3.1 | Local reminders | Capacitor core >=8 | 618 B / 390 B gzip | Android 13 notification permission | Medium | P2 optional Stage 06 | Useful for research/training completion, but requires permission UX and device testing. |
| @capacitor/network | none | 8.0.1 | Network status | Capacitor core >=8 | 342 B / 259 B gzip | Small | Low | P3 reject | Offline game with no remote dependency. |
| @capacitor/app | none | 8.1.2 | Back button/app lifecycle | Capacitor core >=8 | 349 B / 267 B gzip | Back handling and resume behavior | Medium | P1 adopt Stage 06 | Clear native gap: hardware Back and `appStateChange` autosave/lifecycle handling. |
| @capacitor/share | none | 8.0.3 | Native share sheet | Capacitor core >=8 | 355 B / 268 B gzip | Adds share intent | Medium | P2 optional Stage 06 | Pairs with Filesystem for backup export, but is not required for core saves. |
| @capacitor/haptics | 8.0.2 | 8.0.2 | Haptic feedback | Installed | Already installed | Already integrated | None | P0 keep | Used by command feedback. |
| @capacitor/status-bar | 8.0.4 | 8.0.4 | Status-bar theme | Installed | Already installed | Already integrated | None | P0 keep | Synced with light/dark theme. |

## Detailed decisions

### Runtime state and workflow libraries

The application already has one canonical `GameState`, one command facade and explicit domain records for releases and training. Zustand would introduce a second state owner; XState would move workflow logic out of tested domain objects. Neither solves a current defect. Revisit only if a future feature requires independent multi-store subscriptions or a genuinely complex UI workflow.

### Finance precision

`roundUsd` rounds at transaction boundaries and parsers recompute totals with a $0.01 tolerance. The test suite covers transactions, taxes, loans, emergency financing and save parsing. Decimal.js would touch serialization, formulas, migrations and every financial display. Defer until a reproducible defect is documented; do not add it speculatively.

### Charts and analytics

The existing finance chart is a custom accessible SVG with labels and legend. Stage 03 analytics can be built from finance records, market summaries and project data with SVG/CSS. ECharts would add a large runtime to a mobile WebView for a small number of charts. Reject unless a later requirement needs zooming, brushing or large interactive datasets and profiling proves the custom approach insufficient.

### Storage

The custom repository already implements current save, backup, slots, metadata, migration, import validation and localStorage fallback. Dexie would replace a tested abstraction without improving the product. Keep the abstraction; improve import size limits and recovery UX internally.

Capacitor Preferences is not a save database. Splitting settings from `GameState` would create two sources of truth and complicate export/migration.

### Localization

The typed dictionary is a strength: `const en: Translation` forces RU/EN shape parity. i18next would add runtime lookup, resource loading and a second translation format. No pluralization requirement was found; if one appears, add a small `Intl.PluralRules` helper rather than a full i18n framework.

### Motion and UX

CSS transitions/keyframes already provide page entry, button press and reduced-motion behavior. Stage 05 should improve focus, feedback, empty/error states and mobile safe areas with CSS/WAAPI. Motion is not justified without a specific gesture/layout animation requirement.

### Native plugins

- `@capacitor/app` is the highest-value native addition: hardware Back, app pause/resume and lifecycle-aware autosave cannot be solved reliably in the web layer.
- `@capacitor/filesystem` + `@capacitor/share` improve backup portability on Android, where browser download behavior is inconsistent. Keep the web Blob path.
- Local Notifications is optional and should wait for a permission UX and device test plan.
- Network is unnecessary for an offline-first game.
- Preferences would duplicate save settings and is rejected.

### Testing tools

Vitest remains the unit/UI runner. Playwright and fast-check are dev-only and should be introduced in Stage 07, not in Stage 01. Playwright covers desktop browser flows; it does not validate Android WebView behavior. fast-check should target finance totals, save round-trips, cap invariants and formula bounds.

## Game-system gap analysis

### Economy

Existing: finance ledger, taxes, loans, payroll/overhead, six market segments, six competitors, CPU inventory/production, component JIT sales, daily market share and reputation.

Missing: inflation/macro cycles, regional markets, retail channels, campaigns beyond a daily budget, hiring/departments, monthly/quarterly reporting, M&A, patents/licensing, competitor refreshes/bankruptcies, component inventory/stockouts, commercial integration for OS/AI/devices/cloud.

Recommended Stage 04 direction: add employee/department and reporting systems first; then inflation/cycles and competitor refreshes; then commercial integration for OS/AI/devices/cloud. Avoid adding a second market engine.

### Technology

Existing: 27-item research catalog, CPU/component projects and versions, benchmark/thermal model, OS releases, AI training/deployment, device/cloud configurators.

Missing: GPU-specific research depth, process-node gating, product lifecycle/retirement, refresh cadence, CPU product cap, historical availability rules.

Recommended: make process nodes and key GPU capabilities research-gated; add lifecycle/retirement to existing product records; cap product/version growth. Do not create a parallel technology tree.

### Corporate

Existing: company name, balance, reputation, employee count.

Missing: hiring, departments, specialists, management decisions, reporting, M&A.

Recommended: extend the company domain with employees/departments and derive payroll/capacity from them. This is a domain extension, not a dependency decision.

### Software ecosystem

Existing: OS kernel/systems/ecosystem/releases, six-app compatibility catalog, platform profiles.

Missing: software studio/app releases/sales, retention/adoption, developer ecosystem growth, distribution economics.

Recommended: add app projects and releases using existing OS/application compatibility, finance and market primitives. Do not add an app-store runtime dependency.

### AI ecosystem

Existing: AI model/data lab, deterministic training, optimization, deployment, hardware requirements.

Missing: commercial AI products, deployment opex/revenue, customer segments, hardware fit against owned components, research gating.

Recommended: integrate deployments into the existing finance/market pipeline; no new library needed.

### Devices and cloud

Existing: device/cloud configurators, compatibility and metrics, ecosystem synergy.

Missing: device sales, cloud customers, capacity utilization, opex/revenue, segment demand.

Recommended: add commercial device/cloud operations through the existing finance ledger and market summaries. Keep references canonical; do not duplicate component specs.

## Performance and architecture risks

- **Unbounded growth:** CPU market products and project-version histories have no cap; long sessions can grow saves and render lists. Add caps or archival rules in Stage 02.
- **Import size:** import reads the whole file and validates without a size guard. Add a documented maximum and a clear error.
- **App wiring:** `App.tsx` is large and owns many callbacks/draft flags. Extract hooks/command groups without changing domain behavior.
- **Rendering:** pages are large but already lazy-loaded; no measured render bottleneck yet. Profile before adding memoization or workers.
- **No error boundary:** a render failure can blank the app. Add a top-level boundary with recovery/reload actions.
- **Android lifecycle:** no Back button or `appStateChange` handling. Add `@capacitor/app` in Stage 06 and verify on device.
- **Daily pipeline:** current loops are bounded by segment/product/competitor counts and history caps; no profiling evidence justifies Web Workers. Revisit only after measurement.
- **Test runtime:** jsdom setup dominates test time (44 environments, ~70% tracked time). This is acceptable for now; optimize only if it blocks development.

## Recommended implementation plan

### Stage 02 — Core improvements (no new runtime dependency)

1. Extract command/state hooks from `App.tsx`; keep `GameApplication` as the command boundary.
2. Add a top-level error boundary and recovery UI.
3. Cap CPU market products and project-version histories; add tests.
4. Add import file-size guard and clearer recovery errors.
5. Add finance/save invariant tests; consider fast-check only if approved early.
6. Fix stale bundle-size and release documentation.
7. Add lifecycle-safe autosave hooks in preparation for native integration.

### Stage 03 — Analytics

Build corporate/market/technology reports from existing ledger and summaries using accessible SVG/CSS. No ECharts. Add date-range and exportable summaries only if they reuse existing state.

### Stage 04 — Simulation improvements

Add employees/departments, inflation/cycles, process-node research gating, product lifecycle, competitor refreshes and commercial integration for OS/AI/devices/cloud. Preserve the fixed pipeline order and deterministic tests.

### Stage 05 — UX

Improve onboarding, dashboard command center, design-system primitives, focus/feedback, mobile safe areas and reduced motion. No Motion dependency.

### Stage 06 — Android integration

Adopt `@capacitor/app` first; then `@capacitor/filesystem` and optional `@capacitor/share`; evaluate Local Notifications only with a permission UX. Build and test on a physical device; do not claim compatibility from a desktop build.

### Stage 07 — QA and optimization

Adopt Playwright and fast-check as dev-only tools. Add desktop E2E flows, save migration/export/import tests, Android profiling and long-session checks. Do not treat Playwright as Android WebView coverage.

## Stage 01 conclusion

The audit found no dependency that should be installed immediately. The existing architecture is coherent and already covers the proposed runtime concerns. The correct next step is internal improvement: reduce wiring, add safeguards and caps, fix documentation drift, and prepare lifecycle handling. Native and testing dependencies should enter only in their dedicated later stages.

No source code, save schema, package manifest or lockfile was changed during Stage 01. No commit or push was performed.
