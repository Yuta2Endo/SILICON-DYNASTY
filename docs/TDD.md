# Technical Design — SILICON DYNASTY

## Stack
React, TypeScript strict, Vite, Capacitor, IndexedDB, Vitest, Playwright, SVG/Canvas; Three.js only where useful; Web Workers when profiling justifies them. Dexie.js is optional, not mandatory.

## Requirements
- Game logic independent from React and DOM.
- Simulation Core owns deterministic calculations and state transitions.
- UI invokes typed application commands; it must not mutate domain state directly.
- Domain models are typed and validated.
- Use explicit dependencies; avoid circular dependencies and hidden global mutation.
- Use controlled seeded RNG for reproducible random events.
- Storage is behind repository interfaces.
- Save schema is versioned and migrated.
- Offline-first core gameplay.
- Mobile safe areas, background/resume handling and memory-aware rendering.

## Performance
Do not run heavy simulation on every React render. Separate simulation state from presentation state. Profile before adding workers or memoization. Optimize large tables, charts and long sessions.

## Validation
Validate product ranges, technology references, component compatibility, resource sufficiency, financial operations, project state transitions and save integrity.

## Suggested scripts
`npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:e2e`, `npm run build`. If a script does not exist, report NOT AVAILABLE; never claim it passed.

## Explicit non-goals
No real OS kernel or bootable OS. No real large-model training on Android. No mandatory multiplayer/backend/auth in this specification.
