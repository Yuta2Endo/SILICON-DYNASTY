import { validateCompany, type Company } from "./company";
import { parseCpuProject, type CpuProject } from "./cpu";
import { parseComponentProject, type ComponentProject } from "./components";
import { parseAiProject, type AiProject } from "./ai";
import { parseCloudProject, type CloudProject } from "./cloud";
import { parseDeviceProject, type DeviceProject } from "./devices";
import { parseOsProject, type OsProject } from "./os";
import { isValidDateOnly } from "./date";
import {
  createInitialFinanceState,
  parseFinanceState,
  type FinanceState,
} from "./finance";
import {
  createInitialMarketState,
  parseMarketState,
  type MarketState,
} from "./market";
import {
  createInitialResearchState,
  getLegacyCpuResearchUnlocks,
  parseResearchState,
  type ResearchState,
} from "./research";
import {
  createInitialOemContractState,
  parseOemContractState,
  type OemContractState,
} from "./oem-contracts";
import {
  createInitialCommercialState,
  parseCommercialState,
  type CommercialState,
} from "./commercial";
import {
  createInitialManufacturingState,
  parseManufacturingState,
  type ManufacturingState,
} from "./manufacturing";

export const SAVE_SCHEMA_VERSION = 14 as const;

const SUPPORTED_SCHEMA_VERSIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, SAVE_SCHEMA_VERSION] as const;

export type Locale = "ru" | "en";
export type Theme = "light" | "dark";

export interface GameSettings {
  locale: Locale;
  theme: Theme;
}

export interface GameState {
  schemaVersion: typeof SAVE_SCHEMA_VERSION;
  gameDate: string;
  company: Company;
  cpuProjects: CpuProject[];
  componentProjects: ComponentProject[];
  osProjects: OsProject[];
  aiProjects: AiProject[];
  deviceProjects: DeviceProject[];
  cloudProjects: CloudProject[];
  research: ResearchState;
  finance: FinanceState;
  market: MarketState;
  manufacturing: ManufacturingState;
  oemContracts: OemContractState;
  commercialContracts: CommercialState;
  settings: GameSettings;
}

export class InvalidGameStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidGameStateError";
  }
}

export function createInitialGameState(): GameState {
  const gameDate = "1995-01-01";

  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    gameDate,
    cpuProjects: [],
    componentProjects: [],
    osProjects: [],
    aiProjects: [],
    deviceProjects: [],
    cloudProjects: [],
    research: createInitialResearchState(),
    finance: createInitialFinanceState(),
    market: createInitialMarketState(gameDate),
    manufacturing: createInitialManufacturingState(),
    oemContracts: createInitialOemContractState(),
    commercialContracts: createInitialCommercialState(),
    company: {
      id: "player-company",
      name: "Silicon Dynasty",
      foundedYear: 1995,
      balance: 100_000,
      reputation: 10,
      employeeCount: 1,
    },
    settings: {
      locale: "ru",
      theme: "light",
    },
  };
}

export function parseGameState(value: unknown): GameState {
  if (!isRecord(value)) {
    throw new InvalidGameStateError("Save data must be an object.");
  }

  if (
    typeof value.schemaVersion !== "number"
    || !SUPPORTED_SCHEMA_VERSIONS.includes(value.schemaVersion as (typeof SUPPORTED_SCHEMA_VERSIONS)[number])
  ) {
    throw new InvalidGameStateError("Save data uses an unsupported schema version.");
  }

  const sourceSchemaVersion = value.schemaVersion;

  if (typeof value.gameDate !== "string" || !isValidDateOnly(value.gameDate)) {
    throw new InvalidGameStateError("Save data contains an invalid game date.");
  }

  if (!isRecord(value.company)) {
    throw new InvalidGameStateError("Save data is missing the company record.");
  }

  const companyValue = value.company;
  if (
    typeof companyValue.id !== "string" ||
    typeof companyValue.name !== "string" ||
    typeof companyValue.foundedYear !== "number" ||
    typeof companyValue.balance !== "number" ||
    typeof companyValue.reputation !== "number" ||
    typeof companyValue.employeeCount !== "number"
  ) {
    throw new InvalidGameStateError("Save data contains an invalid company record.");
  }

  const company: Company = {
    id: companyValue.id,
    name: companyValue.name,
    foundedYear: companyValue.foundedYear,
    balance: companyValue.balance,
    reputation: companyValue.reputation,
    employeeCount: companyValue.employeeCount,
  };
  const companyValidation = validateCompany(company);

  if (!companyValidation.valid) {
    throw new InvalidGameStateError("Save data contains an invalid company record.");
  }

  if (!isRecord(value.settings)) {
    throw new InvalidGameStateError("Save data is missing the settings record.");
  }

  const locale = value.settings.locale;
  const theme = value.settings.theme;

  if (locale !== "ru" && locale !== "en") {
    throw new InvalidGameStateError("Save data contains an unsupported language.");
  }

  if (theme !== "light" && theme !== "dark") {
    throw new InvalidGameStateError("Save data contains an unsupported theme.");
  }

  let cpuProjects: CpuProject[] = [];
  if (sourceSchemaVersion >= 2) {
    if (!Array.isArray(value.cpuProjects)) {
      throw new InvalidGameStateError("Save data contains an invalid CPU project list.");
    }

    try {
      cpuProjects = value.cpuProjects.map(parseCpuProject);
    } catch {
      throw new InvalidGameStateError("Save data contains an invalid CPU project.");
    }

    const projectIds = new Set(cpuProjects.map((project) => project.id));
    if (projectIds.size !== cpuProjects.length) {
      throw new InvalidGameStateError("Save data contains duplicate CPU project IDs.");
    }
  }

  let componentProjects: ComponentProject[] = [];
  if (sourceSchemaVersion >= 5) {
    if (!Array.isArray(value.componentProjects)) {
      throw new InvalidGameStateError("Save data contains an invalid component project list.");
    }

    try {
      componentProjects = value.componentProjects.map(parseComponentProject);
    } catch {
      throw new InvalidGameStateError("Save data contains an invalid component project.");
    }

    const componentProjectIds = new Set(componentProjects.map((project) => project.id));
    if (componentProjectIds.size !== componentProjects.length) {
      throw new InvalidGameStateError("Save data contains duplicate component project IDs.");
    }
  }

  let osProjects: OsProject[] = [];
  if (sourceSchemaVersion >= 6) {
    if (!Array.isArray(value.osProjects)) {
      throw new InvalidGameStateError("Save data contains an invalid OS project list.");
    }

    try {
      osProjects = value.osProjects.map((project) =>
        parseOsProject(project, value.gameDate as string, {
          allowMissingSystems: sourceSchemaVersion < 7,
          allowMissingEcosystem: sourceSchemaVersion < 8,
          allowMissingReleases: sourceSchemaVersion < 8,
        }),
      );
    } catch {
      throw new InvalidGameStateError("Save data contains an invalid OS project.");
    }

    const osProjectIds = new Set(osProjects.map((project) => project.id));
    if (osProjectIds.size !== osProjects.length) {
      throw new InvalidGameStateError("Save data contains duplicate OS project IDs.");
    }
  }

  let aiProjects: AiProject[] = [];
  if (sourceSchemaVersion >= 9) {
    if (!Array.isArray(value.aiProjects)) {
      throw new InvalidGameStateError("Save data contains an invalid AI project list.");
    }

    try {
      aiProjects = value.aiProjects.map((project) => parseAiProject(project, value.gameDate as string, {
        allowMissingTraining: sourceSchemaVersion < 10,
      }));
    } catch {
      throw new InvalidGameStateError("Save data contains an invalid AI project.");
    }

    const aiProjectIds = new Set(aiProjects.map((project) => project.id));
    if (aiProjectIds.size !== aiProjects.length) {
      throw new InvalidGameStateError("Save data contains duplicate AI project IDs.");
    }
  }

  let deviceProjects: DeviceProject[] = [];
  if (sourceSchemaVersion >= 11) {
    if (!Array.isArray(value.deviceProjects)) {
      throw new InvalidGameStateError("Save data contains an invalid device project list.");
    }

    try {
      deviceProjects = value.deviceProjects.map(parseDeviceProject);
    } catch {
      throw new InvalidGameStateError("Save data contains an invalid device project.");
    }

    const deviceProjectIds = new Set(deviceProjects.map((project) => project.id));
    if (deviceProjectIds.size !== deviceProjects.length) {
      throw new InvalidGameStateError("Save data contains duplicate device project IDs.");
    }
  }

  let cloudProjects: CloudProject[] = [];
  if (sourceSchemaVersion >= 11) {
    if (!Array.isArray(value.cloudProjects)) {
      throw new InvalidGameStateError("Save data contains an invalid cloud project list.");
    }

    try {
      cloudProjects = value.cloudProjects.map(parseCloudProject);
    } catch {
      throw new InvalidGameStateError("Save data contains an invalid cloud project.");
    }

    const cloudProjectIds = new Set(cloudProjects.map((project) => project.id));
    if (cloudProjectIds.size !== cloudProjects.length) {
      throw new InvalidGameStateError("Save data contains duplicate cloud project IDs.");
    }
  }

  let oemContracts: OemContractState;
  if (sourceSchemaVersion >= 12) {
    try {
      oemContracts = parseOemContractState(value.oemContracts);
    } catch {
      throw new InvalidGameStateError("Save data contains invalid OEM contract data.");
    }
  } else {
    oemContracts = createInitialOemContractState();
  }

  let commercialContracts: CommercialState;
  if (sourceSchemaVersion >= 13) {
    try {
      commercialContracts = parseCommercialState(value.commercialContracts);
    } catch {
      throw new InvalidGameStateError("Save data contains invalid commercial contract data.");
    }
  } else {
    commercialContracts = createInitialCommercialState();
  }

  let manufacturing: ManufacturingState;
  if (sourceSchemaVersion >= 14) {
    try {
      manufacturing = parseManufacturingState(value.manufacturing);
    } catch {
      throw new InvalidGameStateError("Save data contains invalid manufacturing data.");
    }
  } else {
    manufacturing = createInitialManufacturingState();
  }

  let research: ResearchState;
  if (sourceSchemaVersion >= 3) {
    try {
      research = parseResearchState(value.research, value.gameDate);
    } catch {
      throw new InvalidGameStateError("Save data contains invalid research data.");
    }
  } else {
    research = createInitialResearchState(getLegacyCpuResearchUnlocks(cpuProjects));
  }

  let finance: FinanceState;
  let market: MarketState;
  if (sourceSchemaVersion >= 4) {
    try {
      finance = parseFinanceState(value.finance);
    } catch {
      throw new InvalidGameStateError("Save data contains invalid finance data.");
    }

    try {
      market = parseMarketState(value.market, {
        allowMissingComponentData: sourceSchemaVersion < 5,
      });
    } catch {
      throw new InvalidGameStateError("Save data contains invalid market data.");
    }
  } else {
    finance = createInitialFinanceState();
    market = createInitialMarketState(value.gameDate);
  }

  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    gameDate: value.gameDate,
    company: { ...company },
    cpuProjects,
    componentProjects,
    osProjects,
    aiProjects,
    deviceProjects,
    cloudProjects,
    research,
    finance,
    market,
    manufacturing,
    oemContracts,
    commercialContracts,
    settings: { locale, theme },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
