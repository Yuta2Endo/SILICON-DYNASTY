import { useEffect, useState, type FormEvent } from "react";
import {
  BrainCircuit,
  CheckCircle2,
  Cpu,
  Database,
  Gauge,
  HardDrive,
  Save,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { ConfirmationBottomSheet } from "../../components/ConfirmationBottomSheet";
import { MetricCard } from "../../components/MetricCard";
import { ProductWorkspaceTabs } from "../../components/ProductWorkspaceTabs";
import {
  AI_ARCHITECTURE_OPTIONS,
  AI_DATASET_LICENSE_OPTIONS,
  AI_DATASET_MODALITY_OPTIONS,
  AI_LIMITS,
  AI_PRECISION_OPTIONS,
  AI_QUANTIZATION_OPTIONS,
  aiConfigurationsEqual,
  aiDatasetsEqual,
  cloneAiConfiguration,
  cloneAiDatasets,
  createDefaultAiConfiguration,
  validateAiConfiguration,
  validateAiDataset,
  validateAiProjectName,
  type AiConfiguration,
  type AiConfigurationField,
  type AiDataset,
  type AiDatasetLicense,
  type AiDatasetModality,
  type AiPrecision,
  type AiQuantization,
  type AiValidationIssue,
} from "../../game/models/ai";
import { calculateAiModelMetrics } from "../../game/formulas/ai";
import type { GameState } from "../../game/models/game-state";
import { formatDecimal, formatNumber, formatShortGameDate } from "../../localization/formatters";
import { translations } from "../../localization/messages";

interface AiDesignerPageProps {
  state: GameState;
  isSaving: boolean;
  onDirtyChange: (isDirty: boolean) => void;
  onCreateProject: (name: string, configuration: AiConfiguration) => Promise<string | null>;
  onSaveVersion: (
    projectId: string,
    name: string,
    configuration: AiConfiguration,
    datasets: AiDataset[],
  ) => Promise<boolean>;
  onOpenCpu: () => void;
  onOpenComponents: () => void;
  onOpenOs: () => void;
}

type PendingAction =
  | { type: "switch-project"; projectId: string }
  | { type: "load-version"; version: number };

type SelectFieldKey = "architecture" | "precision" | "quantization";

interface SelectOption {
  value: string;
  label: string;
}

const NUMBER_FIELDS: Array<{
  key: keyof Pick<
    AiConfiguration,
    "parameterCountM" | "layers" | "hiddenDimension" | "attentionHeads" | "contextWindow" | "vocabularySize" | "experts"
  >;
  min: number;
  max: number;
}> = [
  { key: "parameterCountM", ...AI_LIMITS.parameterCountM },
  { key: "layers", ...AI_LIMITS.layers },
  { key: "hiddenDimension", ...AI_LIMITS.hiddenDimension },
  { key: "attentionHeads", ...AI_LIMITS.attentionHeads },
  { key: "contextWindow", ...AI_LIMITS.contextWindow },
  { key: "vocabularySize", ...AI_LIMITS.vocabularySize },
  { key: "experts", ...AI_LIMITS.experts },
];

function nextDatasetId(datasets: readonly AiDataset[]): string {
  let sequence = 1;
  while (datasets.some((dataset) => dataset.id === `dataset-${sequence}`)) {
    sequence += 1;
  }
  return `dataset-${sequence}`;
}

export function AiDesignerPage({
  state,
  isSaving,
  onDirtyChange,
  onCreateProject,
  onSaveVersion,
  onOpenCpu,
  onOpenComponents,
  onOpenOs,
}: AiDesignerPageProps) {
  const locale = state.settings.locale;
  const t = translations[locale];
  const copy = t.ai;
  const currentYear = Number(state.gameDate.slice(0, 4));
  const firstProject = state.aiProjects[0] ?? null;
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(firstProject?.id ?? null);
  const selectedProject = state.aiProjects.find((project) => project.id === selectedProjectId) ?? null;
  const [draftName, setDraftName] = useState(firstProject?.name ?? "");
  const [draftConfiguration, setDraftConfiguration] = useState<AiConfiguration>(() =>
    firstProject ? cloneAiConfiguration(firstProject.configuration) : createDefaultAiConfiguration(),
  );
  const [draftDatasets, setDraftDatasets] = useState<AiDataset[]>(() =>
    firstProject ? cloneAiDatasets(firstProject.datasets) : [],
  );
  const [newProjectName, setNewProjectName] = useState("");
  const [showCreateValidation, setShowCreateValidation] = useState(false);
  const [showEditorValidation, setShowEditorValidation] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [datasetForm, setDatasetForm] = useState({
    name: "",
    modality: "text" as AiDatasetModality,
    sizeGb: "5",
    qualityScore: "70",
    diversityScore: "60",
    license: "permissive" as AiDatasetLicense,
    processingCostUsd: "250",
  });
  const [showDatasetValidation, setShowDatasetValidation] = useState(false);

  const draftIsDirty = Boolean(
    selectedProject
      && (draftName.trim() !== selectedProject.name
        || !aiConfigurationsEqual(draftConfiguration, selectedProject.configuration)
        || !aiDatasetsEqual(draftDatasets, selectedProject.datasets)),
  );
  const createNameIssue = validateAiProjectName(newProjectName);
  const editorNameIssue = validateAiProjectName(draftName);
  const configurationValidation = validateAiConfiguration(draftConfiguration, { currentYear });
  const editorIsValid = configurationValidation.valid && editorNameIssue === null;
  const metrics = (() => {
    try {
      return calculateAiModelMetrics(draftConfiguration, draftDatasets);
    } catch {
      return null;
    }
  })();

  const candidateDataset: AiDataset = {
    id: nextDatasetId(draftDatasets),
    name: datasetForm.name.trim(),
    modality: datasetForm.modality,
    sizeGb: Number(datasetForm.sizeGb),
    qualityScore: Number(datasetForm.qualityScore),
    diversityScore: Number(datasetForm.diversityScore),
    license: datasetForm.license,
    processingCostUsd: Number(datasetForm.processingCostUsd),
  };
  const datasetValidation = validateAiDataset(candidateDataset);

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

    const initialConfiguration = createDefaultAiConfiguration();
    const projectId = await onCreateProject(newProjectName.trim(), initialConfiguration);
    if (!projectId) {
      return;
    }

    setSelectedProjectId(projectId);
    setDraftName(newProjectName.trim());
    setDraftConfiguration(initialConfiguration);
    setDraftDatasets([]);
    setNewProjectName("");
    setShowCreateValidation(false);
    setShowEditorValidation(false);
  }

  function loadProject(projectId: string) {
    const project = state.aiProjects.find((candidate) => candidate.id === projectId);
    if (!project) {
      return;
    }

    setSelectedProjectId(project.id);
    setDraftName(project.name);
    setDraftConfiguration(cloneAiConfiguration(project.configuration));
    setDraftDatasets(cloneAiDatasets(project.datasets));
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
    setDraftConfiguration(cloneAiConfiguration(version.configuration));
    setDraftDatasets(cloneAiDatasets(version.datasets));
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
    await onSaveVersion(selectedProject.id, draftName.trim(), draftConfiguration, draftDatasets);
  }

  function handleAddDataset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowDatasetValidation(true);
    if (!datasetValidation.valid || draftDatasets.length >= AI_LIMITS.maxDatasets) {
      return;
    }

    setDraftDatasets((current) => [...current, candidateDataset]);
    setDatasetForm((current) => ({ ...current, name: "" }));
    setShowDatasetValidation(false);
  }

  function removeDataset(datasetId: string) {
    setDraftDatasets((current) => current.filter((dataset) => dataset.id !== datasetId));
  }

  function updateField(key: AiConfigurationField, value: AiConfiguration[AiConfigurationField]) {
    setDraftConfiguration((current) => ({ ...current, [key]: value }));
  }

  function updateNumberField(key: (typeof NUMBER_FIELDS)[number]["key"], value: string) {
    updateField(key, Number(value));
  }

  const fieldError = (key: AiConfigurationField): AiValidationIssue | undefined =>
    (showEditorValidation || draftIsDirty) ? configurationValidation.errors[key] : undefined;

  function selectOptions(key: SelectFieldKey): SelectOption[] {
    switch (key) {
      case "architecture":
        return AI_ARCHITECTURE_OPTIONS.map((value) => ({ value, label: copy.options.architecture[value] }));
      case "precision":
        return AI_PRECISION_OPTIONS.map((value) => ({ value, label: copy.options.precision[value] }));
      case "quantization":
        return AI_QUANTIZATION_OPTIONS.map((value) => ({ value, label: copy.options.quantization[value] }));
    }
  }

  function selectValue(key: SelectFieldKey): string {
    return String(draftConfiguration[key]);
  }

  function updateSelect(key: SelectFieldKey, value: string) {
    if (key === "architecture") {
      updateField("architecture", value as AiConfiguration["architecture"]);
    } else if (key === "precision") {
      updateField("precision", value as AiPrecision);
    } else {
      updateField("quantization", value as AiQuantization);
    }
  }

  function updateDatasetForm<K extends keyof typeof datasetForm>(key: K, value: (typeof datasetForm)[K]) {
    setDatasetForm((current) => ({ ...current, [key]: value }));
  }

  function validationText(error: AiValidationIssue): string {
    switch (error.code) {
      case "invalid-option":
        return copy.validation.invalidOption;
      case "integer":
        return copy.validation.integer
          .replace("{min}", formatNumber(error.min ?? 0, locale))
          .replace("{max}", formatNumber(error.max ?? 0, locale));
      case "number-range":
        return copy.validation.numberRange
          .replace("{min}", formatNumber(error.min ?? 0, locale))
          .replace("{max}", formatNumber(error.max ?? 0, locale));
      case "attention-heads-divisible":
        return copy.validation.attentionHeadsDivisible;
      case "experts-only-moe":
        return copy.validation.expertsOnlyMoe;
      case "moe-requires-experts":
        return copy.validation.moeRequiresExperts;
      case "future-technology":
        return copy.validation.futureTechnology.replace("{year}", String(error.year ?? ""));
      case "dataset-name":
        return copy.validation.datasetName
          .replace("{min}", formatNumber(error.min ?? 0, locale))
          .replace("{max}", formatNumber(error.max ?? 0, locale));
      case "dataset-size":
        return copy.validation.datasetSize
          .replace("{min}", formatDecimal(error.min ?? 0, locale))
          .replace("{max}", formatNumber(error.max ?? 0, locale));
      case "dataset-quality":
        return copy.validation.datasetQuality;
      case "dataset-diversity":
        return copy.validation.datasetDiversity;
      case "dataset-cost":
        return copy.validation.datasetCost;
      case "dataset-limit":
        return copy.validation.datasetLimit.replace("{max}", formatNumber(error.max ?? 0, locale));
      case "duplicate-dataset-id":
        return copy.validation.duplicateDatasetId;
    }
  }

  function datasetFieldError(key: keyof AiDataset): string | undefined {
    if (!showDatasetValidation) {
      return undefined;
    }
    const issue = datasetValidation.errors[key];
    return issue ? validationText(issue) : undefined;
  }

  function renderSelectField(key: SelectFieldKey) {
    const error = fieldError(key);
    return (
      <div className="cpu-field" key={key}>
        <label htmlFor={`ai-field-${key}`}>{copy.fields[key]}</label>
        <select
          aria-invalid={Boolean(error)}
          disabled={isSaving}
          id={`ai-field-${key}`}
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

  function renderNumberField(field: (typeof NUMBER_FIELDS)[number]) {
    const error = fieldError(field.key);
    return (
      <div className="cpu-field" key={field.key}>
        <label htmlFor={`ai-field-${field.key}`}>{copy.fields[field.key]}</label>
        <input
          aria-invalid={Boolean(error)}
          disabled={isSaving}
          id={`ai-field-${field.key}`}
          max={field.max}
          min={field.min}
          onChange={(event) => updateNumberField(field.key, event.currentTarget.value)}
          step={1}
          type="number"
          value={draftConfiguration[field.key]}
        />
        {error && <p className="cpu-field__error" role="alert">{validationText(error)}</p>}
      </div>
    );
  }

  return (
    <div className="page-stack ai-designer">
      <ProductWorkspaceTabs
        active="ai"
        aiLabel={t.productWorkspace.ai}
        componentsLabel={t.productWorkspace.components}
        cpuLabel={t.productWorkspace.cpu}
        label={t.productWorkspace.label}
        onOpenAi={() => undefined}
        onOpenComponents={onOpenComponents}
        onOpenCpu={onOpenCpu}
        onOpenOs={onOpenOs}
        osLabel={t.productWorkspace.os}
      />

      <section className="ai-simulation-banner" role="note" aria-labelledby="ai-simulation-title">
        <span className="ai-simulation-banner__icon" aria-hidden="true"><BrainCircuit size={24} /></span>
        <div>
          <p className="eyebrow">{copy.simulationPill}</p>
          <h2 id="ai-simulation-title">{copy.simulationTitle}</h2>
          <p>{copy.simulationText}</p>
        </div>
      </section>

      <section className="cpu-project-panel">
        <div className="cpu-project-panel__intro">
          <span className="cpu-project-panel__icon" aria-hidden="true"><BrainCircuit size={21} /></span>
          <div>
            <h2>{copy.createTitle}</h2>
            <p>{copy.createHint}</p>
          </div>
        </div>
        <form className="company-form" noValidate onSubmit={handleCreateProject}>
          <div className="field-group">
            <label htmlFor="ai-new-project-name">{copy.createNameLabel}</label>
            <input
              disabled={isSaving}
              id="ai-new-project-name"
              maxLength={AI_LIMITS.projectName.max}
              onChange={(event) => setNewProjectName(event.currentTarget.value)}
              placeholder={copy.createNamePlaceholder}
              value={newProjectName}
            />
            {showCreateValidation && createNameIssue && (
              <p className="field-error" role="alert">
                {createNameIssue.code === "required"
                  ? copy.validation.nameRequired
                  : copy.validation.nameLength
                    .replace("{min}", String(AI_LIMITS.projectName.min))
                    .replace("{max}", String(AI_LIMITS.projectName.max))}
              </p>
            )}
            <p className="field-hint">{copy.createNameHint}</p>
          </div>
          <div className="company-form__footer">
            <button className="button button--primary" disabled={isSaving} type="submit">
              {copy.createButton}
            </button>
          </div>
        </form>
      </section>

      {state.aiProjects.length > 0 && (
        <section className="cpu-project-panel ai-project-picker">
          <div className="cpu-project-panel__intro">
            <span className="cpu-project-panel__icon" aria-hidden="true"><Database size={21} /></span>
            <div>
              <h2>{copy.projectsTitle}</h2>
              <p>{copy.projectsHint}</p>
            </div>
          </div>
          <div className="field-group">
            <label htmlFor="ai-project-select">{copy.projectLabel}</label>
            <select
              disabled={isSaving}
              id="ai-project-select"
              onChange={(event) => handleProjectSelection(event.currentTarget.value)}
              value={selectedProjectId ?? ""}
            >
              {state.aiProjects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>
        </section>
      )}

      {selectedProject ? (
        <>
          <form className="cpu-editor-card ai-editor-card" noValidate onSubmit={handleSave}>
            <div className="cpu-editor-card__header">
              <div>
                <h2>{copy.editorTitle}</h2>
                <p>{copy.editorHint}</p>
              </div>
              <span className="status-pill">{copy.versionLabel} {selectedProject.versions.length}</span>
            </div>

            <div className="cpu-fields-grid">
              <div className="cpu-field cpu-field--wide">
                <label htmlFor="ai-project-name">{copy.nameLabel}</label>
                <input
                  disabled={isSaving}
                  id="ai-project-name"
                  maxLength={AI_LIMITS.projectName.max}
                  onChange={(event) => setDraftName(event.currentTarget.value)}
                  value={draftName}
                />
                {(showEditorValidation || draftIsDirty) && editorNameIssue && (
                  <p className="cpu-field__error" role="alert">
                    {editorNameIssue.code === "required"
                      ? copy.validation.nameRequired
                      : copy.validation.nameLength
                        .replace("{min}", String(AI_LIMITS.projectName.min))
                        .replace("{max}", String(AI_LIMITS.projectName.max))}
                  </p>
                )}
              </div>
              {renderSelectField("architecture")}
              {NUMBER_FIELDS.map(renderNumberField)}
              {renderSelectField("precision")}
              {renderSelectField("quantization")}
            </div>

            <div className="ai-model-size-note">
              <Gauge aria-hidden="true" size={18} />
              <span>{copy.metrics.modelSize}: <strong>{formatDecimal(metrics?.modelSizeGb ?? 0, locale)} {copy.units.gb}</strong></span>
            </div>

            <div className="cpu-editor-actions">
              <button
                className="button button--primary"
                disabled={isSaving || !draftIsDirty || !editorIsValid}
                type="submit"
              >
                <Save aria-hidden="true" size={17} />
                {isSaving ? t.common.saving : copy.saveButton}
              </button>
              {!draftIsDirty && <><span aria-hidden="true"> </span><span className="cpu-editor-actions__hint">{copy.noChanges}</span></>}
            </div>
          </form>

          <section className="ai-datasets-section">
            <div className="section-heading">
              <span className="section-heading__icon" aria-hidden="true"><Database size={20} /></span>
              <div>
                <h2>{copy.datasets.title}</h2>
                <p>{copy.datasets.hint}</p>
              </div>
            </div>

            <form className="ai-dataset-form" noValidate onSubmit={handleAddDataset}>
              <div className="cpu-fields-grid">
                <div className="cpu-field cpu-field--wide">
                  <label htmlFor="ai-dataset-name">{copy.datasets.name}</label>
                  <input
                    disabled={isSaving}
                    id="ai-dataset-name"
                    maxLength={AI_LIMITS.datasetName.max}
                    onChange={(event) => updateDatasetForm("name", event.currentTarget.value)}
                    placeholder={copy.datasets.namePlaceholder}
                    value={datasetForm.name}
                  />
                  {datasetFieldError("name") && <p className="cpu-field__error" role="alert">{datasetFieldError("name")}</p>}
                </div>
                <div className="cpu-field">
                  <label htmlFor="ai-dataset-modality">{copy.datasets.modality}</label>
                  <select
                    disabled={isSaving}
                    id="ai-dataset-modality"
                    onChange={(event) =>
                      updateDatasetForm("modality", event.currentTarget.value as AiDatasetModality)
                    }
                    value={datasetForm.modality}
                  >
                    {AI_DATASET_MODALITY_OPTIONS.map((value) => (
                      <option key={value} value={value}>{copy.options.modality[value]}</option>
                    ))}
                  </select>
                </div>
                <div className="cpu-field">
                  <label htmlFor="ai-dataset-size">{copy.datasets.size}</label>
                  <input
                    disabled={isSaving}
                    id="ai-dataset-size"
                    min={AI_LIMITS.datasetSizeGb.min}
                    onChange={(event) => updateDatasetForm("sizeGb", event.currentTarget.value)}
                    step={0.1}
                    type="number"
                    value={datasetForm.sizeGb}
                  />
                  {datasetFieldError("sizeGb") && <p className="cpu-field__error" role="alert">{datasetFieldError("sizeGb")}</p>}
                </div>
                <div className="cpu-field">
                  <label htmlFor="ai-dataset-quality">{copy.datasets.quality}</label>
                  <input
                    disabled={isSaving}
                    id="ai-dataset-quality"
                    max={AI_LIMITS.datasetQualityScore.max}
                    min={AI_LIMITS.datasetQualityScore.min}
                    onChange={(event) => updateDatasetForm("qualityScore", event.currentTarget.value)}
                    step={1}
                    type="number"
                    value={datasetForm.qualityScore}
                  />
                  {datasetFieldError("qualityScore") && <p className="cpu-field__error" role="alert">{datasetFieldError("qualityScore")}</p>}
                </div>
                <div className="cpu-field">
                  <label htmlFor="ai-dataset-diversity">{copy.datasets.diversity}</label>
                  <input
                    disabled={isSaving}
                    id="ai-dataset-diversity"
                    max={AI_LIMITS.datasetDiversityScore.max}
                    min={AI_LIMITS.datasetDiversityScore.min}
                    onChange={(event) => updateDatasetForm("diversityScore", event.currentTarget.value)}
                    step={1}
                    type="number"
                    value={datasetForm.diversityScore}
                  />
                  {datasetFieldError("diversityScore") && <p className="cpu-field__error" role="alert">{datasetFieldError("diversityScore")}</p>}
                </div>
                <div className="cpu-field">
                  <label htmlFor="ai-dataset-license">{copy.datasets.license}</label>
                  <select
                    disabled={isSaving}
                    id="ai-dataset-license"
                    onChange={(event) =>
                      updateDatasetForm("license", event.currentTarget.value as AiDatasetLicense)
                    }
                    value={datasetForm.license}
                  >
                    {AI_DATASET_LICENSE_OPTIONS.map((value) => (
                      <option key={value} value={value}>{copy.options.license[value]}</option>
                    ))}
                  </select>
                </div>
                <div className="cpu-field">
                  <label htmlFor="ai-dataset-cost">{copy.datasets.processingCost}</label>
                  <input
                    disabled={isSaving}
                    id="ai-dataset-cost"
                    min={AI_LIMITS.datasetProcessingCostUsd.min}
                    onChange={(event) => updateDatasetForm("processingCostUsd", event.currentTarget.value)}
                    step={1}
                    type="number"
                    value={datasetForm.processingCostUsd}
                  />
                  {datasetFieldError("processingCostUsd") && (
                    <p className="cpu-field__error" role="alert">{datasetFieldError("processingCostUsd")}</p>
                  )}
                </div>
              </div>
              <div className="ai-dataset-form__footer">
                <button className="button button--primary" disabled={isSaving || draftDatasets.length >= AI_LIMITS.maxDatasets} type="submit">
                  {copy.datasets.addButton}
                </button>
                <span className="field-hint">
                  {copy.datasets.count
                    .replace("{count}", String(draftDatasets.length))
                    .replace("{max}", String(AI_LIMITS.maxDatasets))}
                </span>
              </div>
            </form>

            {draftDatasets.length === 0 ? (
              <div className="ai-dataset-empty">
                <Database aria-hidden="true" size={22} />
                <div>
                  <h3>{copy.datasets.emptyTitle}</h3>
                  <p>{copy.datasets.emptyHint}</p>
                </div>
              </div>
            ) : (
              <ul className="ai-dataset-list">
                {draftDatasets.map((dataset) => (
                  <li className="ai-dataset-card" key={dataset.id}>
                    <div className="ai-dataset-card__header">
                      <div>
                        <h3>{dataset.name}</h3>
                        <p>{copy.options.modality[dataset.modality]} · {formatDecimal(dataset.sizeGb, locale)} {copy.units.gb}</p>
                      </div>
                      <button
                        aria-label={copy.datasets.removeButton.replace("{name}", dataset.name)}
                        className="button button--danger button--compact"
                        disabled={isSaving}
                        onClick={() => removeDataset(dataset.id)}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" size={15} />
                        {copy.datasets.removeButton.replace("{name}", dataset.name)}
                      </button>
                    </div>
                    <dl className="ai-dataset-card__stats">
                      <div><dt>{copy.datasets.quality}</dt><dd>{formatNumber(dataset.qualityScore, locale)}</dd></div>
                      <div><dt>{copy.datasets.diversity}</dt><dd>{formatNumber(dataset.diversityScore, locale)}</dd></div>
                      <div><dt>{copy.datasets.license}</dt><dd>{copy.options.license[dataset.license]}</dd></div>
                      <div><dt>{copy.datasets.processingCost}</dt><dd>{formatNumber(dataset.processingCostUsd, locale)}</dd></div>
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {metrics && (
            <>
              <section className="ai-metrics-section">
                <div className="section-heading">
                  <span className="section-heading__icon" aria-hidden="true"><Gauge size={20} /></span>
                  <div>
                    <h2>{copy.metrics.title}</h2>
                    <p>{copy.metrics.hint}</p>
                  </div>
                </div>
                <div className="metrics-grid">
                  <MetricCard
                    accent="blue"
                    detail={copy.metrics.qualityHint}
                    icon={BrainCircuit}
                    label={copy.metrics.quality}
                    value={formatDecimal(metrics.qualityScore, locale)}
                  />
                  <MetricCard
                    accent="violet"
                    detail={copy.metrics.commercialHint}
                    icon={CheckCircle2}
                    label={copy.metrics.commercial}
                    value={formatDecimal(metrics.commercialReadinessScore, locale)}
                  />
                  <MetricCard
                    accent="amber"
                    detail={copy.metrics.trainingVramHint}
                    icon={Cpu}
                    label={copy.metrics.trainingVram}
                    value={`${formatDecimal(metrics.trainingVramGb, locale)} ${copy.units.gb}`}
                  />
                  <MetricCard
                    accent="green"
                    detail={copy.metrics.inferenceVramHint}
                    icon={HardDrive}
                    label={copy.metrics.inferenceVram}
                    value={`${formatDecimal(metrics.inferenceVramGb, locale)} ${copy.units.gb}`}
                  />
                </div>
                <dl className="os-metric-list">
                  <div><dt>{copy.metrics.modelSize}</dt><dd>{formatDecimal(metrics.modelSizeGb, locale)} {copy.units.gb}</dd></div>
                  <div><dt>{copy.metrics.datasetQuality}</dt><dd>{formatDecimal(metrics.datasetQualityScore, locale)}</dd></div>
                  <div><dt>{copy.metrics.datasetDiversity}</dt><dd>{formatDecimal(metrics.datasetDiversityScore, locale)}</dd></div>
                  <div><dt>{copy.metrics.license}</dt><dd>{formatDecimal(metrics.licenseComplianceScore, locale)}</dd></div>
                  <div><dt>{copy.metrics.trainingReadiness}</dt><dd>{formatDecimal(metrics.trainingReadinessScore, locale)}</dd></div>
                  <div><dt>{copy.metrics.inferenceEfficiency}</dt><dd>{formatDecimal(metrics.inferenceEfficiencyScore, locale)}</dd></div>
                  <div><dt>{copy.metrics.appeal}</dt><dd>{formatDecimal(metrics.appealScore, locale)}</dd></div>
                </dl>
              </section>

              <section className="ai-hardware-section">
                <div className="section-heading">
                  <span className="section-heading__icon" aria-hidden="true"><Cpu size={20} /></span>
                  <div>
                    <h2>{copy.hardware.title}</h2>
                    <p>{copy.hardware.hint}</p>
                  </div>
                </div>
                <div className="ai-hardware-grid">
                  <div className="ai-hardware-card">
                    <span className="ai-hardware-card__label">{copy.hardware.gpu}</span>
                    <strong>{formatDecimal(metrics.minimumGpuTflops, locale)} {copy.units.tflops}</strong>
                  </div>
                  <div className="ai-hardware-card">
                    <span className="ai-hardware-card__label">{copy.hardware.trainingVram}</span>
                    <strong>{formatDecimal(metrics.trainingVramGb, locale)} {copy.units.gb}</strong>
                  </div>
                  <div className="ai-hardware-card">
                    <span className="ai-hardware-card__label">{copy.hardware.inferenceVram}</span>
                    <strong>{formatDecimal(metrics.inferenceVramGb, locale)} {copy.units.gb}</strong>
                  </div>
                  <div className="ai-hardware-card">
                    <span className="ai-hardware-card__label">{copy.hardware.ram}</span>
                    <strong>{formatDecimal(metrics.systemRamGb, locale)} {copy.units.gb}</strong>
                  </div>
                  <div className="ai-hardware-card">
                    <span className="ai-hardware-card__label">{copy.hardware.storage}</span>
                    <strong>{formatDecimal(metrics.storageGb, locale)} {copy.units.gb}</strong>
                  </div>
                  <div className="ai-hardware-card ai-hardware-card--recommended">
                    <span className="ai-hardware-card__label">{copy.hardware.recommended}</span>
                    <strong>{formatDecimal(metrics.recommendedGpuVramGb, locale)} {copy.units.gb}</strong>
                  </div>
                </div>
                <p className="ai-hardware-note">{copy.hardware.note}</p>
              </section>
            </>
          )}

          <section className="cpu-version-section">
            <div className="section-heading">
              <span className="section-heading__icon" aria-hidden="true"><Save size={20} /></span>
              <div>
                <h2>{copy.versions.title}</h2>
                <p>{copy.versions.hint}</p>
              </div>
            </div>
            <ul className="cpu-version-list">
              {[...selectedProject.versions].reverse().map((version) => (
                <li className="cpu-version-card" key={version.version}>
                  <div>
                    <strong>{copy.versions.version.replace("{version}", String(version.version))}</strong>
                    {" "}
                    <span>{formatShortGameDate(version.savedOn, locale)}</span>
                    {" · "}
                    <span>{copy.versions.datasetCount.replace("{count}", String(version.datasets.length))}</span>
                  </div>
                  <button
                    className="button button--secondary button--compact"
                    disabled={isSaving}
                    onClick={() => requestLoadVersion(version.version)}
                    type="button"
                  >
                    {copy.versions.load}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <section className="ai-empty-state">
          <TriangleAlert aria-hidden="true" size={24} />
          <div>
            <h2>{copy.noProjectsTitle}</h2>
            <p>{copy.noProjectsHint}</p>
          </div>
        </section>
      )}

      {pendingAction && (
        <ConfirmationBottomSheet
          cancelLabel={t.cpu.unsavedCancel}
          confirmLabel={t.cpu.unsavedConfirm}
          message={t.cpu.unsavedMessage}
          onCancel={() => setPendingAction(null)}
          onConfirm={confirmPendingAction}
          title={t.cpu.unsavedTitle}
        />
      )}
    </div>
  );
}
