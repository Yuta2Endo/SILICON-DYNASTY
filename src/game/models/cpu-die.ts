import type { CpuConfiguration } from "./cpu";

export type CpuDieBlockKind = "core" | "cache" | "io";
export type CpuDieBlockVariant = "core" | "l2" | "l3" | "memory" | "pcie" | "display";
export type CpuDieHeatTier = "cool" | "warm" | "hot";

export interface CpuDieBlock {
  id: string;
  kind: CpuDieBlockKind;
  variant: CpuDieBlockVariant;
  index: number;
  count: number;
  x: number;
  y: number;
  width: number;
  height: number;
  heat: number;
}

export interface CpuDieLayout {
  width: number;
  height: number;
  blocks: CpuDieBlock[];
  dieAreaMm2: number;
  coreAreaMm2: number;
  cacheAreaMm2: number;
  ioAreaMm2: number;
  areaPerCoreMm2: number;
  cacheSharePercent: number;
  thermalDensityWPerMm2: number;
  hotspot: number;
  hotspotBlockId: string;
  coreCount: number;
  displayedCoreCount: number;
}

const DIE_WIDTH = 100;
const DIE_HEIGHT = 72;
const CORE_REGION = { x: 4, y: 4, width: 64, height: 48 };
const CACHE_REGION = { x: 70, y: 4, width: 26, height: 48 };
const IO_REGION = { x: 4, y: 54, width: 92, height: 14 };
const MAX_DISPLAYED_CORES = 31;
const CORE_GAP = 1.2;

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function getCpuDieHeatTier(heat: number): CpuDieHeatTier {
  if (heat >= 72) {
    return "hot";
  }
  if (heat >= 45) {
    return "warm";
  }
  return "cool";
}

export function buildCpuDieLayout(configuration: CpuConfiguration): CpuDieLayout {
  const dieAreaMm2 = Math.max(1, finite(configuration.dieAreaMm2, 50));
  const coreCount = Math.max(1, Math.floor(finite(configuration.coreCount, 1)));
  const threadCount = Math.max(coreCount, Math.floor(finite(configuration.threadCount, coreCount)));
  const processNodeNm = Math.max(2, finite(configuration.processNodeNm, 350));
  const voltageMv = Math.max(1, finite(configuration.voltageMv, 3_300));
  const clockMHz = Math.max(1, finite(configuration.clockMHz, 100));
  const tdpW = Math.max(1, finite(configuration.tdpW, 10));
  const l1CacheKb = Math.max(0, finite(configuration.l1CacheKbPerCore, 0)) * coreCount;
  const l2CacheMb = Math.max(0, finite(configuration.l2CacheMbPerCore, 0)) * coreCount;
  const l3CacheMb = Math.max(0, finite(configuration.l3CacheMb, 0));
  const totalCacheMb = l1CacheKb / 1_024 + l2CacheMb + l3CacheMb;
  const cacheWeight = clamp(0.16 + totalCacheMb / 160, 0.16, 0.4);
  const ioWeight = 0.18;
  const coreWeight = 1 - cacheWeight - ioWeight;
  const threadsPerCore = threadCount / coreCount;

  const thermalDensityWPerMm2 = tdpW / dieAreaMm2;
  const nodeDensity = clamp(1 + Math.max(0, (350 - processNodeNm) / 350) * 0.35, 1, 1.35);
  const voltageLoad = clamp(voltageMv / 3_300, 0.2, 1.6);
  const heat = clamp(
    10 + thermalDensityWPerMm2 * 130 * nodeDensity + (clockMHz / 10_000) * 8 + Math.max(0, threadsPerCore - 1) * 4 + Math.max(0, voltageLoad - 1) * 6,
    5,
    100,
  );

  const displayedCoreCount = coreCount > MAX_DISPLAYED_CORES + 1 ? MAX_DISPLAYED_CORES : coreCount;
  const aggregateCount = coreCount > MAX_DISPLAYED_CORES + 1 ? coreCount - MAX_DISPLAYED_CORES : 0;
  const tileCount = displayedCoreCount + (aggregateCount > 0 ? 1 : 0);
  const columns = tileCount <= 4 ? 2 : tileCount <= 9 ? 3 : tileCount <= 16 ? 4 : 8;
  const rows = Math.ceil(tileCount / columns);
  const cellSize = Math.min(
    14,
    (CORE_REGION.width - CORE_GAP * (columns + 1)) / columns,
    (CORE_REGION.height - CORE_GAP * (rows + 1)) / rows,
  );
  const gridWidth = columns * cellSize + (columns - 1) * CORE_GAP;
  const gridHeight = rows * cellSize + (rows - 1) * CORE_GAP;
  const startX = CORE_REGION.x + (CORE_REGION.width - gridWidth) / 2;
  const startY = CORE_REGION.y + (CORE_REGION.height - gridHeight) / 2;
  const blocks: CpuDieBlock[] = [];

  for (let index = 0; index < tileCount; index += 1) {
    const isAggregate = aggregateCount > 0 && index === tileCount - 1;
    const coreIndex = index + 1;
    const row = Math.floor(index / columns);
    const column = index % columns;
    blocks.push({
      id: isAggregate ? "core-aggregate" : `core-${coreIndex}`,
      kind: "core",
      variant: "core",
      index: coreIndex,
      count: isAggregate ? aggregateCount : 1,
      x: startX + column * (cellSize + CORE_GAP),
      y: startY + row * (cellSize + CORE_GAP),
      width: cellSize,
      height: cellSize,
      heat: round(clamp(heat + 4 + Math.max(0, threadsPerCore - 1) * 3, 0, 100), 1),
    });
  }

  const l2Share = l2CacheMb + l1CacheKb / 1_024 > 0 ? Math.max(0.18, l2CacheMb / Math.max(totalCacheMb, 0.001)) : 1;
  const hasL3 = l3CacheMb > 0;
  if (hasL3) {
    const l2Height = round((CACHE_REGION.height - CORE_GAP) * clamp(l2Share, 0.25, 0.7), 1);
    blocks.push({
      id: "cache-l2",
      kind: "cache",
      variant: "l2",
      index: 1,
      count: Math.max(1, coreCount),
      x: CACHE_REGION.x,
      y: CACHE_REGION.y,
      width: CACHE_REGION.width,
      height: l2Height,
      heat: round(clamp(heat * 0.58, 0, 100), 1),
    });
    blocks.push({
      id: "cache-l3",
      kind: "cache",
      variant: "l3",
      index: 2,
      count: 1,
      x: CACHE_REGION.x,
      y: CACHE_REGION.y + l2Height + CORE_GAP,
      width: CACHE_REGION.width,
      height: CACHE_REGION.height - l2Height - CORE_GAP,
      heat: round(clamp(heat * 0.46, 0, 100), 1),
    });
  } else {
    blocks.push({
      id: "cache-l2",
      kind: "cache",
      variant: "l2",
      index: 1,
      count: Math.max(1, coreCount),
      x: CACHE_REGION.x,
      y: CACHE_REGION.y,
      width: CACHE_REGION.width,
      height: CACHE_REGION.height,
      heat: round(clamp(heat * 0.58, 0, 100), 1),
    });
  }

  const ioBlocks: Array<{ id: string; variant: CpuDieBlockVariant; width: number; heat: number }> = [
    { id: "io-memory", variant: "memory", width: IO_REGION.width * 0.4, heat: round(clamp(heat * 0.48, 0, 100), 1) },
    { id: "io-pcie", variant: "pcie", width: IO_REGION.width * 0.3, heat: round(clamp(heat * 0.36, 0, 100), 1) },
    { id: "io-display", variant: "display", width: IO_REGION.width * 0.3, heat: round(clamp(heat * 0.3, 0, 100), 1) },
  ];
  let ioX = IO_REGION.x;
  for (const ioBlock of ioBlocks) {
    blocks.push({
      id: ioBlock.id,
      kind: "io",
      variant: ioBlock.variant,
      index: blocks.length,
      count: 1,
      x: ioX,
      y: IO_REGION.y,
      width: ioBlock.width,
      height: IO_REGION.height,
      heat: ioBlock.heat,
    });
    ioX += ioBlock.width;
  }

  let hotspotBlock: CpuDieBlock | undefined;
  for (const block of blocks) {
    if (!hotspotBlock || block.heat > hotspotBlock.heat) {
      hotspotBlock = block;
    }
  }
  if (!hotspotBlock) {
    throw new Error("CPU die layout requires at least one block.");
  }

  return {
    width: DIE_WIDTH,
    height: DIE_HEIGHT,
    blocks,
    dieAreaMm2: round(dieAreaMm2, 1),
    coreAreaMm2: round(dieAreaMm2 * coreWeight, 1),
    cacheAreaMm2: round(dieAreaMm2 * cacheWeight, 1),
    ioAreaMm2: round(dieAreaMm2 * ioWeight, 1),
    areaPerCoreMm2: round(dieAreaMm2 / coreCount, 2),
    cacheSharePercent: round(cacheWeight * 100, 1),
    thermalDensityWPerMm2: round(thermalDensityWPerMm2, 3),
    hotspot: round(hotspotBlock.heat, 1),
    hotspotBlockId: hotspotBlock.id,
    coreCount,
    displayedCoreCount,
  };
}
