# Stage 14 — Android Release & Final QA Report

**Date:** 2026-11-13
**Status:** COMPLETED WITH KNOWN ISSUES

## Git state

- **Branch before/after:** `main`
- **HEAD before:** `414174bf7e47cc477e5bebe03d2d6071c76eec25`
- **Stage 14 implementation checkpoint:** `b1ba657` — “Complete stage 14: Android release and final QA” (60 files, +1,430 / −27)
- The device-QA documentation update is committed separately after that checkpoint.
- Build outputs, copied web assets and signing secrets are ignored.

## Initial repository audit

- Stage 13 was completed, committed and pushed. The working tree was clean at
  the start of Stage 14; save schema was 11.
- The baseline was 41 test files / 237 tests. Available scripts were `dev`,
  `build`, `preview`, `typecheck`, `lint` and `test`; `test:e2e` was not defined.
- A short generic `docs/ANDROID_RELEASE.md` existed, but there was no generated
  Android project, APK/AAB artifact, signing setup or concrete device QA record.
- Capacitor config already targeted `com.silicondynasty.game`, app name
  `SILICON DYNASTY`, `webDir: dist` and the HTTPS Android scheme.
- Java 21.0.13, Node 26.13.0 and Capacitor CLI 8.6.2 were available. The Android
  SDK was installed at `C:\Users\sasha\AppData\Local\Android\Sdk`.
- `adb devices` was empty at the start: no physical Android device or emulator
  was attached. A real device was connected after the initial build and web QA;
  see “Android device QA” below.

## Completed work

- Installed the missing Android SDK packages after accepting licenses:
  platform-tools 37.0.1, platforms 35/36, build-tools 35/36.
- Generated and committed the Capacitor Android project with `npx cap add android`.
  It uses application ID `com.silicondynasty.game`, minSdk 24, compile/target
  SDK 36, versionCode 1 and versionName 1.0.
- Built and verified the production web bundle, synced it into Android, and
  built the debug APK plus release APK/AAB.
- Verified the debug APK manifest and debug signature. The release APK/AAB build
  successfully but is unsigned until a private upload key is configured.
- Added Android build, signing, artifact, install, lifecycle, performance and
  device-QA instructions to `docs/ANDROID_RELEASE.md`.
- Added `docs/RELEASE_NOTES.md` with the release candidate scope, artifacts,
  verification results and known limitations.
- Updated `README.md` from the old Stage 1–2 description to the completed
  Stage 1–14 implementation and Android build instructions.
- Added `public/robots.txt`, which resolved the only Lighthouse SEO failure.
- Verified production-web save persistence across reload, tab close and a new
  tab. Background-tab resume retained the same state.
- Installed and launched the debug APK on a real vivo I2405 (Android 16/API 36,
  arm64-v8a) after the device was connected. Advanced the game by one day,
  backgrounded/resumed the app, force-stopped and relaunched it, and confirmed
  the saved date and balance persisted.
- Ran desktop Lighthouse and a reload trace on the production preview. Android
  profiler/device-performance measurements were not performed.

## Files added or updated for Stage 14

- **Added:** `android/` (generated Capacitor Android project: Gradle wrapper,
  build files, manifest, MainActivity, resources, `.gitignore`), `public/robots.txt`,
  `docs/RELEASE_NOTES.md`, `docs/stages/STAGE_14_REPORT.md`.
- **Updated:** `README.md`, `docs/ANDROID_RELEASE.md`, `docs/QA_STRATEGY.md`,
  `docs/stages/STAGE_14.md`.
- No application source code, game model, save schema or dependency was changed.

## Architecture decisions

- **Generated Android project is included in the working tree.** It is the
  reproducible Capacitor host for the existing web game; no game architecture
  was rewritten.
- **Build outputs and signing material stay local.** APK/AAB files, `.gradle`,
  copied web assets, `local.properties`, keystores and `keystore.properties` are
  ignored.
- **Unsigned release artifacts are build evidence, not publication artifacts.**
  Signing with a private upload key and Play App Signing remain release-gate
  steps.
- **Saves remain platform-independent.** The existing IndexedDB/localStorage
  autosave, slots, backup and import/export behavior is unchanged. Android
  WebView storage persists across normal restarts and process recreation.
- **No device substitute.** An emulator was not presented as a real device, and
  no install/launch claim was made without an attached device.

## Verification

| Command/check | Result |
| --- | --- |
| `npm run test` | PASS — 41 files, 237 tests, Vitest 5.1.0, 13.70 s |
| `npm run typecheck` | PASS — app and node configs |
| `npm run lint` | PASS — ESLint, `--max-warnings 0` |
| `npm run build` | PASS — Vite 8.3.8, 2,133 modules; CSS 95.49 kB (gzip 15.03), JS 748.85 kB (gzip 198.90), built 909 ms; existing >500 kB advisory only |
| `npm run test:e2e` | **NOT AVAILABLE** — no such script in `package.json` |
| `git diff --check` | PASS — no whitespace errors; only LF→CRLF advisory warnings |

### Android builds

Command (from `android/`, with `ANDROID_HOME` set):

```powershell
.\gradlew.bat assembleDebug bundleRelease assembleRelease --no-daemon
```

Result: **BUILD SUCCESSFUL in 35s**, 223 actionable tasks (71 executed, 152 up-to-date).

| Artifact | Result |
| --- | --- |
| `app-debug.apk` | PASS — 4,379,008 bytes; debug signature verified with APK Signature Scheme v2 |
| `app-release-unsigned.apk` | PASS — 3,372,997 bytes; unsigned (`apksigner` reports `DOES NOT VERIFY`) |
| `app-release.aab` | PASS — 3,209,402 bytes; unsigned (`jarsigner` reports `jar is unsigned`) |

`aapt dump badging` confirmed package `com.silicondynasty.game`, versionCode 1,
versionName 1.0, minSdk 24, targetSdk 36, label `SILICON DYNASTY`, launchable
activity `com.silicondynasty.game.MainActivity`, and only INTERNET plus the
generated dynamic-receiver permission.

### Browser QA and profiling

- Production preview at `http://localhost:4173` loaded without console errors;
  `scrollWidth === innerWidth === 1000`.
- Advanced the game to 1995-01-02, reloaded, closed the tab, opened a new tab and
  confirmed the date persisted. A background-tab switch also retained state.
- Lighthouse on the production preview: **accessibility 100, best practices 100,
  SEO 100**, no failures.
- Desktop reload trace: 715 events, one long task of 60.35 ms, JavaScript parse
  18.56 ms, layout 2.43 ms.
- Desktop heap after load: 6.9 MB used / 13.5 MB total, 268 DOM nodes.

### Android device QA

- Device: vivo I2405 (`10AFAB1AD60032K`), Android 16, API 36, arm64-v8a.
- `adb devices -l` reported the device as `device`.
- `adb install -r android\app\build\outputs\apk\debug\app-debug.apk`:
  **Success**.
- `adb shell am start -W -n com.silicondynasty.game/.MainActivity`:
  **Status: ok**, `LaunchState: COLD`, `TotalTime: 510 ms`.
- The app opened on the dashboard with the persisted save (1995-01-02,
  balance $87,800).
- Pressed “Следующий день”: date became 1995-01-03 and balance $87,600; the UI
  showed “Изменения сохранены”.
- Pressed Home, then brought the task back to the foreground: the app resumed
  with the saved state intact.
- `adb shell am force-stop com.silicondynasty.game` followed by a cold relaunch:
  the dashboard reopened at 1995-01-03 with balance $87,600.
- `adb logcat` contained no `FATAL EXCEPTION` or app ANR entries during the
  launch, save, background/resume and restart checks.
- Android startup, memory, battery, thermal and long-session profiling were not
  performed. The desktop Lighthouse/trace numbers are not Android measurements.

## Acceptance criteria

| Criterion | Result |
| --- | --- |
| Production and Android builds pass. | **PASS** — production Vite build, Android debug APK, release APK and release AAB all build successfully; manifest verified. |
| Install and launch are verified on a real device. | **PASS** — debug APK installed with `adb install` and launched on a vivo I2405 (Android 16, API 36, arm64-v8a); cold launch completed in 510 ms and the dashboard rendered. |
| Saves survive background/resume and restart. | **PASS** — advanced to 1995-01-03, backgrounded/resumed the app, then force-stopped and cold-relaunched it; the date and balance ($87,600) persisted. |
| Release notes and known limitations are documented. | **PASS** — `docs/RELEASE_NOTES.md` and `docs/ANDROID_RELEASE.md` document scope, artifacts, signing, QA, save behavior and limitations. |

## Known issues and risks

- Release APK/AAB are unsigned. Publication requires a private upload key,
  signed-artifact verification and, for Play, Play App Signing.
- No Android startup, memory, battery, thermal or long-session profiling was
  performed. Desktop Lighthouse/trace numbers are not Android measurements.
- The app icon and splash screen still use Capacitor defaults; store branding is
  not final.
- The JavaScript bundle exceeds Vite's 500 kB advisory threshold.
- `test:e2e` is unavailable; there is no automated install/launch test.
- There is no cloud save sync. Clearing Android app data or uninstalling the app
  deletes local saves.
- The real-device QA used a debug APK; the signed release artifact has not yet
  been installed and verified.

## Incomplete requirements

- No mandatory Stage 14 acceptance criterion remains incomplete; all four pass.
- Signed release artifacts and Play Console internal testing were not performed;
  these are release-gate steps beyond the local build.
- Android profiler/device-performance measurements remain outstanding.

## Recommendation

Stage 14 is complete with known release issues. The local debug APK has passed
real-device install, launch, background/resume and process-restart save checks.
Before publication, sign the release APK/AAB with a private upload key, install
the signed artifact on a device, run the Android profiler and complete Play
Console internal testing. Stage 14 was the final roadmap stage; no next stage is
started. The device-QA documentation update is committed after the Stage 14
checkpoint.
