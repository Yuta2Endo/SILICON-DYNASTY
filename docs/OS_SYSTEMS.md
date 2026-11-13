# OS SYSTEMS — Stage 08

This document defines the simulated operating-system services added in Stage 08:
filesystems, driver frameworks, networking, permissions, encryption, updates,
package management, diagnostics and hardware-driver compatibility. Every value is a
game model. No real driver, filesystem, network stack or security mechanism is
implemented.

## Scope

- Extend every OS project configuration with eight system-service fields.
- Derive driver coverage, data integrity, network capability, diagnostics, update
  readiness, maintenance cost and update latency.
- Validate subsystem combinations and historical availability.
- Detect incompatible saved CPU and component hardware against the selected driver
  framework and supported architectures.
- Persist all fields in OS project versions and migrate schema-v6 saves.
- Show system metrics and hardware compatibility in the OS Lab without claiming real
  measurements.

OS projects remain outside the daily market, finance, manufacturing and research
pipeline.

## Configuration fields

| Field | Values | Default 1995 |
| --- | --- | --- |
| `filesystem` | `fat`, `ext2`, `ntfs`, `zfs` | `fat` |
| `driverFramework` | `legacy`, `acpi`, `unified`, `certified` | `legacy` |
| `networkStack` | `basic`, `tcp-ip`, `advanced`, `cloud` | `basic` |
| `permissions` | `none`, `permissions`, `role-based`, `capability` | `permissions` |
| `encryption` | `none`, `disk`, `full-disk`, `hardware` | `none` |
| `updateModel` | `manual`, `package-manager`, `staged`, `rolling` | `manual` |
| `packageManager` | `none`, `centralized`, `signed`, `decentralized` | `none` |
| `diagnostics` | `none`, `logs`, `crash-dumps`, `telemetry` | `logs` |

### Availability years

| Technology | Minimum year |
| --- | ---: |
| Role-based permissions | 1998 |
| Full-disk encryption | 2000 |
| Staged updates | 2001 |
| Signed packages | 2002 |
| 64-bit addressing, capability permissions | 2003 |
| ZFS | 2005 |
| Hardware encryption | 2007 |
| Telemetry | 2008 |
| Cloud network stack, rolling updates | 2010 |
| Decentralized packages | 2012 |

Existing Stage 07 gates remain: coreboot 1999, 64-bit addressing 2003, UEFI 2005.

## Validation rules

- Every system field must be a catalog value.
- ZFS requires 64-bit addressing.
- Encryption other than `none` requires a non-`none` permission model.
- Rolling updates require a package manager other than `none`.
- Gated options are rejected before their minimum game year.
- Stage 07 bounds and cross-subsystem rules remain in force.

New stable validation codes are `filesystem-requires-64-bit`,
`encryption-requires-security` and `rolling-updates-require-package-manager`.
Field errors use the existing `future-technology` code with `minYear`.

Schema-v6 configurations are parsed with `allowMissingSystems: true`, which fills the
eight fields from the 1995 defaults. Schema-v7 parsing is strict.

## System profiles

Filesystem (data integrity / performance / footprint MB / maintenance cost units):
FAT 72 / 1.02 / 0 / 2; ext2 84 / 1.00 / 2 / 3; NTFS 90 / 0.98 / 4 / 5; ZFS 98 /
0.94 / 12 / 9.

Driver framework (coverage / compatibility / stability / maintainability / cost):
legacy 45 / 0.95 / 0.94 / 0.90 / 0; ACPI 62 / 0.97 / 1.00 / 1.00 / 2; unified 80 /
1.07 / 1.04 / 1.05 / 6; certified 94 / 1.12 / 1.10 / 1.12 / 12.

Network stack (score / compatibility / security / cost): basic 40 / 0.95 / 0.95 / 0;
TCP/IP 58 / 0.99 / 1.00 / 2; advanced 78 / 1.07 / 1.06 / 6; cloud 92 / 1.11 /
1.02 / 10.

Permission model (security / stability / cost): none 0.72 / 0.96 / 0; permissions
1.00 / 1.00 / 0; role-based 1.12 / 1.02 / 3; capability 1.24 / 1.04 / 6.

Encryption (security / integrity / performance / cost): none 1.00 / 1.00 / 1.00 / 0;
disk 1.06 / 1.04 / 0.99 / 3; full-disk 1.14 / 1.09 / 0.96 / 7; hardware 1.22 /
1.12 / 0.99 / 12.

Updates (latency days / readiness / security / cost): manual 180 / 30 / 0.94 / 1;
package manager 60 / 58 / 1.02 / 3; staged 30 / 76 / 1.08 / 7; rolling 7 / 92 /
1.10 / 10.

Package manager (readiness / security / cost): none 0.85 / 0.93 / 0; centralized
0.97 / 1.02 / 2; signed 1.08 / 1.10 / 5; decentralized 1.12 / 1.06 / 7.

Diagnostics (score / stability / cost): none 25 / 0.92 / 0; logs 60 / 1.00 / 2;
crash dumps 78 / 1.06 / 5; telemetry 92 / 1.09 / 9.

## Derived metrics

The system profiles modify existing kernel metrics deterministically:

- footprint adds filesystem footprint, full-disk encryption overhead and telemetry
  overhead;
- performance includes filesystem and encryption performance factors;
- stability includes driver-framework, permission and diagnostics stability;
- security includes permission, encryption, update, package, network and
  driver-framework factors;
- compatibility includes driver-framework and network compatibility;
- maintainability includes the driver-framework factor.

```text
driverCoverage = driverFramework.coverage * (moduleSupport == "none" ? 0.9 : 1)

dataIntegrity = filesystem.integrity * encryption.integrity
              * memoryManager.stability * (virtualMemory ? 1.03 : 0.92)

networkScore = networkStack.score
diagnosticsScore = diagnostics.score

updateReadiness = updateModel.readiness * packageManager.readiness
                * (encryption == "none" ? 1 : 1.03)

annualMaintenanceUsd = 120 + sum(systemMaintenanceCostUnits) * 45

updateLatencyDays = max(1, round(updateModel.latencyDays
                    * (packageManager == "none" ? 1 : 0.8)))

systemQuality = driverCoverage * 0.24 + dataIntegrity * 0.20
              + networkScore * 0.18 + diagnosticsScore * 0.12
              + updateReadiness * 0.14 + security * 0.12
```

Scores are clamped to 0..100. The default 1995 desktop configuration produces about:
driver coverage 45, data integrity 84.5, network 40, diagnostics 60, update readiness
25.5, system quality 49.4, maintenance $345/year and update latency 180 days.

`system-quality` is a platform requirement: desktop ≥45, mobile ≥45, server ≥55,
gaming ≥45, universal ≥50. The default desktop profile satisfies it, along with the
existing desktop requirements.

## Hardware compatibility

The OS Lab builds `OsHardwareTarget` records from the latest configuration of every
saved CPU and component project. RAM does not require a dedicated driver and is not
checked.

| Target | Rule |
| --- | --- |
| CPU | Its ISA must be in `supportedArchitectures` |
| PCI/PCIe GPU or networking card | Required framework level PCI 0, PCIe 3 = 1, PCIe 4 = 2, PCIe 5 = 3 |
| SATA SSD | ACPI or newer framework |
| NVMe or M.2 SSD | Unified or certified framework |
| PCIe AI accelerator | Unified or certified framework |
| NVLink AI accelerator | Certified framework |
| Fiber networking | TCP/IP or newer network stack |
| InfiniBand networking | Advanced or newer network stack |
| Motherboard | PCIe generation 3+ needs ACPI; 4+ needs unified; 5 needs certified |

Results contain the target ID, name, kind, `compatible` flag and deduplicated issue
codes: `unsupported-architecture`, `driver-framework-required`,
`storage-driver-unsupported`, `network-driver-unsupported` and
`ai-driver-unsupported`. A missing driver produces an incompatible result in the UI;
it does not mutate the saved project.

## Persistence

Save schema v7 adds the eight system fields to every OS configuration and saved
version. Schema-v6 OS projects receive the defaults above; v1–v5 saves still receive
an empty `osProjects` list. All earlier company, CPU, component, research, finance and
market data is preserved. Strict v7 parsing rejects unknown options, invalid years,
cross-subsystem violations and a top-level configuration that differs from the latest
version.

## UI

- A “System services” fieldset exposes all eight fields inside the OS editor.
- Metrics show system quality, driver coverage, data integrity, network capability,
  diagnostics, update readiness, update latency and annual maintenance cost in
  addition to the Stage 07 metrics.
- A hardware-compatibility section lists every saved CPU/component target with a
  compatible/incompatible pill and localized issue text. With no saved hardware it
  shows an empty state.
- The persistent simulation banner remains; all values are model outputs.
- Field and cross-constraint errors are shown immediately for dirty drafts and block
  saving.

## Tests

- `src/game/models/os.test.ts`: system defaults, constraint codes, year gates, strict
  versus legacy parsing, CPU architecture detection and driver-framework progression.
- `src/game/formulas/os.test.ts`: deterministic system metrics, capability effects on
  quality/security/compatibility, maintenance/update cost and platform requirements.
- `src/features/os/OsDesignerPage.test.tsx`: system-field saving and incompatible
  hardware issue rendering.
- `src/game/models/game-state.test.ts`: v6→v7 OS migration with default system fields.
- `src/storage/repositories/BrowserGameStateRepository.test.ts`: schema-v7 persistence.
- `src/game/application/game-application.test.ts`: system configuration round-trip
  through application commands.
