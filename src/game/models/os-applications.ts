import type { CpuIsa } from "./cpu";
import type {
  OsAddressBits,
  OsApi,
  OsConfiguration,
  OsDeveloperTools,
  OsGui,
  OsSdk,
} from "./os";

export type OsApplicationCategory = "productivity" | "internet" | "development" | "gaming" | "enterprise";

export interface OsApplicationDefinition {
  id: string;
  category: OsApplicationCategory;
  minGui: OsGui;
  minSdk: OsSdk;
  requiredApis: OsApi[];
  supportedArchitectures: CpuIsa[];
  minMemoryMb: number;
  minSecurityScore: number;
  minDeveloperTools: OsDeveloperTools;
}

export type OsApplicationCompatibilityIssueCode =
  | "gui-required"
  | "sdk-required"
  | "api-unsupported"
  | "architecture-unsupported"
  | "memory-required"
  | "security-required"
  | "developer-tools-required";

export interface OsApplicationCompatibility {
  applicationId: string;
  category: OsApplicationCategory;
  compatible: boolean;
  issues: OsApplicationCompatibilityIssueCode[];
}

export const OS_APPLICATION_CATALOG = [
  {
    id: "notes",
    category: "productivity",
    minGui: "cli",
    minSdk: "basic",
    requiredApis: ["proprietary"],
    supportedArchitectures: ["x86", "arm", "risc-v"],
    minMemoryMb: 8,
    minSecurityScore: 0,
    minDeveloperTools: "none",
  },
  {
    id: "web-browser",
    category: "internet",
    minGui: "desktop-shell",
    minSdk: "basic",
    requiredApis: ["proprietary", "web"],
    supportedArchitectures: ["x86", "arm", "risc-v"],
    minMemoryMb: 64,
    minSecurityScore: 20,
    minDeveloperTools: "none",
  },
  {
    id: "office-suite",
    category: "productivity",
    minGui: "desktop-shell",
    minSdk: "full",
    requiredApis: ["proprietary", "posix"],
    supportedArchitectures: ["x86", "arm"],
    minMemoryMb: 128,
    minSecurityScore: 30,
    minDeveloperTools: "none",
  },
  {
    id: "developer-studio",
    category: "development",
    minGui: "modern-desktop",
    minSdk: "full",
    requiredApis: ["proprietary", "posix", "web"],
    supportedArchitectures: ["x86", "arm", "risc-v"],
    minMemoryMb: 512,
    minSecurityScore: 25,
    minDeveloperTools: "ide",
  },
  {
    id: "game-runtime",
    category: "gaming",
    minGui: "modern-desktop",
    minSdk: "full",
    requiredApis: ["proprietary", "hybrid"],
    supportedArchitectures: ["x86", "arm"],
    minMemoryMb: 1_024,
    minSecurityScore: 20,
    minDeveloperTools: "compiler",
  },
  {
    id: "enterprise-console",
    category: "enterprise",
    minGui: "desktop-shell",
    minSdk: "professional",
    requiredApis: ["posix", "hybrid"],
    supportedArchitectures: ["x86"],
    minMemoryMb: 2_048,
    minSecurityScore: 50,
    minDeveloperTools: "suite",
  },
] as const satisfies readonly OsApplicationDefinition[];

const GUI_LEVELS: Record<OsGui, number> = {
  cli: 0,
  "desktop-shell": 1,
  "modern-desktop": 2,
  adaptive: 3,
};

const SDK_LEVELS: Record<OsSdk, number> = {
  none: 0,
  basic: 1,
  full: 2,
  professional: 3,
};

const DEVELOPER_TOOLS_LEVELS: Record<OsDeveloperTools, number> = {
  none: 0,
  compiler: 1,
  ide: 2,
  suite: 3,
};

export const OS_MEMORY_CAPACITY_MB: Record<OsAddressBits, number> = {
  16: 16,
  32: 4_096,
  64: 1_000_000,
};

export function checkOsApplicationCompatibility(
  configuration: OsConfiguration,
  metrics: { memoryFootprintMb: number; securityScore: number },
): OsApplicationCompatibility[] {
  const capacityMb = OS_MEMORY_CAPACITY_MB[configuration.addressBits] ?? 0;

  return OS_APPLICATION_CATALOG.map((application) => {
    const issues = new Set<OsApplicationCompatibilityIssueCode>();

    if (GUI_LEVELS[configuration.gui] < GUI_LEVELS[application.minGui]) {
      issues.add("gui-required");
    }
    if (SDK_LEVELS[configuration.sdk] < SDK_LEVELS[application.minSdk]) {
      issues.add("sdk-required");
    }
    if (!(application.requiredApis as readonly OsApi[]).includes(configuration.api)) {
      issues.add("api-unsupported");
    }
    if (!application.supportedArchitectures.some((architecture) =>
      configuration.supportedArchitectures.includes(architecture))) {
      issues.add("architecture-unsupported");
    }
    if (capacityMb < application.minMemoryMb || metrics.memoryFootprintMb > capacityMb) {
      issues.add("memory-required");
    }
    if (metrics.securityScore < application.minSecurityScore) {
      issues.add("security-required");
    }
    if (DEVELOPER_TOOLS_LEVELS[configuration.developerTools] < DEVELOPER_TOOLS_LEVELS[application.minDeveloperTools]) {
      issues.add("developer-tools-required");
    }

    return {
      applicationId: application.id,
      category: application.category,
      compatible: issues.size === 0,
      issues: [...issues],
    };
  });
}
