import { useEffect, useState, type FormEvent } from "react";
import { Boxes, CheckCircle2, Save, ShieldCheck, TriangleAlert } from "lucide-react";
import { ProductWorkspaceTabs } from "../../components/ProductWorkspaceTabs";
import { ConfirmationBottomSheet } from "../../components/ConfirmationBottomSheet";
import {
  COMPONENT_FIELD_SCHEMAS,
  COMPONENT_LIMITS,
  COMPONENT_TYPES,
  checkBuildCompatibility,
  cloneComponentConfiguration,
  componentConfigurationsEqual,
  createDefaultComponentConfiguration,
  validateComponentConfiguration,
  validateComponentName,
  type ComponentConfiguration,
  type ComponentConfigurationField,
  type ComponentProject,
  type ComponentType,
  type ComponentValidationIssue,
  type CompatibilityIssue,
} from "../../game/models/components";
import type { GameState } from "../../game/models/game-state";
import {
  calculateComponentPerformanceScore,
  calculateSuggestedComponentPrice,
  estimateComponentManufacturingCost,
  getComponentMarketProfile,
} from "../../game/formulas/components";
import { formatCurrency, formatDecimal, formatNumber } from "../../localization/formatters";
import { translations } from "../../localization/messages";

interface ComponentDesignerPageProps {
  state: GameState;
  isSaving: boolean;
  onDirtyChange: (isDirty: boolean) => void;
  onCreateProject: (
    type: ComponentType,
    name: string,
    configuration: ComponentConfiguration,
  ) => Promise<string | null>;
  onSaveVersion: (
    projectId: string,
    name: string,
    configuration: ComponentConfiguration,
  ) => Promise<boolean>;
  onOpenCpu: () => void;
  onOpenOs?: () => void;
}

type PendingAction =
  | { type: "switch-project"; projectId: string }
  | { type: "load-version"; version: number };

type BuildSlotId = "cpu" | ComponentType;

export function ComponentDesignerPage({
  state,
  isSaving,
  onDirtyChange,
  onCreateProject,
  onSaveVersion,
  onOpenCpu,
  onOpenOs = () => undefined,
}: ComponentDesignerPageProps) {
  const locale = state.settings.locale;
  const t = translations[locale];
  const copy = t.components;
  const firstProject = state.componentProjects[0] ?? null;
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(firstProject?.id ?? null);
  const selectedProject = state.componentProjects.find((project) => project.id === selectedProjectId) ?? null;
  const [draftName, setDraftName] = useState(firstProject?.name ?? "");
  const [draftConfiguration, setDraftConfiguration] = useState<ComponentConfiguration>(() =>
    firstProject
      ? cloneComponentConfiguration(firstProject.configuration)
      : createDefaultComponentConfiguration("gpu"),
  );
  const [newProjectType, setNewProjectType] = useState<ComponentType>("gpu");
  const [newProjectName, setNewProjectName] = useState("");
  const [showCreateValidation, setShowCreateValidation] = useState(false);
  const [showEditorValidation, setShowEditorValidation] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const draftIsDirty = Boolean(
    selectedProject
      && draftConfiguration.type === selectedProject.type
      && (draftName.trim() !== selectedProject.name
        || !componentConfigurationsEqual(draftConfiguration, selectedProject.configuration)),
  );
  const createNameIssue = validateComponentName(newProjectName);
  const editorNameIssue = validateComponentName(draftName);
  const configurationValidation = validateComponentConfiguration(draftConfiguration);
  const editorIsValid = configurationValidation.valid && editorNameIssue === null;
  const manufacturing = estimateComponentManufacturingCost(draftConfiguration);
  const performanceScore = (() => {
    try {
      return calculateComponentPerformanceScore(draftConfiguration);
    } catch {
      return 0;
    }
  })();
  const profile = getComponentMarketProfile(draftConfiguration.type);
  const suggestedPrice = calculateSuggestedComponentPrice(manufacturing.unitCostUsd, profile);

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

    const initialConfiguration = createDefaultComponentConfiguration(newProjectType);
    const projectId = await onCreateProject(newProjectType, newProjectName.trim(), initialConfiguration);
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
    const project = state.componentProjects.find((candidate) => candidate.id === projectId);
    if (!project) {
      return;
    }

    setSelectedProjectId(project.id);
    setDraftName(project.name);
    setDraftConfiguration(cloneComponentConfiguration(project.configuration));
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
    setDraftConfiguration(cloneComponentConfiguration(version.configuration));
    setDraftName(selectedProject.name);
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

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowEditorValidation(true);
    if (!selectedProject || !editorIsValid || !draftIsDirty) {
      return;
    }
    await onSaveVersion(selectedProject.id, draftName.trim(), draftConfiguration);
  }

  function updateField(key: ComponentConfigurationField, value: string | number | boolean | string[]) {
    setDraftConfiguration((current) => ({ ...current, [key]: value }) as ComponentConfiguration);
  }

  return (
    <div className="page-stack component-designer">
      <ProductWorkspaceTabs
        active="components"
        componentsLabel={t.productWorkspace.components}
        cpuLabel={t.productWorkspace.cpu}
        label={t.productWorkspace.label}
        onOpenComponents={() => undefined}
        onOpenCpu={onOpenCpu}
        onOpenOs={onOpenOs}
        osLabel={t.productWorkspace.os}
      />

      <section className="cpu-project-panel">
        <div className="cpu-project-panel__intro">
          <span className="cpu-project-panel__icon" aria-hidden="true"><Boxes size={21} /></span>
          <div>
            <h2>{copy.createTitle}</h2>
            <p>{copy.createHint}</p>
          </div>
        </div>

        <div className="cpu-project-panel__controls">
          {state.componentProjects.length > 0 ? (
            <div className="cpu-field">
              <label htmlFor="component-project-picker">{copy.projectsLabel}</label>
              <select
                disabled={isSaving}
                id="component-project-picker"
                onChange={(event) => handleProjectSelection(event.currentTarget.value)}
                value={selectedProjectId ?? ""}
              >
                {state.componentProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {copy.types[project.type]} · {project.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="cpu-projects-empty">{copy.projectsEmpty}</p>
          )}

          <form className="cpu-create-form" onSubmit={(event) => void handleCreateProject(event)}>
            <div className="cpu-field">
              <label htmlFor="component-new-type">{copy.createType}</label>
              <select
                disabled={isSaving || draftIsDirty}
                id="component-new-type"
                onChange={(event) => setNewProjectType(event.currentTarget.value as ComponentType)}
                value={newProjectType}
              >
                {COMPONENT_TYPES.map((type) => (
                  <option key={type} value={type}>{copy.types[type]}</option>
                ))}
              </select>
            </div>
            <div className="cpu-field">
              <label htmlFor="component-new-project-name">{copy.createName}</label>
              <input
                autoComplete="off"
                id="component-new-project-name"
                maxLength={COMPONENT_LIMITS.projectName.max}
                onChange={(event) => setNewProjectName(event.currentTarget.value)}
                value={newProjectName}
              />
              <p className="cpu-field__hint">{copy.createNameHint}</p>
              {showCreateValidation && createNameIssue && (
                <p className="cpu-field__error" role="alert">
                  {copy.nameError.replace("{min}", String(COMPONENT_LIMITS.projectName.min))
                    .replace("{max}", String(COMPONENT_LIMITS.projectName.max))}
                </p>
              )}
            </div>
            <button
              className="button button--primary"
              disabled={isSaving || draftIsDirty}
              type="submit"
            >
              <Boxes aria-hidden="true" size={17} />
              {copy.createButton}
            </button>
            {draftIsDirty && <p className="cpu-create-form__guard">{copy.saveBeforeCreate}</p>}
          </form>
        </div>
      </section>

      {selectedProject ? (
        <>
          <form className="cpu-editor-card" onSubmit={(event) => void handleSave(event)}>
            <header className="cpu-editor-card__header">
              <div>
                <p className="eyebrow">{copy.editorEyebrow}</p>
                <h2>{copy.types[selectedProject.type]} · {selectedProject.name}</h2>
                <p>{copy.editorHint}</p>
              </div>
              <span className="status-pill">{copy.types[selectedProject.type]}</span>
            </header>

            <div className="cpu-field">
              <label htmlFor="component-project-name">{copy.projectName}</label>
              <input
                autoComplete="off"
                id="component-project-name"
                maxLength={COMPONENT_LIMITS.projectName.max}
                onChange={(event) => setDraftName(event.currentTarget.value)}
                value={draftName}
              />
              {showEditorValidation && editorNameIssue && (
                <p className="cpu-field__error" role="alert">
                  {copy.nameError.replace("{min}", String(COMPONENT_LIMITS.projectName.min))
                    .replace("{max}", String(COMPONENT_LIMITS.projectName.max))}
                </p>
              )}
            </div>

            <div className="cpu-fields-grid">
              {COMPONENT_FIELD_SCHEMAS[selectedProject.type].map((field) => (
                <ComponentField
                  configuration={draftConfiguration}
                  error={(showEditorValidation || draftIsDirty)
                    ? configurationValidation.errors[field.key]
                    : undefined}
                  field={field}
                  key={field.key}
                  locale={locale}
                  onChange={(value) => updateField(field.key, value)}
                  optionsFor={(key, value) => {
                    const options = copy.options as Record<string, Record<string, string>>;
                    return options[key]?.[value] ?? value;
                  }}
                  label={copy.fields[field.key]}
                  validationCopy={copy.validation}
                />
              ))}
            </div>

            <div className="component-editor-summary">
              <div><span>{copy.summary.unitCost}</span><strong>{formatCurrency(manufacturing.unitCostUsd, locale)}</strong></div>
              <div><span>{copy.summary.performance}</span><strong>{formatDecimal(performanceScore, locale, 3)}</strong></div>
              <div><span>{copy.summary.suggestedPrice}</span><strong>{formatCurrency(suggestedPrice, locale)}</strong></div>
              <div><span>{copy.summary.market}</span><strong>{copy.marketLabels[selectedProject.type]}</strong></div>
            </div>

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

          <section className="cpu-version-section">
            <header className="cpu-version-section__heading">
              <h2>{copy.versionHistory}</h2>
              <span className="status-pill">{selectedProject.versions.length}</span>
            </header>
            <div className="cpu-version-list">
              {[...selectedProject.versions].reverse().map((version) => (
                <article className="cpu-version-card" key={version.version}>
                  <div>
                    <strong>{copy.version} {version.version}</strong>
                    <span>{version.savedOn}</span>
                  </div>
                  <button
                    className="button button--secondary cpu-version-card__button"
                    disabled={isSaving}
                    onClick={() => requestLoadVersion(version.version)}
                    type="button"
                  >
                    {copy.loadVersion}
                  </button>
                </article>
              ))}
            </div>
          </section>

          <BuildCompatibilityPanel state={state} locale={locale} />
        </>
      ) : (
        <section className="component-empty-state">
          <Boxes aria-hidden="true" size={26} />
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

interface ComponentFieldProps {
  field: (typeof COMPONENT_FIELD_SCHEMAS)[ComponentType][number];
  configuration: ComponentConfiguration;
  label: string;
  locale: GameState["settings"]["locale"];
  error?: ComponentValidationIssue | undefined;
  onChange: (value: string | number | boolean | string[]) => void;
  optionsFor: (key: string, value: string) => string;
  validationCopy: {
    integer: string;
    range: string;
    precision: string;
    invalidOption: string;
    selectAtLeastOne: string;
    duplicateOption: string;
  };
}

function ComponentField({
  field,
  configuration,
  label,
  locale,
  error,
  onChange,
  optionsFor,
  validationCopy,
}: ComponentFieldProps) {
  const value = (configuration as unknown as Record<string, unknown>)[field.key];
  const inputId = `component-field-${field.key}`;

  function errorText() {
    if (!error) {
      return null;
    }
    switch (error.code) {
      case "integer":
        return validationCopy.integer
          .replace("{min}", formatNumber(error.min ?? 0, locale))
          .replace("{max}", formatNumber(error.max ?? 0, locale));
      case "range":
        return validationCopy.range
          .replace("{min}", formatNumber(error.min ?? 0, locale))
          .replace("{max}", formatNumber(error.max ?? 0, locale));
      case "precision":
        return validationCopy.precision.replace("{step}", String(error.step ?? 1));
      case "invalid-option":
        return validationCopy.invalidOption;
      case "empty-selection":
        return validationCopy.selectAtLeastOne;
      case "duplicate-option":
        return validationCopy.duplicateOption;
    }
  }

  if (field.kind === "boolean") {
    return (
      <label className="component-checkbox-field" htmlFor={inputId}>
        <input
          checked={Boolean(value)}
          id={inputId}
          onChange={(event) => onChange(event.currentTarget.checked)}
          type="checkbox"
        />
        <span>{label}</span>
      </label>
    );
  }

  if (field.kind === "multi-select") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset className="component-multiselect-field">
        <legend>{label}</legend>
        <div>
          {(field.options ?? []).map((option) => (
            <label key={option}>
              <input
                checked={selected.includes(option)}
                onChange={(event) => {
                  const next = event.currentTarget.checked
                    ? [...selected, option]
                    : selected.filter((candidate) => candidate !== option);
                  onChange(next);
                }}
                type="checkbox"
              />
              <span>{optionsFor(field.key, option)}</span>
            </label>
          ))}
        </div>
        {error && <p className="cpu-field__error" role="alert">{errorText()}</p>}
      </fieldset>
    );
  }

  if (field.kind === "select") {
    return (
      <div className="cpu-field">
        <label htmlFor={inputId}>{label}</label>
        <select
          aria-invalid={Boolean(error)}
          id={inputId}
          onChange={(event) => onChange(event.currentTarget.value)}
          value={String(value ?? "")}
        >
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>{optionsFor(field.key, option)}</option>
          ))}
        </select>
        {error && <p className="cpu-field__error" role="alert">{errorText()}</p>}
      </div>
    );
  }

  return (
    <div className="cpu-field">
      <label htmlFor={inputId}>{label}</label>
      <input
        aria-invalid={Boolean(error)}
        id={inputId}
        max={field.max}
        min={field.min}
        onChange={(event) => onChange(event.currentTarget.value === "" ? 0 : Number(event.currentTarget.value))}
        step={field.step ?? (field.kind === "integer" ? 1 : "any")}
        type="number"
        value={Number(value ?? 0)}
      />
      {error && <p className="cpu-field__error" role="alert">{errorText()}</p>}
    </div>
  );
}

function BuildCompatibilityPanel({
  state,
  locale,
}: {
  state: GameState;
  locale: GameState["settings"]["locale"];
}) {
  const t = translations[locale];
  const copy = t.components.compatibility;
  const [selection, setSelection] = useState<Partial<Record<BuildSlotId, string>>>({});

  function optionsFor(slot: BuildSlotId): ComponentProject[] {
    if (slot === "cpu") {
      return [];
    }
    return state.componentProjects.filter((project) => project.type === slot);
  }

  const cpuProject = state.cpuProjects.find((project) => project.id === selection.cpu);
  const selectedComponents: Partial<Record<ComponentType, ComponentConfiguration>> = {};
  for (const type of COMPONENT_TYPES) {
    const project = state.componentProjects.find((candidate) => candidate.id === selection[type]);
    if (project) {
      selectedComponents[type] = project.configuration;
    }
  }
  const hasSelection = Boolean(cpuProject) || Object.keys(selectedComponents).length > 0;
  const result = checkBuildCompatibility({
    ...(cpuProject ? { cpu: cpuProject.configuration } : {}),
    components: selectedComponents,
  });

  function updateSelection(slot: BuildSlotId, projectId: string) {
    setSelection((current) => ({ ...current, [slot]: projectId }));
  }

  return (
    <section className="compatibility-panel" aria-labelledby="compatibility-title">
      <div className="section-heading">
        <span className="section-heading__icon" aria-hidden="true"><ShieldCheck size={18} /></span>
        <div>
          <h2 id="compatibility-title">{copy.title}</h2>
          <p>{copy.hint}</p>
        </div>
      </div>

      <div className="compatibility-slots">
        <div className="cpu-field">
          <label htmlFor="compatibility-cpu">{copy.slots.cpu}</label>
          <select
            id="compatibility-cpu"
            onChange={(event) => updateSelection("cpu", event.currentTarget.value)}
            value={selection.cpu ?? ""}
          >
            <option value="">{copy.none}</option>
            {state.cpuProjects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>
        {COMPONENT_TYPES.map((type) => (
          <div className="cpu-field" key={type}>
            <label htmlFor={`compatibility-${type}`}>{copy.slots[type]}</label>
            <select
              id={`compatibility-${type}`}
              onChange={(event) => updateSelection(type, event.currentTarget.value)}
              value={selection[type] ?? ""}
            >
              <option value="">{copy.none}</option>
              {optionsFor(type).map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {!hasSelection ? (
        <p className="compatibility-empty">{copy.empty}</p>
      ) : result.issues.length === 0 ? (
        <p className="compatibility-result compatibility-result--ok" role="status">
          <CheckCircle2 aria-hidden="true" size={17} />
          {copy.compatible}
        </p>
      ) : (
        <ul className="compatibility-issues">
          {result.issues.map((issue, index) => (
            <li
              className={`compatibility-issue compatibility-issue--${issue.severity}`}
              key={`${issue.code}-${index}`}
            >
              <TriangleAlert aria-hidden="true" size={17} />
              <span>{compatibilityIssueText(issue, copy.issues)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function compatibilityIssueText(
  issue: CompatibilityIssue,
  messages: Record<CompatibilityIssue["code"], string>,
): string {
  const details = issue.details ?? {};
  return messages[issue.code]
    .replace("{cpuIsa}", String(details.cpuIsa ?? ""))
    .replace("{motherboardIsa}", String(details.motherboardIsa ?? ""))
    .replace("{cpuMemory}", String(details.cpuMemory ?? ""))
    .replace("{motherboardMemory}", String(details.motherboardMemory ?? ""))
    .replace("{ramMemory}", String(details.ramMemory ?? ""))
    .replace("{capacity}", String(details.capacity ?? ""))
    .replace("{maxMemory}", String(details.maxMemory ?? ""))
    .replace("{channels}", String(details.channels ?? ""))
    .replace("{slots}", String(details.slots ?? ""))
    .replace("{required}", String(details.required ?? ""))
    .replace("{available}", String(details.available ?? ""));
}
