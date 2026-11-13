import {
  getTechnology,
  type ResearchState,
  type ResearchTechnologyId,
} from "../models/research";

export type ResearchAvailabilityStatus =
  | "available"
  | "completed"
  | "researching"
  | "future"
  | "locked"
  | "busy"
  | "unaffordable"
  | "unknown";

export interface ResearchAvailability {
  status: ResearchAvailabilityStatus;
  missingPrerequisiteIds: string[];
  availableFromYear: number | null;
  requiredBalance: number;
}

export function getResearchAvailability(
  technologyId: string,
  research: ResearchState,
  gameDate: string,
  balance: number,
): ResearchAvailability {
  const technology = getTechnology(technologyId);
  if (!technology) {
    return { status: "unknown", missingPrerequisiteIds: [], availableFromYear: null, requiredBalance: 0 };
  }

  if (research.completedTechnologyIds.includes(technology.id as ResearchTechnologyId)) {
    return {
      status: "completed",
      missingPrerequisiteIds: [],
      availableFromYear: technology.availableFromYear,
      requiredBalance: technology.costUsd,
    };
  }
  if (research.activeProject?.technologyId === technology.id) {
    return {
      status: "researching",
      missingPrerequisiteIds: [],
      availableFromYear: technology.availableFromYear,
      requiredBalance: technology.costUsd,
    };
  }

  const currentYear = Number(gameDate.slice(0, 4));
  if (!Number.isInteger(currentYear) || currentYear < technology.availableFromYear) {
    return {
      status: "future",
      missingPrerequisiteIds: [],
      availableFromYear: technology.availableFromYear,
      requiredBalance: technology.costUsd,
    };
  }

  const completed = new Set<string>(research.completedTechnologyIds);
  const missingPrerequisiteIds = technology.prerequisiteIds.filter((id) => !completed.has(id));
  if (missingPrerequisiteIds.length > 0) {
    return {
      status: "locked",
      missingPrerequisiteIds,
      availableFromYear: technology.availableFromYear,
      requiredBalance: technology.costUsd,
    };
  }
  if (research.activeProject) {
    return {
      status: "busy",
      missingPrerequisiteIds: [],
      availableFromYear: technology.availableFromYear,
      requiredBalance: technology.costUsd,
    };
  }
  if (!Number.isFinite(balance) || balance < technology.costUsd) {
    return {
      status: "unaffordable",
      missingPrerequisiteIds: [],
      availableFromYear: technology.availableFromYear,
      requiredBalance: technology.costUsd,
    };
  }

  return {
    status: "available",
    missingPrerequisiteIds: [],
    availableFromYear: technology.availableFromYear,
    requiredBalance: technology.costUsd,
  };
}

export interface StartResearchResult {
  research: ResearchState;
  companyBalance: number;
}

export class ResearchUnavailableError extends Error {
  constructor(readonly status: ResearchAvailabilityStatus) {
    super(`Research cannot be started in the current state: ${status}.`);
    this.name = "ResearchUnavailableError";
  }
}

export function startResearchProject(
  technologyId: string,
  research: ResearchState,
  gameDate: string,
  companyBalance: number,
): StartResearchResult {
  const availability = getResearchAvailability(technologyId, research, gameDate, companyBalance);
  if (availability.status !== "available") {
    throw new ResearchUnavailableError(availability.status);
  }

  const technology = getTechnology(technologyId);
  if (!technology) {
    throw new ResearchUnavailableError("unknown");
  }

  const balance = roundUsd(companyBalance - technology.costUsd);
  const totalInvestedUsd = roundUsd(research.totalInvestedUsd + technology.costUsd);

  return {
    companyBalance: balance,
    research: {
      ...research,
      activeProject: {
        technologyId: technology.id as ResearchTechnologyId,
        startedOn: gameDate,
        progressDays: 0,
        costPaidUsd: technology.costUsd,
      },
      totalInvestedUsd,
    },
  };
}

export function advanceResearchDay(research: ResearchState): ResearchState {
  const activeProject = research.activeProject;
  if (!activeProject) {
    return research;
  }

  const technology = getTechnology(activeProject.technologyId);
  if (!technology) {
    return research;
  }

  const progressDays = activeProject.progressDays + 1;
  if (progressDays < technology.durationDays) {
    return {
      ...research,
      activeProject: { ...activeProject, progressDays },
    };
  }

  return {
    ...research,
    completedTechnologyIds: [...research.completedTechnologyIds, technology.id as ResearchTechnologyId],
    activeProject: null,
  };
}

function roundUsd(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
