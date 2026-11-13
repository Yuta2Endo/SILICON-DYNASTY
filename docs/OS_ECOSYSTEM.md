# OS Interface & Software Ecosystem

Stage 09 extends the OS Lab with platform profiles, user-interface capability,
development tools, an application catalog and a staged release lifecycle. All
values are deterministic game models, not measurements of a real operating
system.

## Configuration fields

Every OS configuration now has 26 fields: the 21 kernel/system fields from
Stages 07–08 plus five ecosystem fields.

| Field | Options | 1995 default | Effect |
| --- | --- | --- | --- |
| `gui` | `cli`, `desktop-shell`, `modern-desktop`, `adaptive` | `cli` | GUI capability, application requirements and GUI score |
| `sdk` | `none`, `basic`, `full`, `professional` | `basic` | SDK score and minimum SDK for applications |
| `api` | `proprietary`, `posix`, `web`, `hybrid` | `proprietary` | API score and which applications accept the platform |
| `developerTools` | `none`, `compiler`, `ide`, `suite` | `compiler` | Developer-tools score and application requirements |
| `appStore` | `none`, `curated`, `open`, `enterprise` | `none` | Store score, platform appeal and store availability |

Field catalogs are typed and validated by `validateOsConfiguration`. Save
parsing uses the same catalog, so unknown options are rejected rather than
silently accepted.

## Historical availability

Ecosystem options are year-gated. The UI shows a future-technology error until
the simulated year reaches the minimum.

| Option | Minimum year |
| --- | --- |
| Web API | 1997 |
| IDE developer tools | 1997 |
| Full SDK | 1998 |
| Curated app store | 1999 |
| Modern desktop GUI | 2000 |
| Hybrid API | 2003 |
| Open app store | 2003 |
| Developer suite | 2004 |
| Professional SDK | 2005 |
| Enterprise app store | 2007 |
| Adaptive GUI | 2008 |

Existing kernel and system gates remain in force, including coreboot (1999),
64-bit addressing (2003), UEFI (2005), ZFS (2005), advanced networking (2003),
cloud networking (2010), role-based permissions (1998), capability permissions
(2003), full-disk encryption (2000), hardware encryption (2007), staged updates
(2001), rolling updates (2010), signed packages (2002), decentralized packages
(2012) and telemetry (2008).

## Ecosystem constraints

- An app store requires an SDK other than `none`.
- IDE or suite developer tools require an SDK other than `none`.
- A developer suite requires a `full` or `professional` SDK.
- A web API requires a network stack other than `basic`.

The designer reports these as field errors and blocks saving until they are
resolved.

## Platform profiles

The profile picker applies a complete, valid 1995 preset to the current draft.
It does not save automatically; the user can review and save a new version.

| Profile | Main differences from the default desktop preset |
| --- | --- |
| Desktop | Desktop platform with `desktop-shell` GUI |
| Mobile | Microkernel, energy-aware scheduler, message-passing IPC, 96 syscalls, user-space modules/drivers, 256 processes, ARM, ext2, desktop-shell |
| Server | Priority scheduler, message-passing IPC, 256 syscalls, 4,096 processes, ext2, ACPI drivers, TCP/IP, centralized packages, crash dumps, POSIX API |
| Gaming | Hybrid kernel, priority scheduler, shared-memory IPC, 256 syscalls, hybrid drivers, 1,024 processes, ACPI drivers, desktop-shell |

Profiles are starting points for experimentation, not permanent platform
classes. Every field remains editable after applying a preset.

## Application catalog

`src/game/models/os-applications.ts` defines six applications. Compatibility is
checked against the current configuration and the calculated memory footprint
and security score.

| Application | Category | Minimum GUI | Minimum SDK | Required API | Architectures | Memory | Security | Tools |
| --- | --- | --- | --- | --- | --- | ---: | ---: | --- |
| Notes | Productivity | CLI | Basic | Proprietary | x86, ARM, RISC-V | 8 MB | 0 | None |
| Web browser | Internet | Desktop shell | Basic | Proprietary or web | x86, ARM, RISC-V | 64 MB | 20 | None |
| Office suite | Productivity | Desktop shell | Full | Proprietary or POSIX | x86, ARM | 128 MB | 30 | None |
| Developer studio | Development | Modern desktop | Full | Proprietary, POSIX or web | x86, ARM, RISC-V | 512 MB | 25 | IDE |
| Game runtime | Gaming | Modern desktop | Full | Proprietary or hybrid | x86, ARM | 1,024 MB | 20 | Compiler |
| Enterprise console | Enterprise | Desktop shell | Professional | POSIX or hybrid | x86 | 2,048 MB | 50 | Suite |

Compatibility issue codes:

- `gui-required`
- `sdk-required`
- `api-unsupported`
- `architecture-unsupported`
- `memory-required`
- `security-required`
- `developer-tools-required`

Address width determines the usable memory capacity for this check:

| Address width | Capacity |
| --- | ---: |
| 16-bit | 16 MB |
| 32-bit | 4,096 MB |
| 64-bit | 1,000,000 MB |

An application needs both enough capacity for its minimum memory and a kernel
footprint that fits inside the capacity. The UI lists every catalog application,
its category, compatibility status and all failed requirements.

## Ecosystem metrics

Profile scores are fixed, bounded values:

| GUI | Score | SDK | Score | API | Score | Tools | Score | Store | Score |
| --- | ---: | --- | ---: | --- | ---: | --- | ---: | --- | ---: |
| CLI | 20 | None | 10 | Proprietary | 35 | None | 20 | None | 10 |
| Desktop shell | 55 | Basic | 45 | POSIX | 62 | Compiler | 48 | Curated | 50 |
| Modern desktop | 78 | Full | 75 | Web | 58 | IDE | 72 | Open | 75 |
| Adaptive | 92 | Professional | 92 | Hybrid | 82 | Suite | 90 | Enterprise | 68 |

Derived outputs:

```text
applicationCoverage = compatible applications / total applications * 100
ecosystemScore = sdk * 0.32 + api * 0.23 + gui * 0.20
               + developerTools * 0.15 + appStore * 0.10
platformAppeal = kernelOverall * 0.30 + ecosystemScore * 0.30
               + applicationCoverage * 0.25 + appStoreScore * 0.15
```

All results are clamped to 0–100 and rounded to one decimal. Platform appeal is
therefore driven by the kernel, the development ecosystem, real application
compatibility and store quality. Applications do not add decorative bonuses;
they change coverage, which changes appeal.

## Release lifecycle

An OS project can have multiple releases. A release is a snapshot of the project
configuration at the moment the lifecycle starts, plus its current stage,
quality, appeal and cumulative cost.

```text
alpha → beta → rc → stable
```

| Stage | Cost | Quality/appeal factor |
| --- | ---: | ---: |
| Alpha | $25,000 | 0.78 |
| Beta | $35,000 | 0.88 |
| RC | $50,000 | 0.95 |
| Stable | $80,000 | 1.00 |

Each transition is immediate in the current implementation and charges the next
stage's cost through the finance ledger under the `release` category. Advancing
one release from Alpha through Stable therefore costs $190,000 in total.

```text
quality = (kernelOverall * 0.40 + platformAppeal * 0.60) * stageFactor
appeal  = platformAppeal * stageFactor
```

Quality and appeal improve as a release matures, but an unstable or poorly
supported platform can still have a low score at Stable. Starting a release
creates version `max(existing versions) + 1` and an ID such as `os-release-1`.
Stable is final; further advancement returns a `release-final` error. Release
operations do not run in the daily pipeline and do not advance time
automatically.

## Persistence

Save schema v8 stores:

- the five ecosystem fields in every current configuration and saved version;
- `releases` on each OS project, including the release ID, version, stage,
  creation date, configuration snapshot, quality, appeal and cumulative cost.

Schema v7 projects migrate with the 1995 ecosystem defaults and an empty release
list. Saves from schema 1–5 still receive an empty OS project list. Strict v8
parsing validates every ecosystem option, release stage, date, score and cost,
rejects duplicate release IDs or versions, and rejects schema 9 or newer.

## UI

The OS Lab adds:

- a platform-profile picker that applies a draft configuration;
- an ecosystem fieldset with GUI, SDK, API, developer tools and app store;
- ecosystem metric rows for SDK, API, GUI, tools, store, ecosystem score,
  compatible applications, coverage and platform appeal;
- an application compatibility panel with all six catalog applications;
- a release panel with history, stage, quality, appeal, cumulative cost, Start
  Alpha and Advance actions;
- localized errors when a release command fails.

The existing simulation banner remains visible. The page states that this is a
game simulation, not a real operating system.

## Tests

- `src/game/models/os.test.ts` covers ecosystem constraints, year gates, legacy
  parsing, platform profiles and release snapshots.
- `src/game/formulas/os.test.ts` covers ecosystem scores, application coverage,
  platform appeal, release costs and quality progression.
- `src/game/engine/os-release.test.ts` covers finance charges and the full
  Alpha/Beta/RC/Stable chain.
- `src/game/application/game-application.test.ts` covers persistence across
  save/reload.
- `src/game/models/game-state.test.ts` covers schema v7 → v8 migration.
- `src/features/os/OsDesignerPage.test.tsx` covers profile application,
  ecosystem saves, application issues and release actions.
