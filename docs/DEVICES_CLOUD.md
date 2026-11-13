# Devices and Cloud

## Scope

Stage 12 adds device configuration projects and cloud infrastructure projects. Devices are
assembled from existing CPU, component, OS-release and AI-deployment projects. Cloud projects
reference a saved server device and add data-center scale, storage, networking and AI capacity.

This is a game simulation. Compatibility, performance, power, thermal, cost and cloud metrics are
deterministic game models, not real engineering measurements.

Device and cloud projects persist, but they are not yet sold through the daily market pipeline.

## Device model

`src/game/models/devices.ts` defines eight device types:

| Type | Intended platform |
| --- | --- |
| Desktop | Desktop |
| Laptop | Desktop |
| Smartphone | Mobile |
| Tablet | Mobile |
| Workstation | Desktop |
| Server | Server |
| Gaming | Gaming |
| AI device | Universal |

A device stores references only; it does not copy component or OS specifications:

- required: CPU project + CPU version, motherboard, RAM, SSD, OS project + OS release;
- optional: GPU, networking, AI accelerator;
- AI device additionally requires an AI accelerator, AI project and AI deployment;
- gaming additionally requires a GPU;
- server additionally requires networking.

Project names are 2–40 characters. Device projects keep a version history; every version snapshots
the complete reference configuration. Version 1 is required, versions are unique and sorted, and
the project-level configuration must match the latest version.

### Platform matching

The OS release must target the device's platform or `universal`. A mismatch is reported as
`os-platform-mismatch` and blocks saving.

### Validation

Device validation uses the existing compatibility services rather than duplicating their rules:

- `checkBuildCompatibility` validates CPU, motherboard, RAM, GPU, SSD, networking and AI
  accelerator combinations;
- `checkOsHardwareCompatibility` validates the selected OS release against the same hardware.

Stable issue codes:

`invalid-name`, `invalid-type`, `required-reference`, `project-not-found`, `version-not-found`,
`component-type-mismatch`, `os-release-not-found`, `ai-deployment-not-found`,
`ai-project-mismatch`, `os-platform-mismatch`, `component-incompatible`, `os-incompatible`.

### Suggested configuration

New devices can start from a suggested configuration that selects the first saved project of each
required type, the latest versions, the latest OS release and, for AI devices, the latest AI
deployment. Validation still runs before saving; a suggestion is not a guarantee of compatibility.

## Device metrics

`src/game/formulas/devices.ts` resolves every reference and derives metrics from the canonical
source projects.

Component scores:

- CPU: `35 + CPU market performance × 25`;
- GPU: `35 + component performance × 25`;
- RAM and SSD: `40 + component performance × 20`;
- networking and AI accelerator: `30 + component performance × 30`.

OS integration:

`OS release quality × 0.5 + ecosystem score × 0.3 + platform bonus (20 match, 4 mismatch)`

AI capability:

`deployment quality × 0.65 + accelerator score × 0.35`

Power is the sum of CPU, component and accelerator TDP plus a type-specific overhead. Thermal load
is `power / thermal capacity × 100`, capped at 100. Efficiency is
`100 − thermal load × 0.55 − power × 0.03`.

Compatibility is `100 − validation issue count × 12`. Reliability combines OS kernel stability,
thermal headroom and a release-stage bonus (`alpha 0`, `beta 2`, `rc 4`, `stable 7`).

Performance, gaming and productivity scores are weighted component/OS combinations. The final
overall score uses type-specific weights: for example desktop favors CPU and OS, gaming favors GPU,
server favors networking and reliability, and AI device gives AI capability a large share.

Ecosystem synergy:

`CPU 15% + GPU 10% + AI 20% + OS integration 20% + application coverage 20% + network 5% + platform match 10%`

Appeal:

`overall 50% + synergy 20% + OS integration 15% + AI capability 10% + compatibility 5%`

Unit cost is the sum of CPU manufacturing cost, component manufacturing costs and a type-specific
assembly cost. Device metrics also expose memory, storage, power, thermal load and compatibility.

## Cloud model

`src/game/models/cloud.ts` defines a cloud configuration:

| Field | Limits | Default |
| --- | --- | --- |
| Server device project | required, must be a server | empty |
| Server device version | 1–1,000,000 | 1 |
| Data centers | 1–100 | 1 |
| Servers per center | 1–10,000 | 100 |
| Storage, TB | 1–1,000,000 | 1,000 |
| Network, Gbps | 1–1,000,000 | 10,000 |
| AI accelerator units | 0–100,000 | 0 |
| Redundancy | 1–3 | 2 |

The referenced server device must exist, have the selected version, be of type `server`, and pass
full device validation. Cloud projects have the same strict version-history rules as devices.
Cloud validation codes are `required-reference`, `project-not-found`, `version-not-found`,
`device-not-server`, `device-incompatible`, `integer` and `range`.

## Cloud metrics

`src/game/formulas/cloud.ts` derives capacity from the referenced server device:

- server count = data centers × servers per center;
- compute units = server count × server performance / 100;
- memory TB = server count × server memory GB / 1024;
- AI TFLOPS = AI units × (5 + server AI capability × 0.1) + compute units × AI capability × 0.005;
- availability = `95 + redundancy × 1.5 + server reliability × 0.03`, capped at 99.99;
- efficiency = server efficiency − `(redundancy − 1) × 2`;
- operating cost/day = compute units × server power × 0.003744 + storage TB × 0.015 +
  network Gbps × 0.002 + AI units × 1.1;
- capex = compute units × (server unit cost + 250) + storage TB × 100 + network Gbps × 12 +
  AI units × 7,000;
- capacity score is a bounded logarithmic combination of compute, storage, network and AI;
- overall score = capacity 45% + availability 30% + efficiency 25%.

Cloud metrics reference the server device version rather than copying its specifications, so device
edits and new versions remain the single source of truth.

## Persistence

Save schema v11 adds `deviceProjects` and `cloudProjects`. Version 1–10 saves migrate with empty
arrays and preserve all company, CPU, component, OS, AI, research, finance and market data.
Strict parsing validates project names, references, dates, version histories and numeric limits.

## UI

The Devices page is the fifth product-workspace tab. It provides:

- Device and Cloud internal tabs;
- device creation by type and suggested configuration;
- project/version selection and all component, OS-release and AI-deployment references;
- validation and compatibility issue display;
- device metrics, cost, power, thermal, memory, storage and synergy;
- cloud creation from a saved server device, capacity fields and cloud metrics;
- version history, unsaved-draft confirmation and a simulation disclaimer.

The bottom navigation remains six destinations; Devices is reached through the product workspace.

## Tests

Model tests cover suggested devices, missing and mismatched references, platform checks, version
persistence and strict parsing. Formula tests cover device metrics, OS/AI integration, type-specific
cost/power, bounded synergy and cloud capacity/operating cost. Engine/application tests cover
create/save/reload. UI tests cover device creation, cloud creation, compatibility errors and tabs.
Schema tests cover v10→v11 migration and repository persistence.
