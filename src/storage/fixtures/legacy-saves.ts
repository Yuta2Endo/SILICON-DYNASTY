import {
  createDefaultCpuConfiguration,
  createCpuProject,
} from "../../game/models/cpu";
import {
  createDefaultComponentConfiguration,
  createComponentProject,
} from "../../game/models/components";
import { createInitialGameState } from "../../game/models/game-state";
import {
  createDefaultOsConfiguration,
  createOsProject,
} from "../../game/models/os";

export function createSchema1Fixture(): unknown {
  const current = createInitialGameState();
  return {
    schemaVersion: 1,
    gameDate: current.gameDate,
    company: current.company,
    settings: current.settings,
  };
}

export function createSchema5Fixture(): unknown {
  const current = createInitialGameState();
  const cpuProject = createCpuProject(
    "cpu-1",
    "Legacy CPU",
    { ...createDefaultCpuConfiguration(), memoryStandard: "ddr" },
    current.gameDate,
  );
  const componentProject = createComponentProject(
    "component-1",
    "Legacy GPU",
    "gpu",
    createDefaultComponentConfiguration("gpu"),
    current.gameDate,
  );

  return {
    schemaVersion: 5,
    gameDate: current.gameDate,
    company: { ...current.company, name: "Legacy Components Co" },
    settings: current.settings,
    cpuProjects: [cpuProject],
    componentProjects: [componentProject],
    research: current.research,
    finance: current.finance,
    market: current.market,
  };
}

export function createSchema7Fixture(): unknown {
  const current = createInitialGameState();
  const configuration = createDefaultOsConfiguration();
  const {
    gui: _gui,
    sdk: _sdk,
    api: _api,
    developerTools: _developerTools,
    appStore: _appStore,
    ...legacyConfiguration
  } = configuration;
  void _gui;
  void _sdk;
  void _api;
  void _developerTools;
  void _appStore;
  const project = createOsProject("os-1", "Legacy OS", configuration, current.gameDate);
  const legacyProject = {
    id: project.id,
    name: project.name,
    configuration: legacyConfiguration,
    versions: project.versions.map((version) => ({
      ...version,
      configuration: legacyConfiguration,
    })),
  };

  return {
    schemaVersion: 7,
    gameDate: current.gameDate,
    company: { ...current.company, name: "Legacy OS Co" },
    settings: current.settings,
    cpuProjects: [],
    componentProjects: [],
    osProjects: [legacyProject],
    research: current.research,
    finance: current.finance,
    market: current.market,
  };
}

export function createSchema10Fixture(): unknown {
  const current = createInitialGameState();
  const {
    deviceProjects: _deviceProjects,
    cloudProjects: _cloudProjects,
    ...legacyState
  } = current;
  void _deviceProjects;
  void _cloudProjects;

  return {
    ...legacyState,
    schemaVersion: 10,
    company: { ...current.company, name: "Pre-Devices Co" },
  };
}

export function createSchema11Fixture(): unknown {
  const current = createInitialGameState();
  return {
    ...current,
    schemaVersion: 11,
    oemContracts: undefined,
    company: { ...current.company, name: "Pre-OEM Co" },
  };
}

export function createSchema12Fixture(): unknown {
  const current = createInitialGameState();
  const {
    commercialContracts: _commercialContracts,
    ...legacyState
  } = current;
  void _commercialContracts;

  return {
    ...legacyState,
    schemaVersion: 12,
    company: { ...current.company, name: "Pre-Commercial Co" },
  };
}

export function createSchema13Fixture(): unknown {
  const current = createInitialGameState();
  const {
    manufacturing: _manufacturing,
    ...legacyState
  } = current;
  void _manufacturing;

  return {
    ...legacyState,
    schemaVersion: 13,
    company: { ...current.company, name: "Pre-Manufacturing Co" },
  };
}

export function createSchema14Fixture(): unknown {
  const current = createInitialGameState();
  return {
    ...current,
    schemaVersion: 14,
    company: { ...current.company, name: "Current Save Co" },
  };
}
