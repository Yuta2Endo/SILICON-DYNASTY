import { validateCompany } from "../models/company";
import {
  createCpuProject as buildCpuProject,
  saveCpuProjectVersion,
  type CpuConfiguration,
} from "../models/cpu";
import {
  getRequiredCpuResearchUnlocks,
  getUnlockedResearchIds,
  type ResearchTechnologyId,
  type ResearchUnlockId,
} from "../models/research";
import {
  createInitialGameState,
  parseGameState,
  type GameSettings,
  type GameState,
} from "../models/game-state";
import { advanceGameDay } from "../engine/time";
import { startResearchProject } from "../engine/research";
import {
  discontinueProduct,
  orderProduction,
  releaseProduct,
  updateMarketingBudget,
  updateProductPrice,
  type ReleaseProductInput,
} from "../engine/market";
import { postFinanceTransaction, repayLoan, takeLoan } from "../engine/finance";
import type { GameStateRepository } from "../../storage/repositories/GameStateRepository";

export interface GameApplication {
  load(): Promise<GameState>;
  advanceDay(): Promise<GameState>;
  startResearch(technologyId: ResearchTechnologyId): Promise<GameState>;
  renameCompany(name: string): Promise<GameState>;
  updateSettings(settings: Partial<GameSettings>): Promise<GameState>;
  createCpuProject(name: string, configuration: CpuConfiguration): Promise<GameState>;
  saveCpuVersion(projectId: string, name: string, configuration: CpuConfiguration): Promise<GameState>;
  releaseProduct(input: ReleaseProductInput): Promise<GameState>;
  updateProductPrice(productId: string, priceUsd: number): Promise<GameState>;
  orderProduction(productId: string, quantity: number): Promise<GameState>;
  discontinueProduct(productId: string): Promise<GameState>;
  updateMarketingBudget(amountUsd: number): Promise<GameState>;
  takeLoan(amountUsd: number): Promise<GameState>;
  repayLoan(amountUsd: number): Promise<GameState>;
}

export class CpuResearchRequirementError extends Error {
  constructor(readonly missingUnlockIds: readonly ResearchUnlockId[]) {
    super("CPU configuration requires technologies that have not been researched.");
    this.name = "CpuResearchRequirementError";
  }
}

export function createGameApplication(repository: GameStateRepository): GameApplication {
  let currentState: GameState | null = null;

  async function ensureLoaded(): Promise<GameState> {
    return currentState ?? (await load());
  }

  async function commit(nextState: GameState): Promise<GameState> {
    const validatedState = parseGameState(nextState);
    await repository.save(validatedState);
    currentState = validatedState;
    return validatedState;
  }

  async function load(): Promise<GameState> {
    if (currentState) {
      return currentState;
    }

    const savedState = await repository.load();
    if (savedState) {
      currentState = parseGameState(savedState);
      return currentState;
    }

    return commit(createInitialGameState());
  }

  return {
    load,

    async advanceDay() {
      return commit(advanceGameDay(await ensureLoaded()));
    },

    async startResearch(technologyId) {
      const state = await ensureLoaded();
      const result = startResearchProject(technologyId, state.research, state.gameDate, state.company.balance);
      const costUsd = result.research.activeProject?.costPaidUsd ?? 0;
      return commit(postFinanceTransaction(
        { ...state, research: result.research },
        "research",
        -costUsd,
        `Research: ${technologyId}`,
      ));
    },

    async renameCompany(name) {
      const state = await ensureLoaded();
      const company = { ...state.company, name: name.trim() };
      const validation = validateCompany(company);

      if (!validation.valid) {
        throw new Error(validation.errors.name ?? "Company data is invalid.");
      }

      return commit({ ...state, company });
    },

    async updateSettings(settings) {
      const state = await ensureLoaded();
      return commit({
        ...state,
        settings: { ...state.settings, ...settings },
      });
    },

    async createCpuProject(name, configuration) {
      const state = await ensureLoaded();
      assertCpuConfigurationUnlocked(configuration, state);
      const project = buildCpuProject(nextCpuProjectId(state.cpuProjects), name, configuration, state.gameDate);
      return commit({ ...state, cpuProjects: [...state.cpuProjects, project] });
    },

    async saveCpuVersion(projectId, name, configuration) {
      const state = await ensureLoaded();
      assertCpuConfigurationUnlocked(configuration, state);
      const projectIndex = state.cpuProjects.findIndex((project) => project.id === projectId);
      if (projectIndex < 0) {
        throw new Error("CPU project was not found.");
      }

      const project = state.cpuProjects[projectIndex];
      if (!project) {
        throw new Error("CPU project was not found.");
      }

      const updatedProject = saveCpuProjectVersion(project, name, configuration, state.gameDate);
      const cpuProjects = state.cpuProjects.map((currentProject) =>
        currentProject.id === projectId ? updatedProject : currentProject,
      );

      return commit({ ...state, cpuProjects });
    },

    async releaseProduct(input) {
      return commit(releaseProduct(await ensureLoaded(), input));
    },

    async updateProductPrice(productId, priceUsd) {
      return commit(updateProductPrice(await ensureLoaded(), productId, priceUsd));
    },

    async orderProduction(productId, quantity) {
      return commit(orderProduction(await ensureLoaded(), productId, quantity));
    },

    async discontinueProduct(productId) {
      return commit(discontinueProduct(await ensureLoaded(), productId));
    },

    async updateMarketingBudget(amountUsd) {
      return commit(updateMarketingBudget(await ensureLoaded(), amountUsd));
    },

    async takeLoan(amountUsd) {
      return commit(takeLoan(await ensureLoaded(), amountUsd));
    },

    async repayLoan(amountUsd) {
      return commit(repayLoan(await ensureLoaded(), amountUsd));
    },
  };
}

function nextCpuProjectId(projects: GameState["cpuProjects"]): string {
  let sequence = 1;
  while (projects.some((project) => project.id === `cpu-${sequence}`)) {
    sequence += 1;
  }
  return `cpu-${sequence}`;
}

function assertCpuConfigurationUnlocked(configuration: CpuConfiguration, state: GameState): void {
  const unlocked = new Set(getUnlockedResearchIds(state.research));
  const missingUnlockIds = getRequiredCpuResearchUnlocks(configuration).filter((unlockId) => !unlocked.has(unlockId));
  if (missingUnlockIds.length > 0) {
    throw new CpuResearchRequirementError(missingUnlockIds);
  }
}
