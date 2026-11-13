import type { OsApplicationCompatibility } from "./os-applications";
import { checkOsApplicationCompatibility, OS_APPLICATION_CATALOG } from "./os-applications";
import type { OsConfiguration, OsProject, OsRelease, OsReleaseStage } from "./os";
import { calculateOsKernelMetrics } from "../formulas/os";

export type OsPreviewShell = "terminal" | "desktop-shell" | "modern-desktop" | "adaptive";
export type OsPreviewDevice = "desktop" | "mobile" | "server" | "gaming";
export type OsPreviewAccent = "blue" | "green" | "violet" | "amber";
export type OsPreviewStage = OsReleaseStage | "development";

export interface OsPreviewApp {
  id: string;
  category: string;
  compatible: boolean;
  issues: string[];
}

export interface OsPreviewModel {
  shell: OsPreviewShell;
  device: OsPreviewDevice;
  accent: OsPreviewAccent;
  stage: OsPreviewStage;
  versionLabel: string;
  quality: number;
  appeal: number;
  bootSeconds: number;
  kernelType: OsConfiguration["kernelType"];
  gui: OsConfiguration["gui"];
  compatibleApps: number;
  totalApps: number;
  apps: OsPreviewApp[];
  nextShell: OsPreviewShell | null;
  hasTaskbar: boolean;
  hasStartMenu: boolean;
  hasWidgets: boolean;
  hasWindowChrome: boolean;
}

const SHELL_ORDER: OsPreviewShell[] = [
  "terminal",
  "desktop-shell",
  "modern-desktop",
  "adaptive",
];

function getShell(gui: OsConfiguration["gui"]): OsPreviewShell {
  if (gui === "cli") {
    return "terminal";
  }
  return gui;
}

function getDevice(platform: OsConfiguration["targetPlatform"]): OsPreviewDevice {
  if (platform === "mobile" || platform === "server" || platform === "gaming") {
    return platform;
  }
  return "desktop";
}

function getAccent(device: OsPreviewDevice): OsPreviewAccent {
  if (device === "mobile") {
    return "green";
  }
  if (device === "server") {
    return "violet";
  }
  if (device === "gaming") {
    return "amber";
  }
  return "blue";
}

function getNextShell(shell: OsPreviewShell): OsPreviewShell | null {
  const index = SHELL_ORDER.indexOf(shell);
  return index >= 0 && index < SHELL_ORDER.length - 1 ? SHELL_ORDER[index + 1]! : null;
}

function toApp(result: OsApplicationCompatibility): OsPreviewApp {
  return {
    id: result.applicationId,
    category: result.category,
    compatible: result.compatible,
    issues: result.issues,
  };
}

export function buildOsPreviewModel(
  configuration: OsConfiguration,
  project?: Pick<OsProject, "releases"> | null,
): OsPreviewModel {
  const metrics = calculateOsKernelMetrics(configuration);
  const compatibility = checkOsApplicationCompatibility(configuration, {
    memoryFootprintMb: metrics.memoryFootprintMb,
    securityScore: metrics.securityScore,
  });
  const apps = compatibility.map(toApp);
  const latestRelease = project?.releases.reduce<OsRelease | null>(
    (latest, release) => (latest === null || release.version > latest.version ? release : latest),
    null,
  );
  const shell = getShell(configuration.gui);
  const device = getDevice(configuration.targetPlatform);

  return {
    shell,
    device,
    accent: getAccent(device),
    stage: latestRelease?.stage ?? "development",
    versionLabel: latestRelease ? `${latestRelease.version}.0` : "0.1",
    quality: latestRelease?.qualityScore ?? metrics.overallScore,
    appeal: latestRelease?.appealScore ?? metrics.overallScore,
    bootSeconds: metrics.bootTimeSeconds,
    kernelType: configuration.kernelType,
    gui: configuration.gui,
    compatibleApps: apps.filter((app) => app.compatible).length,
    totalApps: OS_APPLICATION_CATALOG.length,
    apps,
    nextShell: getNextShell(shell),
    hasTaskbar: shell !== "terminal",
    hasStartMenu: shell !== "terminal",
    hasWidgets: shell === "modern-desktop" || shell === "adaptive",
    hasWindowChrome: shell === "modern-desktop" || shell === "adaptive",
  };
}
