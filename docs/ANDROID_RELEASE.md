# Android Release Specification

## Preparation
Verify production web build, Capacitor config, package ID, app name/version/icons, minimal permissions, offline launch, IndexedDB persistence and lifecycle behavior.

## Lifecycle
Test cold start, background/resume, system Back, process termination, state restoration, background save and memory pressure.

## Performance
Profile startup, navigation, large tables, charts, simulation calculations, long sessions, memory, battery and device heat.

## Data and security
No secrets in client bundle. Request only necessary permissions. Validate imported files. Do not transmit local saves without explicit consent. Keep signing keys out of the repository.

## Deliverables
APK for testing/distribution if needed; AAB for Google Play if applicable; release notes; build instructions; tested device/Android version list; known limitations.

## Release gate
Production build and Android build pass; install and launch verified on real device; save survives restart; core loop tested; no critical issues; release artifacts and limitations documented. Do not claim publication readiness without verifying the actual signed artifact.
