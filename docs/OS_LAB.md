# OS LAB — Stage 07

This document defines the simulated operating-system kernel laboratory introduced in
Stage 07. Every architecture, metric and requirement is a game model. No bootable
image, kernel, driver or real operating system is produced.

## Scope

- Create named OS projects with a saved version history.
- Configure target platform, kernel architecture, bootloader, scheduler, memory
  manager, virtual memory, IPC model, syscall count, module support, driver model,
  address width, process limit and supported CPU architectures.
- Recalculate kernel metrics deterministically from those choices.
- Evaluate platform requirements and enforce cross-subsystem constraints.
- Present the model as a simulation explicitly; it is a product-design workspace
  inside Silicon Dynasty, not a real OS tool.

Stage 07 does not integrate OS projects into the daily market, finance ledger,
research unlocks or manufacturing pipeline. Those are later-stage systems.

## Persistence

`GameState.osProjects` is stored from save schema v6. No historical OS data is
invented when migrating a v1–v5 save; older saves receive an empty list.

```ts
{
  id: string;                 // os-N
  name: string;               // trimmed, 2..40 characters
  configuration: OsConfiguration;
  versions: Array<{
    version: number;          // starts at 1, strictly increasing
    savedOn: string;          // YYYY-MM-DD
    configuration: OsConfiguration;
  }>;
}
```

Parsing requires a non-empty unique version list beginning at 1. The top-level
configuration must equal the latest saved version. All configurations, including
historical versions, are validated against the current game year, so a save cannot
smuggle a future technology into the present.

## Configuration

| Field | Values / bounds | Default 1995 |
| --- | --- | --- |
| `targetPlatform` | desktop, mobile, server, gaming, universal | desktop |
| `kernelType` | monolithic, microkernel, hybrid, modular | monolithic |
| `bootloader` | BIOS, UEFI, coreboot | BIOS |
| `scheduler` | round-robin, priority, multilevel-feedback, real-time, energy-aware | round-robin |
| `memoryManager` | flat, paging, segmentation, paged-segmentation | paging |
| `virtualMemory` | boolean | true |
| `ipcModel` | pipes, message-passing, shared-memory, hybrid | pipes |
| `syscallCount` | integer 16..1,024 | 128 |
| `moduleSupport` | none, loadable, user-space | loadable |
| `driverModel` | in-kernel, user-space, hybrid | in-kernel |
| `addressBits` | 16, 32, 64 | 32 |
| `maxProcesses` | integer 16..1,000,000 | 512 |
| `supportedArchitectures` | non-empty unique x86, ARM, RISC-V | x86 |

Technology availability: coreboot from 1999, 64-bit addressing from 2003, UEFI
from 2005. Validation uses the current game year.

## Validation rules

- All option fields must be valid catalog values.
- `syscallCount` and `maxProcesses` must be integers within global bounds.
- At least one architecture is required; duplicates are rejected.
- Virtual memory requires paging.
- A microkernel requires message-passing or hybrid IPC and cannot use in-kernel
  drivers.
- A monolithic kernel cannot use user-space drivers.
- User-space modules require a microkernel or hybrid kernel.
- A modular kernel must support loadable or user-space modules.
- Maximum processes are capped by address width: 16-bit 4,096, 32-bit 100,000,
  64-bit 1,000,000.
- UEFI, coreboot and 64-bit addressing are rejected before their minimum year.

Stable validation codes are `invalid-option`, `integer`, `empty-selection`,
`duplicate-option`, `future-technology`, `virtual-memory-requires-paging`,
`microkernel-ipc`, `microkernel-drivers`, `monolithic-user-drivers`,
`user-space-modules-require-microkernel`, `modular-requires-modules` and
`process-limit`.

## Metric model

All metrics are deterministic. Scores are clamped to 0..100. Distances are rounded
for display: times/footprints/throughputs to 1 decimal, IPC latency to 2 decimals,
scores to 1 decimal. Process capacity is the smaller of the configured limit and the
address-width cap.

The model derives intermediate factors from the selected subsystems:

```text
syscallFactor = 1 - min(0.12, log2(max(1, syscalls / 64)) * 0.025)
processFactor = 0.9 + min(0.18, log10(max(1, maxProcesses)) / 10)
architectureCompatibility = min(1.2, 0.88 + architectureCount * 0.12)
architectureMaintainability = 1 - min(0.15, max(0, architectureCount - 1) * 0.05)
```

### Kernel architecture profiles

| Kernel | Perf | Stability | Security | Compatibility | Maintainability | Footprint | Boot | IPC latency | Syscall | Energy |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Monolithic | 1.14 | 0.90 | 0.86 | 0.96 | 0.80 | 0.82 | 0.86 | 0.72 | 0.74 | 1.06 |
| Microkernel | 0.82 | 1.20 | 1.18 | 0.90 | 1.18 | 0.94 | 1.14 | 1.65 | 1.30 | 0.90 |
| Hybrid | 1.00 | 1.06 | 1.05 | 1.00 | 1.05 | 0.90 | 1.00 | 1.00 | 0.95 | 1.00 |
| Modular | 0.90 | 1.04 | 1.03 | 1.08 | 1.20 | 1.08 | 1.16 | 0.96 | 0.92 | 0.95 |

These profiles make architecture a trade-off: monolithic leads on raw speed and
kernel size, microkernel on isolation and serviceability, modular on compatibility
and maintenance, hybrid balances the extremes.

### Subsystem profiles

Bootloaders:

| Bootloader | Seconds | Compatibility | Security | Maintainability |
| --- | ---: | ---: | ---: | ---: |
| BIOS | 9.0 | 0.90 | 0.84 | 0.85 |
| UEFI | 4.5 | 1.08 | 1.08 | 1.05 |
| coreboot | 3.0 | 0.96 | 1.06 | 1.12 |

Schedulers (throughput / latency / energy / stability / compatibility):
round-robin 0.90 / 1.05 / 0.95 / 1.00 / 1.00; priority 1.00 / 0.95 / 1.00 /
0.96 / 0.98; multilevel-feedback 1.12 / 0.88 / 0.95 / 1.02 / 1.03; real-time
0.96 / 0.60 / 0.84 / 0.90 / 0.90; energy-aware 0.88 / 1.00 / 1.18 / 1.00 / 0.95.

Memory managers (performance / stability / security / compatibility / energy /
overhead MB): flat 1.06 / 0.78 / 0.72 / 0.86 / 1.04 / 12; paging 1.00 / 1.14 /
1.14 / 1.05 / 0.98 / 24; segmentation 0.92 / 0.96 / 0.94 / 0.90 / 1.00 / 18;
paged-segmentation 0.96 / 1.10 / 1.10 / 1.02 / 0.96 / 28.

IPC models (latency / throughput / stability / security / compatibility): pipes
1.25 / 0.92 / 1.02 / 0.94 / 1.00; message-passing 1.05 / 0.98 / 1.04 / 1.04 /
1.02; shared-memory 0.65 / 1.10 / 0.92 / 0.86 / 0.94; hybrid 0.85 / 1.04 / 1.02 /
1.00 / 1.03.

Module support (footprint MB / compatibility / maintainability / stability /
security): none 0 / 0.92 / 0.85 / 1.02 / 1.04; loadable 20 / 1.06 / 1.12 / 0.98 /
0.96; user-space 30 / 1.10 / 1.18 / 1.06 / 1.12.

Driver models (footprint MB / performance / stability / security /
maintainability): in-kernel 8 / 1.08 / 0.92 / 0.86 / 0.90; user-space 26 / 0.82 /
1.14 / 1.18 / 1.12; hybrid 14 / 1.00 / 1.05 / 1.06 / 1.04.

Address width (performance / compatibility / maintainability / additional boot
seconds / additional footprint MB): 16-bit 0.82 / 0.70 / 0.85 / −1 / 0; 32-bit
1.00 / 1.00 / 1.00 / 0 / 0; 64-bit 1.06 / 1.08 / 1.02 / +0.8 / +8.

### Derived metrics

```text
footprint = 24 * kernel.footprint
          + memory.overheadMb + module.footprintMb + driver.footprintMb
          + (virtualMemory ? 6 : 0) + min(24, syscalls * 0.03)
          + sqrt(max(1, maxProcesses)) * 0.55
          + (architectureCount - 1) * 5 + address.footprintMb
          clamp 16..4096 MB

boot = bootloader.seconds + 2 + footprint / 85
     + (module.footprintMb + driver.footprintMb) * 0.035
     + syscalls / 600 + address.bootSeconds
     + (virtualMemory ? 1.2 : 0) + (kernel.boot - 1) * 5
     clamp 1..600 s

performance = 55 * kernel.perf * scheduler.throughput * memory.performance
            * driver.performance * ipc.throughput * syscallFactor
            * processFactor * address.performance
            * (virtualMemory ? 0.96 : 1)

stability = 62 * kernel.stability * memory.stability * ipc.stability
          * scheduler.stability * driver.stability * bootloader.security
          * module.stability * (virtualMemory ? 1.05 : 1)

security = 58 * kernel.security * memory.security * ipc.security
         * driver.security * bootloader.security * module.security
         * (virtualMemory ? 1.06 : 1)

compatibility = 55 * bootloader.compatibility * module.compatibility
              * kernel.compatibility * address.compatibility
              * architectureCompatibility
              * (0.8 + 0.2 * min(1, syscalls / 256))

energy = 65 * scheduler.energy * kernel.energy * memory.energy
       * clamp(1 - footprint / 5000, 0.7, 1)
       * (virtualMemory ? 0.92 : 1)

maintainability = 55 * kernel.maintainability * module.maintainability
                * driver.maintainability * bootloader.maintainability
                * address.maintainability * architectureMaintainability

ipcLatency = 12 * kernel.ipcLatency * ipc.latency * scheduler.latency
           * (virtualMemory ? 1.04 : 1)
           clamp 0.5..5000 microseconds

syscallOverhead = 220 * kernel.syscall * scheduler.latency
                * (virtualMemory ? 1.02 : 1)
                * (1 - min(0.1, syscalls / 10240))
                clamp 10..20000 nanoseconds
```

Overall score uses platform-specific weights:

| Platform | Perf | Stability | Security | Compatibility | Energy | Latency | Syscall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Desktop | 0.26 | 0.25 | 0.16 | 0.18 | 0.07 | 0.05 | 0.03 |
| Mobile | 0.16 | 0.22 | 0.14 | 0.12 | 0.24 | 0.07 | 0.05 |
| Server | 0.18 | 0.28 | 0.22 | 0.16 | 0.06 | 0.05 | 0.05 |
| Gaming | 0.34 | 0.14 | 0.05 | 0.07 | 0.06 | 0.26 | 0.08 |
| Universal | 0.22 | 0.22 | 0.15 | 0.20 | 0.09 | 0.07 | 0.05 |

Latency and syscall scores are `100 - max(0, IPC − 4) * 4` and
`100 - max(0, overhead − 80) / 7`, clamped to 0..100.

The default 1995 desktop configuration produces approximately: boot 13.8 s,
footprint 94 MB, performance 56.7, stability 51.6, security 39.3, compatibility
45.3, energy 57.9, maintainability 37.7, IPC latency 11.79 µs, syscall overhead
172.2 ns, process capacity 512 and overall score 52.2. Desktop requirements are
all satisfied.

## Platform requirements

| Platform | Requirement |
| --- | --- |
| Desktop | boot ≤ 30 s, footprint ≤ 1,024 MB, performance ≥ 45, stability ≥ 45, compatibility ≥ 40 |
| Mobile | boot ≤ 20 s, footprint ≤ 512 MB, stability ≥ 50, energy ≥ 55, compatibility ≥ 35 |
| Server | boot ≤ 120 s, footprint ≤ 4,096 MB, stability ≥ 60, security ≥ 45, performance ≥ 45 |
| Gaming | boot ≤ 25 s, performance ≥ 60, stability ≥ 40, IPC ≤ 120 µs, syscall ≤ 600 ns |
| Universal | boot ≤ 45 s, footprint ≤ 2,048 MB, performance ≥ 45, stability ≥ 50, compatibility ≥ 50, overall ≥ 50 |

Requirements are evaluated against the same metrics object shown in the UI, so a
failed requirement always shows its actual value and comparator.

## UI

The OS Lab is a third tab in the product-development workspace, alongside
Processors and Components. It is not a separate bottom-navigation destination,
which keeps the mobile navigation at six items.

- A persistent simulation banner states that this is a game model, not a real OS.
- The create panel accepts a 2–40 character project name; new projects receive the
  1995 default configuration.
- The editor exposes every configuration field and shows field-level/cross-constraint
  errors, current process cap and controlled select/multi-select inputs.
- The metrics section shows overall/performance/stability/security cards plus boot,
  footprint, compatibility, energy, maintainability, IPC latency, syscall overhead
  and process capacity.
- The requirements checklist shows passed count, comparator, target, actual value and
  pass/fail text.
- Version history displays every saved version and loads a version into the draft.
- Switching project or loading a version with unsaved edits opens a confirmation
  sheet; leaving the screen triggers the app navigation guard; a browser unload
  prompt protects dirty drafts.

All values are calculated from game logic. The UI does not own formulas and does not
claim that metrics are measured from real hardware or software.

## Tests

- `src/game/models/os.test.ts`: configuration defaults/round-trip, bounds, cross
  constraints, year gates, process caps, project/version creation, strict parsing and
  rejection of invalid names/configurations.
- `src/game/formulas/os.test.ts`: deterministic metrics, monolithic/microkernel
  trade-offs, bootloader/address/architecture effects, requirement pass/fail and
  process-cap behavior.
- `src/features/os/OsDesignerPage.test.tsx`: project creation, valid version save,
  invalid kernel constraint blocking, product-workspace navigation.
- `src/app/App.test.tsx`: OS Lab route from the product workspace and persisted OS
  project creation.
- `src/game/models/game-state.test.ts` and
  `src/storage/repositories/BrowserGameStateRepository.test.ts`: schema v5→v6
  migration and OS persistence.
- `src/game/application/game-application.test.ts`: create/save OS commands and
  rejection without persistence.
