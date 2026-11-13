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

Schema v3 adds persisted research state: completed technology IDs, legacy unlock IDs, one active project's start date/progress/upfront cost, and cumulative research spending. Version 1 saves migrate with no CPU projects; version 2 saves retain every CPU project and saved version. Both migrations initialize research progress/completions/spending as empty and derive `legacyUnlockIds` from the union of CPU capabilities present across saved configuration history. This grandfathering preserves existing designs without marking their technologies researched. Research state in v3 is validated against the catalog, including active prerequisites, cost and progress bounds.

Schema v4 adds `finance` and `market`. Finance stores transactions, daily aggregates, active loan, lifetime revenue/expenses/taxes/interest/financing. Market stores released products, production orders, competitor multipliers, observable actions, daily summaries and the marketing budget. Version 3 saves preserve company, date, CPU projects and research, then initialize finance and market at the saved game date. Finance parsing checks transaction sign/category, unique IDs and dates, recomputed daily totals, and loan bounds. Market parsing checks unique products/orders/actions, inventory equal to produced minus sold, known product references, the complete competitor catalog, capped histories, summary arithmetic and marketing budget bounds.

Schema v5 adds component projects and component market products. `componentProjects` stores GPU, RAM, SSD, motherboard, AI-accelerator and networking projects with typed configurations and version histories. `market.componentProducts` stores released component products with configuration, manufacturing cost, performance score, units sold and revenue. Market daily summaries gain component demand, units, revenue and manufacturing cost. Version 4 saves preserve company, CPU projects, research, finance, market products/orders/competitors/actions and marketing budget; missing component arrays and summary fields migrate to empty/zero values. Component parsing validates type-specific fields, bounds, project/version uniqueness and product/config type equality. Saves from schema 10 or newer are rejected rather than overwritten.

Schema v6 adds `osProjects`. Each project stores a name and a strictly validated version history of OS configurations: target platform, kernel architecture, bootloader, scheduler, memory manager, virtual memory, IPC model, syscall count, module support, driver model, address width, process limit and supported CPU architectures. Version 1–5 saves receive an empty OS project list and preserve all earlier company, CPU, component, research, finance and market state. OS parsing validates configuration bounds, cross-subsystem constraints, historical technology gates, unique project IDs, versions beginning at 1 and equality between the current configuration and the latest saved version. Saves from schema 10 or newer are rejected rather than overwritten.

Schema v7 adds eight system-service fields to every OS configuration and saved version: filesystem, driver framework, network stack, permission model, encryption, update model, package manager and diagnostics. Version 6 OS projects migrate with the 1995 defaults for those fields while preserving all earlier data; version 1-5 saves still receive an empty OS project list. Strict v7 parsing validates field options, historical availability, filesystem/address-width, encryption/permissions and rolling-update/package constraints, plus equality between the current configuration and the latest version. Saves from schema 10 or newer are rejected rather than overwritten.

Schema v8 adds five ecosystem fields to every OS configuration and saved version - GUI, SDK, API, developer tools and app store - plus `releases` on each OS project. A release stores its ID, version, stage (Alpha/Beta/RC/Stable), creation date, configuration snapshot, quality score, appeal score and cumulative cost. Version 7 OS projects migrate with the 1995 ecosystem defaults (`cli`, `basic`, `proprietary`, `compiler`, `none`) and an empty release list; all earlier company, CPU, component, research, finance, market and system-service data is preserved. Strict v8 parsing validates ecosystem options and year gates, release stage/date/config/scores/cost, unique release IDs and versions, and configuration equality between the current project and its latest saved version. Saves from schema 10 or newer are rejected rather than overwritten.

Schema v9 adds `aiProjects`. Each AI project stores a model configuration, a dataset list and a version history that snapshots both configuration and datasets. Configurations cover architecture, parameter count, layers, hidden dimension, attention heads, context window, vocabulary, experts, precision and quantization; datasets store modality, size, quality, diversity, license and processing cost. Version 1-8 saves receive an empty AI project list and preserve all earlier company, CPU, component, OS, research, finance and market state. Strict v9 parsing validates numeric bounds, attention/MoE constraints, historical technology gates, dataset limits and IDs, unique project/version IDs, versions beginning at 1 and equality between the current project and its latest saved version. Saves from schema 10 or newer are rejected rather than overwritten.


## Import/export
Use a versioned format. Validate file structure, size and domain data. Invalid imports must not overwrite a working save. Treat imported values as untrusted.

## Acceptance
Create/rename/delete slots; save/load full state; autosave; import/export; tested migrations; corruption handling; no silent progress loss.
