import { addDays } from "../models/date";
import type { CloudProject, CloudReferenceContext } from "../models/cloud";
import type { DeviceProject, DeviceReferenceContext } from "../models/devices";
import type { GameState } from "../models/game-state";
import {
  COMMERCIAL_LIMITS,
  createCommercialContract,
  generateCommercialOffer,
  nextContractId,
  type CommercialAsset,
} from "../models/commercial";
import { calculateCloudMetrics } from "../formulas/cloud";
import { calculateDeviceMetrics } from "../formulas/devices";
import { calculateOsEcosystemMetrics, calculateOsKernelMetrics } from "../formulas/os";
import {
  getDoctrineEffects,
  getReputationContractMultiplier,
} from "../models/legacy";
import { postFinanceTransaction } from "./finance";

export type CommercialOperationCode =
  | "offer-not-found"
  | "offer-expired"
  | "asset-unavailable"
  | "duplicate-contract";

export class CommercialOperationError extends Error {
  constructor(readonly code: CommercialOperationCode, message: string) {
    super(message);
    this.name = "CommercialOperationError";
  }
}

export function buildCommercialAssets(state: GameState): CommercialAsset[] {
  const assets: CommercialAsset[] = [];
  const deviceContext: DeviceReferenceContext = {
    cpuProjects: state.cpuProjects,
    componentProjects: state.componentProjects,
    osProjects: state.osProjects,
    aiProjects: state.aiProjects,
  };

  for (const project of state.osProjects) {
    for (const release of project.releases) {
      assets.push({
        id: `os-license:${project.id}:${release.id}`,
        channel: "os-license",
        name: `${project.name} ${release.stage} v${release.version}`,
        qualityScore: release.qualityScore,
        appealScore: release.appealScore,
      });
    }

    const latestRelease = project.releases.at(-1);
    if (latestRelease && latestRelease.configuration.appStore !== "none") {
      const kernel = calculateOsKernelMetrics(latestRelease.configuration);
      const ecosystem = calculateOsEcosystemMetrics(latestRelease.configuration, kernel);
      assets.push({
        id: `app-store:${project.id}`,
        channel: "app-store",
        name: `${project.name} Store`,
        qualityScore: ecosystem.ecosystemScore,
        appealScore: ecosystem.platformAppealScore,
      });
    }
  }

  for (const project of state.aiProjects) {
    for (const deployment of project.deployments) {
      assets.push({
        id: `ai-api:${project.id}:${deployment.id}`,
        channel: "ai-api",
        name: `${project.name} API v${deployment.version}`,
        qualityScore: deployment.qualityScore,
        appealScore: deployment.appealScore,
      });
    }
  }

  for (const project of state.deviceProjects) {
    const asset = buildDeviceAsset(project, deviceContext);
    if (asset) {
      assets.push(asset);
    }
  }

  const cloudContext = {
    ...deviceContext,
    deviceProjects: state.deviceProjects,
  };
  for (const project of state.cloudProjects) {
    const asset = buildCloudAsset(project, cloudContext);
    if (asset) {
      assets.push(asset);
    }
  }

  return assets.sort((left, right) => left.id.localeCompare(right.id));
}

export function runCommercialDay(state: GameState, date: string): GameState {
  const contracts = state.commercialContracts.active.filter((contract) => contract.expiresOn > date);
  const offers = state.commercialContracts.offers.filter((offer) => offer.expiresOn >= date);

  let nextState: GameState = {
    ...state,
    commercialContracts: {
      ...state.commercialContracts,
      offers,
      active: contracts.map((contract) => ({ ...contract })),
    },
  };

  for (const contract of nextState.commercialContracts.active) {
    nextState = postFinanceTransaction(
      nextState,
      "sales",
      contract.dailyRevenueUsd,
      `Commercial revenue: ${contract.partnerName} / ${contract.assetName}`,
    );

    const active = nextState.commercialContracts.active.map((candidate) =>
      candidate.id === contract.id
        ? { ...candidate, totalRevenueUsd: roundUsd(candidate.totalRevenueUsd + contract.dailyRevenueUsd) }
        : candidate,
    );
    nextState = {
      ...nextState,
      commercialContracts: {
        ...nextState.commercialContracts,
        active,
      },
    };

    if (contract.dailyCostUsd > 0) {
      nextState = postFinanceTransaction(
        nextState,
        "overhead",
        -contract.dailyCostUsd,
        `Commercial operating cost: ${contract.partnerName} / ${contract.assetName}`,
      );
    }
  }

  const commercialContracts = nextState.commercialContracts;
  const isOfferDue = commercialContracts.lastOfferOn === null
    || date >= addDays(commercialContracts.lastOfferOn, COMMERCIAL_LIMITS.offerIntervalDays);

  if (isOfferDue) {
    const offer = generateCommercialOffer(commercialContracts, {
      date,
      reputation: nextState.company.reputation,
      assets: buildCommercialAssets(nextState),
      revenueMultiplier:
        getDoctrineEffects(nextState.legacy.doctrine).commercialRevenueMultiplier
        * getReputationContractMultiplier(nextState.company.reputation),
    });

    if (offer) {
      nextState = {
        ...nextState,
        commercialContracts: {
          ...commercialContracts,
          offers: [...commercialContracts.offers, offer],
          lastOfferOn: date,
        },
      };
    }
  }

  return nextState;
}

export function acceptCommercialOffer(state: GameState, offerId: string): GameState {
  const offer = state.commercialContracts.offers.find((candidate) => candidate.id === offerId);
  if (!offer) {
    throw new CommercialOperationError("offer-not-found", "Commercial offer was not found.");
  }
  if (state.gameDate > offer.expiresOn) {
    throw new CommercialOperationError("offer-expired", "Commercial offer has expired.");
  }

  const asset = buildCommercialAssets(state).find((candidate) =>
    candidate.id === offer.assetId && candidate.channel === offer.channel,
  );
  if (!asset) {
    throw new CommercialOperationError("asset-unavailable", "The offered asset is no longer available.");
  }

  const duplicate = state.commercialContracts.active.some((contract) =>
    contract.expiresOn > state.gameDate
    && contract.assetId === offer.assetId
    && contract.channel === offer.channel,
  );
  if (duplicate) {
    throw new CommercialOperationError(
      "duplicate-contract",
      "An active contract already covers this asset.",
    );
  }

  const contract = createCommercialContract(
    offer,
    nextContractId(state.commercialContracts),
    state.gameDate,
  );
  const nextState: GameState = {
    ...state,
    company: {
      ...state.company,
      reputation: Math.min(
        100,
        Math.round(
          (state.company.reputation
            + 0.5 * getDoctrineEffects(state.legacy.doctrine).reputationGainMultiplier) * 100,
        ) / 100,
      ),
    },
    commercialContracts: {
      ...state.commercialContracts,
      offers: state.commercialContracts.offers.filter((candidate) => candidate.id !== offerId),
      active: [...state.commercialContracts.active, contract],
    },
  };

  return postFinanceTransaction(
    nextState,
    "sales",
    offer.signingBonusUsd,
    `Commercial contract: ${offer.partnerName} / ${offer.assetName}`,
  );
}

export function declineCommercialOffer(state: GameState, offerId: string): GameState {
  if (!state.commercialContracts.offers.some((offer) => offer.id === offerId)) {
    throw new CommercialOperationError("offer-not-found", "Commercial offer was not found.");
  }

  return {
    ...state,
    commercialContracts: {
      ...state.commercialContracts,
      offers: state.commercialContracts.offers.filter((offer) => offer.id !== offerId),
    },
  };
}

function buildDeviceAsset(
  project: DeviceProject,
  context: DeviceReferenceContext,
): CommercialAsset | null {
  try {
    const metrics = calculateDeviceMetrics(project.configuration, context);
    return {
      id: `device-supply:${project.id}`,
      channel: "device-supply",
      name: `${project.name} ${project.configuration.type}`,
      qualityScore: metrics.overallScore,
      appealScore: metrics.appealScore,
      dailyCostUsd: metrics.unitCostUsd,
    };
  } catch {
    return null;
  }
}

function buildCloudAsset(
  project: CloudProject,
  context: CloudReferenceContext,
): CommercialAsset | null {
  try {
    const metrics = calculateCloudMetrics(project.configuration, context);
    return {
      id: `cloud-capacity:${project.id}`,
      channel: "cloud-capacity",
      name: `${project.name} Cloud`,
      qualityScore: metrics.overallScore,
      appealScore: metrics.capacityScore,
      dailyCostUsd: metrics.operatingCostPerDayUsd,
    };
  } catch {
    return null;
  }
}

function roundUsd(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
