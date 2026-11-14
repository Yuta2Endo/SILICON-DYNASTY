import type { GpuConfiguration } from "./components";

export type GpuPreviewView = "board" | "die";

export type GpuHeatTier = "cool" | "warm" | "hot";

export type GpuBoardModuleKind =
  | "die"
  | "vram"
  | "vrm"
  | "pcie"
  | "display"
  | "power";

export type GpuDieBlockKind =
  | "compute"
  | "cache"
  | "memory-controller"
  | "display"
  | "rt";

export interface GpuBoardModule {
  id: string;
  kind: GpuBoardModuleKind;
  x: number;
  y: number;
  width: number;
  height: number;
  heat: number;
  count?: number;
  capacityGb?: number;
}

export interface GpuDieBlock {
  id: string;
  kind: GpuDieBlockKind;
  x: number;
  y: number;
  width: number;
  height: number;
  heat: number;
  index?: number;
  count?: number;
}

export interface GpuBoardLayout {
  width: number;
  height: number;
  modules: GpuBoardModule[];
}

export interface GpuDieLayout {
  width: number;
  height: number;
  blocks: GpuDieBlock[];
  hotspotBlockId: string;
  hotspot: number;
}

export interface GpuVisualMetrics {
  dieAreaMm2: number;
  areaPerComputeUnit: number;
  computeThroughputTflops: number;
  memoryBandwidthGbPerSecond: number;
  memoryCapacityGb: number;
  memoryBusBits: number;
  vramModuleCount: number;
  vramModuleCapacityGb: number;
  tdpW: number;
  dieHeat: number;
  vrmHeat: number;
  vramHeat: number;
  hotspot: number;
  hotspotModuleId: string;
  boardLengthMm: number;
  slotWidth: number;
  powerConnectors: number;
  recommendedPsuW: number;
  vrmPhaseCount: number;
}

export interface GpuVisualModel {
  board: GpuBoardLayout;
  die: GpuDieLayout;
  metrics: GpuVisualMetrics;
}

const BOARD_WIDTH = 340;
const BOARD_HEIGHT = 170;
const DIE_WIDTH = 300;
const DIE_HEIGHT = 190;

const VRAM_SIDE_SLOTS = [
  { x: 30, y: 52 },
  { x: 284, y: 52 },
  { x: 30, y: 76 },
  { x: 284, y: 76 },
  { x: 30, y: 100 },
  { x: 284, y: 100 },
  { x: 30, y: 124 },
  { x: 284, y: 124 },
] as const;

const VRAM_TOP_SLOTS = [
  { x: 92, y: 24 },
  { x: 124, y: 24 },
  { x: 156, y: 24 },
  { x: 188, y: 24 },
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function roundUpTo(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

export function getGpuHeatTier(heat: number): GpuHeatTier {
  if (heat >= 72) {
    return "hot";
  }
  if (heat >= 45) {
    return "warm";
  }
  return "cool";
}

function calculateMemoryBusBits(configuration: GpuConfiguration): number {
  const raw = configuration.memoryBandwidthGbPerSecond * 4
    + configuration.memoryCapacityGb * 4;
  return clamp(roundUpTo(Math.max(64, raw), 64), 64, 512);
}

function buildBoardModules(
  configuration: GpuConfiguration,
  metrics: Omit<GpuVisualMetrics, "hotspotModuleId">,
): GpuBoardModule[] {
  const modules: GpuBoardModule[] = [
    {
      id: "gpu-display",
      kind: "display",
      x: 2,
      y: 44,
      width: 10,
      height: 66,
      heat: 24,
      count: 3,
    },
    {
      id: "gpu-die",
      kind: "die",
      x: 112,
      y: 50,
      width: 116,
      height: 84,
      heat: metrics.dieHeat,
      count: Math.min(configuration.computeUnits, 12),
    },
  ];

  const vramCount = metrics.vramModuleCount;
  const sideCount = Math.min(vramCount, VRAM_SIDE_SLOTS.length);
  for (let index = 0; index < sideCount; index += 1) {
    const slot = VRAM_SIDE_SLOTS[index];
    if (!slot) {
      continue;
    }
    modules.push({
      id: `gpu-vram-${index + 1}`,
      kind: "vram",
      x: slot.x,
      y: slot.y,
      width: 26,
      height: 20,
      heat: clamp(metrics.vramHeat + (index % 3) * 1.4, 15, 100),
      capacityGb: metrics.vramModuleCapacityGb,
    });
  }

  const topCount = Math.max(0, vramCount - sideCount);
  for (let index = 0; index < topCount; index += 1) {
    const slot = VRAM_TOP_SLOTS[index % VRAM_TOP_SLOTS.length];
    if (!slot) {
      continue;
    }
    modules.push({
      id: `gpu-vram-${sideCount + index + 1}`,
      kind: "vram",
      x: slot.x,
      y: slot.y,
      width: 26,
      height: 16,
      heat: clamp(metrics.vramHeat + 2 + (index % 2) * 1.2, 15, 100),
      capacityGb: metrics.vramModuleCapacityGb,
    });
  }

  modules.push({
    id: "gpu-vrm",
    kind: "vrm",
    x: 220,
    y: 22,
    width: 88,
    height: 14,
    heat: metrics.vrmHeat,
    count: metrics.vrmPhaseCount,
  });

  modules.push({
    id: "gpu-pcie",
    kind: "pcie",
    x: 44,
    y: 158,
    width: 150,
    height: 7,
    heat: 22,
    count: 16,
  });

  if (metrics.powerConnectors > 0) {
    modules.push({
      id: "gpu-power",
      kind: "power",
      x: 266,
      y: 2,
      width: 46,
      height: 10,
      heat: clamp(metrics.vrmHeat * 0.8, 15, 100),
      count: metrics.powerConnectors,
    });
  }

  return modules;
}

function buildDieLayout(
  configuration: GpuConfiguration,
  metrics: Omit<GpuVisualMetrics, "hotspotModuleId">,
): GpuDieLayout {
  const blocks: GpuDieBlock[] = [];
  const displayedComputeUnits = Math.min(configuration.computeUnits, 23);
  const columns = displayedComputeUnits <= 4
    ? 2
    : displayedComputeUnits <= 9
      ? 3
      : displayedComputeUnits <= 16
        ? 4
        : 6;
  const rows = Math.ceil(displayedComputeUnits / columns);
  const gap = 2;
  const cellWidth = (190 - (columns - 1) * gap) / columns;
  const cellHeight = (110 - (rows - 1) * gap) / rows;

  for (let index = 0; index < displayedComputeUnits; index += 1) {
    blocks.push({
      id: `gpu-die-compute-${index + 1}`,
      kind: "compute",
      x: 18 + (index % columns) * (cellWidth + gap),
      y: 30 + Math.floor(index / columns) * (cellHeight + gap),
      width: cellWidth,
      height: cellHeight,
      heat: clamp(metrics.dieHeat + (index % 4) * 1.5 + 2, 5, 100),
      index,
    });
  }

  if (configuration.computeUnits > displayedComputeUnits) {
    const extra = configuration.computeUnits - displayedComputeUnits;
    blocks.push({
      id: "gpu-die-compute-extra",
      kind: "compute",
      x: 18 + (displayedComputeUnits % columns) * (cellWidth + gap),
      y: 30 + Math.floor(displayedComputeUnits / columns) * (cellHeight + gap),
      width: cellWidth,
      height: cellHeight,
      heat: clamp(metrics.dieHeat + 5, 5, 100),
      count: extra,
    });
  }

  blocks.push({
    id: "gpu-die-cache",
    kind: "cache",
    x: 216,
    y: 30,
    width: 66,
    height: 42,
    heat: clamp(metrics.dieHeat * 0.64, 5, 100),
  });

  let displayY = 78;
  let displayHeight = 58;

  if (configuration.rayTracing) {
    blocks.push({
      id: "gpu-die-rt",
      kind: "rt",
      x: 216,
      y: 78,
      width: 66,
      height: 26,
      heat: clamp(metrics.dieHeat * 1.06, 5, 100),
      count: Math.max(1, Math.ceil(configuration.computeUnits / 16)),
    });
    displayY = 110;
    displayHeight = 26;
  }

  blocks.push({
    id: "gpu-die-display",
    kind: "display",
    x: 216,
    y: displayY,
    width: 66,
    height: displayHeight,
    heat: clamp(metrics.dieHeat * 0.42, 5, 100),
    count: 3,
  });

  const controllerCount = clamp(Math.ceil(metrics.memoryBusBits / 64), 2, 8);
  const controllerGap = 2;
  const controllerWidth = (264 - (controllerCount - 1) * controllerGap) / controllerCount;
  for (let index = 0; index < controllerCount; index += 1) {
    blocks.push({
      id: `gpu-die-memory-controller-${index + 1}`,
      kind: "memory-controller",
      x: 18 + index * (controllerWidth + controllerGap),
      y: 148,
      width: controllerWidth,
      height: 24,
      heat: clamp(metrics.dieHeat * 0.68 + metrics.vramHeat * 0.18, 5, 100),
    });
  }

  let hotspotBlock = blocks[0];
  for (const block of blocks) {
    if (!hotspotBlock || block.heat > hotspotBlock.heat) {
      hotspotBlock = block;
    }
  }

  return {
    width: DIE_WIDTH,
    height: DIE_HEIGHT,
    blocks,
    hotspotBlockId: hotspotBlock?.id ?? "gpu-die-compute-1",
    hotspot: hotspotBlock?.heat ?? metrics.dieHeat,
  };
}

export function buildGpuVisualModel(configuration: GpuConfiguration): GpuVisualModel {
  const nodeDensity = clamp(
    1 + Math.max(0, 350 - configuration.processNodeNm) / 700,
    1,
    1.35,
  );
  const dieHeat = clamp(
    10
      + (configuration.tdpW / configuration.dieAreaMm2) * 130 * nodeDensity
      + (configuration.clockMHz / 6_000) * 10
      + (configuration.computeUnits / 4_096) * 8
      + (configuration.rayTracing ? 4 : 0),
    5,
    100,
  );
  const vrmHeat = clamp(
    22
      + (configuration.tdpW / 5_000) * 70
      + (configuration.computeUnits / 4_096) * 12,
    15,
    100,
  );
  const vramHeat = clamp(
    18
      + (configuration.memoryBandwidthGbPerSecond / 1_000) * 20
      + (configuration.memoryCapacityGb / 4_096) * 10,
    15,
    100,
  );

  const memoryBusBits = calculateMemoryBusBits(configuration);
  const vramModuleCount = clamp(Math.floor(memoryBusBits / 32), 4, 12);
  const vramModuleCapacityGb = round(
    configuration.memoryCapacityGb / vramModuleCount,
    2,
  );
  const computeThroughputTflops = round(
    (configuration.computeUnits
      * configuration.operationsPerCyclePerUnit
      * configuration.clockMHz
      * 2)
      / 1_000_000,
    3,
  );
  const slotWidth = configuration.tdpW <= 75
    ? 1
    : configuration.tdpW <= 180
      ? 2
      : 3;
  const powerConnectors = configuration.tdpW <= 75
    ? 0
    : configuration.tdpW <= 225
      ? 1
      : 2;
  const recommendedPsuW = Math.max(
    200,
    Math.ceil((configuration.tdpW * 3 + 150) / 50) * 50,
  );
  const boardLengthMm = round(
    clamp(120 + configuration.tdpW * 0.22 + configuration.dieAreaMm2 * 0.25, 120, 360),
    0,
  );
  const vrmPhaseCount = clamp(Math.ceil(configuration.tdpW / 35), 3, 12);

  const metrics: Omit<GpuVisualMetrics, "hotspotModuleId"> = {
    dieAreaMm2: configuration.dieAreaMm2,
    areaPerComputeUnit: round(configuration.dieAreaMm2 / configuration.computeUnits, 2),
    computeThroughputTflops,
    memoryBandwidthGbPerSecond: configuration.memoryBandwidthGbPerSecond,
    memoryCapacityGb: configuration.memoryCapacityGb,
    memoryBusBits,
    vramModuleCount,
    vramModuleCapacityGb,
    tdpW: configuration.tdpW,
    dieHeat: round(dieHeat, 1),
    vrmHeat: round(vrmHeat, 1),
    vramHeat: round(vramHeat, 1),
    hotspot: round(dieHeat, 1),
    boardLengthMm,
    slotWidth,
    powerConnectors,
    recommendedPsuW,
    vrmPhaseCount,
  };

  const boardModules = buildBoardModules(configuration, metrics);
  const die = buildDieLayout(configuration, metrics);
  const dieModule = boardModules.find((module) => module.kind === "die");
  const hotspotModuleId = dieModule?.id ?? boardModules[0]?.id ?? "";

  return {
    board: {
      width: BOARD_WIDTH,
      height: BOARD_HEIGHT,
      modules: boardModules,
    },
    die,
    metrics: {
      ...metrics,
      hotspot: round(die.hotspot, 1),
      hotspotModuleId,
    },
  };
}
