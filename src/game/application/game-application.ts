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
import {
  createComponentProject as buildComponentProject,
  saveComponentVersion as buildComponentVersion,
  type ComponentConfiguration,
  type ComponentProject,
  type ComponentType,
} from "../models/components";
import {
  createOsProject as buildOsProject,
  saveOsVersion as buildOsVersion,
  type OsConfiguration,
  type OsProject,
} from "../models/os";
import {
  createAiProject as buildAiProject,
  saveAiVersion as buildAiVersion,
  type AiConfiguration,
  type AiDataset,
  type AiOptimizationType,
  type AiProject,
} from "../models/ai";
import {
  createCloudProject as buildCloudProject,
  saveCloudVersion as buildCloudVersion,
  validateCloudConfiguration,
  type CloudConfiguration,
  type CloudProject,
  type CloudReferenceContext,
} from "../models/cloud";
import {
  createDeviceProject as buildDeviceProject,
  saveDeviceVersion as buildDeviceVersion,
  validateDeviceConfiguration,
  type DeviceConfiguration,
  type DeviceProject,
  type DeviceReferenceContext,
} from "../models/devices";
import { startResearchProject } from "../engine/research";
import { chooseCompanyDoctrine } from "../engine/legacy";
import type { CompanyDoctrineId } from "../models/legacy";
import {
  discontinueProduct,
  orderProduction,
  releaseProduct,
  updateMarketingBudget,
  updateProductPrice,
  type ReleaseProductInput,
} from "../engine/market";
import { postFinanceTransaction, repayLoan, takeLoan } from "../engine/finance";
import {
  discontinueComponentProduct,
  releaseComponentProduct,
  updateComponentProductPrice,
  type ReleaseComponentProductInput,
} from "../engine/component-market";
import { orderComponentProduction, upgradeFactory } from "../engine/manufacturing";
import { advanceOsRelease, startOsRelease } from "../engine/os-release";
import { acceptOemContract, declineOemContract } from "../engine/oem-contracts";
import { acceptCommercialOffer, declineCommercialOffer } from "../engine/commercial";
import {
  applyAiOptimization,
  deployAiModel,
  startAiTraining,
  type StartAiTrainingInput,
} from "../engine/ai-training";
import { advanceGameDay } from "../engine/time";
import type { GameStateRepository } from "../../storage/repositories/GameStateRepository";
import {
  createUnsupportedSaveOverview,
  isSaveManagementRepository,
  type SaveManagementRepository,
  type SaveOverview,
} from "../../storage/repositories/SaveManagement";
import { exportGameState, parseImportedGameState } from "./save-transfer";

export interface GameApplication {
  load(): Promise<GameState>;
  newGame(): Promise<GameState>;
  advanceDay(): Promise<GameState>;
  startResearch(technologyId: ResearchTechnologyId): Promise<GameState>;
  renameCompany(name: string): Promise<GameState>;
  chooseDoctrine(doctrine: CompanyDoctrineId): Promise<GameState>;
  updateSettings(settings: Partial<GameSettings>): Promise<GameState>;
  getSaveInfo(): Promise<SaveOverview>;
  saveToSlot(slotId: string): Promise<SaveOverview>;
  loadFromSlot(slotId: string): Promise<GameState>;
  deleteSlot(slotId: string): Promise<SaveOverview>;
  exportSave(): Promise<string>;
  importSave(serialized: string): Promise<GameState>;
  restoreBackup(): Promise<GameState>;
  createCpuProject(name: string, configuration: CpuConfiguration): Promise<GameState>;
  saveCpuVersion(projectId: string, name: string, configuration: CpuConfiguration): Promise<GameState>;
  createComponentProject(
    type: ComponentType,
    name: string,
    configuration: ComponentConfiguration,
  ): Promise<GameState>;
  saveComponentVersion(
    projectId: string,
    name: string,
    configuration: ComponentConfiguration,
  ): Promise<GameState>;
  createOsProject(name: string, configuration: OsConfiguration): Promise<GameState>;
  saveOsVersion(projectId: string, name: string, configuration: OsConfiguration): Promise<GameState>;
  startOsRelease(projectId: string): Promise<GameState>;
  advanceOsRelease(projectId: string, releaseId: string): Promise<GameState>;
  createAiProject(name: string, configuration: AiConfiguration): Promise<GameState>;
  saveAiVersion(
    projectId: string,
    name: string,
    configuration: AiConfiguration,
    datasets: readonly AiDataset[],
  ): Promise<GameState>;
  startAiTraining(projectId: string, input: StartAiTrainingInput): Promise<GameState>;
  applyAiOptimization(
    projectId: string,
    trainingJobId: string,
    type: AiOptimizationType,
  ): Promise<GameState>;
  deployAiModel(projectId: string, trainingJobId: string): Promise<GameState>;
  createDeviceProject(name: string, configuration: DeviceConfiguration): Promise<GameState>;
  saveDeviceVersion(projectId: string, name: string, configuration: DeviceConfiguration): Promise<GameState>;
  createCloudProject(name: string, configuration: CloudConfiguration): Promise<GameState>;
  saveCloudVersion(projectId: string, name: string, configuration: CloudConfiguration): Promise<GameState>;
  releaseProduct(input: ReleaseProductInput): Promise<GameState>;
  releaseComponentProduct(input: ReleaseComponentProductInput): Promise<GameState>;
  updateComponentProductPrice(productId: string, priceUsd: number): Promise<GameState>;
  discontinueComponentProduct(productId: string): Promise<GameState>;
  orderComponentProduction(productId: string, quantity: number): Promise<GameState>;
  upgradeFactory(): Promise<GameState>;
  updateProductPrice(productId: string, priceUsd: number): Promise<GameState>;
  orderProduction(productId: string, quantity: number): Promise<GameState>;
  discontinueProduct(productId: string): Promise<GameState>;
  updateMarketingBudget(amountUsd: number): Promise<GameState>;
  acceptOemContract(offerId: string): Promise<GameState>;
  declineOemContract(offerId: string): Promise<GameState>;
  acceptCommercialOffer(offerId: string): Promise<GameState>;
  declineCommercialOffer(offerId: string): Promise<GameState>;
  takeLoan(amountUsd: number): Promise<GameState>;
  repayLoan(amountUsd: number): Promise<GameState>;
}

export class CpuResearchRequirementError extends Error {
  constructor(readonly missingUnlockIds: readonly ResearchUnlockId[]) {
    super("CPU configuration requires technologies that have not been researched.");
    this.name = "CpuResearchRequirementError";
  }
}

export class SaveManagementUnavailableError extends Error {
  constructor() {
    super("Save management is not available in this storage environment.");
    this.name = "SaveManagementUnavailableError";
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

    async newGame() {
      const state = await ensureLoaded();
      const nextState = createInitialGameState();
      return commit({ ...nextState, settings: state.settings });
    },

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

    async chooseDoctrine(doctrine) {
      return commit(chooseCompanyDoctrine(await ensureLoaded(), doctrine));
    },

    async updateSettings(settings) {
      const state = await ensureLoaded();
      return commit({
        ...state,
        settings: { ...state.settings, ...settings },
      });
    },

    async getSaveInfo() {
      return isSaveManagementRepository(repository)
        ? repository.getSaveOverview()
        : createUnsupportedSaveOverview();
    },

    async saveToSlot(slotId) {
      const saveRepository = requireSaveManagement(repository);
      await saveRepository.saveSlot(slotId, await ensureLoaded());
      return saveRepository.getSaveOverview();
    },

    async loadFromSlot(slotId) {
      const saveRepository = requireSaveManagement(repository);
      const slotState = await saveRepository.loadSlot(slotId);
      if (!slotState) {
        throw new Error("The selected save slot is empty.");
      }
      return commit(slotState);
    },

    async deleteSlot(slotId) {
      const saveRepository = requireSaveManagement(repository);
      await saveRepository.deleteSlot(slotId);
      return saveRepository.getSaveOverview();
    },

    async exportSave() {
      return exportGameState(await ensureLoaded());
    },

    async importSave(serialized) {
      return commit(parseImportedGameState(serialized));
    },

    async restoreBackup() {
      const saveRepository = requireSaveManagement(repository);
      const backupState = await saveRepository.restoreBackup();
      if (!backupState) {
        throw new Error("No recovery backup is available.");
      }
      currentState = parseGameState(backupState);
      return currentState;
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

    async createComponentProject(type, name, configuration) {
      const state = await ensureLoaded();
      const project = buildComponentProject(
        nextComponentProjectId(state.componentProjects),
        name,
        type,
        configuration,
        state.gameDate,
      );
      return commit({ ...state, componentProjects: [...state.componentProjects, project] });
    },

    async saveComponentVersion(projectId, name, configuration) {
      const state = await ensureLoaded();
      const projectIndex = state.componentProjects.findIndex((project) => project.id === projectId);
      if (projectIndex < 0) {
        throw new Error("Component project was not found.");
      }

      const project = state.componentProjects[projectIndex];
      if (!project) {
        throw new Error("Component project was not found.");
      }

      const updatedProject = buildComponentVersion(project, name, configuration, state.gameDate);
      const componentProjects = state.componentProjects.map((currentProject) =>
        currentProject.id === projectId ? updatedProject : currentProject,
      );

      return commit({ ...state, componentProjects });
    },

    async releaseComponentProduct(input) {
      return commit(releaseComponentProduct(await ensureLoaded(), input));
    },

    async updateComponentProductPrice(productId, priceUsd) {
      return commit(updateComponentProductPrice(await ensureLoaded(), productId, priceUsd));
    },

    async discontinueComponentProduct(productId) {
      return commit(discontinueComponentProduct(await ensureLoaded(), productId));
    },

    async orderComponentProduction(productId, quantity) {
      return commit(orderComponentProduction(await ensureLoaded(), productId, quantity));
    },

    async upgradeFactory() {
      return commit(upgradeFactory(await ensureLoaded()));
    },

    async createOsProject(name, configuration) {
      const state = await ensureLoaded();
      const project = buildOsProject(nextOsProjectId(state.osProjects), name, configuration, state.gameDate);
      return commit({ ...state, osProjects: [...state.osProjects, project] });
    },

    async saveOsVersion(projectId, name, configuration) {
      const state = await ensureLoaded();
      const projectIndex = state.osProjects.findIndex((project) => project.id === projectId);
      if (projectIndex < 0) {
        throw new Error("OS project was not found.");
      }

      const project = state.osProjects[projectIndex];
      if (!project) {
        throw new Error("OS project was not found.");
      }

      const updatedProject = buildOsVersion(project, name, configuration, state.gameDate);
      const osProjects = state.osProjects.map((currentProject) =>
        currentProject.id === projectId ? updatedProject : currentProject,
      );

      return commit({ ...state, osProjects });
    },

    async startOsRelease(projectId) {
      return commit(startOsRelease(await ensureLoaded(), projectId));
    },

    async advanceOsRelease(projectId, releaseId) {
      return commit(advanceOsRelease(await ensureLoaded(), projectId, releaseId));
    },

    async createAiProject(name, configuration) {
      const state = await ensureLoaded();
      const project = buildAiProject(nextAiProjectId(state.aiProjects), name, configuration, state.gameDate);
      return commit({ ...state, aiProjects: [...state.aiProjects, project] });
    },

    async saveAiVersion(projectId, name, configuration, datasets) {
      const state = await ensureLoaded();
      const projectIndex = state.aiProjects.findIndex((project) => project.id === projectId);
      if (projectIndex < 0) {
        throw new Error("AI project was not found.");
      }

      const project = state.aiProjects[projectIndex];
      if (!project) {
        throw new Error("AI project was not found.");
      }

      const updatedProject = buildAiVersion(project, name, configuration, datasets, state.gameDate);
      const aiProjects = state.aiProjects.map((currentProject) =>
        currentProject.id === projectId ? updatedProject : currentProject,
      );

      return commit({ ...state, aiProjects });
    },

    async startAiTraining(projectId, input) {
      return commit(startAiTraining(await ensureLoaded(), projectId, input));
    },

    async applyAiOptimization(projectId, trainingJobId, type) {
      return commit(applyAiOptimization(await ensureLoaded(), projectId, trainingJobId, type));
    },

    async deployAiModel(projectId, trainingJobId) {
      return commit(deployAiModel(await ensureLoaded(), projectId, trainingJobId));
    },

    async createDeviceProject(name, configuration) {
      const state = await ensureLoaded();
      const validation = validateDeviceConfiguration(configuration, deviceContext(state));
      if (!validation.valid) {
        throw new Error("Device configuration is incompatible with the selected hardware or OS.");
      }
      const project = buildDeviceProject(
        nextDeviceProjectId(state.deviceProjects),
        name,
        configuration,
        state.gameDate,
      );
      return commit({ ...state, deviceProjects: [...state.deviceProjects, project] });
    },

    async saveDeviceVersion(projectId, name, configuration) {
      const state = await ensureLoaded();
      const validation = validateDeviceConfiguration(configuration, deviceContext(state));
      if (!validation.valid) {
        throw new Error("Device configuration is incompatible with the selected hardware or OS.");
      }
      const project = state.deviceProjects.find((candidate) => candidate.id === projectId);
      if (!project) {
        throw new Error("Device project was not found.");
      }
      const updatedProject = buildDeviceVersion(project, name, configuration, state.gameDate);
      return commit({
        ...state,
        deviceProjects: state.deviceProjects.map((candidate) =>
          candidate.id === projectId ? updatedProject : candidate,
        ),
      });
    },

    async createCloudProject(name, configuration) {
      const state = await ensureLoaded();
      const validation = validateCloudConfiguration(configuration, cloudContext(state));
      if (!validation.valid) {
        throw new Error("Cloud configuration is incompatible with the selected server device.");
      }
      const project = buildCloudProject(
        nextCloudProjectId(state.cloudProjects),
        name,
        configuration,
        state.gameDate,
      );
      return commit({ ...state, cloudProjects: [...state.cloudProjects, project] });
    },

    async saveCloudVersion(projectId, name, configuration) {
      const state = await ensureLoaded();
      const validation = validateCloudConfiguration(configuration, cloudContext(state));
      if (!validation.valid) {
        throw new Error("Cloud configuration is incompatible with the selected server device.");
      }
      const project = state.cloudProjects.find((candidate) => candidate.id === projectId);
      if (!project) {
        throw new Error("Cloud project was not found.");
      }
      const updatedProject = buildCloudVersion(project, name, configuration, state.gameDate);
      return commit({
        ...state,
        cloudProjects: state.cloudProjects.map((candidate) =>
          candidate.id === projectId ? updatedProject : candidate,
        ),
      });
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

    async acceptOemContract(offerId) {
      return commit(acceptOemContract(await ensureLoaded(), offerId));
    },

    async declineOemContract(offerId) {
      return commit(declineOemContract(await ensureLoaded(), offerId));
    },

    async acceptCommercialOffer(offerId) {
      return commit(acceptCommercialOffer(await ensureLoaded(), offerId));
    },

    async declineCommercialOffer(offerId) {
      return commit(declineCommercialOffer(await ensureLoaded(), offerId));
    },

    async takeLoan(amountUsd) {
      return commit(takeLoan(await ensureLoaded(), amountUsd));
    },

    async repayLoan(amountUsd) {
      return commit(repayLoan(await ensureLoaded(), amountUsd));
    },
  };
}

function requireSaveManagement(repository: GameStateRepository): SaveManagementRepository {
  if (!isSaveManagementRepository(repository)) {
    throw new SaveManagementUnavailableError();
  }
  return repository;
}

function nextCpuProjectId(projects: GameState["cpuProjects"]): string {
  let sequence = 1;
  while (projects.some((project) => project.id === `cpu-${sequence}`)) {
    sequence += 1;
  }
  return `cpu-${sequence}`;
}

function nextComponentProjectId(projects: ComponentProject[]): string {
  let sequence = 1;
  while (projects.some((project) => project.id === `component-${sequence}`)) {
    sequence += 1;
  }
  return `component-${sequence}`;
}

function nextOsProjectId(projects: OsProject[]): string {
  let sequence = 1;
  while (projects.some((project) => project.id === `os-${sequence}`)) {
    sequence += 1;
  }
  return `os-${sequence}`;
}

function nextAiProjectId(projects: AiProject[]): string {
  let sequence = 1;
  while (projects.some((project) => project.id === `ai-${sequence}`)) {
    sequence += 1;
  }
  return `ai-${sequence}`;
}

function nextDeviceProjectId(projects: DeviceProject[]): string {
  let sequence = 1;
  while (projects.some((project) => project.id === `device-${sequence}`)) {
    sequence += 1;
  }
  return `device-${sequence}`;
}

function nextCloudProjectId(projects: CloudProject[]): string {
  let sequence = 1;
  while (projects.some((project) => project.id === `cloud-${sequence}`)) {
    sequence += 1;
  }
  return `cloud-${sequence}`;
}

function deviceContext(state: GameState): DeviceReferenceContext {
  return {
    cpuProjects: state.cpuProjects,
    componentProjects: state.componentProjects,
    osProjects: state.osProjects,
    aiProjects: state.aiProjects,
  };
}

function cloudContext(state: GameState): CloudReferenceContext {
  return {
    ...deviceContext(state),
    deviceProjects: state.deviceProjects,
  };
}

function assertCpuConfigurationUnlocked(configuration: CpuConfiguration, state: GameState): void {
  const unlocked = new Set(getUnlockedResearchIds(state.research));
  const missingUnlockIds = getRequiredCpuResearchUnlocks(configuration).filter((unlockId) => !unlocked.has(unlockId));
  if (missingUnlockIds.length > 0) {
    throw new CpuResearchRequirementError(missingUnlockIds);
  }
}
