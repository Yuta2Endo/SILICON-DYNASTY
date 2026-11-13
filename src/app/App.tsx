import { useCallback, useEffect, useState } from "react";
import { AppShell } from "./AppShell";
import { ConfirmationBottomSheet } from "../components/ConfirmationBottomSheet";
import { CPUDesignerPage } from "../features/cpu/CPUDesignerPage";
import { ComponentDesignerPage } from "../features/components/ComponentDesignerPage";
import { OsDesignerPage } from "../features/os/OsDesignerPage";
import { AiDesignerPage } from "../features/ai/AiDesignerPage";
import { MarketPage } from "../features/market/MarketPage";
import { ResearchPage } from "../features/research/ResearchPage";
import { createGameApplication, type GameApplication } from "../game/application/game-application";
import type { CpuConfiguration } from "../game/models/cpu";
import type { AiConfiguration, AiDataset } from "../game/models/ai";
import type { GameSettings, GameState } from "../game/models/game-state";
import { createBrowserGameStateRepository } from "../storage/repositories/BrowserGameStateRepository";
import { translations } from "../localization/messages";
import { CompanyPage } from "../features/company/CompanyPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { type ScreenId } from "./navigation";

interface AppProps {
  application?: GameApplication;
}

export function App({ application }: AppProps = {}) {
  const [gameApplication] = useState(
    () => application ?? createGameApplication(createBrowserGameStateRepository()),
  );
  const [state, setState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeScreen, setActiveScreen] = useState<ScreenId>("dashboard");
  const [hasLoadError, setHasLoadError] = useState(false);
  const [hasCommandError, setHasCommandError] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const [hasUnsavedCpuDraft, setHasUnsavedCpuDraft] = useState(false);
  const [hasUnsavedComponentDraft, setHasUnsavedComponentDraft] = useState(false);
  const [hasUnsavedOsDraft, setHasUnsavedOsDraft] = useState(false);
  const [hasUnsavedAiDraft, setHasUnsavedAiDraft] = useState(false);
  const [pendingScreen, setPendingScreen] = useState<ScreenId | null>(null);

  const loadGame = useCallback(async () => {
    setIsLoading(true);
    setHasLoadError(false);

    try {
      setState(await gameApplication.load());
    } catch {
      setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [gameApplication]);

  useEffect(() => {
    void loadGame();
  }, [loadGame]);

  useEffect(() => {
    if (state) {
      document.documentElement.lang = state.settings.locale;
    }
  }, [state?.settings.locale]);

  const runCommand = useCallback(async (command: () => Promise<GameState>): Promise<GameState | null> => {
    setIsSaving(true);
    setHasCommandError(false);
    setShowSavedFeedback(false);

    try {
      const nextState = await command();
      setState(nextState);
      setShowSavedFeedback(true);
      return nextState;
    } catch {
      setHasCommandError(true);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const requestNavigation = useCallback((screen: ScreenId) => {
    if (screen === activeScreen) {
      return;
    }
    if (activeScreen === "cpu" && hasUnsavedCpuDraft) {
      setPendingScreen(screen);
      return;
    }
    if (activeScreen === "components" && hasUnsavedComponentDraft) {
      setPendingScreen(screen);
      return;
    }
    if (activeScreen === "os" && hasUnsavedOsDraft) {
      setPendingScreen(screen);
      return;
    }
    if (activeScreen === "ai" && hasUnsavedAiDraft) {
      setPendingScreen(screen);
      return;
    }
    setActiveScreen(screen);
  }, [activeScreen, hasUnsavedCpuDraft, hasUnsavedComponentDraft, hasUnsavedOsDraft, hasUnsavedAiDraft]);

  const cancelNavigation = useCallback(() => setPendingScreen(null), []);

  const discardDraftAndNavigate = useCallback(() => {
    if (pendingScreen) {
      setHasUnsavedCpuDraft(false);
      setHasUnsavedComponentDraft(false);
      setHasUnsavedOsDraft(false);
      setHasUnsavedAiDraft(false);
      setActiveScreen(pendingScreen);
      setPendingScreen(null);
    }
  }, [pendingScreen]);

  const locale = state?.settings.locale ?? "ru";
  const t = translations[locale];

  if (isLoading) {
    return <LoadingScreen label={t.common.loading} />;
  }

  if (!state || hasLoadError) {
    return <StartupErrorScreen label={t.errors.load} retryLabel={t.common.retry} onRetry={() => void loadGame()} />;
  }

  const announcement = showSavedFeedback ? t.common.saved : null;
  const alert = hasCommandError ? t.errors.save : null;

  return (
    <AppShell
      activeScreen={activeScreen}
      alert={alert}
      announcement={announcement}
      onNavigate={requestNavigation}
      state={state}
    >
      {activeScreen === "dashboard" && (
        <DashboardPage
          isSaving={isSaving}
          onAdvanceDay={() => void runCommand(() => gameApplication.advanceDay())}
          state={state}
        />
      )}
      {activeScreen === "company" && (
        <CompanyPage
          isSaving={isSaving}
          onRename={(name) => void runCommand(() => gameApplication.renameCompany(name))}
          state={state}
        />
      )}
      {activeScreen === "research" && (
        <ResearchPage
          isSaving={isSaving}
          onStartResearch={async (technologyId) =>
            (await runCommand(() => gameApplication.startResearch(technologyId))) !== null
          }
          state={state}
        />
      )}
      {activeScreen === "cpu" && (
        <CPUDesignerPage
          isSaving={isSaving}
          onCreateProject={async (name, configuration) => {
            const nextState = await runCommand(() => gameApplication.createCpuProject(name, configuration));
            return nextState?.cpuProjects.at(-1)?.id ?? null;
          }}
          onDirtyChange={setHasUnsavedCpuDraft}
          onOpenComponents={() => requestNavigation("components")}
          onOpenOs={() => requestNavigation("os")}
          onOpenAi={() => requestNavigation("ai")}
          onSaveVersion={async (projectId, name, configuration: CpuConfiguration) =>
            (await runCommand(() => gameApplication.saveCpuVersion(projectId, name, configuration))) !== null
          }
          state={state}
        />
      )}
      {activeScreen === "components" && (
        <ComponentDesignerPage
          isSaving={isSaving}
          onCreateProject={async (type, name, configuration) => {
            const nextState = await runCommand(
              () => gameApplication.createComponentProject(type, name, configuration),
            );
            return nextState?.componentProjects.at(-1)?.id ?? null;
          }}
          onDirtyChange={setHasUnsavedComponentDraft}
          onOpenCpu={() => requestNavigation("cpu")}
          onOpenOs={() => requestNavigation("os")}
          onOpenAi={() => requestNavigation("ai")}
          onSaveVersion={async (projectId, name, configuration) =>
            (await runCommand(
              () => gameApplication.saveComponentVersion(projectId, name, configuration),
            )) !== null
          }
          state={state}
        />
      )}
      {activeScreen === "os" && (
        <OsDesignerPage
          isSaving={isSaving}
          onCreateProject={async (name, configuration) => {
            const nextState = await runCommand(() => gameApplication.createOsProject(name, configuration));
            return nextState?.osProjects.at(-1)?.id ?? null;
          }}
          onDirtyChange={setHasUnsavedOsDraft}
          onOpenComponents={() => requestNavigation("components")}
          onOpenCpu={() => requestNavigation("cpu")}
          onOpenAi={() => requestNavigation("ai")}
          onSaveVersion={async (projectId, name, configuration) =>
            (await runCommand(() => gameApplication.saveOsVersion(projectId, name, configuration))) !== null
          }
          onStartRelease={async (projectId) =>
            (await runCommand(() => gameApplication.startOsRelease(projectId))) !== null
          }
          onAdvanceRelease={async (projectId, releaseId) =>
            (await runCommand(() => gameApplication.advanceOsRelease(projectId, releaseId))) !== null
          }
          state={state}
        />
      )}
      {activeScreen === "ai" && (
        <AiDesignerPage
          isSaving={isSaving}
          onCreateProject={async (name, configuration) => {
            const nextState = await runCommand(() => gameApplication.createAiProject(name, configuration));
            return nextState?.aiProjects.at(-1)?.id ?? null;
          }}
          onDirtyChange={setHasUnsavedAiDraft}
          onOpenComponents={() => requestNavigation("components")}
          onOpenCpu={() => requestNavigation("cpu")}
          onOpenOs={() => requestNavigation("os")}
          onSaveVersion={async (projectId, name, configuration: AiConfiguration, datasets: AiDataset[]) =>
            (await runCommand(
              () => gameApplication.saveAiVersion(projectId, name, configuration, datasets),
            )) !== null
          }
          state={state}
        />
      )}
      {(activeScreen === "market" || activeScreen === "finance") && (
        <MarketPage
          activeView={activeScreen}
          isSaving={isSaving}
          onDiscontinueProduct={async (productId) =>
            (await runCommand(() => gameApplication.discontinueProduct(productId))) !== null
          }
          onDiscontinueComponentProduct={async (productId) =>
            (await runCommand(() => gameApplication.discontinueComponentProduct(productId))) !== null
          }
          onOrderProduction={async (productId, quantity) =>
            (await runCommand(() => gameApplication.orderProduction(productId, quantity))) !== null
          }
          onReleaseProduct={async (input) =>
            (await runCommand(() => gameApplication.releaseProduct(input))) !== null
          }
          onReleaseComponentProduct={async (input) =>
            (await runCommand(() => gameApplication.releaseComponentProduct(input))) !== null
          }
          onUpdatePrice={async (productId, priceUsd) =>
            (await runCommand(() => gameApplication.updateProductPrice(productId, priceUsd))) !== null
          }
          onUpdateComponentPrice={async (productId, priceUsd) =>
            (await runCommand(() => gameApplication.updateComponentProductPrice(productId, priceUsd))) !== null
          }
          onUpdateMarketingBudget={async (amountUsd) =>
            (await runCommand(() => gameApplication.updateMarketingBudget(amountUsd))) !== null
          }
          onTakeLoan={async (amountUsd) =>
            (await runCommand(() => gameApplication.takeLoan(amountUsd))) !== null
          }
          onRepayLoan={async (amountUsd) =>
            (await runCommand(() => gameApplication.repayLoan(amountUsd))) !== null
          }
          onViewChange={requestNavigation}
          state={state}
        />
      )}
      {activeScreen === "settings" && (
        <SettingsPage
          onUpdate={(settings: Partial<GameSettings>) => void runCommand(() => gameApplication.updateSettings(settings))}
          state={state}
        />
      )}
      {(activeScreen === "cpu" || activeScreen === "components" || activeScreen === "os" || activeScreen === "ai") && pendingScreen && (
        <ConfirmationBottomSheet
          cancelLabel={t.cpu.unsavedCancel}
          confirmLabel={t.cpu.unsavedConfirm}
          message={t.cpu.unsavedMessage}
          onCancel={cancelNavigation}
          onConfirm={discardDraftAndNavigate}
          title={t.cpu.unsavedTitle}
        />
      )}
    </AppShell>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="standalone-screen" role="status">
      <span className="brand-mark" aria-hidden="true">SD</span>
      <p>{label}</p>
    </div>
  );
}

function StartupErrorScreen({
  label,
  retryLabel,
  onRetry,
}: {
  label: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div className="standalone-screen">
      <span className="brand-mark" aria-hidden="true">SD</span>
      <p role="alert">{label}</p>
      <button className="button button--primary" onClick={onRetry} type="button">
        {retryLabel}
      </button>
    </div>
  );
}
