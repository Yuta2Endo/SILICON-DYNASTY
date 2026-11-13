# STAGE 14 — Android Release & Final QA

**Project:** SILICON DYNASTY
**Status:** PARTIALLY COMPLETED
**Execution rule:** complete this stage only, then stop for approval.

## Objective
Prepare Capacitor Android release, optimization, device testing, performance/memory profiling, save reliability, APK/AAB and release documentation.

## Required workflow
1. Audit the repository, documentation, package scripts, Git branch and HEAD before editing.
2. Present a short implementation plan.
3. Preserve existing functionality, user changes and data.
4. Do not rewrite architecture without a demonstrated need.
5. Implement only this stage's scope.
6. Add/update tests and documentation.
7. Run all relevant checks that actually exist.
8. Create `docs/stages/STAGE_14_REPORT.md`.
9. Stop. Do not begin the next stage without separate authorization.

## Acceptance criteria
- [x] Production and Android builds pass.
- [ ] Install and launch are verified on a real device.
- [ ] Saves survive background/resume and restart.
- [x] Release notes and known limitations are documented.

**Status note:** Android debug/release APK and AAB builds pass, and production-web
save persistence across reload/restart was verified. No physical Android device
was attached (`adb devices` empty), so real-device install/launch and Android
background/resume verification remain blocked. See `STAGE_14_REPORT.md`.

## Engineering constraints
- React + TypeScript strict + Vite + Capacitor.
- Keep game logic independent from React.
- Follow sound existing repository patterns.
- Do not add dependencies without justification.
- Do not substitute decorative mock values for game logic.
- Do not claim tests passed unless they were executed.
- Missing scripts must be reported as `NOT AVAILABLE`.
- Do not run destructive Git commands.
- Do not delete or overwrite user data.

## Verification
Run available project scripts, such as:
```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```
Record exact command and outcome. A missing script is not a pass.

## Required report
Create `docs/stages/STAGE_14_REPORT.md` with:
- Stage name, date, status.
- Git branch and HEAD before/after.
- Initial repository audit.
- Completed tasks.
- Added/modified files.
- Architecture decisions.
- Exact test commands and results.
- Build result.
- Acceptance criteria status: PASS / FAIL / BLOCKED.
- Known issues, risks and blockers.
- Uncompleted requirements.
- Recommendation for the next stage.

## Allowed status values
`COMPLETED`, `COMPLETED WITH KNOWN ISSUES`, `PARTIALLY COMPLETED`, `BLOCKED`.

Do not use COMPLETED when any mandatory criterion is unmet or unverified.

## Final instruction
Provide a concise summary after writing the report and stop. Do not proceed to the next stage.
