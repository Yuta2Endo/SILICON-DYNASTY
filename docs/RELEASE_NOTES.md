# SILICON DYNASTY — Release Notes

## Version 1.0 — Android release candidate

**Date:** 2026-11-13
**Application ID:** `com.silicondynasty.game`
**Minimum Android:** 7.0 (API 24)
**Target Android:** API 36

This is a local release candidate. It has not been published to Google Play.
The release APK/AAB are unsigned; the debug APK passed real-device install,
launch and save-lifecycle checks.

### Included systems

- Company dashboard, research, finance and CPU market simulation.
- CPU and component designers with versioned projects and compatibility checks.
- OS architecture, system services, drivers, security, updates and release
  lifecycle: Alpha, Beta, RC and Stable.
- Software ecosystem profiles, SDK/API/app compatibility and app-store effects.
- AI model/data lab, deterministic training, optimization and deployment.
- Device configurator, cloud infrastructure and ecosystem synergy.
- Save autosave, manual slots, backup, JSON import/export and recovery.
- Russian and English localization, responsive mobile-first UI, tutorial and
  achievements.
- Simulated metrics are game values, not real OS builds, real drivers or real
  AI training.

### Android build artifacts

- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release APK (unsigned): `android/app/build/outputs/apk/release/app-release-unsigned.apk`
- Release AAB (unsigned): `android/app/build/outputs/bundle/release/app-release.aab`

Build and signing instructions are in `docs/ANDROID_RELEASE.md`.

### Verification

- Production web build and TypeScript checks pass.
- Android debug, release APK and release AAB builds pass.
- Manifest verified: package `com.silicondynasty.game`, versionCode 1,
  versionName 1.0, minSdk 24, targetSdk 36.
- Production preview: Lighthouse accessibility 100, best practices 100,
  SEO 100.
- Web save survived reload, tab close and a new tab.
- Debug APK installed and launched on a vivo I2405 (Android 16, API 36,
  arm64-v8a). The save survived background/resume and a force-stop/cold restart
  after advancing to 1995-01-03.
- Full test suite, lint and build results are recorded in
  `docs/stages/STAGE_14_REPORT.md`.

### Known limitations

- The signed release APK/AAB has not yet been installed on a device; only the
  debug APK passed real-device QA.
- Release artifacts are unsigned until a private upload key is configured.
- No Android profiling, Play Console internal testing or native crash reporting.
- Default Capacitor icon/splash; store branding is not final.
- No cloud save sync; clearing app data deletes local saves.
- `test:e2e` is not available.
- JavaScript bundle exceeds Vite's 500 kB advisory threshold.
