# STAGE 01 — Foundation & Design System

**Project:** SILICON DYNASTY  
**Status:** NOT STARTED  
**Execution rule:** complete this stage only, then stop for approval.

## Objective
Audit the existing repository. Establish React, TypeScript strict, Vite and Capacitor readiness; navigation, Modern Corporate design system, RU/EN, Dashboard, base Company model, Simulation Core foundation and storage interface.

## Required workflow
1. Audit the repository, documentation, package scripts, Git branch and HEAD before editing.
2. Present a short implementation plan.
3. Preserve existing functionality, user changes and data.
4. Do not rewrite architecture without a demonstrated need.
5. Implement only this stage's scope.
6. Add/update tests and documentation.
7. Run all relevant checks that actually exist.
8. Create `docs/stages/STAGE_01_REPORT.md`.
9. Stop. Do not begin the next stage without separate authorization.

## Acceptance criteria
- [ ] App runs in development and production build.
- [ ] Mobile navigation works.
- [ ] RU/EN switching preserves state.
- [ ] Company model is typed and validated.
- [ ] Storage is isolated behind an interface.

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
Create `docs/stages/STAGE_01_REPORT.md` with:
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
