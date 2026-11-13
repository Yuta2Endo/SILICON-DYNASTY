# AI Architecture & Data Lab

## Scope and disclaimer

The AI Lab is a game simulation of AI model design. It calculates model quality, dataset contribution, commercial readiness, appeal and hardware requirements. It does not train or run a real AI model, and its numbers are not technical benchmarks.

Stage 10 covers AI projects, architectures, model parameters, datasets, data quality and licensing, and GPU/VRAM/RAM/storage requirements. Training, deployment and market integration belong to later stages.

## Persistence

AI projects are stored in save schema v9 as `aiProjects`. Each project has:

- `id`, `name`, current `configuration` and current `datasets`;
- `versions`, each with a version number, save date, configuration snapshot and dataset snapshot.

Versions start at 1, are unique and sorted, and the current project must equal the latest saved version. Version 1-8 saves migrate with an empty AI project list. Saves from schema 10 or newer are rejected.

## Model configuration

| Field | Options / bounds | Default |
| --- | --- | --- |
| Architecture | Transformer, RNN, CNN, Diffusion, MoE, Multimodal, Custom | RNN |
| Parameters | 1-1,000,000 million | 10 |
| Layers | 1-512 | 2 |
| Hidden dimension | 64-32,768 | 256 |
| Attention heads | 1-256 | 4 |
| Context window | 128-10,000,000 | 512 |
| Vocabulary size | 1,000-1,000,000 | 10,000 |
| Experts | 1-128 | 1 |
| Precision | FP32, FP16, BF16, FP8 | FP32 |
| Quantization | None, INT8, INT4 | None |

Project and dataset names are 2-40 characters.

### Historical gates

Transformer 2017, MoE 2019, Diffusion 2020, Multimodal 2021, FP16 2008, BF16 2018, FP8 2022, INT8 2015, INT4 2022. RNN, CNN and Custom, FP32 and no quantization are valid from 1995.

### Constraints

- Transformer, MoE and Multimodal require the hidden dimension to be divisible by the attention-head count.
- Only MoE may use more than one expert; MoE requires at least two.
- All numeric values must be integers inside their bounds.

## Datasets

Datasets have a name, modality (text, code, images, video, audio, scientific, multimodal), size in GB, quality 0-100, diversity 0-100, license and processing cost. A project may hold up to 20 datasets with unique IDs.

Licenses affect commercial readiness:

| License | Compliance factor |
| --- | --- |
| Proprietary | 1.00 |
| Permissive | 0.98 |
| Research | 0.65 |
| Restricted | 0.35 |

Dataset quality, diversity, size and license are weighted by dataset size. With no datasets, quality and diversity are 0 and license compliance is 100.

## Metrics

The formula module returns:

- model size, dataset size, weighted dataset quality/diversity and license compliance;
- quality score, training readiness, inference efficiency, commercial readiness and appeal;
- minimum GPU TFLOPS, training VRAM, inference VRAM, system RAM, storage and recommended GPU VRAM.

### Model size

`modelSizeGb = parameterCountM × inferenceBytes / 1000`

Inference bytes: INT8 = 1, INT4 = 0.5; otherwise FP32 = 4, FP16/BF16 = 2, FP8 = 1.

### Quality

`quality = architectureQuality × scaleFactor × dataFactor × diversityFactor × contextFactor × precisionFactor`

- `scaleFactor = clamp(0.6 + 0.2 × log10(parameters / 10), 0.55, 1.3)`
- `dataFactor = 0.55 + 0.45 × datasetQuality / 100`
- `diversityFactor = 0.9 + 0.2 × datasetDiversity / 100`
- `contextFactor = clamp(0.9 + log10(context / 512) × 0.03, 0.9, 1.1)`
- precision factors: FP32 1, FP16 1.02, BF16 1.03, FP8 1.04.

Architecture quality/training/inference/memory profiles:

| Architecture | Quality | Training | Inference | Memory |
| --- | --- | --- | --- | --- |
| Transformer | 80 | 1.15 | 1.00 | 1.00 |
| RNN | 58 | 0.75 | 0.90 | 0.85 |
| CNN | 62 | 0.80 | 0.95 | 0.90 |
| Diffusion | 72 | 1.25 | 1.30 | 1.20 |
| MoE | 86 | 1.35 | 1.10 | 1.30 |
| Multimodal | 82 | 1.30 | 1.20 | 1.15 |
| Custom | 65 | 1.00 | 1.00 | 1.00 |

### Other scores

- `trainingReadiness = quality 35% + diversity 20% + volume adequacy 20% + architecture training 15% + precision 10%`
- `inferenceEfficiency = clamp(96 − modelSize × 0.45 + quantization bonus − architecture penalty, 10, 99)`; quantization bonus is 0/8/14 for none/INT8/INT4.
- `commercialReadiness = quality × 0.6 + licenseCompliance × 100 × 0.25 + diversity × 0.15`
- `appeal = quality × 0.55 + commercialReadiness × 0.25 + inferenceEfficiency × 0.2`

### Hardware requirements

- `trainingWeightsGb = parameters × trainingBytes × 4 / 1000`
- `activationGb = layers × context × hidden × 8 × precisionBytes / 1e9 × 0.25`
- `trainingVramGb = (trainingWeightsGb + activationGb + 2) × architectureMemoryFactor`
- `inferenceVramGb = modelSizeGb + kvCacheGb + 1.5`
- `systemRamGb = 16 + datasetSize × 0.2 + trainingWeightsGb × 0.5`
- `storageGb = 20 + datasetSize × 1.2 + trainingWeightsGb × 4`
- `recommendedGpuVramGb = trainingVramGb × 1.25`
- `minimumGpuTflops = clamp(5 + parameters × 0.02 + context / 4096 × 5, 5, 1000)`

All displayed values are rounded for readability; calculations use the unrounded inputs.

## UI

The AI Lab is the fourth tab in the CPU/Components/OS/AI product workspace. It contains:

- a simulation banner;
- a project creation panel and project picker;
- architecture and numeric configuration fields with validation;
- a Data Lab for adding and removing datasets;
- model metric cards and a detailed metric list;
- a hardware-requirements grid;
- saved-version comparison with architecture and dataset changes plus quality, commercial, readiness, efficiency and VRAM metric deltas;
- version history with configuration and dataset snapshots;
- unsaved-draft confirmation and `beforeunload` protection.

## Tests

Model tests cover defaults, round-trip parsing, bounds, attention/MoE constraints, year gates, dataset validation and version snapshots. Formula tests cover deterministic output, architecture and parameter effects, dataset quality/licensing, quantization and hardware requirements. UI tests cover creation, saving a configuration with a dataset, invalid input, dataset validation, version comparison and workspace navigation. Application and game-state tests cover persistence and schema-v9 migration.
