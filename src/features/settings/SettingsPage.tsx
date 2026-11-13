import { useRef, useState } from "react";
import {
  ArchiveRestore,
  Check,
  Download,
  Globe2,
  HardDrive,
  Moon,
  RefreshCw,
  Save,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import type { GameSettings, GameState, Locale, Theme } from "../../game/models/game-state";
import { translations } from "../../localization/messages";
import { formatCurrency, formatGameDate } from "../../localization/formatters";
import {
  SAVE_SLOT_IDS,
  type SaveMetadata,
  type SaveOverview,
  type SaveSlotInfo,
} from "../../storage/repositories/SaveManagement";
import { GameJourney } from "./GameJourney";

interface SettingsPageProps {
  state: GameState;
  onUpdate: (settings: Partial<GameSettings>) => void;
  saveOverview: SaveOverview | null;
  isSaveBusy: boolean;
  saveManagementError: boolean;
  onRefreshSaves: () => void;
  onSaveToSlot: (slotId: string) => Promise<boolean>;
  onLoadSlot: (slotId: string) => Promise<boolean>;
  onDeleteSlot: (slotId: string) => Promise<boolean>;
  onExportSave: () => Promise<string | null>;
  onImportSave: (serialized: string) => Promise<boolean>;
  onRestoreBackup: () => Promise<boolean>;
}

type PendingSaveAction =
  | { type: "load"; slotId: string }
  | { type: "delete"; slotId: string }
  | { type: "restore" }
  | null;

interface SaveFeedback {
  tone: "success" | "error";
  text: string;
}

export function SettingsPage({
  state,
  onUpdate,
  saveOverview,
  isSaveBusy,
  saveManagementError,
  onRefreshSaves,
  onSaveToSlot,
  onLoadSlot,
  onDeleteSlot,
  onExportSave,
  onImportSave,
  onRestoreBackup,
}: SettingsPageProps) {
  const locale = state.settings.locale;
  const t = translations[locale];
  const copy = t.settings.saveManagement;
  const languages: Array<{ id: Locale; label: string }> = [
    { id: "ru", label: t.settings.russian },
    { id: "en", label: t.settings.english },
  ];
  const themes: Array<{ id: Theme; label: string; icon: typeof Sun }> = [
    { id: "light", label: t.settings.light, icon: Sun },
    { id: "dark", label: t.settings.dark, icon: Moon },
  ];
  const [pendingAction, setPendingAction] = useState<PendingSaveAction>(null);
  const [feedback, setFeedback] = useState<SaveFeedback | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isBusy = isSaveBusy || busyAction !== null;
  const slotsSupported = saveOverview?.supported === true;

  const runSaveAction = async (
    key: string,
    action: () => Promise<boolean>,
    successText: string,
  ): Promise<boolean> => {
    setBusyAction(key);
    setFeedback(null);
    try {
      const succeeded = await action();
      setFeedback({
        tone: succeeded ? "success" : "error",
        text: succeeded ? successText : copy.actionError,
      });
      return succeeded;
    } catch {
      setFeedback({ tone: "error", text: copy.actionError });
      return false;
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveSlot = async (slotId: string) => {
    await runSaveAction(`save-${slotId}`, () => onSaveToSlot(slotId), copy.saveSuccess);
  };

  const handleConfirm = async () => {
    if (!pendingAction) {
      return;
    }

    if (pendingAction.type === "restore") {
      const succeeded = await runSaveAction("restore", onRestoreBackup, copy.restoreSuccess);
      if (succeeded) {
        setPendingAction(null);
      }
      return;
    }

    if (pendingAction.type === "load") {
      const succeeded = await runSaveAction(
        `load-${pendingAction.slotId}`,
        () => onLoadSlot(pendingAction.slotId),
        copy.loadSuccess,
      );
      if (succeeded) {
        setPendingAction(null);
      }
      return;
    }

    const succeeded = await runSaveAction(
      `delete-${pendingAction.slotId}`,
      () => onDeleteSlot(pendingAction.slotId),
      copy.deleteSuccess,
    );
    if (succeeded) {
      setPendingAction(null);
    }
  };

  const handleExport = async () => {
    setBusyAction("export");
    setFeedback(null);
    try {
      const serialized = await onExportSave();
      if (!serialized) {
        throw new Error("Export failed.");
      }

      if (typeof URL.createObjectURL === "function") {
        const blob = new Blob([serialized], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `silicon-dynasty-${state.gameDate}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
      }

      setFeedback({ tone: "success", text: copy.exportSuccess });
    } catch {
      setFeedback({ tone: "error", text: copy.actionError });
    } finally {
      setBusyAction(null);
    }
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    setBusyAction("import");
    setFeedback(null);
    try {
      const serialized = await file.text();
      const succeeded = await onImportSave(serialized);
      setFeedback({
        tone: succeeded ? "success" : "error",
        text: succeeded ? copy.importSuccess : copy.importError,
      });
    } catch {
      setFeedback({ tone: "error", text: copy.importError });
    } finally {
      setBusyAction(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const formatSavedAt = (value: string | null): string => {
    if (!value) {
      return copy.unknownTime;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return copy.unknownTime;
    }

    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  const metadataRows = (metadata: SaveMetadata | SaveSlotInfo | null) => {
    if (!metadata) {
      return null;
    }

    return (
      <dl className="save-metadata">
        <div>
          <dt>{copy.gameDate}</dt>
          <dd>{formatGameDate(metadata.gameDate, locale)}</dd>
        </div>
        <div>
          <dt>{copy.company}</dt>
          <dd>{metadata.companyName}</dd>
        </div>
        <div>
          <dt>{copy.balance}</dt>
          <dd>{formatCurrency(metadata.balanceUsd, locale)}</dd>
        </div>
        <div>
          <dt>{copy.savedAt}</dt>
          <dd>{formatSavedAt(metadata.savedAt)}</dd>
        </div>
      </dl>
    );
  };

  const slotNumber = (slotId: string): string => String(SAVE_SLOT_IDS.indexOf(slotId as (typeof SAVE_SLOT_IDS)[number]) + 1);
  const pendingMessage = pendingAction?.type === "restore"
    ? copy.restoreConfirm
    : pendingAction?.type === "delete"
      ? copy.deleteConfirm.replace("{number}", slotNumber(pendingAction.slotId))
      : pendingAction?.type === "load"
        ? copy.loadConfirm.replace("{number}", slotNumber(pendingAction.slotId))
        : null;

  return (
    <div className="page-stack settings-stack">
      <section className="preference-card">
        <div className="preference-card__heading">
          <span className="preference-icon preference-icon--blue" aria-hidden="true"><Globe2 size={19} /></span>
          <div>
            <h2>{t.settings.language}</h2>
            <p>{t.settings.languageHint}</p>
          </div>
        </div>
        <div className="segmented-control" role="group" aria-label={t.settings.language}>
          {languages.map(({ id, label }) => (
            <button
              aria-pressed={locale === id}
              className={`segment-button${locale === id ? " is-selected" : ""}`}
              key={id}
              onClick={() => onUpdate({ locale: id })}
              type="button"
            >
              <span>{label}</span>
              {locale === id && <Check aria-hidden="true" size={16} />}
            </button>
          ))}
        </div>
      </section>

      <section className="preference-card">
        <div className="preference-card__heading">
          <span className="preference-icon preference-icon--violet" aria-hidden="true"><Sun size={19} /></span>
          <div>
            <h2>{t.settings.appearance}</h2>
            <p>{t.settings.appearanceHint}</p>
          </div>
        </div>
        <div className="segmented-control" role="group" aria-label={t.settings.appearance}>
          {themes.map(({ id, label, icon: Icon }) => (
            <button
              aria-pressed={state.settings.theme === id}
              className={`segment-button${state.settings.theme === id ? " is-selected" : ""}`}
              key={id}
              onClick={() => onUpdate({ theme: id })}
              type="button"
            >
              <Icon aria-hidden="true" size={16} />
              <span>{label}</span>
              {state.settings.theme === id && <Check aria-hidden="true" className="segment-button__check" size={16} />}
            </button>
          ))}
        </div>
      </section>

      <section className="save-management-card" aria-labelledby="save-management-title">
        <div className="save-management-heading">
          <div className="preference-card__heading">
            <span className="preference-icon preference-icon--green" aria-hidden="true"><HardDrive size={19} /></span>
            <div>
              <h2 id="save-management-title">{copy.title}</h2>
              <p>{copy.hint}</p>
            </div>
          </div>
          <button
            aria-label={copy.refresh}
            className="icon-button"
            disabled={isBusy}
            onClick={onRefreshSaves}
            type="button"
          >
            <RefreshCw aria-hidden="true" size={16} />
          </button>
        </div>

        {saveManagementError && (
          <p className="inline-feedback inline-feedback--error" role="alert">{copy.loadError}</p>
        )}

        {!saveOverview && !saveManagementError && (
          <p className="save-management-loading" role="status">{copy.loading}</p>
        )}

        {saveOverview && !slotsSupported && (
          <p className="save-management-unavailable">{copy.unavailable}</p>
        )}

        {slotsSupported && saveOverview && (
          <>
            <div className="save-autosave-card">
              <div className="save-card-heading">
                <span className="save-card-heading__icon" aria-hidden="true"><Save size={16} /></span>
                <strong>{copy.autosaveTitle}</strong>
                <span className="status-pill status-pill--success">{copy.autosaveActive}</span>
              </div>
              <p>{copy.autosaveHint}</p>
              {saveOverview.autosave ? metadataRows(saveOverview.autosave) : <p className="save-empty">{copy.noAutosave}</p>}
            </div>

            <div className="save-backup-card">
              <div className="save-card-heading">
                <span className="save-card-heading__icon" aria-hidden="true"><ArchiveRestore size={16} /></span>
                <strong>{copy.backupTitle}</strong>
              </div>
              <p>{copy.backupHint}</p>
              {saveOverview.backup ? (
                <>
                  {metadataRows(saveOverview.backup)}
                  <button
                    className="button button--secondary"
                    disabled={isBusy}
                    onClick={() => setPendingAction({ type: "restore" })}
                    type="button"
                  >
                    <ArchiveRestore aria-hidden="true" size={16} />
                    <span>{copy.restoreBackup}</span>
                  </button>
                </>
              ) : (
                <p className="save-empty">{copy.noBackup}</p>
              )}
            </div>

            <div className="save-slots">
              <div className="save-section-heading">
                <div>
                  <strong>{copy.slotsTitle}</strong>
                  <p>{copy.slotsHint}</p>
                </div>
              </div>
              <ul className="save-slot-list">
                {SAVE_SLOT_IDS.map((slotId, index) => {
                  const slot = saveOverview.slots.find((candidate) => candidate.slotId === slotId) ?? null;
                  return (
                    <li className="save-slot" key={slotId}>
                      <div className="save-slot__heading">
                        <strong>{copy.slotLabel.replace("{number}", String(index + 1))}</strong>
                        {slot ? (
                          <span className="status-pill">{copy.slotFilled}</span>
                        ) : (
                          <span className="status-pill">{copy.slotEmpty}</span>
                        )}
                      </div>
                      {slot ? metadataRows(slot) : <p className="save-empty">{copy.emptySlotHint}</p>}
                      <div className="save-slot__actions">
                        <button
                          className="button button--secondary"
                          disabled={isBusy}
                          onClick={() => void handleSaveSlot(slotId)}
                          type="button"
                        >
                          <Save aria-hidden="true" size={15} />
                          <span>{copy.saveToSlot}</span>
                        </button>
                        <button
                          className="button button--secondary"
                          disabled={isBusy || !slot}
                          onClick={() => setPendingAction({ type: "load", slotId })}
                          type="button"
                        >
                          <Upload aria-hidden="true" size={15} />
                          <span>{copy.loadSlot}</span>
                        </button>
                        <button
                          className="button button--danger"
                          disabled={isBusy || !slot}
                          onClick={() => setPendingAction({ type: "delete", slotId })}
                          type="button"
                        >
                          <Trash2 aria-hidden="true" size={15} />
                          <span>{copy.deleteSlot}</span>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="save-transfer">
              <div className="save-section-heading">
                <div>
                  <strong>{copy.transferTitle}</strong>
                  <p>{copy.transferHint}</p>
                </div>
              </div>
              <div className="save-transfer__actions">
                <button
                  className="button button--secondary"
                  disabled={isBusy}
                  onClick={() => void handleExport()}
                  type="button"
                >
                  <Download aria-hidden="true" size={16} />
                  <span>{copy.exportSave}</span>
                </button>
                <label className={`button button--secondary${isBusy ? " is-disabled" : ""}`}>
                  <Upload aria-hidden="true" size={16} />
                  <span>{copy.importSave}</span>
                  <input
                    accept=".json,application/json"
                    className="visually-hidden"
                    disabled={isBusy}
                    onChange={(event) => void handleImportFile(event.target.files?.[0])}
                    ref={fileInputRef}
                    type="file"
                  />
                </label>
              </div>
            </div>
          </>
        )}

        {feedback && (
          <p
            className={`inline-feedback${feedback.tone === "error" ? " inline-feedback--error" : ""}`}
            role={feedback.tone === "error" ? "alert" : "status"}
          >
            {feedback.text}
          </p>
        )}

        {pendingMessage && (
          <div className="save-confirm" role="alertdialog" aria-label={copy.confirmTitle}>
            <div>
              <strong>{copy.confirmTitle}</strong>
              <p>{pendingMessage}</p>
            </div>
            <div className="save-confirm__actions">
              <button
                className="button button--secondary"
                disabled={isBusy}
                onClick={() => setPendingAction(null)}
                type="button"
              >
                {copy.cancel}
              </button>
              <button
                className="button button--primary"
                disabled={isBusy}
                onClick={() => void handleConfirm()}
                type="button"
              >
                {isBusy ? t.common.saving : copy.confirm}
              </button>
            </div>
          </div>
        )}
      </section>

      <GameJourney state={state} />

      <aside className="local-save-card">
        <span className="preference-icon preference-icon--green" aria-hidden="true"><ShieldCheck size={19} /></span>
        <div>
          <h2>{t.settings.localDataTitle}</h2>
          <p>{t.settings.localDataBody}</p>
        </div>
      </aside>
    </div>
  );
}
