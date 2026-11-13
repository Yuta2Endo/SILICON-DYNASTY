import { useEffect, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Cloud,
  Laptop,
  Save,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { ConfirmationBottomSheet } from "../../components/ConfirmationBottomSheet";
import { MetricCard } from "../../components/MetricCard";
import { ProductWorkspaceTabs } from "../../components/ProductWorkspaceTabs";
import {
  DEVICE_LIMITS,
  DEVICE_TYPE_OPTIONS,
  buildSuggestedDeviceConfiguration,
  cloneDeviceConfiguration,
  createDefaultDeviceConfiguration,
  deviceConfigurationsEqual,
  validateDeviceConfiguration,
  validateDeviceProjectName,
  type DeviceConfiguration,
  type DeviceType,
  type DeviceValidationIssue,
} from "../../game/models/devices";
import {
  CLOUD_LIMITS,
  buildSuggestedCloudConfiguration,
  cloneCloudConfiguration,
  cloudConfigurationsEqual,
  createDefaultCloudConfiguration,
  validateCloudConfiguration,
  type CloudConfiguration,
  type CloudValidationIssue,
} from "../../game/models/cloud";
import { calculateCloudMetrics, type CloudMetrics } from "../../game/formulas/cloud";
import { calculateDeviceMetrics, type DeviceMetrics } from "../../game/formulas/devices";
import { DeviceVersionCompare } from "./DeviceVersionCompare";
import type { GameState } from "../../game/models/game-state";
import { formatCurrency, formatDecimal, formatNumber } from "../../localization/formatters";
import { translations } from "../../localization/messages";

interface DeviceDesignerPageProps {
  state: GameState;
  isSaving: boolean;
  onDirtyChange: (isDirty: boolean) => void;
  onCreateDevice: (name: string, configuration: DeviceConfiguration) => Promise<string | null>;
  onSaveDevice: (projectId: string, name: string, configuration: DeviceConfiguration) => Promise<boolean>;
  onCreateCloud: (name: string, configuration: CloudConfiguration) => Promise<string | null>;
  onSaveCloud: (projectId: string, name: string, configuration: CloudConfiguration) => Promise<boolean>;
  onOpenCpu: () => void;
  onOpenComponents: () => void;
  onOpenOs: () => void;
  onOpenAi: () => void;
}

type WorkspaceView = "device" | "cloud";

type PendingAction =
  | { type: "switch-device"; projectId: string }
  | { type: "load-device-version"; version: number }
  | { type: "switch-cloud"; projectId: string }
  | { type: "load-cloud-version"; version: number };

interface SelectOption {
  value: string;
  label: string;
}

export function DeviceDesignerPage({
  state,
  isSaving,
  onDirtyChange,
  onCreateDevice,
  onSaveDevice,
  onCreateCloud,
  onSaveCloud,
  onOpenCpu,
  onOpenComponents,
  onOpenOs,
  onOpenAi,
}: DeviceDesignerPageProps) {
  const locale = state.settings.locale;
  const t = translations[locale];
  const copy = t.devices;
  const context = {
    cpuProjects: state.cpuProjects,
    componentProjects: state.componentProjects,
    osProjects: state.osProjects,
    aiProjects: state.aiProjects,
  };
  const cloudContext = { ...context, deviceProjects: state.deviceProjects };

  const [view, setView] = useState<WorkspaceView>("device");
  const firstDevice = state.deviceProjects[0] ?? null;
  const firstCloud = state.cloudProjects[0] ?? null;
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(firstDevice?.id ?? null);
  const selectedDevice = state.deviceProjects.find((project) => project.id === selectedDeviceId) ?? null;
  const [deviceName, setDeviceName] = useState(firstDevice?.name ?? "");
  const [deviceConfiguration, setDeviceConfiguration] = useState<DeviceConfiguration>(() =>
    firstDevice ? cloneDeviceConfiguration(firstDevice.configuration) : createDefaultDeviceConfiguration("desktop"),
  );
  const [newDeviceType, setNewDeviceType] = useState<DeviceType>("desktop");
  const [newDeviceName, setNewDeviceName] = useState("");
  const [showDeviceCreateValidation, setShowDeviceCreateValidation] = useState(false);
  const [showDeviceValidation, setShowDeviceValidation] = useState(false);

  const [selectedCloudId, setSelectedCloudId] = useState<string | null>(firstCloud?.id ?? null);
  const selectedCloud = state.cloudProjects.find((project) => project.id === selectedCloudId) ?? null;
  const [cloudName, setCloudName] = useState(firstCloud?.name ?? "");
  const [cloudConfiguration, setCloudConfiguration] = useState<CloudConfiguration>(() =>
    firstCloud ? cloneCloudConfiguration(firstCloud.configuration) : createDefaultCloudConfiguration(),
  );
  const [newCloudName, setNewCloudName] = useState("");
  const [showCloudCreateValidation, setShowCloudCreateValidation] = useState(false);
  const [showCloudValidation, setShowCloudValidation] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const deviceDirty = Boolean(
    selectedDevice
      && (deviceName.trim() !== selectedDevice.name
        || !deviceConfigurationsEqual(deviceConfiguration, selectedDevice.configuration)),
  );
  const cloudDirty = Boolean(
    selectedCloud
      && (cloudName.trim() !== selectedCloud.name
        || !cloudConfigurationsEqual(cloudConfiguration, selectedCloud.configuration)),
  );
  const draftIsDirty = deviceDirty || cloudDirty;
  const deviceNameIssue = validateDeviceProjectName(deviceName);
  const cloudNameIssue = validateDeviceProjectName(cloudName);
  const newDeviceNameIssue = validateDeviceProjectName(newDeviceName);
  const newCloudNameIssue = validateDeviceProjectName(newCloudName);
  const deviceValidation = validateDeviceConfiguration(deviceConfiguration, context);
  const cloudValidation = validateCloudConfiguration(cloudConfiguration, cloudContext);
  const deviceMetrics = safeDeviceMetrics(deviceConfiguration, context);
  const cloudMetrics = safeCloudMetrics(cloudConfiguration, cloudContext);
  const suggestedDevice = buildSuggestedDeviceConfiguration(newDeviceType, context);
  const suggestedDeviceValidation = validateDeviceConfiguration(suggestedDevice, context);
  const suggestedCloud = buildSuggestedCloudConfiguration(state.deviceProjects);
  const suggestedCloudValidation = validateCloudConfiguration(suggestedCloud, cloudContext);

  useEffect(() => {
    onDirtyChange(draftIsDirty);
    if (!draftIsDirty) {
      return;
    }
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [draftIsDirty, onDirtyChange]);

  function loadDevice(projectId: string) {
    const project = state.deviceProjects.find((candidate) => candidate.id === projectId);
    if (!project) {
      return;
    }
    setSelectedDeviceId(project.id);
    setDeviceName(project.name);
    setDeviceConfiguration(cloneDeviceConfiguration(project.configuration));
    setShowDeviceValidation(false);
    setPendingAction(null);
  }

  function loadCloud(projectId: string) {
    const project = state.cloudProjects.find((candidate) => candidate.id === projectId);
    if (!project) {
      return;
    }
    setSelectedCloudId(project.id);
    setCloudName(project.name);
    setCloudConfiguration(cloneCloudConfiguration(project.configuration));
    setShowCloudValidation(false);
    setPendingAction(null);
  }

  function requestDeviceSelection(projectId: string) {
    if (projectId === selectedDeviceId) {
      return;
    }
    if (deviceDirty) {
      setPendingAction({ type: "switch-device", projectId });
      return;
    }
    loadDevice(projectId);
  }

  function requestCloudSelection(projectId: string) {
    if (projectId === selectedCloudId) {
      return;
    }
    if (cloudDirty) {
      setPendingAction({ type: "switch-cloud", projectId });
      return;
    }
    loadCloud(projectId);
  }

  function requestDeviceVersion(versionNumber: number) {
    if (!selectedDevice) {
      return;
    }
    if (deviceDirty) {
      setPendingAction({ type: "load-device-version", version: versionNumber });
      return;
    }
    loadDeviceVersion(versionNumber);
  }

  function requestCloudVersion(versionNumber: number) {
    if (!selectedCloud) {
      return;
    }
    if (cloudDirty) {
      setPendingAction({ type: "load-cloud-version", version: versionNumber });
      return;
    }
    loadCloudVersion(versionNumber);
  }

  function loadDeviceVersion(versionNumber: number) {
    const version = selectedDevice?.versions.find((entry) => entry.version === versionNumber);
    if (!version) {
      return;
    }
    setDeviceConfiguration(cloneDeviceConfiguration(version.configuration));
    setShowDeviceValidation(false);
    setPendingAction(null);
  }

  function loadCloudVersion(versionNumber: number) {
    const version = selectedCloud?.versions.find((entry) => entry.version === versionNumber);
    if (!version) {
      return;
    }
    setCloudConfiguration(cloneCloudConfiguration(version.configuration));
    setShowCloudValidation(false);
    setPendingAction(null);
  }

  function confirmPendingAction() {
    if (!pendingAction) {
      return;
    }
    switch (pendingAction.type) {
      case "switch-device":
        loadDevice(pendingAction.projectId);
        return;
      case "load-device-version":
        loadDeviceVersion(pendingAction.version);
        return;
      case "switch-cloud":
        loadCloud(pendingAction.projectId);
        return;
      case "load-cloud-version":
        loadCloudVersion(pendingAction.version);
        return;
    }
  }

  async function handleCreateDevice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowDeviceCreateValidation(true);
    if (newDeviceNameIssue || draftIsDirty || !suggestedDeviceValidation.valid) {
      return;
    }
    const projectId = await onCreateDevice(newDeviceName.trim(), suggestedDevice);
    if (!projectId) {
      return;
    }
    setSelectedDeviceId(projectId);
    setDeviceName(newDeviceName.trim());
    setDeviceConfiguration(cloneDeviceConfiguration(suggestedDevice));
    setNewDeviceName("");
    setShowDeviceCreateValidation(false);
    setShowDeviceValidation(false);
    setView("device");
  }

  async function handleCreateCloud(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowCloudCreateValidation(true);
    if (newCloudNameIssue || draftIsDirty || !suggestedCloudValidation.valid) {
      return;
    }
    const projectId = await onCreateCloud(newCloudName.trim(), suggestedCloud);
    if (!projectId) {
      return;
    }
    setSelectedCloudId(projectId);
    setCloudName(newCloudName.trim());
    setCloudConfiguration(cloneCloudConfiguration(suggestedCloud));
    setNewCloudName("");
    setShowCloudCreateValidation(false);
    setShowCloudValidation(false);
    setView("cloud");
  }

  async function handleSaveDevice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowDeviceValidation(true);
    if (!selectedDevice || deviceNameIssue || !deviceValidation.valid || !deviceDirty) {
      return;
    }
    await onSaveDevice(selectedDevice.id, deviceName.trim(), deviceConfiguration);
  }

  async function handleSaveCloud(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowCloudValidation(true);
    if (!selectedCloud || cloudNameIssue || !cloudValidation.valid || !cloudDirty) {
      return;
    }
    await onSaveCloud(selectedCloud.id, cloudName.trim(), cloudConfiguration);
  }

  function updateDevice<K extends keyof DeviceConfiguration>(key: K, value: DeviceConfiguration[K]) {
    setDeviceConfiguration((current) => ({ ...current, [key]: value }));
  }

  function updateCloud<K extends keyof CloudConfiguration>(key: K, value: CloudConfiguration[K]) {
    setCloudConfiguration((current) => ({ ...current, [key]: value }));
  }

  function deviceProjectOptions(type: string): SelectOption[] {
    return state.componentProjects
      .filter((project) => project.type === type)
      .map((project) => ({ value: project.id, label: project.name }));
  }

  function cpuVersionOptions(projectId: string): SelectOption[] {
    const project = state.cpuProjects.find((candidate) => candidate.id === projectId);
    return (project?.versions ?? []).map((version) => ({
      value: String(version.version),
      label: `${copy.versions.version} ${version.version}`,
    }));
  }

  function osReleaseOptions(projectId: string): SelectOption[] {
    const project = state.osProjects.find((candidate) => candidate.id === projectId);
    return [...(project?.releases ?? [])]
      .sort((left, right) => left.version - right.version)
      .map((release) => ({
        value: release.id,
        label: `${copy.versions.version} ${release.version} · ${copy.releaseStages[release.stage]}`,
      }));
  }

  function aiDeploymentOptions(projectId: string): SelectOption[] {
    const project = state.aiProjects.find((candidate) => candidate.id === projectId);
    return (project?.deployments ?? []).map((deployment) => ({
      value: deployment.id,
      label: `${copy.versions.version} ${deployment.version}`,
    }));
  }

  function issueText(issue: DeviceValidationIssue): string {
    switch (issue.code) {
      case "invalid-name":
        return copy.validation.invalidName;
      case "invalid-type":
        return copy.validation.invalidType;
      case "required-reference":
        return copy.validation.requiredReference;
      case "project-not-found":
        return copy.validation.projectNotFound;
      case "version-not-found":
        return copy.validation.versionNotFound;
      case "component-type-mismatch":
        return copy.validation.componentTypeMismatch;
      case "os-release-not-found":
        return copy.validation.osReleaseNotFound;
      case "ai-deployment-not-found":
        return copy.validation.aiDeploymentNotFound;
      case "ai-project-mismatch":
        return copy.validation.aiProjectMismatch;
      case "os-platform-mismatch":
        return copy.validation.osPlatformMismatch;
      case "component-incompatible":
        return copy.validation.componentIncompatible;
      case "os-incompatible":
        return copy.validation.osIncompatible;
    }
  }

  function cloudIssueText(issue: CloudValidationIssue): string {
    switch (issue.code) {
      case "required-reference":
        return copy.cloud.validation.requiredReference;
      case "project-not-found":
        return copy.cloud.validation.projectNotFound;
      case "version-not-found":
        return copy.cloud.validation.versionNotFound;
      case "device-not-server":
        return copy.cloud.validation.deviceNotServer;
      case "device-incompatible":
        return copy.cloud.validation.deviceIncompatible;
      case "integer":
        return copy.cloud.validation.integer;
      case "range":
        return copy.cloud.validation.range
          .replace("{min}", formatNumber(issue.min ?? 0, locale))
          .replace("{max}", formatNumber(issue.max ?? 0, locale));
    }
  }

  function renderDeviceProjectSelect(
    key: "motherboardProjectId" | "ramProjectId" | "storageProjectId",
    type: "motherboard" | "ram" | "ssd",
  ) {
    return (
      <div className="cpu-field" key={key}>
        <label htmlFor={`device-field-${key}`}>{copy.fields[key]}</label>
        <select
          disabled={isSaving}
          id={`device-field-${key}`}
          onChange={(event) => updateDevice(key, event.currentTarget.value)}
          value={deviceConfiguration[key]}
        >
          <option value="">{copy.optional}</option>
          {deviceProjectOptions(type).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
    );
  }

  function renderOptionalComponentSelect(
    key: "gpuProjectId" | "networkingProjectId" | "aiAcceleratorProjectId",
    type: "gpu" | "networking" | "ai-accelerator",
  ) {
    return (
      <div className="cpu-field" key={key}>
        <label htmlFor={`device-field-${key}`}>{copy.fields[key]}</label>
        <select
          disabled={isSaving}
          id={`device-field-${key}`}
          onChange={(event) => updateDevice(key, event.currentTarget.value || null)}
          value={deviceConfiguration[key] ?? ""}
        >
          <option value="">{copy.optional}</option>
          {deviceProjectOptions(type).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
    );
  }

  function renderDeviceEditor() {
    return (
      <form className="cpu-editor-card device-editor-card" onSubmit={(event) => void handleSaveDevice(event)}>
        <header className="cpu-editor-card__header">
          <div>
            <p className="eyebrow">{copy.editorEyebrow}</p>
            <h2>{selectedDevice?.name}</h2>
            <p>{copy.editorHint}</p>
          </div>
          <span className="status-pill">{copy.deviceTypes[deviceConfiguration.type]}</span>
        </header>

        <div className="cpu-field">
          <label htmlFor="device-project-name">{copy.projectName}</label>
          <input
            autoComplete="off"
            id="device-project-name"
            maxLength={DEVICE_LIMITS.projectName.max}
            onChange={(event) => setDeviceName(event.currentTarget.value)}
            value={deviceName}
          />
          {showDeviceValidation && deviceNameIssue && (
            <p className="cpu-field__error" role="alert">
              {copy.validation.nameError
                .replace("{min}", String(DEVICE_LIMITS.projectName.min))
                .replace("{max}", String(DEVICE_LIMITS.projectName.max))}
            </p>
          )}
        </div>

        <div className="cpu-fields-grid">
          <div className="cpu-field">
            <label htmlFor="device-field-type">{copy.fields.type}</label>
            <select
              disabled={isSaving}
              id="device-field-type"
              onChange={(event) => updateDevice("type", event.currentTarget.value as DeviceType)}
              value={deviceConfiguration.type}
            >
              {DEVICE_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>{copy.deviceTypes[type]}</option>
              ))}
            </select>
          </div>

          <div className="cpu-field">
            <label htmlFor="device-field-cpu">{copy.fields.cpuProject}</label>
            <select
              disabled={isSaving}
              id="device-field-cpu"
              onChange={(event) => {
                const projectId = event.currentTarget.value;
                const project = state.cpuProjects.find((candidate) => candidate.id === projectId);
                const latest = project ? Math.max(...project.versions.map((version) => version.version)) : 1;
                setDeviceConfiguration((current) => ({ ...current, cpuProjectId: projectId, cpuVersion: latest }));
              }}
              value={deviceConfiguration.cpuProjectId}
            >
              <option value="">{copy.optional}</option>
              {state.cpuProjects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>

          <div className="cpu-field">
            <label htmlFor="device-field-cpu-version">{copy.fields.cpuVersion}</label>
            <select
              disabled={isSaving || !deviceConfiguration.cpuProjectId}
              id="device-field-cpu-version"
              onChange={(event) => updateDevice("cpuVersion", Number(event.currentTarget.value))}
              value={String(deviceConfiguration.cpuVersion)}
            >
              {cpuVersionOptions(deviceConfiguration.cpuProjectId).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {renderDeviceProjectSelect("motherboardProjectId", "motherboard")}
          {renderDeviceProjectSelect("ramProjectId", "ram")}
          {renderDeviceProjectSelect("storageProjectId", "ssd")}
          {renderOptionalComponentSelect("gpuProjectId", "gpu")}
          {renderOptionalComponentSelect("networkingProjectId", "networking")}
          {renderOptionalComponentSelect("aiAcceleratorProjectId", "ai-accelerator")}

          <div className="cpu-field">
            <label htmlFor="device-field-os">{copy.fields.osProject}</label>
            <select
              disabled={isSaving}
              id="device-field-os"
              onChange={(event) => {
                const projectId = event.currentTarget.value;
                const project = state.osProjects.find((candidate) => candidate.id === projectId);
                const latest = project
                  ? [...project.releases].sort((left, right) => right.version - left.version)[0]
                  : undefined;
                setDeviceConfiguration((current) => ({
                  ...current,
                  osProjectId: projectId,
                  osReleaseId: latest?.id ?? "",
                }));
              }}
              value={deviceConfiguration.osProjectId}
            >
              <option value="">{copy.optional}</option>
              {state.osProjects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>

          <div className="cpu-field">
            <label htmlFor="device-field-os-release">{copy.fields.osRelease}</label>
            <select
              disabled={isSaving || !deviceConfiguration.osProjectId}
              id="device-field-os-release"
              onChange={(event) => updateDevice("osReleaseId", event.currentTarget.value)}
              value={deviceConfiguration.osReleaseId}
            >
              <option value="">{copy.optional}</option>
              {osReleaseOptions(deviceConfiguration.osProjectId).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="cpu-field">
            <label htmlFor="device-field-ai">{copy.fields.aiProject}</label>
            <select
              disabled={isSaving}
              id="device-field-ai"
              onChange={(event) => {
                const projectId = event.currentTarget.value;
                const project = state.aiProjects.find((candidate) => candidate.id === projectId);
                const latest = project?.deployments.at(-1);
                setDeviceConfiguration((current) => ({
                  ...current,
                  aiProjectId: projectId || null,
                  aiDeploymentId: latest?.id ?? null,
                }));
              }}
              value={deviceConfiguration.aiProjectId ?? ""}
            >
              <option value="">{copy.optional}</option>
              {state.aiProjects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>

          <div className="cpu-field">
            <label htmlFor="device-field-ai-deployment">{copy.fields.aiDeployment}</label>
            <select
              disabled={isSaving || !deviceConfiguration.aiProjectId}
              id="device-field-ai-deployment"
              onChange={(event) => updateDevice("aiDeploymentId", event.currentTarget.value || null)}
              value={deviceConfiguration.aiDeploymentId ?? ""}
            >
              <option value="">{copy.optional}</option>
              {aiDeploymentOptions(deviceConfiguration.aiProjectId ?? "").map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        <DeviceValidationPanel
          issues={deviceValidation.issues}
          show={showDeviceValidation || deviceDirty}
          texts={copy.validation}
          title={copy.compatibility.title}
          hint={copy.compatibility.hint}
          validLabel={copy.compatibility.valid}
          issueText={issueText}
        />

        <div className="cpu-editor-actions">
          <button
            className="button button--primary"
            disabled={isSaving || !deviceDirty || !deviceValidation.valid || deviceNameIssue !== null}
            type="submit"
          >
            <Save aria-hidden="true" size={17} />
            {isSaving ? copy.savingVersion : copy.saveVersion}
          </button>
          <p className="field-hint">
            {!deviceDirty
              ? copy.noChanges
              : !deviceValidation.valid || deviceNameIssue
                ? copy.fixErrors
                : copy.saveVersionHint}
          </p>
        </div>
      </form>
    );
  }

  function renderCloudEditor() {
    return (
      <form className="cpu-editor-card cloud-editor-card" onSubmit={(event) => void handleSaveCloud(event)}>
        <header className="cpu-editor-card__header">
          <div>
            <p className="eyebrow">{copy.cloud.editorEyebrow}</p>
            <h2>{selectedCloud?.name}</h2>
            <p>{copy.cloud.editorHint}</p>
          </div>
          <span className="status-pill">{copy.cloud.title}</span>
        </header>

        <div className="cpu-field">
          <label htmlFor="cloud-project-name">{copy.projectName}</label>
          <input
            autoComplete="off"
            id="cloud-project-name"
            maxLength={CLOUD_LIMITS.projectName.max}
            onChange={(event) => setCloudName(event.currentTarget.value)}
            value={cloudName}
          />
          {showCloudValidation && cloudNameIssue && (
            <p className="cpu-field__error" role="alert">
              {copy.validation.nameError
                .replace("{min}", String(CLOUD_LIMITS.projectName.min))
                .replace("{max}", String(CLOUD_LIMITS.projectName.max))}
            </p>
          )}
        </div>

        <div className="cpu-fields-grid">
          <div className="cpu-field">
            <label htmlFor="cloud-field-server">{copy.cloud.fields.serverDevice}</label>
            <select
              disabled={isSaving}
              id="cloud-field-server"
              onChange={(event) => {
                const projectId = event.currentTarget.value;
                const project = state.deviceProjects.find((candidate) => candidate.id === projectId);
                const latest = project ? Math.max(...project.versions.map((version) => version.version)) : 1;
                setCloudConfiguration((current) => ({
                  ...current,
                  serverDeviceProjectId: projectId,
                  serverDeviceVersion: latest,
                }));
              }}
              value={cloudConfiguration.serverDeviceProjectId}
            >
              <option value="">{copy.optional}</option>
              {state.deviceProjects
                .filter((project) => project.configuration.type === "server")
                .map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
            </select>
          </div>

          <div className="cpu-field">
            <label htmlFor="cloud-field-server-version">{copy.cloud.fields.serverVersion}</label>
            <select
              disabled={isSaving || !cloudConfiguration.serverDeviceProjectId}
              id="cloud-field-server-version"
              onChange={(event) => updateCloud("serverDeviceVersion", Number(event.currentTarget.value))}
              value={String(cloudConfiguration.serverDeviceVersion)}
            >
              {(state.deviceProjects.find((project) => project.id === cloudConfiguration.serverDeviceProjectId)?.versions ?? [])
                .map((version) => (
                  <option key={version.version} value={version.version}>
                    {copy.versions.version} {version.version}
                  </option>
                ))}
            </select>
          </div>

          {([
            ["dataCenters", copy.cloud.fields.dataCenters, CLOUD_LIMITS.dataCenters],
            ["serversPerCenter", copy.cloud.fields.serversPerCenter, CLOUD_LIMITS.serversPerCenter],
            ["storageTb", copy.cloud.fields.storageTb, CLOUD_LIMITS.storageTb],
            ["networkGbps", copy.cloud.fields.networkGbps, CLOUD_LIMITS.networkGbps],
            ["aiAcceleratorUnits", copy.cloud.fields.aiAcceleratorUnits, CLOUD_LIMITS.aiAcceleratorUnits],
            ["redundancy", copy.cloud.fields.redundancy, CLOUD_LIMITS.redundancy],
          ] as const).map(([key, label, limits]) => (
            <div className="cpu-field" key={key}>
              <label htmlFor={`cloud-field-${key}`}>{label}</label>
              <input
                id={`cloud-field-${key}`}
                max={limits.max}
                min={limits.min}
                onChange={(event) => updateCloud(key, Number(event.currentTarget.value))}
                step={1}
                type="number"
                value={cloudConfiguration[key]}
              />
            </div>
          ))}
        </div>

        {cloudValidation.issues.length > 0 && (showCloudValidation || cloudDirty) && (
          <div className="device-validation device-validation--invalid" role="alert">
            <p><TriangleAlert aria-hidden="true" size={17} /> {copy.compatibility.invalid}</p>
            <ul>
              {cloudValidation.issues.map((issue, index) => (
                <li key={`${issue.code}-${issue.field ?? "general"}-${index}`}>{cloudIssueText(issue)}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="cpu-editor-actions">
          <button
            className="button button--primary"
            disabled={isSaving || !cloudDirty || !cloudValidation.valid || cloudNameIssue !== null}
            type="submit"
          >
            <Save aria-hidden="true" size={17} />
            {isSaving ? copy.savingVersion : copy.saveVersion}
          </button>
          <p className="field-hint">
            {!cloudDirty
              ? copy.noChanges
              : !cloudValidation.valid || cloudNameIssue
                ? copy.fixErrors
                : copy.saveVersionHint}
          </p>
        </div>
      </form>
    );
  }

  return (
    <div className="page-stack device-designer">
      <ProductWorkspaceTabs
        active="devices"
        aiLabel={t.productWorkspace.ai}
        componentsLabel={t.productWorkspace.components}
        cpuLabel={t.productWorkspace.cpu}
        devicesLabel={t.productWorkspace.devices}
        label={t.productWorkspace.label}
        onOpenAi={onOpenAi}
        onOpenComponents={onOpenComponents}
        onOpenCpu={onOpenCpu}
        onOpenDevices={() => undefined}
        onOpenOs={onOpenOs}
        osLabel={t.productWorkspace.os}
      />

      <section className="device-simulation-banner" role="note" aria-labelledby="device-simulation-title">
        <span className="device-simulation-banner__icon" aria-hidden="true"><Laptop size={24} /></span>
        <div>
          <p className="eyebrow">{locale === "ru" ? "ИГРОВАЯ МОДЕЛЬ" : "GAME MODEL"}</p>
          <h2 id="device-simulation-title">{copy.simulationTitle}</h2>
          <p>{copy.simulationText}</p>
        </div>
        <span className="status-pill device-simulation-banner__pill">
          <ShieldCheck aria-hidden="true" size={15} />
          {locale === "ru" ? "СИМУЛЯЦИЯ" : "SIMULATION"}
        </span>
      </section>

      <div className="segment-control device-workspace-tabs" role="tablist" aria-label={copy.tabs.label}>
        <button
          aria-selected={view === "device"}
          className={`segment-button${view === "device" ? " is-active" : ""}`}
          onClick={() => setView("device")}
          role="tab"
          type="button"
        >
          <Laptop aria-hidden="true" size={16} /> {copy.tabs.device}
        </button>
        <button
          aria-selected={view === "cloud"}
          className={`segment-button${view === "cloud" ? " is-active" : ""}`}
          onClick={() => setView("cloud")}
          role="tab"
          type="button"
        >
          <Cloud aria-hidden="true" size={16} /> {copy.tabs.cloud}
        </button>
      </div>

      {view === "device" ? (
        <>
          <section className="cpu-project-panel">
            <div className="cpu-project-panel__intro">
              <span className="cpu-project-panel__icon" aria-hidden="true"><Laptop size={21} /></span>
              <div>
                <h2>{copy.createTitle}</h2>
                <p>{copy.createHint}</p>
              </div>
            </div>

            <div className="cpu-project-panel__controls">
              {state.deviceProjects.length > 0 ? (
                <div className="cpu-field">
                  <label htmlFor="device-project-picker">{copy.projectsLabel}</label>
                  <select
                    disabled={isSaving}
                    id="device-project-picker"
                    onChange={(event) => requestDeviceSelection(event.currentTarget.value)}
                    value={selectedDeviceId ?? ""}
                  >
                    {state.deviceProjects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="cpu-projects-empty">{copy.projectsEmpty}</p>
              )}

              <form className="cpu-create-form" onSubmit={(event) => void handleCreateDevice(event)}>
                <div className="cpu-field">
                  <label htmlFor="device-new-type">{copy.fields.type}</label>
                  <select
                    disabled={isSaving}
                    id="device-new-type"
                    onChange={(event) => setNewDeviceType(event.currentTarget.value as DeviceType)}
                    value={newDeviceType}
                  >
                    {DEVICE_TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>{copy.deviceTypes[type]}</option>
                    ))}
                  </select>
                </div>
                <div className="cpu-field">
                  <label htmlFor="device-new-name">{copy.createName}</label>
                  <input
                    autoComplete="off"
                    id="device-new-name"
                    maxLength={DEVICE_LIMITS.projectName.max}
                    onChange={(event) => setNewDeviceName(event.currentTarget.value)}
                    value={newDeviceName}
                  />
                  <p className="cpu-field__hint">{copy.createNameHint}</p>
                  {showDeviceCreateValidation && newDeviceNameIssue && (
                    <p className="cpu-field__error" role="alert">
                      {copy.validation.nameError
                        .replace("{min}", String(DEVICE_LIMITS.projectName.min))
                        .replace("{max}", String(DEVICE_LIMITS.projectName.max))}
                    </p>
                  )}
                  {!suggestedDeviceValidation.valid && (
                    <p className="cpu-field__hint">{copy.prerequisites}</p>
                  )}
                </div>
                <button
                  className="button button--primary"
                  disabled={isSaving || draftIsDirty || !suggestedDeviceValidation.valid}
                  type="submit"
                >
                  <Laptop aria-hidden="true" size={17} />
                  {copy.createButton}
                </button>
                {draftIsDirty && <p className="cpu-create-form__guard">{copy.saveBeforeCreate}</p>}
              </form>
            </div>
          </section>

          {selectedDevice ? (
            <>
              {renderDeviceEditor()}
              {deviceMetrics && <DeviceMetricsPanel locale={locale} metrics={deviceMetrics} />}
              <DeviceVersionCompare locale={locale} project={selectedDevice} state={state} />
              <section className="cpu-version-section">
                <header className="cpu-version-section__heading">
                  <h2>{copy.versions.title}</h2>
                  <span className="status-pill">{selectedDevice.versions.length}</span>
                </header>
                <div className="cpu-version-list">
                  {[...selectedDevice.versions].reverse().map((version) => (
                    <article className="cpu-version-card" key={version.version}>
                      <div>
                        <strong>{copy.versions.version} {version.version}</strong>{" "}
                        <span>{version.savedOn}</span>
                      </div>
                      <button
                        className="button button--secondary cpu-version-card__button"
                        disabled={isSaving}
                        onClick={() => requestDeviceVersion(version.version)}
                        type="button"
                      >
                        {copy.versions.loadVersion}
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <section className="component-empty-state">
              <Laptop aria-hidden="true" size={28} />
              <h2>{copy.noProjectsTitle}</h2>
              <p>{copy.noProjectsHint}</p>
            </section>
          )}
        </>
      ) : (
        <>
          <section className="cpu-project-panel">
            <div className="cpu-project-panel__intro">
              <span className="cpu-project-panel__icon" aria-hidden="true"><Cloud size={21} /></span>
              <div>
                <h2>{copy.cloud.createTitle}</h2>
                <p>{copy.cloud.createHint}</p>
              </div>
            </div>

            <div className="cpu-project-panel__controls">
              {state.cloudProjects.length > 0 ? (
                <div className="cpu-field">
                  <label htmlFor="cloud-project-picker">{copy.projectsLabel}</label>
                  <select
                    disabled={isSaving}
                    id="cloud-project-picker"
                    onChange={(event) => requestCloudSelection(event.currentTarget.value)}
                    value={selectedCloudId ?? ""}
                  >
                    {state.cloudProjects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="cpu-projects-empty">{copy.cloud.projectsEmpty}</p>
              )}

              <form className="cpu-create-form" onSubmit={(event) => void handleCreateCloud(event)}>
                <div className="cpu-field">
                  <label htmlFor="cloud-new-name">{copy.createName}</label>
                  <input
                    autoComplete="off"
                    id="cloud-new-name"
                    maxLength={CLOUD_LIMITS.projectName.max}
                    onChange={(event) => setNewCloudName(event.currentTarget.value)}
                    value={newCloudName}
                  />
                  <p className="cpu-field__hint">{copy.createNameHint}</p>
                  {showCloudCreateValidation && newCloudNameIssue && (
                    <p className="cpu-field__error" role="alert">
                      {copy.validation.nameError
                        .replace("{min}", String(CLOUD_LIMITS.projectName.min))
                        .replace("{max}", String(CLOUD_LIMITS.projectName.max))}
                    </p>
                  )}
                  {!suggestedCloudValidation.valid && (
                    <p className="cpu-field__hint">{copy.cloud.prerequisites}</p>
                  )}
                </div>
                <button
                  className="button button--primary"
                  disabled={isSaving || draftIsDirty || !suggestedCloudValidation.valid}
                  type="submit"
                >
                  <Cloud aria-hidden="true" size={17} />
                  {copy.createButton}
                </button>
                {draftIsDirty && <p className="cpu-create-form__guard">{copy.saveBeforeCreate}</p>}
              </form>
            </div>
          </section>

          {selectedCloud ? (
            <>
              {renderCloudEditor()}
              {cloudMetrics && <CloudMetricsPanel locale={locale} metrics={cloudMetrics} />}
              <section className="cpu-version-section">
                <header className="cpu-version-section__heading">
                  <h2>{copy.versions.title}</h2>
                  <span className="status-pill">{selectedCloud.versions.length}</span>
                </header>
                <div className="cpu-version-list">
                  {[...selectedCloud.versions].reverse().map((version) => (
                    <article className="cpu-version-card" key={version.version}>
                      <div>
                        <strong>{copy.versions.version} {version.version}</strong>{" "}
                        <span>{version.savedOn}</span>
                      </div>
                      <button
                        className="button button--secondary cpu-version-card__button"
                        disabled={isSaving}
                        onClick={() => requestCloudVersion(version.version)}
                        type="button"
                      >
                        {copy.versions.loadVersion}
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <section className="component-empty-state">
              <Cloud aria-hidden="true" size={28} />
              <h2>{copy.cloud.noProjectsTitle}</h2>
              <p>{copy.cloud.noProjectsHint}</p>
            </section>
          )}
        </>
      )}

      {pendingAction && (
        <ConfirmationBottomSheet
          cancelLabel={copy.unsavedCancel}
          confirmLabel={copy.unsavedConfirm}
          message={copy.unsavedMessage}
          onCancel={() => setPendingAction(null)}
          onConfirm={confirmPendingAction}
          title={copy.unsavedTitle}
        />
      )}
    </div>
  );
}

function DeviceValidationPanel({
  issues,
  show,
  texts,
  title,
  hint,
  validLabel,
  issueText,
}: {
  issues: DeviceValidationIssue[];
  show: boolean;
  texts: { valid: string; invalid: string };
  title: string;
  hint: string;
  validLabel: string;
  issueText: (issue: DeviceValidationIssue) => string;
}) {
  return (
    <section className="device-validation-section">
      <header>
        <div>
          <h3>{title}</h3>
          <p>{hint}</p>
        </div>
        <span className={`status-pill${issues.length === 0 ? " os-status-pill--ok" : ""}`}>
          {issues.length === 0 ? validLabel : texts.invalid}
        </span>
      </header>
      {show && issues.length > 0 && (
        <div className="device-validation device-validation--invalid" role="alert">
          <ul>
            {issues.map((issue, index) => (
              <li key={`${issue.code}-${issue.field ?? "general"}-${index}`}>
                <TriangleAlert aria-hidden="true" size={15} /> {issueText(issue)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {show && issues.length === 0 && (
        <p className="device-validation device-validation--ok">
          <CheckCircle2 aria-hidden="true" size={16} /> {texts.valid}
        </p>
      )}
    </section>
  );
}

function DeviceMetricsPanel({
  locale,
  metrics,
}: {
  locale: GameState["settings"]["locale"];
  metrics: DeviceMetrics;
}) {
  const copy = translations[locale].devices;
  return (
    <section className="device-metrics-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{copy.metrics.eyebrow}</p>
          <h2>{copy.metrics.title}</h2>
        </div>
      </div>
      <div className="metrics-grid">
        <MetricCard accent="blue" icon={Laptop} label={copy.metrics.overall} value={formatDecimal(metrics.overallScore, locale, 1)} detail={copy.metrics.scoreHint} />
        <MetricCard accent="violet" icon={CheckCircle2} label={copy.metrics.performance} value={formatDecimal(metrics.performanceScore, locale, 1)} detail={copy.metrics.scoreHint} />
        <MetricCard accent="green" icon={ShieldCheck} label={copy.metrics.appeal} value={formatDecimal(metrics.appealScore, locale, 1)} detail={copy.metrics.scoreHint} />
        <MetricCard accent="amber" icon={TriangleAlert} label={copy.metrics.compatibility} value={formatDecimal(metrics.compatibilityScore, locale, 1)} detail={copy.metrics.scoreHint} />
      </div>
      <dl className="os-metric-list">
        {([
          ["gaming", metrics.gamingScore],
          ["productivity", metrics.productivityScore],
          ["efficiency", metrics.efficiencyScore],
          ["reliability", metrics.reliabilityScore],
          ["osIntegration", metrics.osIntegrationScore],
          ["aiCapability", metrics.aiCapabilityScore],
          ["synergy", metrics.ecosystemSynergyScore],
        ] as const).map(([key, value]) => (
          <div className="os-metric-row" key={key}>
            <dt>{copy.metrics[key]}</dt>
            <dd>{formatDecimal(value, locale, 1)}</dd>
          </div>
        ))}
        <div className="os-metric-row">
          <dt>{copy.metrics.unitCost}</dt>
          <dd>{formatCurrency(metrics.unitCostUsd, locale)}</dd>
        </div>
        <div className="os-metric-row">
          <dt>{copy.metrics.power}</dt>
          <dd>{formatDecimal(metrics.powerW, locale, 1)} {copy.units.watt}</dd>
        </div>
        <div className="os-metric-row">
          <dt>{copy.metrics.thermalLoad}</dt>
          <dd>{formatDecimal(metrics.thermalLoad, locale, 1)}%</dd>
        </div>
        <div className="os-metric-row">
          <dt>{copy.metrics.memory}</dt>
          <dd>{formatNumber(metrics.memoryGb, locale)} {copy.units.gb}</dd>
        </div>
        <div className="os-metric-row">
          <dt>{copy.metrics.storage}</dt>
          <dd>{formatNumber(metrics.storageGb, locale)} {copy.units.gb}</dd>
        </div>
      </dl>
    </section>
  );
}

function CloudMetricsPanel({
  locale,
  metrics,
}: {
  locale: GameState["settings"]["locale"];
  metrics: CloudMetrics;
}) {
  const copy = translations[locale].devices;
  return (
    <section className="device-metrics-section cloud-metrics-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{copy.cloud.metrics.eyebrow}</p>
          <h2>{copy.cloud.metrics.title}</h2>
        </div>
      </div>
      <div className="metrics-grid">
        <MetricCard accent="blue" icon={Cloud} label={copy.cloud.metrics.capacity} value={formatDecimal(metrics.capacityScore, locale, 1)} detail={copy.metrics.scoreHint} />
        <MetricCard accent="green" icon={ShieldCheck} label={copy.cloud.metrics.availability} value={`${formatDecimal(metrics.availability, locale, 2)}%`} detail={copy.metrics.scoreHint} />
        <MetricCard accent="violet" icon={CheckCircle2} label={copy.cloud.metrics.overall} value={formatDecimal(metrics.overallScore, locale, 1)} detail={copy.metrics.scoreHint} />
        <MetricCard accent="amber" icon={TriangleAlert} label={copy.cloud.metrics.operatingCost} value={`${formatCurrency(metrics.operatingCostPerDayUsd, locale)}${copy.cloud.metrics.perDay}`} detail={copy.cloud.metrics.perDay} />
      </div>
      <dl className="os-metric-list">
        {([
          ["computeUnits", metrics.computeUnits],
          ["memoryTb", metrics.memoryTb],
          ["storageTb", metrics.storageTb],
          ["aiTflops", metrics.aiTflops],
          ["networkGbps", metrics.networkGbps],
          ["efficiency", metrics.efficiency],
        ] as const).map(([key, value]) => (
          <div className="os-metric-row" key={key}>
            <dt>{copy.cloud.metrics[key]}</dt>
            <dd>{formatNumber(value, locale)}</dd>
          </div>
        ))}
        <div className="os-metric-row">
          <dt>{copy.cloud.metrics.capex}</dt>
          <dd>{formatCurrency(metrics.capexUsd, locale)}</dd>
        </div>
      </dl>
    </section>
  );
}

function safeDeviceMetrics(
  configuration: DeviceConfiguration,
  context: Parameters<typeof calculateDeviceMetrics>[1],
): DeviceMetrics | null {
  try {
    return calculateDeviceMetrics(configuration, context);
  } catch {
    return null;
  }
}

function safeCloudMetrics(
  configuration: CloudConfiguration,
  context: Parameters<typeof calculateCloudMetrics>[1],
): CloudMetrics | null {
  try {
    return calculateCloudMetrics(configuration, context);
  } catch {
    return null;
  }
}
