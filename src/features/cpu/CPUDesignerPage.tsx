import { useEffect, useState, type FormEvent } from "react";
import { Cpu, MemoryStick, Save, Workflow } from "lucide-react";
import { ConfirmationBottomSheet } from "../../components/ConfirmationBottomSheet";
import { MetricCard } from "../../components/MetricCard";
import {
  CPU_ARCHITECTURE_OPTIONS,
  CPU_ISA_OPTIONS,
  CPU_LIMITS,
  CPU_MEMORY_OPTIONS,
  CPU_MICROARCHITECTURE_OPTIONS,
  SIMD_BY_ISA,
  cloneCpuConfiguration,
  cpuConfigurationsEqual,
  createDefaultCpuConfiguration,
  validateCpuConfiguration,
  validateCpuProjectName,
  type CpuArchitecture,
  type CpuConfiguration,
  type CpuConfigurationField,
  type CpuIsa,
  type CpuMemoryStandard,
  type CpuMicroarchitecture,
  type CpuProjectNameIssue,
  type CpuSimdExtension,
  type CpuValidationIssue,
} from "../../game/models/cpu";
import type { GameState } from "../../game/models/game-state";
import { formatCurrency, formatGameDate, formatDecimal, formatNumber } from "../../localization/formatters";
import { translations, type TranslationMessages } from "../../localization/messages";

interface CPUDesignerPageProps {
  state: GameState;
  isSaving: boolean;
  onDirtyChange: (isDirty: boolean) => void;
  onCreateProject: (name: string, configuration: CpuConfiguration) => Promise<string | null>;
  onSaveVersion: (projectId: string, name: string, configuration: CpuConfiguration) => Promise<boolean>;
}

type PendingAction =
  | { type: "switch-project"; projectId: string }
  | { type: "load-version"; version: number };

export function CPUDesignerPage({
  state,
  isSaving,
  onDirtyChange,
  onCreateProject,
  onSaveVersion,
}: CPUDesignerPageProps) {
  const locale = state.settings.locale;
  const t = translations[locale];
  const firstProject = state.cpuProjects[0] ?? null;
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(firstProject?.id ?? null);
  const selectedProject = state.cpuProjects.find((project) => project.id === selectedProjectId) ?? null;
  const [draftName, setDraftName] = useState(firstProject?.name ?? "");
  const [draftConfiguration, setDraftConfiguration] = useState<CpuConfiguration>(() =>
    firstProject ? cloneCpuConfiguration(firstProject.configuration) : createDefaultCpuConfiguration(),
  );
  const [newProjectName, setNewProjectName] = useState("");
  const [showCreateValidation, setShowCreateValidation] = useState(false);
  const [showEditorValidation, setShowEditorValidation] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const draftIsDirty = Boolean(
    selectedProject &&
      (draftName.trim() !== selectedProject.name || !cpuConfigurationsEqual(draftConfiguration, selectedProject.configuration)),
  );
  const createNameIssue = validateCpuProjectName(newProjectName);
  const editorNameIssue = validateCpuProjectName(draftName);
  const configurationValidation = validateCpuConfiguration(draftConfiguration);
  const editorIsValid = configurationValidation.valid && editorNameIssue === null;
  const supportedSimd = SIMD_BY_ISA[draftConfiguration.isa] ?? [];
  const totalCacheMb =
    (draftConfiguration.l1CacheKbPerCore * draftConfiguration.coreCount) / 1_024 +
    draftConfiguration.l2CacheMbPerCore * draftConfiguration.coreCount +
    draftConfiguration.l3CacheMb;
  const threadsPerCore = draftConfiguration.coreCount > 0
    ? draftConfiguration.threadCount / draftConfiguration.coreCount
    : 0;
  const totalCacheLabel = Number.isFinite(totalCacheMb) ? `${formatDecimal(totalCacheMb, locale, 2)} MB` : "—";
  const threadsPerCoreLabel = Number.isFinite(threadsPerCore) ? `${formatDecimal(threadsPerCore, locale, 2)}×` : "—";

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
    if (createNameIssue) {
      return;
    }

    const initialConfiguration = createDefaultCpuConfiguration();
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
    const project = state.cpuProjects.find((currentProject) => currentProject.id === projectId);
    if (!project) {
      return;
    }

    setSelectedProjectId(project.id);
    setDraftName(project.name);
    setDraftConfiguration(cloneCpuConfiguration(project.configuration));
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

  function loadVersion(versionNumber: number) {
    if (!selectedProject) {
      return;
    }

    const version = selectedProject.versions.find((entry) => entry.version === versionNumber);
    if (!version) {
      return;
    }

    setDraftConfiguration(cloneCpuConfiguration(version.configuration));
    setDraftName(selectedProject.name);
    setShowEditorValidation(false);
    setPendingAction(null);
  }

  function requestLoadVersion(versionNumber: number) {
    if (draftIsDirty) {
      setPendingAction({ type: "load-version", version: versionNumber });
      return;
    }
    loadVersion(versionNumber);
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

  async function handleSaveVersion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowEditorValidation(true);
    if (!selectedProject || !editorIsValid) {
      return;
    }

    const saved = await onSaveVersion(selectedProject.id, draftName.trim(), draftConfiguration);
    if (saved) {
      setShowEditorValidation(false);
    }
  }

  function updateConfiguration<K extends CpuConfigurationField>(field: K, value: CpuConfiguration[K]) {
    setDraftConfiguration((current) => ({ ...current, [field]: value }));
  }

  function updateIsa(isa: CpuIsa) {
    setDraftConfiguration((current) => ({
      ...current,
      isa,
      simdExtensions: current.simdExtensions.filter((extension) => SIMD_BY_ISA[isa].includes(extension)),
    }));
  }

  function toggleSimdExtension(extension: CpuSimdExtension, checked: boolean) {
    setDraftConfiguration((current) => ({
      ...current,
      simdExtensions: checked
        ? [...current.simdExtensions, extension]
        : current.simdExtensions.filter((currentExtension) => currentExtension !== extension),
    }));
  }

  const projectNameError = showCreateValidation ? getProjectNameError(createNameIssue, t.cpu) : undefined;
  const editorProjectNameError = showEditorValidation ? getProjectNameError(editorNameIssue, t.cpu) : undefined;
  const visibleConfigurationErrors = Object.entries(configurationValidation.errors);
  const pendingMessages = t.cpu;

  return (
    <div className="page-stack cpu-designer">
      <section className="cpu-project-panel">
        <div className="cpu-project-panel__intro">
          <span className="cpu-project-panel__icon" aria-hidden="true"><Cpu size={21} /></span>
          <div>
            <h2>{t.cpu.createTitle}</h2>
            <p>{t.cpu.createHint}</p>
          </div>
        </div>

        <div className="cpu-project-panel__controls">
          {state.cpuProjects.length > 0 ? (
            <div className="cpu-field">
              <label htmlFor="cpu-project-picker">{t.cpu.projectsLabel}</label>
              <select
                disabled={isSaving}
                id="cpu-project-picker"
                onChange={(event) => handleProjectSelection(event.currentTarget.value)}
                value={selectedProjectId ?? ""}
              >
                {state.cpuProjects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <p className="cpu-projects-empty">{t.cpu.projectsEmpty}</p>
          )}

          <form className="cpu-create-form" onSubmit={(event) => void handleCreateProject(event)}>
            <div className="cpu-field">
              <label htmlFor="cpu-new-project-name">{t.cpu.createName}</label>
              <input
                autoComplete="off"
                id="cpu-new-project-name"
                maxLength={CPU_LIMITS.projectName.max}
                onChange={(event) => setNewProjectName(event.currentTarget.value)}
                value={newProjectName}
              />
              <p className="cpu-field__hint">{t.cpu.createNameHint}</p>
              {projectNameError && <p className="cpu-field__error" role="alert">{projectNameError}</p>}
            </div>
            <button
              className="button button--primary"
              disabled={isSaving || draftIsDirty}
              type="submit"
            >
              <Cpu aria-hidden="true" size={17} />
              {t.cpu.createButton}
            </button>
            {draftIsDirty && <p className="cpu-create-form__guard">{t.cpu.saveBeforeCreate}</p>}
          </form>
        </div>
      </section>

      {!selectedProject ? (
        <section className="cpu-empty-state">
          <span className="cpu-empty-state__icon" aria-hidden="true"><Workflow size={22} /></span>
          <h2>{t.cpu.projectsEmpty}</h2>
          <p>{t.cpu.createHint}</p>
        </section>
      ) : (
        <>
          <section className="cpu-validation-card" aria-live="polite">
            <span className={`cpu-validation-card__icon${editorIsValid ? " is-valid" : " is-invalid"}`} aria-hidden="true">
              {editorIsValid ? <Workflow size={18} /> : <Cpu size={18} />}
            </span>
            <div className="cpu-validation-card__copy">
              <h2>{t.cpu.validationTitle}</h2>
              <p>{editorIsValid ? t.cpu.validationPassed : t.cpu.validationFailed}</p>
            </div>
            <span className={`cpu-validation-card__status${editorIsValid ? " is-valid" : " is-invalid"}`}>
              {editorIsValid
                ? t.cpu.validationStatusValid
                : formatNumber(visibleConfigurationErrors.length + Number(Boolean(editorNameIssue)), locale)}
            </span>
          </section>

          <section className="cpu-derived-grid" aria-label={t.cpu.summaryTitle}>
            <MetricCard
              accent="blue"
              detail={t.cpu.coresThenThreads}
              icon={Cpu}
              label={t.cpu.threadsPerCore}
              value={threadsPerCoreLabel}
            />
            <MetricCard
              accent="violet"
              detail={t.cpu.summaryTitle}
              icon={MemoryStick}
              label={t.cpu.totalCache}
              value={totalCacheLabel}
            />
          </section>

          <form className="cpu-editor-form" noValidate onSubmit={(event) => void handleSaveVersion(event)}>
            <section className="cpu-editor-card">
              <header className="cpu-editor-card__header">
                <div>
                  <p className="eyebrow">{t.screens.cpu.eyebrow}</p>
                  <h2>{t.cpu.configurationTitle}</h2>
                  <p>{t.cpu.configurationHint}</p>
                </div>
                <div className="cpu-editor-card__version">
                  <Save aria-hidden="true" size={15} />
                  <span>{t.cpu.version} {selectedProject.versions.at(-1)?.version ?? 1}</span>
                </div>
              </header>

              <div className="cpu-project-name-field cpu-field">
                <label htmlFor="cpu-edit-project-name">{t.cpu.createName}</label>
                <input
                  autoComplete="off"
                  disabled={isSaving}
                  id="cpu-edit-project-name"
                  maxLength={CPU_LIMITS.projectName.max}
                  onChange={(event) => setDraftName(event.currentTarget.value)}
                  value={draftName}
                  aria-invalid={Boolean(editorProjectNameError)}
                  aria-describedby={editorProjectNameError ? "cpu-edit-project-name-error" : undefined}
                />
                {editorProjectNameError && <p className="cpu-field__error" id="cpu-edit-project-name-error" role="alert">{editorProjectNameError}</p>}
              </div>

              <section className="cpu-form-section">
                <div className="cpu-form-section__heading">
                  <span className="cpu-section-icon" aria-hidden="true"><Cpu size={17} /></span>
                  <div>
                    <h3>{t.cpu.coreSection}</h3>
                    <p>{t.cpu.coreSectionHint}</p>
                  </div>
                </div>
                <div className="cpu-fields-grid">
                  <SelectField
                    disabled={isSaving}
                    id="cpu-isa"
                    label={t.cpu.fields.isa}
                    onChange={(value) => updateIsa(value as CpuIsa)}
                    options={CPU_ISA_OPTIONS.map((value) => ({ value, label: t.cpu.options.isa[value] }))}
                    value={draftConfiguration.isa}
                    error={showEditorValidation ? getCpuIssueText(configurationValidation.errors.isa, t.cpu, locale) : undefined}
                  />
                  <SelectField
                    disabled={isSaving}
                    id="cpu-architecture"
                    label={t.cpu.fields.architecture}
                    onChange={(value) => updateConfiguration("architecture", value as CpuArchitecture)}
                    options={CPU_ARCHITECTURE_OPTIONS.map((value) => ({ value, label: t.cpu.options.architecture[value] }))}
                    value={draftConfiguration.architecture}
                    error={showEditorValidation ? getCpuIssueText(configurationValidation.errors.architecture, t.cpu, locale) : undefined}
                  />
                  <SelectField
                    disabled={isSaving}
                    id="cpu-microarchitecture"
                    label={t.cpu.fields.microarchitecture}
                    onChange={(value) => updateConfiguration("microarchitecture", value as CpuMicroarchitecture)}
                    options={CPU_MICROARCHITECTURE_OPTIONS.map((value) => ({ value, label: t.cpu.options.microarchitecture[value] }))}
                    value={draftConfiguration.microarchitecture}
                    error={showEditorValidation ? getCpuIssueText(configurationValidation.errors.microarchitecture, t.cpu, locale) : undefined}
                  />
                  <NumberField
                    disabled={isSaving}
                    id="cpu-core-count"
                    label={t.cpu.fields.coreCount}
                    max={CPU_LIMITS.coreCount.max}
                    min={CPU_LIMITS.coreCount.min}
                    onChange={(value) => updateConfiguration("coreCount", value)}
                    value={draftConfiguration.coreCount}
                    error={showEditorValidation ? getCpuIssueText(configurationValidation.errors.coreCount, t.cpu, locale) : undefined}
                  />
                  <NumberField
                    disabled={isSaving}
                    id="cpu-thread-count"
                    label={t.cpu.fields.threadCount}
                    max={CPU_LIMITS.threadCount.max}
                    min={CPU_LIMITS.threadCount.min}
                    onChange={(value) => updateConfiguration("threadCount", value)}
                    value={draftConfiguration.threadCount}
                    error={showEditorValidation ? getCpuIssueText(configurationValidation.errors.threadCount, t.cpu, locale) : undefined}
                  />
                  <NumberField
                    disabled={isSaving}
                    id="cpu-clock-mhz"
                    label={t.cpu.fields.clockMHz}
                    max={CPU_LIMITS.clockMHz.max}
                    min={CPU_LIMITS.clockMHz.min}
                    onChange={(value) => updateConfiguration("clockMHz", value)}
                    value={draftConfiguration.clockMHz}
                    error={showEditorValidation ? getCpuIssueText(configurationValidation.errors.clockMHz, t.cpu, locale) : undefined}
                  />
                  <NumberField
                    disabled={isSaving}
                    id="cpu-ipc"
                    label={t.cpu.fields.ipc}
                    max={CPU_LIMITS.ipc.max}
                    min={CPU_LIMITS.ipc.min}
                    onChange={(value) => updateConfiguration("ipc", value)}
                    step={CPU_LIMITS.ipc.step}
                    value={draftConfiguration.ipc}
                    error={showEditorValidation ? getCpuIssueText(configurationValidation.errors.ipc, t.cpu, locale) : undefined}
                  />
                </div>
              </section>

              <details className="cpu-form-section cpu-advanced-section">
                <summary>{t.cpu.cacheSection}</summary>
                <p className="cpu-form-section__summary-hint">{t.cpu.cacheSectionHint}</p>
                <div className="cpu-fields-grid">
                  <NumberField
                    disabled={isSaving}
                    id="cpu-l1-cache"
                    label={t.cpu.fields.l1CacheKbPerCore}
                    max={CPU_LIMITS.l1CacheKbPerCore.max}
                    min={CPU_LIMITS.l1CacheKbPerCore.min}
                    onChange={(value) => updateConfiguration("l1CacheKbPerCore", value)}
                    value={draftConfiguration.l1CacheKbPerCore}
                    error={showEditorValidation ? getCpuIssueText(configurationValidation.errors.l1CacheKbPerCore, t.cpu, locale) : undefined}
                  />
                  <NumberField
                    disabled={isSaving}
                    id="cpu-l2-cache"
                    label={t.cpu.fields.l2CacheMbPerCore}
                    max={CPU_LIMITS.l2CacheMbPerCore.max}
                    min={CPU_LIMITS.l2CacheMbPerCore.min}
                    onChange={(value) => updateConfiguration("l2CacheMbPerCore", value)}
                    step={CPU_LIMITS.l2CacheMbPerCore.step}
                    value={draftConfiguration.l2CacheMbPerCore}
                    error={showEditorValidation ? getCpuIssueText(configurationValidation.errors.l2CacheMbPerCore, t.cpu, locale) : undefined}
                  />
                  <NumberField
                    disabled={isSaving}
                    id="cpu-l3-cache"
                    label={t.cpu.fields.l3CacheMb}
                    max={CPU_LIMITS.l3CacheMb.max}
                    min={CPU_LIMITS.l3CacheMb.min}
                    onChange={(value) => updateConfiguration("l3CacheMb", value)}
                    value={draftConfiguration.l3CacheMb}
                    error={showEditorValidation ? getCpuIssueText(configurationValidation.errors.l3CacheMb, t.cpu, locale) : undefined}
                  />
                  <SelectField
                    disabled={isSaving}
                    id="cpu-memory-standard"
                    label={t.cpu.fields.memoryStandard}
                    onChange={(value) => updateConfiguration("memoryStandard", value as CpuMemoryStandard)}
                    options={CPU_MEMORY_OPTIONS.map((value) => ({ value, label: t.cpu.options.memory[value] }))}
                    value={draftConfiguration.memoryStandard}
                    error={showEditorValidation ? getCpuIssueText(configurationValidation.errors.memoryStandard, t.cpu, locale) : undefined}
                  />
                  <NumberField
                    disabled={isSaving}
                    id="cpu-memory-channels"
                    label={t.cpu.fields.memoryChannels}
                    max={CPU_LIMITS.memoryChannels.max}
                    min={CPU_LIMITS.memoryChannels.min}
                    onChange={(value) => updateConfiguration("memoryChannels", value)}
                    value={draftConfiguration.memoryChannels}
                    error={showEditorValidation ? getCpuIssueText(configurationValidation.errors.memoryChannels, t.cpu, locale) : undefined}
                  />
                  <NumberField
                    disabled={isSaving}
                    id="cpu-max-memory"
                    label={t.cpu.fields.maxMemoryGb}
                    max={CPU_LIMITS.maxMemoryGb.max}
                    min={CPU_LIMITS.maxMemoryGb.min}
                    onChange={(value) => updateConfiguration("maxMemoryGb", value)}
                    value={draftConfiguration.maxMemoryGb}
                    error={showEditorValidation ? getCpuIssueText(configurationValidation.errors.maxMemoryGb, t.cpu, locale) : undefined}
                  />
                </div>
                <fieldset className="cpu-simd-field" disabled={isSaving}>
                  <legend>{t.cpu.fields.simdExtensions}</legend>
                  <div className="cpu-simd-options">
                    {supportedSimd.length === 0 ? (
                      <p>{t.cpu.options.noSimd}</p>
                    ) : supportedSimd.map((extension) => (
                      <label className="cpu-check-option" key={extension}>
                        <input
                          checked={draftConfiguration.simdExtensions.includes(extension)}
                          onChange={(event) => toggleSimdExtension(extension, event.currentTarget.checked)}
                          type="checkbox"
                        />
                        <span>{t.cpu.options.simd[extension]}</span>
                      </label>
                    ))}
                  </div>
                  {showEditorValidation && configurationValidation.errors.simdExtensions && (
                    <p className="cpu-field__error" role="alert">
                      {getCpuIssueText(configurationValidation.errors.simdExtensions, t.cpu, locale)}
                    </p>
                  )}
                </fieldset>
              </details>

              <details className="cpu-form-section cpu-advanced-section">
                <summary>{t.cpu.processSection}</summary>
                <p className="cpu-form-section__summary-hint">{t.cpu.processSectionHint}</p>
                <div className="cpu-fields-grid">
                  <NumberField
                    disabled={isSaving}
                    id="cpu-process-node"
                    label={t.cpu.fields.processNodeNm}
                    max={CPU_LIMITS.processNodeNm.max}
                    min={CPU_LIMITS.processNodeNm.min}
                    onChange={(value) => updateConfiguration("processNodeNm", value)}
                    value={draftConfiguration.processNodeNm}
                    error={showEditorValidation ? getCpuIssueText(configurationValidation.errors.processNodeNm, t.cpu, locale) : undefined}
                  />
                  <NumberField
                    disabled={isSaving}
                    id="cpu-voltage"
                    label={t.cpu.fields.voltageMv}
                    max={CPU_LIMITS.voltageMv.max}
                    min={CPU_LIMITS.voltageMv.min}
                    onChange={(value) => updateConfiguration("voltageMv", value)}
                    value={draftConfiguration.voltageMv}
                    error={showEditorValidation ? getCpuIssueText(configurationValidation.errors.voltageMv, t.cpu, locale) : undefined}
                  />
                  <NumberField
                    disabled={isSaving}
                    id="cpu-tdp"
                    label={t.cpu.fields.tdpW}
                    max={CPU_LIMITS.tdpW.max}
                    min={CPU_LIMITS.tdpW.min}
                    onChange={(value) => updateConfiguration("tdpW", value)}
                    value={draftConfiguration.tdpW}
                    error={showEditorValidation ? getCpuIssueText(configurationValidation.errors.tdpW, t.cpu, locale) : undefined}
                  />
                  <NumberField
                    disabled={isSaving}
                    id="cpu-die-area"
                    label={t.cpu.fields.dieAreaMm2}
                    max={CPU_LIMITS.dieAreaMm2.max}
                    min={CPU_LIMITS.dieAreaMm2.min}
                    onChange={(value) => updateConfiguration("dieAreaMm2", value)}
                    value={draftConfiguration.dieAreaMm2}
                    error={showEditorValidation ? getCpuIssueText(configurationValidation.errors.dieAreaMm2, t.cpu, locale) : undefined}
                  />
                  <NumberField
                    disabled={isSaving}
                    id="cpu-unit-cost"
                    label={t.cpu.fields.unitCostUsd}
                    max={CPU_LIMITS.unitCostUsd.max}
                    min={CPU_LIMITS.unitCostUsd.min}
                    onChange={(value) => updateConfiguration("unitCostUsd", value)}
                    step={0.01}
                    value={draftConfiguration.unitCostUsd}
                    error={showEditorValidation ? getCpuIssueText(configurationValidation.errors.unitCostUsd, t.cpu, locale) : undefined}
                  />
                </div>
              </details>

              <footer className="cpu-editor-footer">
                <div className="cpu-editor-footer__copy">
                  {draftIsDirty ? <p>{t.cpu.saveVersionHint}</p> : <p>{t.cpu.noChanges}</p>}
                  {showEditorValidation && !editorIsValid && <p className="cpu-field__error" role="alert">{t.cpu.validationFailed}</p>}
                </div>
                <button
                  className="button button--primary"
                  disabled={isSaving || !draftIsDirty}
                  type="submit"
                >
                  <Save aria-hidden="true" size={16} />
                  {isSaving ? t.cpu.savingVersion : t.cpu.saveVersion}
                </button>
              </footer>
            </section>
          </form>

          <section className="cpu-version-section">
            <header className="cpu-version-section__heading">
              <div>
                <h2>{t.cpu.versionHistory}</h2>
                <p>{selectedProject.name}</p>
              </div>
              <span className="cpu-version-count">{formatNumber(selectedProject.versions.length, locale)}</span>
            </header>
            <div className="cpu-version-list">
              {[...selectedProject.versions].reverse().map((version) => (
                <article className="cpu-version-card" key={version.version}>
                  <div className="cpu-version-card__top">
                    <div>
                      <strong>{t.cpu.version} {formatNumber(version.version, locale)}</strong>
                      {version.version === selectedProject.versions.at(-1)?.version && (
                        <span className="cpu-version-current">{t.cpu.versionCurrent}</span>
                      )}
                    </div>
                    <time dateTime={version.savedOn}>{formatGameDate(version.savedOn, locale)}</time>
                  </div>
                  <dl className="cpu-version-specs">
                    <div><dt>{t.cpu.fields.coreCount}</dt><dd>{formatNumber(version.configuration.coreCount, locale)}</dd></div>
                    <div><dt>{t.cpu.fields.clockMHz}</dt><dd>{formatNumber(version.configuration.clockMHz, locale)}</dd></div>
                    <div><dt>{t.cpu.fields.tdpW}</dt><dd>{formatNumber(version.configuration.tdpW, locale)}</dd></div>
                    <div><dt>{t.cpu.fields.unitCostUsd}</dt><dd>{formatCurrency(version.configuration.unitCostUsd, locale)}</dd></div>
                  </dl>
                  <button
                    className="button button--secondary cpu-version-card__button"
                    disabled={isSaving}
                    onClick={() => requestLoadVersion(version.version)}
                    type="button"
                  >
                    {t.cpu.loadVersion}
                  </button>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {pendingAction && (
        <ConfirmationBottomSheet
          cancelLabel={pendingMessages.unsavedCancel}
          confirmLabel={pendingMessages.unsavedConfirm}
          message={pendingMessages.unsavedMessage}
          onCancel={() => setPendingAction(null)}
          onConfirm={confirmPendingAction}
          title={pendingMessages.unsavedTitle}
        />
      )}
    </div>
  );
}

interface NumberFieldProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled: boolean;
  error?: string | undefined;
  onChange: (value: number) => void;
}

function NumberField({ id, label, value, min, max, step = 1, disabled, error, onChange }: NumberFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="cpu-field">
      <label htmlFor={id}>{label}</label>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        disabled={disabled}
        id={id}
        max={max}
        min={min}
        onChange={(event) => {
          const valueText = event.currentTarget.value;
          onChange(valueText.length === 0 ? Number.NaN : Number(valueText));
        }}
        step={step}
        type="number"
        value={Number.isFinite(value) ? String(value) : ""}
      />
      {error && <p className="cpu-field__error" id={errorId} role="alert">{error}</p>}
    </div>
  );
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  disabled: boolean;
  error?: string | undefined;
  onChange: (value: string) => void;
}

function SelectField({ id, label, value, options, disabled, error, onChange }: SelectFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="cpu-field">
      <label htmlFor={id}>{label}</label>
      <select
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.currentTarget.value)}
        value={value}
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {error && <p className="cpu-field__error" id={errorId} role="alert">{error}</p>}
    </div>
  );
}

function getProjectNameError(issue: CpuProjectNameIssue | null, messages: TranslationMessages["cpu"]): string | undefined {
  if (!issue) {
    return undefined;
  }
  if (issue.code === "required") {
    return messages.projectNameRequired;
  }
  return messages.projectNameLength
    .replace("{min}", String(issue.min))
    .replace("{max}", String(issue.max));
}

function getCpuIssueText(
  issue: CpuValidationIssue | undefined,
  messages: TranslationMessages["cpu"],
  locale: GameState["settings"]["locale"],
): string | undefined {
  if (!issue) {
    return undefined;
  }

  switch (issue.code) {
    case "invalid-option":
      return messages.validation.invalidOption;
    case "integer":
      return messages.validation.integer
        .replace("{min}", formatDecimal(issue.min, locale))
        .replace("{max}", formatDecimal(issue.max, locale));
    case "range":
      return messages.validation.range
        .replace("{min}", formatDecimal(issue.min, locale))
        .replace("{max}", formatDecimal(issue.max, locale));
    case "precision":
      return messages.validation.precision.replace("{step}", formatDecimal(issue.step, locale, 3));
    case "threads-per-core":
      return messages.validation.threads
        .replace("{min}", formatNumber(issue.min, locale))
        .replace("{max}", formatNumber(issue.max, locale));
    case "unsupported-simd":
      return messages.validation.unsupportedSimd.replace("{isa}", messages.options.isa[issue.isa]);
    case "duplicate-simd":
      return messages.validation.duplicateSimd;
  }
}
