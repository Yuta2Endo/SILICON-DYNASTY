import type { GameState } from "../models/game-state";
import { addDays } from "../models/date";
import { advanceResearchDay } from "./research";
import { runCompetitorDay, runProductionDay, simulateMarketDay, updateMarketReputation } from "./market";
import { simulateComponentMarketDay } from "./component-market";
import { advanceAiTrainingDay } from "./ai-training";
import { settleDailyFinance } from "./finance";

export function advanceGameDay(state: GameState): GameState {
  const simulationDate = state.gameDate;

  let nextState: GameState = {
    ...state,
    research: advanceResearchDay(state.research),
  };

  nextState = runProductionDay(nextState, simulationDate);
  nextState = runCompetitorDay(nextState, simulationDate);
  nextState = simulateMarketDay(nextState, simulationDate);
  nextState = simulateComponentMarketDay(nextState, simulationDate);
  nextState = advanceAiTrainingDay(nextState, simulationDate);
  nextState = settleDailyFinance(nextState, simulationDate);

  const summary = nextState.market.dailySummaries.at(-1);
  if (summary?.date === simulationDate) {
    nextState = updateMarketReputation(nextState, summary);
  }

  return {
    ...nextState,
    gameDate: addDays(simulationDate, 1),
  };
}
