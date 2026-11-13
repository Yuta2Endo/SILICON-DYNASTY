# Save System Specification

## Storage
IndexedDB behind repository interfaces. UI and domain systems must not depend on low-level storage details.

## Save contents
Metadata, schema version, game version, company, products, CPU/GPU/components, research, OS, AI projects/datasets, software, devices, cloud, manufacturing, market, finance, employees, events, timeline, settings and RNG state when required.

## Slots
Support multiple independent slots with ID, display name, last-save timestamp, game date, schema version and summary.

## Autosave
Configurable interval or gameplay triggers. Avoid blocking UI. Do not overwrite the only valid copy before a safe write completes. Surface storage/quota errors.

## Atomicity and recovery
Use IndexedDB transactions where applicable. Maintain a recovery strategy for interrupted writes and previous valid state.

## Versioning and migration
Every save has `schemaVersion`. Migrations are sequential and tested against fixtures. Never silently overwrite a save from a newer schema. Preserve original data if migration fails.

## Import/export
Use a versioned format. Validate file structure, size and domain data. Invalid imports must not overwrite a working save. Treat imported values as untrusted.

## Acceptance
Create/rename/delete slots; save/load full state; autosave; import/export; tested migrations; corruption handling; no silent progress loss.
