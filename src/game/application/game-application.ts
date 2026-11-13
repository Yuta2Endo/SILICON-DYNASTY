import { validateCompany } from "../models/company";
import {
  createCpuProject as buildCpuProject,
  saveCpuProjectVersion,
  type CpuConfiguration,
} from "../models/cpu";
import {
  createInitialGameState,
  parseGameState,
  type GameSettings,
  type GameState,
} from "../models/game-state";
import { advanceGameDay } from "../engine/time";
import type { GameStateRepository } from "../../storage/repositories/GameStateRepository";

export interface GameApplication {
  load(): Promise<GameState>;
  advanceDay(): Promise<GameState>;
  renameCompany(name: string): Promise<GameState>;
  updateSettings(settings: Partial<GameSettings>): Promise<GameState>;
  createCpuProject(name: string, configuration: CpuConfiguration): Promise<GameState>;
  saveCpuVersion(projectId: string, name: string, configuration: CpuConfiguration): Promise<GameState>;
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
      const project = buildCpuProject(nextCpuProjectId(state.cpuProjects), name, configuration, state.gameDate);
      return commit({ ...state, cpuProjects: [...state.cpuProjects, project] });
    },

    async saveCpuVersion(projectId, name, configuration) {
      const state = await ensureLoaded();
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
  };
}

function nextCpuProjectId(projects: GameState["cpuProjects"]): string {
  let sequence = 1;
  while (projects.some((project) => project.id === `cpu-${sequence}`)) {
    sequence += 1;
  }
  return `cpu-${sequence}`;
}
