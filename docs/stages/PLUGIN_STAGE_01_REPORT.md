# Plugin Stage 01 Report — Dependency Audit

**Date:** 2026-11-14
**Stage:** Plugin Stage 01 — Dependency Audit
**Status:** COMPLETED

## Stage objective

Audit the existing game and technical stack before adding any plugin or dependency. Identify what is already implemented, what is genuinely missing, which proposed dependencies are justified, and recommend a staged implementation plan without changing application behavior, save data, RU/EN localization, Android compatibility or game balance.

## Initial state

- Branch `main`, HEAD `6f1de4b`, working tree clean and in sync with `origin/main`.
- Save schema 11 with migrations 1–11 and fixture coverage.
- Existing stack: React 19, TypeScript 5.9 strict, Vite 8, Capacitor 8, Vitest 5, Testing Library, custom IndexedDB/localStorage repository, typed RU/EN localization.
- Existing gameplay: CPU/components, OS, AI, devices/cloud, research, market, finance, saves and achievements.
- Existing native plugins: `@capacitor/haptics` 8.0.2 and `@capacitor/status-bar` 8.0.4 only.
- Scripts: `dev`, `build`, `preview`, `typecheck`, `lint`, `test`; **no `test:e2e`**.

## Completed work

- Reviewed the repository documentation, package manifests, domain/formula/engine/application layers, storage, UI features, tests and Android project.
- Confirmed existing implementations for state management, persistence, charts, localization, animation, save recovery and native haptics/status bar.
- Audited the daily simulation pipeline, history caps, React page sizes, bundle output and Android build.
- Compared every proposed dependency against current versions, peer compatibility, estimated bundle size, Android impact, integration complexity and product need.
- Classified dependencies into keep, adopt later, defer and reject.
- Identified concrete architecture and performance risks: uncapped CPU products/version histories, no import size guard, large `App.tsx` wiring, no error boundary, no Android Back/app lifecycle handling.
- Recommended a dependency-light Stage 02 and dependency-specific later stages.
- Created `docs/PLUGIN_INTEGRATION_AUDIT.md` with the full dependency table, existing-capability map, gap analysis, risks and roadmap.

## Dependencies added or rejected

**Added in Stage 01:** none. No `package.json` or lockfile change was made.

**Retain:** React 19, TypeScript 5.9, Vite 8, Capacitor 8, Vitest 5, Testing Library, `lucide-react`, Manrope font, Haptics 8.0.2, StatusBar 8.0.4.

**Adopt in later stages:**

- `@capacitor/app` 8.1.2 — Stage 06, Android Back/app lifecycle.
- `@capacitor/filesystem` 8.1.5 — Stage 06, native backup portability.
- `@capacitor/share` 8.0.3 — optional Stage 06, backup sharing.
- `@capacitor/local-notifications` 8.3.1 — optional Stage 06, only with permission UX and device testing.
- `fast-check` 4.10.2 — Stage 07, dev-only invariants.
- Playwright 1.65.0 — Stage 07, dev-only desktop E2E.

**Deferred:** `decimal.js` 10.6.0, only after a reproducible precision defect.

**Rejected for now:** Zustand, XState, Apache ECharts, echarts-for-react, Dexie, Motion, i18next, react-i18next, TanStack Query, Howler, Capacitor Preferences, Capacitor Network.

## Files added or modified

- **Added:** `docs/PLUGIN_INTEGRATION_AUDIT.md`, `docs/stages/PLUGIN_STAGE_01_REPORT.md`.
- **Application source:** none.
- **Package manifest/lockfile:** none.
- **Schema/migrations:** none.
- **Localization:** none.
- **Android project:** none.

## Architecture decisions

- **No runtime dependency without a measured gap.** Existing state, storage, charting, localization, animation and offline behavior already solve the proposed problems.
- **Preserve the domain/application boundary.** State remains one `GameState` owned by `GameApplication`; no second store or workflow engine.
- **Preserve save schema 11.** Dependency work does not justify a schema change.
- **Use native plugins only where the web layer cannot provide the behavior.** `@capacitor/app` is the clear example; Preferences and Network are not.
- **Keep Vitest and the typed localization dictionary.** Add dev-only QA tooling later instead of replacing working infrastructure.
- **Improve internals before adding libraries.** Stage 02 should extract wiring, add safeguards/caps and an error boundary.
- **No ECharts for a single small chart.** Use accessible SVG/CSS and profile before considering a chart runtime.

## Verification

| Command/check | Result |
| --- | --- |
| `npm run test` | **PASS — 44 files / 251 tests**, Vitest 5.1.0, 14.61 s |
| `npm run typecheck` | PASS — app and node configs |
| `npm run lint` | PASS — ESLint, `--max-warnings 0` |
| `npm run build` | PASS — Vite 8.3.8, 2,147 modules, 665 ms |
| `npm run test:e2e` | **NOT AVAILABLE** — no script |
| `git diff --check` | PASS — no whitespace errors; only LF→CRLF advisories |
| Android `npx cap sync android` | PASS — 2 plugins, 0.121 s |
| Android `gradlew assembleDebug --no-daemon` | PASS — 153 tasks, 19 s |
| Android device check | `adb devices` empty — no physical device |

### Build output

- `index.html` 0.87 kB (gzip 0.48)
- CSS 121.57 kB (gzip 22.86)
- Main JS 356.76 kB (gzip 97.14)
- React vendor 218.77 kB (gzip 68.25)
- Lazy chunks 3.33–38.71 kB
- Debug APK 4,497,653 bytes
- No >500 kB warning

### Performance impact

No application code or dependency changed, so Stage 01 has no runtime bundle or startup impact. The audit identified future risks rather than measured regressions:

- No measured need for Web Workers.
- No measured render bottleneck; large pages are already lazy-loaded.
- jsdom setup dominates test runtime but is acceptable at the current suite size.
- Uncapped CPU products/version histories and missing import size limits are save-growth risks.

## Android compatibility

The existing Android project syncs and builds successfully. The merged manifest includes INTERNET and VIBRATE, and the debug APK builds. No new plugin was added, so there is no new Android compatibility claim. No physical device was attached during this audit; real-device install/launch/save behavior was verified in the earlier Stage 14 QA on a vivo I2405, not re-verified here. Native plugin integration in Stage 06 must be built and tested on a device before being marked complete.

## Known issues and blockers

- Documentation drift remains in `docs/RELEASE_NOTES.md` and `docs/ANDROID_RELEASE.md` (stale 748.85 kB JS / 95.49 kB CSS and >500 kB warning references). README is current.
- No end-to-end test script or Playwright suite exists.
- No physical Android device is attached for current native testing.
- Bundle-size figures for proposed dependencies are Bundlephobia estimates, not measured application deltas.
- No runtime profiling or long-session benchmark was performed in this audit.
- CPU market products and project-version histories remain uncapped.
- `App.tsx` has no error boundary and no Android Back/app lifecycle handling.

None of these blocked the audit. They are inputs to later stages.

## Uncompleted requirements

- No mandatory Stage 01 requirement is incomplete.
- Installing dependencies, implementing improvements, changing the schema or modifying source were explicitly out of scope.
- Stage 02 has not started and must wait for explicit approval.

## Recommendation

Approve the audit and proceed to **Stage 02 — Core Improvements** only after explicit authorization. Stage 02 should remain dependency-light and focus on internal safeguards:

1. Extract command/state wiring from `App.tsx`.
2. Add a top-level error boundary.
3. Cap CPU products and project-version histories.
4. Add an import file-size guard.
5. Add finance/save invariant tests.
6. Fix release documentation drift.
7. Prepare lifecycle-safe autosave for later native integration.

No dependencies were installed, no source was changed, and no commit or push was performed.
