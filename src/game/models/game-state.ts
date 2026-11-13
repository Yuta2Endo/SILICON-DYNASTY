import { validateCompany, type Company } from "./company";
import { parseCpuProject, type CpuProject } from "./cpu";

export const SAVE_SCHEMA_VERSION = 2 as const;

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
  settings: GameSettings;
}

export class InvalidGameStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidGameStateError";
  }
}

export function createInitialGameState(): GameState {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    gameDate: "1995-01-01",
    cpuProjects: [],
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

  if (value.schemaVersion !== 1 && value.schemaVersion !== SAVE_SCHEMA_VERSION) {
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
  if (sourceSchemaVersion === SAVE_SCHEMA_VERSION) {
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

  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    gameDate: value.gameDate,
    company: { ...company },
    cpuProjects,
    settings: { locale, theme },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
