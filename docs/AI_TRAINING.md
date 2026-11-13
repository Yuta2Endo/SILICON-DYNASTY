# AI Training & Deployment

Stage 11 adds a simulated training and deployment pipeline to the AI Lab. The
feature is a game model: it does not train a real machine-learning model, does
not use real datasets and does not measure real hardware. Metrics are explicitly
labelled as simulated values in the UI.

## Scope

- Deterministic training runs with seed, hardware, duration, progress, loss and
  validation.
- Hardware plans derived from the reference cluster or saved GPU/AI-accelerator
  component projects.
- Upfront training costs and hardware compatibility checks.
- Post-training quantization, pruning, distillation and fine-tuning.
- Deployment snapshots with quality, appeal, cost and optimization history.
- Persistence of training jobs and deployments in save schema v10.

Market effects, reputation effects, cloud inference and competitor AI products
are outside Stage 11.

## Persistence

`AiProject` now stores `trainingJobs` and `deployments` alongside its design
versions.

A training job contains:

- `id`, design `version`, `seed`;
- hardware project ID/name, TFLOPS and VRAM;
- total days, progress days, daily cost and total cost;
- stage (`training` or `completed`), loss and validation score;
- start/completion dates;
- configuration and dataset snapshots;
- applied optimizations with dates and costs.

A deployment contains:

- `id`, training job ID and design version;
- deployment date;
- quality score, appeal score and cost;
- the optimization types applied to the run.

Schema v10 is strict. Legacy v9 saves receive empty training/deployment arrays
during migration. Parsing rejects inconsistent progress, missing completion
dates, duplicate IDs, multiple active jobs, unknown deployment references and
optimizations that were not applied to the source run.

## Training hardware

`getAiTrainingHardwareOptions` always exposes a reference cluster and adds every
saved GPU or AI-accelerator component project.

| Source | TFLOPS | VRAM |
| --- | --- | --- |
| Reference training cluster | 20 | 16 GB |
| GPU component | `round(5 + performanceScore * 15, 1)` | Memory capacity |
| AI accelerator component | `round(5 + performanceScore * 15, 1)` | Memory capacity |

The plan compares hardware with the model's calculated minimum GPU TFLOPS and
training VRAM. Missing or insufficient hardware is rejected before charging.

## Training plan

The training plan uses the current model configuration and datasets:

```text
totalDays = clamp(ceil(2 + parameterCountM / 1000 + trainingVramGb / 8 + datasetSizeGb / 100), 1, 60)
costPerDayUsd = round(120 + tflops * 6 + vramGb * 9)
totalCostUsd = totalDays * costPerDayUsd
```

The full training cost is charged once when training starts, through the finance
ledger under the `research` category. Daily progress does not charge again.

## Deterministic progress

Training starts at day 0. Each game-day advance increments every active job once.
Loss and validation are deterministic functions of the seed, day, model,
datasets and optimizations.

```text
ratio = progressDays / totalDays
noise = seededUnit(seed, progressDays, salt)
loss = max(0.05, 4.8 * exp(-3.4 * ratio) + noise * 0.18)
validation = clamp(
  modelQuality * (0.55 + 0.45 * ratio) + (100 - loss * 20) * 0.25,
  0,
  100,
)
```

The same seed and inputs always produce the same sequence. Different seeds
produce different loss/validation trajectories. A job completes when
`progressDays >= totalDays`; its completion date is the simulation date of the
advance that finished it.

## Optimizations

Optimizations are applied only to completed training jobs, once per type, and
each posts its cost to the finance ledger under `research`.

| Optimization | Cost | Effects |
| --- | --- | --- |
| Quantization | $12,000 | Model size ×0.55, inference efficiency +8, quality −1.5 |
| Pruning | $18,000 | Model size ×0.75, inference efficiency +5, quality −2.5 |
| Distillation | $30,000 | Model size ×0.70, inference efficiency +10, quality −3.5 |
| Fine-tuning | $22,000 | Quality +4, commercial readiness +3 |

The optimized metrics are recalculated from the job's configuration and dataset
snapshot. Optimization effects stack in a documented, deterministic order.

## Deployment

Deployment costs $15,000, requires a completed run and can be performed once per
training job. It creates an immutable deployment snapshot:

```text
deploymentQuality = modelQuality * 0.65 + validationScore * 0.35
deploymentAppeal = modelAppeal * 0.70 + deploymentQuality * 0.30
```

The deployment records the source version, optimization types and cost. The
deployment is not yet connected to market demand, reputation or competitor AI
products.

## UI

The AI Lab's training section provides:

- hardware selection and seed input;
- duration, daily cost, total cost, required TFLOPS and required VRAM;
- hardware compatibility issues;
- active-run progress, loss, validation and cost;
- completed runs with optimization actions and effects;
- deployment action and deployment history.

All values are labelled as a deterministic game simulation. The page continues
to show the model/dataset editor, calculated model metrics and hardware
requirements from Stage 10.

## Validation and tests

Coverage includes:

- strict training/deployment parsing and legacy migration;
- deterministic same-seed and different-seed progress;
- hardware plan compatibility and insufficient-resource failures;
- optimization effects and duplicate guards;
- training, optimization and deployment finance costs;
- application-level persistence across reload;
- UI start/progress/optimization/deployment flows.

`test:e2e` is not defined in the project, so end-to-end automation is reported as
NOT AVAILABLE.
