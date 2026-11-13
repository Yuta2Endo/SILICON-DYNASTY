import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { GameApplication } from "../game/application/game-application";
import type { GameState } from "../game/models/game-state";
import type { SaveOverview } from "../storage/repositories/SaveManagement";
import { syncStatusBar, triggerHaptic } from "../native/native-services";

export interface RunCommandOptions {
  suppressErrorAlert?: boolean;
}

export interface GameSession {
  state: GameState | null;
  isLoading: boolean;
  isSaving: boolean;
  hasLoadError: boolean;
  hasCommandError: boolean;
  showSavedFeedback: boolean;
  saveOverview: SaveOverview | null;
  isSaveOverviewLoading: boolean;
  saveManagementError: boolean;
  canRestoreBackup: boolean;
  isRestoringBackup: boolean;
  restoreBackupError: boolean;
  setSaveOverview: Dispatch<SetStateAction<SaveOverview | null>>;
  setSaveManagementError: Dispatch<SetStateAction<boolean>>;
  loadGame: () => Promise<void>;
  refreshSaveOverview: () => Promise<void>;
  restoreBackup: () => Promise<void>;
  runCommand: (
    command: () => Promise<GameState>,
    options?: RunCommandOptions,
  ) => Promise<GameState | null>;
}

export function useGameSession(gameApplication: GameApplication): GameSession {
  const [state, setState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [hasCommandError, setHasCommandError] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const [saveOverview, setSaveOverview] = useState<SaveOverview | null>(null);
  const [isSaveOverviewLoading, setIsSaveOverviewLoading] = useState(false);
  const [saveManagementError, setSaveManagementError] = useState(false);
  const [canRestoreBackup, setCanRestoreBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [restoreBackupError, setRestoreBackupError] = useState(false);

  const loadGame = useCallback(async () => {
    setIsLoading(true);
    setHasLoadError(false);
    setRestoreBackupError(false);

    try {
      setState(await gameApplication.load());
    } catch {
      setHasLoadError(true);
      try {
        const overview = await gameApplication.getSaveInfo();
        setCanRestoreBackup(overview.backup !== null);
        setSaveOverview(overview);
      } catch {
        setCanRestoreBackup(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [gameApplication]);

  const refreshSaveOverview = useCallback(async () => {
    setIsSaveOverviewLoading(true);
    setSaveManagementError(false);

    try {
      setSaveOverview(await gameApplication.getSaveInfo());
    } catch {
      setSaveManagementError(true);
    } finally {
      setIsSaveOverviewLoading(false);
    }
  }, [gameApplication]);

  const restoreBackup = useCallback(async () => {
    setIsRestoringBackup(true);
    setRestoreBackupError(false);

    try {
      const nextState = await gameApplication.restoreBackup();
      setState(nextState);
      setHasLoadError(false);
      setCanRestoreBackup(false);
      setShowSavedFeedback(true);
      await refreshSaveOverview();
    } catch {
      setRestoreBackupError(true);
    } finally {
      setIsRestoringBackup(false);
    }
  }, [gameApplication, refreshSaveOverview]);

  useEffect(() => {
    void loadGame();
  }, [loadGame]);

  useEffect(() => {
    if (state) {
      document.documentElement.lang = state.settings.locale;
    }
  }, [state?.settings.locale]);

  const theme = state?.settings.theme;

  useEffect(() => {
    if (theme) {
      void syncStatusBar(theme);
    }
  }, [theme]);

  const runCommand = useCallback(async (
    command: () => Promise<GameState>,
    options: RunCommandOptions = {},
  ): Promise<GameState | null> => {
    setIsSaving(true);
    setHasCommandError(false);
    setShowSavedFeedback(false);

    try {
      const nextState = await command();
      setState(nextState);
      setShowSavedFeedback(true);
      void triggerHaptic("light");
      return nextState;
    } catch {
      if (!options.suppressErrorAlert) {
        setHasCommandError(true);
        void triggerHaptic("warning");
      }
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    state,
    isLoading,
    isSaving,
    hasLoadError,
    hasCommandError,
    showSavedFeedback,
    saveOverview,
    isSaveOverviewLoading,
    saveManagementError,
    canRestoreBackup,
    isRestoringBackup,
    restoreBackupError,
    setSaveOverview,
    setSaveManagementError,
    loadGame,
    refreshSaveOverview,
    restoreBackup,
    runCommand,
  };
}
