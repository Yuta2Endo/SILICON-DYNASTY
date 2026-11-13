export const ECONOMIC_CYCLE_PHASES = [
  "stable",
  "expansion",
  "peak",
  "contraction",
  "trough",
] as const;

export type EconomicCyclePhase = (typeof ECONOMIC_CYCLE_PHASES)[number];

export interface EconomicCycle {
  phase: EconomicCyclePhase;
  demandMultiplier: number;
  costMultiplier: number;
  competitorAggression: number;
}

const CYCLE_PROFILES: Record<EconomicCyclePhase, Omit<EconomicCycle, "phase">> = {
  stable: { demandMultiplier: 1, costMultiplier: 1, competitorAggression: 1 },
  expansion: { demandMultiplier: 1.06, costMultiplier: 1.02, competitorAggression: 1.05 },
  peak: { demandMultiplier: 1.12, costMultiplier: 1.05, competitorAggression: 1.1 },
  contraction: { demandMultiplier: 0.94, costMultiplier: 0.98, competitorAggression: 1.15 },
  trough: { demandMultiplier: 0.88, costMultiplier: 0.96, competitorAggression: 1.2 },
};

export function getEconomicCycle(date: string): EconomicCycle {
  const year = Number(date.slice(0, 4));
  const offset = ((Math.max(1995, year) - 1995) % 8 + 8) % 8;
  const phase: EconomicCyclePhase = offset < 2
    ? "stable"
    : offset < 4
      ? "expansion"
      : offset < 6
        ? "peak"
        : offset === 6
          ? "contraction"
          : "trough";

  return { phase, ...CYCLE_PROFILES[phase] };
}
