import { useEffect, useState, type FormEvent } from "react";
import {
  Activity,
  Boxes,
  CheckCircle2,
  Cpu,
  Gamepad2,
  HardDrive,
  MonitorCog,
  Save,
  ShieldCheck,
  Timer,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { ConfirmationBottomSheet } from "../../components/ConfirmationBottomSheet";
import { MetricCard } from "../../components/MetricCard";
import { ProductWorkspaceTabs } from "../../components/ProductWorkspaceTabs";
import {
  OS_ADDRESS_BIT_OPTIONS,
  OS_API_OPTIONS,
  OS_APP_STORE_OPTIONS,
  OS_ARCHITECTURE_OPTIONS,
  OS_BOOTLOADER_OPTIONS,
  OS_DEVELOPER_TOOLS_OPTIONS,
  OS_DIAGNOSTICS_OPTIONS,
  OS_DRIVER_FRAMEWORK_OPTIONS,
  OS_DRIVER_MODEL_OPTIONS,
  OS_ENCRYPTION_OPTIONS,
  OS_FILESYSTEM_OPTIONS,
  OS_GUI_OPTIONS,
  OS_IPC_OPTIONS,
  OS_KERNEL_OPTIONS,
  OS_LIMITS,
  OS_MEMORY_MANAGER_OPTIONS,
  OS_MODULE_SUPPORT_OPTIONS,
  OS_NETWORK_STACK_OPTIONS,
  OS_PACKAGE_MANAGER_OPTIONS,
  OS_PERMISSION_MODEL_OPTIONS,
  OS_PLATFORM_OPTIONS,
  OS_PLATFORM_PROFILE_OPTIONS,
  OS_PROCESS_LIMITS_BY_ADDRESS_BITS,
  OS_SCHEDULER_OPTIONS,
  OS_SDK_OPTIONS,
  OS_UPDATE_MODEL_OPTIONS,
  checkOsHardwareCompatibility,
  cloneOsConfiguration,
  createDefaultOsConfiguration,
  createOsPlatformProfileConfiguration,
  osConfigurationsEqual,
  validateOsConfiguration,
  validateOsProjectName,
  type OsAddressBits,
  type OsApi,
  type OsAppStore,
  type OsBootloader,
  type OsConfiguration,
  type OsConfigurationField,
  type OsDeveloperTools,
  type OsDiagnostics,
  type OsDriverFramework,
  type OsDriverModel,
  type OsEncryption,
  type OsFilesystem,
  type OsGui,
  type OsHardwareTarget,
  type OsIpcModel,
  type OsKernelType,
  type OsMemoryManager,
  type OsModuleSupport,
  type OsNetworkStack,
  type OsPackageManager,
  type OsPermissionModel,
  type OsPlatform,
  type OsPlatformProfile,
  type OsScheduler,
  type OsSdk,
  type OsUpdateModel,
  type OsValidationIssue,
} from "../../game/models/os";
import {
  calculateOsEcosystemMetrics,
  calculateOsKernelMetrics,
  evaluateOsRequirements,
  getNextOsReleaseStage,
  type OsEcosystemMetrics,
  type OsKernelMetrics,
  type OsRequirementMetric,
  type OsRequirementResult,
} from "../../game/formulas/os";
import {
  OS_APPLICATION_CATALOG,
  checkOsApplicationCompatibility,
  type OsApplicationCompatibility,
} from "../../game/models/os-applications";
import type { GameState } from "../../game/models/game-state";
import type { OsProject } from "../../game/models/os";
import { formatCurrency, formatDecimal, formatNumber } from "../../localization/formatters";
import { translations } from "../../localization/messages";

interface OsDesignerPageProps {
  state: GameState;
  isSaving: boolean;
  onDirtyChange: (isDirty: boolean) => void;
  onCreateProject: (name: string, configuration: OsConfiguration) => Promise<string | null>;
  onSaveVersion: (projectId: string, name: string, configuration: OsConfiguration) => Promise<boolean>;
  onStartRelease?: (projectId: string) => Promise<boolean>;
  onAdvanceRelease?: (projectId: string, releaseId: string) => Promise<boolean>;
  onOpenCpu: () => void;
  onOpenComponents: () => void;
}

type PendingAction =
  | { type: "switch-project"; projectId: string }
  | { type: "load-version"; version: number };

type SelectFieldKey =
  | "targetPlatform"
  | "kernelType"
  | "bootloader"
  | "scheduler"
  | "memoryManager"
  | "ipcModel"
  | "moduleSupport"
  | "driverModel"
  | "addressBits"
  | "filesystem"
  | "driverFramework"
  | "networkStack"
  | "permissions"
  | "encryption"
  | "updateModel"
  | "packageManager"
  | "diagnostics"
  | "gui"
  | "sdk"
  | "api"
  | "developerTools"
  | "appStore";

interface SelectOption {
  value: string;
  label: string;
}

export function OsDesignerPage({
  state,
  isSaving,
  onDirtyChange,
  onCreateProject,
  onSaveVersion,
  onStartRelease,
  onAdvanceRelease,
  onOpenCpu,
  onOpenComponents,
}: OsDesignerPageProps) {
  const locale = state.settings.locale;
  const t = translations[locale];
  const copy = t.os;
  const currentYear = Number(state.gameDate.slice(0, 4));
  const firstProject = state.osProjects[0] ?? null;
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(firstProject?.id ?? null);
  const selectedProject = state.osProjects.find((project) => project.id === selectedProjectId) ?? null;
  const [draftName, setDraftName] = useState(firstProject?.name ?? "");
  const [draftConfiguration, setDraftConfiguration] = useState<OsConfiguration>(() =>
    firstProject ? cloneOsConfiguration(firstProject.configuration) : createDefaultOsConfiguration(),
  );
  const [newProjectName, setNewProjectName] = useState("");
  const [showCreateValidation, setShowCreateValidation] = useState(false);
  const [showEditorValidation, setShowEditorValidation] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  const draftIsDirty = Boolean(
    selectedProject
      && (draftName.trim() !== selectedProject.name
        || !osConfigurationsEqual(draftConfiguration, selectedProject.configuration)),
  );
  const createNameIssue = validateOsProjectName(newProjectName);
  const editorNameIssue = validateOsProjectName(draftName);
  const configurationValidation = validateOsConfiguration(draftConfiguration, { currentYear });
  const editorIsValid = configurationValidation.valid && editorNameIssue === null;
  const metrics = (() => {
    try {
      return calculateOsKernelMetrics(draftConfiguration);
    } catch {
      return null;
    }
  })();
  const requirements = metrics
    ? evaluateOsRequirements(draftConfiguration, metrics)
    : [];
  const ecosystemMetrics = metrics
    ? calculateOsEcosystemMetrics(draftConfiguration, metrics)
    : null;
  const applicationCompatibility = metrics
    ? checkOsApplicationCompatibility(draftConfiguration, {
        memoryFootprintMb: metrics.memoryFootprintMb,
        securityScore: metrics.securityScore,
      })
    : [];
  const compatibilityTargets = buildHardwareTargets(state);

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

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowCreateValidation(true);
    if (createNameIssue || draftIsDirty) {
      return;
    }

    const initialConfiguration = createDefaultOsConfiguration();
    const projectId = await onCreateProject(newProjectName.trim(), initialConfiguration);
    if (!projectId) {
      return;
    }

    setSelectedProjectId(projectId);
    setDraftName(newProjectName.trim());
    setDraftConfiguration(initialConfiguration);
    setNewProjectName("");
    setShowCreateValidation(false);
    setShowEditorValidation(false);
  }

  function loadProject(projectId: string) {
    const project = state.osProjects.find((candidate) => candidate.id === projectId);
    if (!project) {
      return;
    }

    setSelectedProjectId(project.id);
    setDraftName(project.name);
    setDraftConfiguration(cloneOsConfiguration(project.configuration));
    setShowEditorValidation(false);
    setPendingAction(null);
  }

  function handleProjectSelection(projectId: string) {
    if (projectId === selectedProjectId) {
      return;
    }
    if (draftIsDirty) {
      setPendingAction({ type: "switch-project", projectId });
      return;
    }
    loadProject(projectId);
  }

  function requestLoadVersion(versionNumber: number) {
    if (draftIsDirty) {
      setPendingAction({ type: "load-version", version: versionNumber });
      return;
    }
    loadVersion(versionNumber);
  }

  function loadVersion(versionNumber: number) {
    if (!selectedProject) {
      return;
    }
    const version = selectedProject.versions.find((entry) => entry.version === versionNumber);
    if (!version) {
      return;
    }
    setDraftConfiguration(cloneOsConfiguration(version.configuration));
    setShowEditorValidation(false);
    setPendingAction(null);
  }

  function confirmPendingAction() {
    if (!pendingAction) {
      return;
    }
    if (pendingAction.type === "switch-project") {
      loadProject(pendingAction.projectId);
      return;
    }
    loadVersion(pendingAction.version);
  }

  function applyPlatformProfile(profile: OsPlatformProfile) {
    setDraftConfiguration(createOsPlatformProfileConfiguration(profile));
    setShowEditorValidation(false);
    setReleaseError(null);
  }

  async function handleStartRelease() {
    if (!selectedProject || !onStartRelease) {
      return;
    }
    setReleaseError(null);
    const succeeded = await onStartRelease(selectedProject.id);
    if (!succeeded) {
      setReleaseError(copy.releases.error);
    }
  }

  async function handleAdvanceRelease(releaseId: string) {
    if (!selectedProject || !onAdvanceRelease) {
      return;
    }
    setReleaseError(null);
    const succeeded = await onAdvanceRelease(selectedProject.id, releaseId);
    if (!succeeded) {
      setReleaseError(copy.releases.error);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowEditorValidation(true);
    if (!selectedProject || !editorIsValid || !draftIsDirty) {
      return;
    }
    await onSaveVersion(selectedProject.id, draftName.trim(), draftConfiguration);
  }

  function updateField(key: OsConfigurationField, value: OsConfiguration[OsConfigurationField]) {
    setDraftConfiguration((current) => ({ ...current, [key]: value }));
  }

  const fieldError = (key: OsConfigurationField): OsValidationIssue | undefined =>
    (showEditorValidation || draftIsDirty) ? configurationValidation.errors[key] : undefined;

  function selectOptions(key: SelectFieldKey): SelectOption[] {
    switch (key) {
      case "targetPlatform":
        return OS_PLATFORM_OPTIONS.map((value) => ({
          value,
          label: copy.options.targetPlatform[value],
        }));
      case "kernelType":
        return OS_KERNEL_OPTIONS.map((value) => ({
          value,
          label: copy.options.kernelType[value],
        }));
      case "bootloader":
        return OS_BOOTLOADER_OPTIONS.map((value) => ({
          value,
          label: copy.options.bootloader[value],
        }));
      case "scheduler":
        return OS_SCHEDULER_OPTIONS.map((value) => ({
          value,
          label: copy.options.scheduler[value],
        }));
      case "memoryManager":
        return OS_MEMORY_MANAGER_OPTIONS.map((value) => ({
          value,
          label: copy.options.memoryManager[value],
        }));
      case "ipcModel":
        return OS_IPC_OPTIONS.map((value) => ({
          value,
          label: copy.options.ipcModel[value],
        }));
      case "moduleSupport":
        return OS_MODULE_SUPPORT_OPTIONS.map((value) => ({
          value,
          label: copy.options.moduleSupport[value],
        }));
      case "driverModel":
        return OS_DRIVER_MODEL_OPTIONS.map((value) => ({
          value,
          label: copy.options.driverModel[value],
        }));
      case "filesystem":
        return OS_FILESYSTEM_OPTIONS.map((value) => ({
          value,
          label: copy.options.filesystem[value],
        }));
      case "driverFramework":
        return OS_DRIVER_FRAMEWORK_OPTIONS.map((value) => ({
          value,
          label: copy.options.driverFramework[value],
        }));
      case "networkStack":
        return OS_NETWORK_STACK_OPTIONS.map((value) => ({
          value,
          label: copy.options.networkStack[value],
        }));
      case "permissions":
        return OS_PERMISSION_MODEL_OPTIONS.map((value) => ({
          value,
          label: copy.options.permissions[value],
        }));
      case "encryption":
        return OS_ENCRYPTION_OPTIONS.map((value) => ({
          value,
          label: copy.options.encryption[value],
        }));
      case "updateModel":
        return OS_UPDATE_MODEL_OPTIONS.map((value) => ({
          value,
          label: copy.options.updateModel[value],
        }));
      case "packageManager":
        return OS_PACKAGE_MANAGER_OPTIONS.map((value) => ({
          value,
          label: copy.options.packageManager[value],
        }));
      case "diagnostics":
        return OS_DIAGNOSTICS_OPTIONS.map((value) => ({
          value,
          label: copy.options.diagnostics[value],
        }));
      case "gui":
        return OS_GUI_OPTIONS.map((value) => ({
          value,
          label: copy.options.gui[value],
        }));
      case "sdk":
        return OS_SDK_OPTIONS.map((value) => ({
          value,
          label: copy.options.sdk[value],
        }));
      case "api":
        return OS_API_OPTIONS.map((value) => ({
          value,
          label: copy.options.api[value],
        }));
      case "developerTools":
        return OS_DEVELOPER_TOOLS_OPTIONS.map((value) => ({
          value,
          label: copy.options.developerTools[value],
        }));
      case "appStore":
        return OS_APP_STORE_OPTIONS.map((value) => ({
          value,
          label: copy.options.appStore[value],
        }));
      case "addressBits":
        return OS_ADDRESS_BIT_OPTIONS.map((value) => ({
          value: String(value),
          label: `${value}-bit`,
        }));
    }
  }

  function selectValue(key: SelectFieldKey): string {
    if (key === "addressBits") {
      return String(draftConfiguration.addressBits);
    }
    return String(draftConfiguration[key]);
  }

  function updateSelect(key: SelectFieldKey, value: string) {
    switch (key) {
      case "targetPlatform":
        updateField("targetPlatform", value as OsPlatform);
        return;
      case "kernelType":
        updateField("kernelType", value as OsKernelType);
        return;
      case "bootloader":
        updateField("bootloader", value as OsBootloader);
        return;
      case "scheduler":
        updateField("scheduler", value as OsScheduler);
        return;
      case "memoryManager":
        updateField("memoryManager", value as OsMemoryManager);
        return;
      case "ipcModel":
        updateField("ipcModel", value as OsIpcModel);
        return;
      case "moduleSupport":
        updateField("moduleSupport", value as OsModuleSupport);
        return;
      case "driverModel":
        updateField("driverModel", value as OsDriverModel);
        return;
      case "filesystem":
        updateField("filesystem", value as OsFilesystem);
        return;
      case "driverFramework":
        updateField("driverFramework", value as OsDriverFramework);
        return;
      case "networkStack":
        updateField("networkStack", value as OsNetworkStack);
        return;
      case "permissions":
        updateField("permissions", value as OsPermissionModel);
        return;
      case "encryption":
        updateField("encryption", value as OsEncryption);
        return;
      case "updateModel":
        updateField("updateModel", value as OsUpdateModel);
        return;
      case "packageManager":
        updateField("packageManager", value as OsPackageManager);
        return;
      case "diagnostics":
        updateField("diagnostics", value as OsDiagnostics);
        return;
      case "gui":
        updateField("gui", value as OsGui);
        return;
      case "sdk":
        updateField("sdk", value as OsSdk);
        return;
      case "api":
        updateField("api", value as OsApi);
        return;
      case "developerTools":
        updateField("developerTools", value as OsDeveloperTools);
        return;
      case "appStore":
        updateField("appStore", value as OsAppStore);
        return;
      case "addressBits":
        updateField("addressBits", Number(value) as OsAddressBits);
        return;
    }
  }

  function validationText(error: OsValidationIssue): string {
    switch (error.code) {
      case "invalid-option":
        return copy.validation.invalidOption;
      case "integer":
        return copy.validation.integer
          .replace("{min}", formatNumber(error.min, locale))
          .replace("{max}", formatNumber(error.max, locale));
      case "empty-selection":
        return copy.validation.selectAtLeastOne;
      case "duplicate-option":
        return copy.validation.duplicateOption;
      case "future-technology":
        return copy.validation.futureTechnology.replace("{year}", String(error.minYear));
      case "virtual-memory-requires-paging":
        return copy.validation.virtualMemoryRequiresPaging;
      case "microkernel-ipc":
        return copy.validation.microkernelIpc;
      case "microkernel-drivers":
        return copy.validation.microkernelDrivers;
      case "monolithic-user-drivers":
        return copy.validation.monolithicUserDrivers;
      case "user-space-modules-require-microkernel":
        return copy.validation.userSpaceModulesRequireMicrokernel;
      case "modular-requires-modules":
        return copy.validation.modularRequiresModules;
      case "process-limit":
        return copy.validation.processLimit
          .replace("{bits}", String(draftConfiguration.addressBits))
          .replace("{max}", formatNumber(error.max, locale));
      case "filesystem-requires-64-bit":
        return copy.validation.filesystemRequires64Bit;
      case "encryption-requires-security":
        return copy.validation.encryptionRequiresSecurity;
      case "rolling-updates-require-package-manager":
        return copy.validation.rollingUpdatesRequirePackageManager;
      case "app-store-requires-sdk":
        return copy.validation.appStoreRequiresSdk;
      case "developer-tools-require-sdk":
        return copy.validation.developerToolsRequireSdk;
      case "suite-requires-full-sdk":
        return copy.validation.suiteRequiresFullSdk;
      case "web-api-requires-network":
        return copy.validation.webApiRequiresNetwork;
    }
  }

  function renderSelectField(key: SelectFieldKey) {
    const error = fieldError(key);
    return (
      <div className="cpu-field" key={key}>
        <label htmlFor={`os-field-${key}`}>{copy.fields[key]}</label>
        <select
          aria-invalid={Boolean(error)}
          disabled={isSaving}
          id={`os-field-${key}`}
          onChange={(event) => updateSelect(key, event.currentTarget.value)}
          value={selectValue(key)}
        >
          {selectOptions(key).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {error && <p className="cpu-field__error" role="alert">{validationText(error)}</p>}
      </div>
    );
  }

  return (
    <div className="page-stack os-designer">
      <ProductWorkspaceTabs
        active="os"
        componentsLabel={t.productWorkspace.components}
        cpuLabel={t.productWorkspace.cpu}
        label={t.productWorkspace.label}
        onOpenComponents={onOpenComponents}
        onOpenCpu={onOpenCpu}
        onOpenOs={() => undefined}
        osLabel={t.productWorkspace.os}
      />

      <section className="os-simulation-banner" role="note" aria-labelledby="os-simulation-title">
        <span className="os-simulation-banner__icon" aria-hidden="true"><Gamepad2 size={24} /></span>
        <div>
          <p className="eyebrow">{t.app.era === "ХРОНОЛОГИЯ" ? "ИГРОВАЯ МОДЕЛЬ" : "GAME MODEL"}</p>
          <h2 id="os-simulation-title">{copy.simulationTitle}</h2>
          <p>{copy.simulationText}</p>
        </div>
        <span className="status-pill os-simulation-banner__pill">
          <MonitorCog aria-hidden="true" size={15} />
          {locale === "ru" ? "СИМУЛЯЦИЯ" : "SIMULATION"}
        </span>
      </section>

      <section className="cpu-project-panel">
        <div className="cpu-project-panel__intro">
          <span className="cpu-project-panel__icon" aria-hidden="true"><MonitorCog size={21} /></span>
          <div>
            <h2>{copy.createTitle}</h2>
            <p>{copy.createHint}</p>
          </div>
        </div>

        <div className="cpu-project-panel__controls">
          {state.osProjects.length > 0 ? (
            <div className="cpu-field">
              <label htmlFor="os-project-picker">{copy.projectsLabel}</label>
              <select
                disabled={isSaving}
                id="os-project-picker"
                onChange={(event) => handleProjectSelection(event.currentTarget.value)}
                value={selectedProjectId ?? ""}
              >
                {state.osProjects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <p className="cpu-projects-empty">{copy.projectsEmpty}</p>
          )}

          <form className="cpu-create-form" onSubmit={(event) => void handleCreateProject(event)}>
            <div className="cpu-field">
              <label htmlFor="os-new-project-name">{copy.createName}</label>
              <input
                autoComplete="off"
                id="os-new-project-name"
                maxLength={OS_LIMITS.projectName.max}
                onChange={(event) => setNewProjectName(event.currentTarget.value)}
                value={newProjectName}
              />
              <p className="cpu-field__hint">{copy.createNameHint}</p>
              {showCreateValidation && createNameIssue && (
                <p className="cpu-field__error" role="alert">
                  {copy.validation.nameError
                    .replace("{min}", String(OS_LIMITS.projectName.min))
                    .replace("{max}", String(OS_LIMITS.projectName.max))}
                </p>
              )}
            </div>
            <button
              className="button button--primary"
              disabled={isSaving || draftIsDirty}
              type="submit"
            >
              <MonitorCog aria-hidden="true" size={17} />
              {copy.createButton}
            </button>
            {draftIsDirty && <p className="cpu-create-form__guard">{copy.saveBeforeCreate}</p>}
          </form>
        </div>
      </section>

      {selectedProject ? (
        <>
          <form className="cpu-editor-card os-editor-card" onSubmit={(event) => void handleSave(event)}>
            <header className="cpu-editor-card__header">
              <div>
                <p className="eyebrow">{copy.editorEyebrow}</p>
                <h2>{selectedProject.name}</h2>
                <p>{copy.editorHint}</p>
              </div>
              <span className="status-pill">
                {copy.options.kernelType[draftConfiguration.kernelType]}
              </span>
            </header>

            <div className="os-profile-picker">
              <div>
                <strong>{copy.profiles.title}</strong>
                <p>{copy.profiles.hint}</p>
              </div>
              <div className="os-profile-picker__buttons" role="group" aria-label={copy.profiles.title}>
                {OS_PLATFORM_PROFILE_OPTIONS.map((profile) => (
                  <button
                    aria-pressed={draftConfiguration.targetPlatform === profile}
                    className="segment-button"
                    disabled={isSaving}
                    key={profile}
                    onClick={() => applyPlatformProfile(profile)}
                    type="button"
                  >
                    {copy.profiles[profile]}
                  </button>
                ))}
              </div>
            </div>

            <div className="cpu-field">
              <label htmlFor="os-project-name">{copy.projectName}</label>
              <input
                autoComplete="off"
                id="os-project-name"
                maxLength={OS_LIMITS.projectName.max}
                onChange={(event) => setDraftName(event.currentTarget.value)}
                value={draftName}
              />
              {showEditorValidation && editorNameIssue && (
                <p className="cpu-field__error" role="alert">
                  {copy.validation.nameError
                    .replace("{min}", String(OS_LIMITS.projectName.min))
                    .replace("{max}", String(OS_LIMITS.projectName.max))}
                </p>
              )}
            </div>

            <div className="cpu-fields-grid">
              {renderSelectField("targetPlatform")}
              {renderSelectField("kernelType")}
              {renderSelectField("bootloader")}
              {renderSelectField("scheduler")}
              {renderSelectField("memoryManager")}
              {renderSelectField("ipcModel")}
              {renderSelectField("moduleSupport")}
              {renderSelectField("driverModel")}
              {renderSelectField("addressBits")}

              <label className="component-checkbox-field" htmlFor="os-field-virtual-memory">
                <input
                  checked={draftConfiguration.virtualMemory}
                  id="os-field-virtual-memory"
                  onChange={(event) => updateField("virtualMemory", event.currentTarget.checked)}
                  type="checkbox"
                />
                <span>{copy.fields.virtualMemory}</span>
              </label>

              <div className="cpu-field">
                <label htmlFor="os-field-syscall-count">{copy.fields.syscallCount}</label>
                <input
                  aria-invalid={Boolean(fieldError("syscallCount"))}
                  id="os-field-syscall-count"
                  max={OS_LIMITS.syscallCount.max}
                  min={OS_LIMITS.syscallCount.min}
                  onChange={(event) => updateField("syscallCount", Number(event.currentTarget.value))}
                  step={1}
                  type="number"
                  value={draftConfiguration.syscallCount}
                />
                {fieldError("syscallCount") && (
                  <p className="cpu-field__error" role="alert">{validationText(fieldError("syscallCount")!)}</p>
                )}
              </div>

              <div className="cpu-field">
                <label htmlFor="os-field-max-processes">{copy.fields.maxProcesses}</label>
                <input
                  aria-invalid={Boolean(fieldError("maxProcesses"))}
                  id="os-field-max-processes"
                  max={OS_LIMITS.maxProcesses.max}
                  min={OS_LIMITS.maxProcesses.min}
                  onChange={(event) => updateField("maxProcesses", Number(event.currentTarget.value))}
                  step={1}
                  type="number"
                  value={draftConfiguration.maxProcesses}
                />
                <p className="cpu-field__hint">
                  {copy.units.processes}: 1 — {formatNumber(OS_PROCESS_LIMITS_BY_ADDRESS_BITS[draftConfiguration.addressBits], locale)}
                </p>
                {fieldError("maxProcesses") && (
                  <p className="cpu-field__error" role="alert">{validationText(fieldError("maxProcesses")!)}</p>
                )}
              </div>
            </div>

            <fieldset className="component-multiselect-field os-architecture-field">
              <legend>{copy.fields.supportedArchitectures}</legend>
              <div>
                {OS_ARCHITECTURE_OPTIONS.map((architecture) => (
                  <label key={architecture}>
                    <input
                      checked={draftConfiguration.supportedArchitectures.includes(architecture)}
                      onChange={(event) => {
                        const next = event.currentTarget.checked
                          ? [...draftConfiguration.supportedArchitectures, architecture]
                          : draftConfiguration.supportedArchitectures.filter((candidate) => candidate !== architecture);
                        updateField("supportedArchitectures", next);
                      }}
                      type="checkbox"
                    />
                    <span>{architecture.toUpperCase()}</span>
                  </label>
                ))}
              </div>
              {fieldError("supportedArchitectures") && (
                <p className="cpu-field__error" role="alert">
                  {validationText(fieldError("supportedArchitectures")!)}
                </p>
              )}
            </fieldset>

            <fieldset className="os-systems-fieldset">
              <legend>{copy.systemsTitle}</legend>
              <p className="os-systems-fieldset__hint">{copy.systemsHint}</p>
              <div className="cpu-fields-grid">
                {renderSelectField("filesystem")}
                {renderSelectField("driverFramework")}
                {renderSelectField("networkStack")}
                {renderSelectField("permissions")}
                {renderSelectField("encryption")}
                {renderSelectField("updateModel")}
                {renderSelectField("packageManager")}
                {renderSelectField("diagnostics")}
              </div>
            </fieldset>

            <fieldset className="os-systems-fieldset os-ecosystem-fieldset">
              <legend>{copy.ecosystemTitle}</legend>
              <p className="os-systems-fieldset__hint">{copy.ecosystemHint}</p>
              <div className="cpu-fields-grid">
                {renderSelectField("gui")}
                {renderSelectField("sdk")}
                {renderSelectField("api")}
                {renderSelectField("developerTools")}
                {renderSelectField("appStore")}
              </div>
            </fieldset>

            <div className="cpu-editor-actions">
              <button
                className="button button--primary"
                disabled={isSaving || !draftIsDirty || !editorIsValid}
                type="submit"
              >
                <Save aria-hidden="true" size={17} />
                {isSaving ? copy.savingVersion : copy.saveVersion}
              </button>
              <p className="field-hint">
                {!draftIsDirty
                  ? copy.noChanges
                  : !editorIsValid
                    ? copy.fixErrors
                    : copy.saveVersionHint}
              </p>
            </div>
          </form>

          {metrics && ecosystemMetrics && (
            <MetricsPanel
              ecosystem={ecosystemMetrics}
              metrics={metrics}
              locale={locale}
            />
          )}

          {metrics && (
            <RequirementsPanel
              requirements={requirements}
              locale={locale}
            />
          )}

          <CompatibilityPanel
            configuration={draftConfiguration}
            locale={locale}
            targets={compatibilityTargets}
          />

          <ApplicationCompatibilityPanel
            locale={locale}
            results={applicationCompatibility}
          />

          <section className="cpu-version-section">
            <header className="cpu-version-section__heading">
              <h2>{copy.versions.title}</h2>
              <span className="status-pill">{selectedProject.versions.length}</span>
            </header>
            <div className="cpu-version-list">
              {[...selectedProject.versions].reverse().map((version) => (
                <article className="cpu-version-card" key={version.version}>
                  <div>
                    <strong>{copy.versions.version} {version.version}</strong>{" "}
                    <span>{version.savedOn}</span>
                  </div>
                  <button
                    className="button button--secondary cpu-version-card__button"
                    disabled={isSaving}
                    onClick={() => requestLoadVersion(version.version)}
                    type="button"
                  >
                    {copy.versions.loadVersion}
                  </button>
                </article>
              ))}
            </div>
          </section>

          <ReleasePanel
            error={releaseError}
            isSaving={isSaving}
            locale={locale}
            onAdvanceRelease={onAdvanceRelease ? (releaseId) => void handleAdvanceRelease(releaseId) : undefined}
            onStartRelease={onStartRelease ? () => void handleStartRelease() : undefined}
            project={selectedProject}
          />
        </>
      ) : (
        <section className="component-empty-state">
          <MonitorCog aria-hidden="true" size={28} />
          <h2>{copy.noProjectsTitle}</h2>
          <p>{copy.noProjectsHint}</p>
        </section>
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

function MetricsPanel({
  metrics,
  ecosystem,
  locale,
}: {
  metrics: OsKernelMetrics;
  ecosystem: OsEcosystemMetrics;
  locale: GameState["settings"]["locale"];
}) {
  const copy = translations[locale].os;
  const primary = [
    {
      label: copy.metrics.overallScore,
      value: formatDecimal(metrics.overallScore, locale, 1),
      detail: copy.units.score,
      icon: Activity,
      accent: "blue" as const,
    },
    {
      label: copy.metrics.performanceScore,
      value: formatDecimal(metrics.performanceScore, locale, 1),
      detail: copy.units.score,
      icon: Zap,
      accent: "violet" as const,
    },
    {
      label: copy.metrics.stabilityScore,
      value: formatDecimal(metrics.stabilityScore, locale, 1),
      detail: copy.units.score,
      icon: CheckCircle2,
      accent: "green" as const,
    },
    {
      label: copy.metrics.securityScore,
      value: formatDecimal(metrics.securityScore, locale, 1),
      detail: copy.units.score,
      icon: ShieldCheck,
      accent: "amber" as const,
    },
  ];
  const secondary = [
    {
      label: copy.metrics.bootTimeSeconds,
      value: `${formatDecimal(metrics.bootTimeSeconds, locale, 1)} ${copy.units.seconds}`,
      icon: Timer,
    },
    {
      label: copy.metrics.memoryFootprintMb,
      value: `${formatDecimal(metrics.memoryFootprintMb, locale, 1)} ${copy.units.megabytes}`,
      icon: HardDrive,
    },
    {
      label: copy.metrics.compatibilityScore,
      value: formatDecimal(metrics.compatibilityScore, locale, 1),
      icon: Boxes,
    },
    {
      label: copy.metrics.energyEfficiencyScore,
      value: formatDecimal(metrics.energyEfficiencyScore, locale, 1),
      icon: Zap,
    },
    {
      label: copy.metrics.maintainabilityScore,
      value: formatDecimal(metrics.maintainabilityScore, locale, 1),
      icon: Cpu,
    },
    {
      label: copy.metrics.systemQualityScore,
      value: formatDecimal(metrics.systemQualityScore, locale, 1),
      icon: ShieldCheck,
    },
    {
      label: copy.metrics.driverCoverageScore,
      value: formatDecimal(metrics.driverCoverageScore, locale, 1),
      icon: Boxes,
    },
    {
      label: copy.metrics.dataIntegrityScore,
      value: formatDecimal(metrics.dataIntegrityScore, locale, 1),
      icon: HardDrive,
    },
    {
      label: copy.metrics.networkScore,
      value: formatDecimal(metrics.networkScore, locale, 1),
      icon: Zap,
    },
    {
      label: copy.metrics.diagnosticsScore,
      value: formatDecimal(metrics.diagnosticsScore, locale, 1),
      icon: Activity,
    },
    {
      label: copy.metrics.updateReadinessScore,
      value: formatDecimal(metrics.updateReadinessScore, locale, 1),
      icon: CheckCircle2,
    },
    {
      label: copy.metrics.updateLatencyDays,
      value: `${formatNumber(metrics.updateLatencyDays, locale)} ${copy.units.days}`,
      icon: Timer,
    },
    {
      label: copy.metrics.annualMaintenanceCostUsd,
      value: `${formatCurrency(metrics.annualMaintenanceCostUsd, locale)} ${copy.units.perYear}`,
      icon: Boxes,
    },
    {
      label: copy.metrics.ipcLatencyMicroseconds,
      value: `${formatDecimal(metrics.ipcLatencyMicroseconds, locale, 2)} ${copy.units.microseconds}`,
      icon: Timer,
    },
    {
      label: copy.metrics.syscallOverheadNanoseconds,
      value: `${formatDecimal(metrics.syscallOverheadNanoseconds, locale, 1)} ${copy.units.nanoseconds}`,
      icon: Activity,
    },
    {
      label: copy.metrics.processCapacity,
      value: formatNumber(metrics.processCapacity, locale),
      icon: Boxes,
    },
    {
      label: copy.metrics.sdkScore,
      value: formatDecimal(ecosystem.sdkScore, locale, 1),
      icon: Cpu,
    },
    {
      label: copy.metrics.apiScore,
      value: formatDecimal(ecosystem.apiScore, locale, 1),
      icon: Boxes,
    },
    {
      label: copy.metrics.guiScore,
      value: formatDecimal(ecosystem.guiScore, locale, 1),
      icon: MonitorCog,
    },
    {
      label: copy.metrics.developerToolsScore,
      value: formatDecimal(ecosystem.developerToolsScore, locale, 1),
      icon: Zap,
    },
    {
      label: copy.metrics.appStoreScore,
      value: formatDecimal(ecosystem.appStoreScore, locale, 1),
      icon: Boxes,
    },
    {
      label: copy.metrics.ecosystemScore,
      value: formatDecimal(ecosystem.ecosystemScore, locale, 1),
      icon: Activity,
    },
    {
      label: copy.metrics.compatibleApplications,
      value: `${formatNumber(ecosystem.compatibleApplications, locale)} / ${formatNumber(ecosystem.totalApplications, locale)}`,
      icon: CheckCircle2,
    },
    {
      label: copy.metrics.applicationCoverage,
      value: `${formatDecimal(ecosystem.applicationCoverage, locale, 1)}%`,
      icon: Boxes,
    },
    {
      label: copy.metrics.platformAppealScore,
      value: formatDecimal(ecosystem.platformAppealScore, locale, 1),
      icon: Gamepad2,
    },
  ];

  return (
    <section className="os-metrics-section" aria-labelledby="os-metrics-title">
      <div className="section-heading">
        <span className="section-heading__icon" aria-hidden="true"><Activity size={18} /></span>
        <div>
          <h2 id="os-metrics-title">{copy.metrics.title}</h2>
          <p>{copy.metrics.hint}</p>
        </div>
      </div>

      <div className="metrics-grid">
        {primary.map(({ label, value, detail, icon, accent }) => (
          <MetricCard
            accent={accent}
            detail={detail}
            icon={icon}
            key={label}
            label={label}
            value={value}
          />
        ))}
      </div>

      <div className="os-metric-list">
        {secondary.map(({ label, value, icon: Icon }) => (
          <article className="os-metric-row" key={label}>
            <span className="os-metric-row__icon" aria-hidden="true"><Icon size={16} /></span>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function RequirementsPanel({
  requirements,
  locale,
}: {
  requirements: OsRequirementResult[];
  locale: GameState["settings"]["locale"];
}) {
  const copy = translations[locale].os;
  const passed = requirements.filter((requirement) => requirement.satisfied).length;

  return (
    <section className="os-requirements-section" aria-labelledby="os-requirements-title">
      <div className="section-heading">
        <span className="section-heading__icon" aria-hidden="true"><ShieldCheck size={18} /></span>
        <div>
          <h2 id="os-requirements-title">{copy.requirements.title}</h2>
          <p>{copy.requirements.hint}</p>
        </div>
        <span className={`status-pill${passed === requirements.length ? " os-status-pill--ok" : ""}`}>
          {passed}/{requirements.length}
        </span>
      </div>

      <ul className="os-requirement-list">
        {requirements.map((requirement) => (
          <li
            className={`os-requirement${requirement.satisfied ? " os-requirement--ok" : " os-requirement--failed"}`}
            key={requirement.id}
          >
            <span className="os-requirement__state" aria-hidden="true">
              {requirement.satisfied ? <CheckCircle2 size={18} /> : <TriangleAlert size={18} />}
            </span>
            <div className="os-requirement__copy">
              <strong>{copy.requirements[requirement.id]}</strong>
              <span>
                {requirement.comparator === "at-least"
                  ? copy.requirements.atLeast
                  : copy.requirements.atMost}{" "}
                {formatRequirementValue(requirement.metric, requirement.target, locale, copy.units)}
              </span>
            </div>
            <div className="os-requirement__actual">
              <strong>{formatRequirementValue(requirement.metric, requirement.actual, locale, copy.units)}</strong>
              <span>{requirement.satisfied ? copy.requirements.satisfied : copy.requirements.unsatisfied}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ApplicationCompatibilityPanel({
  results,
  locale,
}: {
  results: OsApplicationCompatibility[];
  locale: GameState["settings"]["locale"];
}) {
  const copy = translations[locale].os;
  const compatibleCount = results.filter((result) => result.compatible).length;

  return (
    <section className="os-applications-section" aria-labelledby="os-applications-title">
      <div className="section-heading">
        <span className="section-heading__icon" aria-hidden="true"><Boxes size={18} /></span>
        <div>
          <h2 id="os-applications-title">{copy.applications.title}</h2>
          <p>{copy.applications.hint}</p>
        </div>
        <span className={`status-pill${compatibleCount === results.length ? " os-status-pill--ok" : ""}`}>
          {compatibleCount}/{results.length}
        </span>
      </div>

      <div className="os-application-list">
        {results.map((result) => {
          const application = OS_APPLICATION_CATALOG.find((entry) => entry.id === result.applicationId);
          if (!application) {
            return null;
          }

          return (
            <article
              className={`os-application-card${result.compatible ? " os-application-card--ok" : " os-application-card--failed"}`}
              key={result.applicationId}
            >
              <header>
                <div>
                  <span className="os-application-category">
                    {copy.applications.categories[result.category]}
                  </span>
                  <strong>{copy.applications.names[result.applicationId as keyof typeof copy.applications.names]}</strong>
                </div>
                <span className="status-pill">
                  {result.compatible ? copy.applications.compatible : copy.applications.incompatible}
                </span>
              </header>
              {result.issues.length > 0 && (
                <ul>
                  {result.issues.map((issue) => (
                    <li key={issue}>
                      <TriangleAlert aria-hidden="true" size={15} />
                      <span>{copy.applications.issues[issue]}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ReleasePanel({
  project,
  locale,
  isSaving,
  error,
  onStartRelease,
  onAdvanceRelease,
}: {
  project: OsProject;
  locale: GameState["settings"]["locale"];
  isSaving: boolean;
  error: string | null;
  onStartRelease: (() => void) | undefined;
  onAdvanceRelease: ((releaseId: string) => void) | undefined;
}) {
  const copy = translations[locale].os;
  const releases = [...project.releases].sort((left, right) => left.version - right.version);
  const latest = releases[releases.length - 1] ?? null;
  const nextStage = latest ? getNextOsReleaseStage(latest.stage) : "alpha";
  const canStart = !latest && Boolean(onStartRelease);
  const canAdvance = Boolean(latest && latest.stage !== "stable" && onAdvanceRelease);
  const nextStageLabel = nextStage ? copy.releases.stages[nextStage] : copy.releases.stages.stable;

  return (
    <section className="os-release-section" aria-labelledby="os-release-title">
      <div className="section-heading">
        <span className="section-heading__icon" aria-hidden="true"><Gamepad2 size={18} /></span>
        <div>
          <h2 id="os-release-title">{copy.releases.title}</h2>
          <p>{copy.releases.hint}</p>
        </div>
        {latest && <span className="status-pill">{copy.releases.stages[latest.stage]}</span>}
      </div>

      {releases.length === 0 ? (
        <div className="os-release-empty">
          <Gamepad2 aria-hidden="true" size={24} />
          <div>
            <strong>{copy.releases.emptyTitle}</strong>
            <p>{copy.releases.emptyHint}</p>
          </div>
        </div>
      ) : (
        <div className="os-release-list">
          {[...releases].reverse().map((release) => (
            <article className="os-release-card" key={release.id}>
              <header>
                <div>
                  <span className="os-release-version">
                    {copy.releases.versionLabel} {release.version}
                  </span>
                  <strong>{copy.releases.stages[release.stage]}</strong>
                  <span>{release.createdOn}</span>
                </div>
                <span className="status-pill">
                  {copy.releases.quality}: {formatDecimal(release.qualityScore, locale, 1)}
                </span>
              </header>
              <div className="os-release-stats">
                <span>{copy.releases.appeal}: {formatDecimal(release.appealScore, locale, 1)}</span>
                <span>{copy.releases.cost}: {formatCurrency(release.costUsd, locale)}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {error && <p className="inline-feedback inline-feedback--error" role="alert">{error}</p>}

      <div className="os-release-actions">
        {canStart && (
          <button className="button button--primary" disabled={isSaving} onClick={onStartRelease} type="button">
            {copy.releases.start}
          </button>
        )}
        {canAdvance && latest && (
          <button
            className="button button--primary"
            disabled={isSaving}
            onClick={() => onAdvanceRelease?.(latest.id)}
            type="button"
          >
            {copy.releases.advance.replace("{stage}", nextStageLabel)}
          </button>
        )}
        {latest?.stage === "stable" && (
          <p className="field-hint">{copy.releases.final}</p>
        )}
      </div>
    </section>
  );
}

function buildHardwareTargets(state: GameState): OsHardwareTarget[] {
  const targets: OsHardwareTarget[] = state.cpuProjects.map((project) => ({
    id: project.id,
    name: project.name,
    kind: "cpu",
    architecture: project.configuration.isa,
  }));

  for (const project of state.componentProjects) {
    const configuration = project.configuration;
    const target: OsHardwareTarget = {
      id: project.id,
      name: project.name,
      kind: configuration.type,
    };

    switch (configuration.type) {
      case "gpu":
        target.bus = configuration.bus;
        break;
      case "ssd":
        target.storageInterface = configuration.interface;
        target.storageFormFactor = configuration.formFactor;
        break;
      case "motherboard":
        target.pcieGeneration = configuration.pcieGeneration;
        break;
      case "ai-accelerator":
        target.aiInterconnect = configuration.interconnect;
        break;
      case "networking":
        target.bus = configuration.bus;
        target.networkStandard = configuration.standard;
        target.networkMedium = configuration.medium;
        break;
      case "ram":
        break;
    }

    targets.push(target);
  }

  return targets;
}

function CompatibilityPanel({
  configuration,
  locale,
  targets,
}: {
  configuration: OsConfiguration;
  locale: GameState["settings"]["locale"];
  targets: OsHardwareTarget[];
}) {
  const copy = translations[locale].os;
  const results = checkOsHardwareCompatibility(configuration, targets);
  const compatibleCount = results.filter((result) => result.compatible).length;

  return (
    <section className="os-compatibility-section" aria-labelledby="os-compatibility-title">
      <div className="section-heading">
        <span className="section-heading__icon" aria-hidden="true"><Cpu size={18} /></span>
        <div>
          <h2 id="os-compatibility-title">{copy.compatibility.title}</h2>
          <p>{copy.compatibility.hint}</p>
        </div>
        {results.length > 0 && (
          <span className={`status-pill${compatibleCount === results.length ? " os-status-pill--ok" : ""}`}>
            {compatibleCount}/{results.length}
          </span>
        )}
      </div>

      {results.length === 0 ? (
        <div className="os-compatibility-empty">
          <Boxes aria-hidden="true" size={24} />
          <div>
            <strong>{copy.compatibility.emptyTitle}</strong>
            <p>{copy.compatibility.emptyHint}</p>
          </div>
        </div>
      ) : (
        <div className="os-compatibility-list">
          {results.map((result) => (
            <article
              className={`os-compatibility-card${result.compatible ? " os-compatibility-card--ok" : " os-compatibility-card--failed"}`}
              key={result.targetId}
            >
              <header>
                <div>
                  <span className="os-compatibility-kind">{copy.compatibility.kinds[result.kind]}</span>
                  <strong>{result.name}</strong>
                </div>
                <span className="status-pill">
                  {result.compatible ? copy.compatibility.compatible : copy.compatibility.incompatible}
                </span>
              </header>
              {result.issues.length > 0 && (
                <ul>
                  {result.issues.map((issue) => (
                    <li key={issue.code}>
                      <TriangleAlert aria-hidden="true" size={15} />
                      <span>{copy.compatibility.issues[issue.code]}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatRequirementValue(
  metric: OsRequirementMetric,
  value: number,
  locale: GameState["settings"]["locale"],
  units: { seconds: string; megabytes: string; microseconds: string; nanoseconds: string },
): string {
  switch (metric) {
    case "bootTimeSeconds":
      return `${formatDecimal(value, locale, 1)} ${units.seconds}`;
    case "memoryFootprintMb":
      return `${formatDecimal(value, locale, 1)} ${units.megabytes}`;
    case "ipcLatencyMicroseconds":
      return `${formatDecimal(value, locale, 2)} ${units.microseconds}`;
    case "syscallOverheadNanoseconds":
      return `${formatDecimal(value, locale, 1)} ${units.nanoseconds}`;
    default:
      return formatDecimal(value, locale, 1);
  }
}
