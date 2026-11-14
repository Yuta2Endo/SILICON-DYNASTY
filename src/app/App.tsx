import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { AppShell } from "./AppShell";
import { ConfirmationBottomSheet } from "../components/ConfirmationBottomSheet";
import { MainMenu } from "../features/menu/MainMenu";
import { createGameApplication, type GameApplication } from "../game/application/game-application";
import type { CpuConfiguration } from "../game/models/cpu";
import type { AiConfiguration, AiDataset, AiOptimizationType } from "../game/models/ai";
import type { DeviceConfiguration } from "../game/models/devices";
import type { CloudConfiguration } from "../game/models/cloud";
import type { GameSettings } from "../game/models/game-state";
import { createBrowserGameStateRepository } from "../storage/repositories/BrowserGameStateRepository";
import { translations } from "../localization/messages";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { type ScreenId } from "./navigation";
import { useGameSession } from "./useGameSession";
import { exitNativeApp, registerNativeLifecycle } from "../native/app-lifecycle";

const CompanyPage = lazy(() => import("../features/company/CompanyPage").then((module) => ({ default: module.CompanyPage })));
const ResearchPage = lazy(() => import("../features/research/ResearchPage").then((module) => ({ default: module.ResearchPage })));
const SettingsPage = lazy(() => import("../features/settings/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const CPUDesignerPage = lazy(() => import("../features/cpu/CPUDesignerPage").then((module) => ({ default: module.CPUDesignerPage })));
const ComponentDesignerPage = lazy(() => import("../features/components/ComponentDesignerPage").then((module) => ({ default: module.ComponentDesignerPage })));
const OsDesignerPage = lazy(() => import("../features/os/OsDesignerPage").then((module) => ({ default: module.OsDesignerPage })));
const AiDesignerPage = lazy(() => import("../features/ai/AiDesignerPage").then((module) => ({ default: module.AiDesignerPage })));
const DeviceDesignerPage = lazy(() => import("../features/devices/DeviceDesignerPage").then((module) => ({ default: module.DeviceDesignerPage })));
const MarketPage = lazy(() => import("../features/market/MarketPage").then((module) => ({ default: module.MarketPage })));

function prefetchPageChunks() {
  void import("../features/company/CompanyPage");
  void import("../features/research/ResearchPage");
  void import("../features/settings/SettingsPage");
  void import("../features/cpu/CPUDesignerPage");
  void import("../features/market/MarketPage");
}

interface AppProps {
  application?: GameApplication;
  initialMenuOpen?: boolean;
}

export function App({ application, initialMenuOpen }: AppProps = {}) {
  const [gameApplication] = useState(
    () => application ?? createGameApplication(createBrowserGameStateRepository()),
  );
  const {
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
  } = useGameSession(gameApplication);
  const [isMainMenuOpen, setIsMainMenuOpen] = useState(initialMenuOpen ?? !application);
  const [menuError, setMenuError] = useState(false);
  const [activeScreen, setActiveScreen] = useState<ScreenId>("dashboard");
  const [hasUnsavedCpuDraft, setHasUnsavedCpuDraft] = useState(false);
  const [hasUnsavedComponentDraft, setHasUnsavedComponentDraft] = useState(false);
  const [hasUnsavedOsDraft, setHasUnsavedOsDraft] = useState(false);
  const [hasUnsavedAiDraft, setHasUnsavedAiDraft] = useState(false);
  const [hasUnsavedDeviceDraft, setHasUnsavedDeviceDraft] = useState(false);
  const [pendingScreen, setPendingScreen] = useState<ScreenId | null>(null);

  useEffect(() => {
    if (state && activeScreen === "settings") {
      void refreshSaveOverview();
    }
  }, [state, activeScreen, refreshSaveOverview]);

  const isGameLoaded = state !== null;

  useEffect(() => {
    if (!isGameLoaded) return;
    const timer = window.setTimeout(prefetchPageChunks, 1_200);
    return () => window.clearTimeout(timer);
  }, [isGameLoaded]);

  const startNewGame = useCallback(async () => {
    setMenuError(false);
    const nextState = await runCommand(() => gameApplication.newGame());

    if (!nextState) {
      setMenuError(true);
      return;
    }

    setActiveScreen("dashboard");
    setHasUnsavedCpuDraft(false);
    setHasUnsavedComponentDraft(false);
    setHasUnsavedOsDraft(false);
    setHasUnsavedAiDraft(false);
    setHasUnsavedDeviceDraft(false);
    setIsMainMenuOpen(false);
  }, [gameApplication, runCommand]);

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
    if (activeScreen === "devices" && hasUnsavedDeviceDraft) {
      setPendingScreen(screen);
      return;
    }
    setActiveScreen(screen);
  }, [activeScreen, hasUnsavedCpuDraft, hasUnsavedComponentDraft, hasUnsavedOsDraft, hasUnsavedAiDraft, hasUnsavedDeviceDraft]);

  const cancelNavigation = useCallback(() => setPendingScreen(null), []);

  useEffect(() => registerNativeLifecycle({
    onBack: () => {
      if (isMainMenuOpen) {
        setIsMainMenuOpen(false);
        return;
      }
      if (pendingScreen) {
        setPendingScreen(null);
        return;
      }
      if (activeScreen !== "dashboard") {
        requestNavigation("dashboard");
        return;
      }
      void exitNativeApp();
    },
    onActiveChange: (isActive) => {
      if (isActive) {
        void refreshSaveOverview();
      }
    },
  }), [activeScreen, isMainMenuOpen, pendingScreen, refreshSaveOverview, requestNavigation]);

  const openSettingsFromMenu = useCallback(() => {
    setIsMainMenuOpen(false);
    requestNavigation("settings");
  }, [requestNavigation]);

  const openMainMenu = useCallback(() => {
    setMenuError(false);
    setIsMainMenuOpen(true);
  }, []);

  const discardDraftAndNavigate = useCallback(() => {
    if (pendingScreen) {
      setHasUnsavedCpuDraft(false);
      setHasUnsavedComponentDraft(false);
      setHasUnsavedOsDraft(false);
      setHasUnsavedAiDraft(false);
      setHasUnsavedDeviceDraft(false);
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
    return (
      <StartupErrorScreen
        canRestoreBackup={canRestoreBackup}
        isRestoringBackup={isRestoringBackup}
        label={t.errors.load}
        onRestoreBackup={() => void restoreBackup()}
        onRetry={() => void loadGame()}
        restoreError={restoreBackupError}
        restoreErrorLabel={t.settings.saveManagement.restoreError}
        restoreLabel={t.settings.saveManagement.restoreBackup}
        restoringLabel={t.common.loading}
        retryLabel={t.common.retry}
      />
    );
  }

  const announcement = showSavedFeedback ? t.common.saved : null;
  const alert = hasCommandError ? t.errors.save : null;

  return (
    <>
      <AppShell
        activeScreen={activeScreen}
        alert={alert}
        announcement={announcement}
        onNavigate={requestNavigation}
        onOpenMenu={openMainMenu}
        state={state}
      >
      <Suspense fallback={<ScreenLoading label={t.common.loading} />}>
      {activeScreen === "dashboard" && (
        <DashboardPage
          isSaving={isSaving}
          onAdvanceDay={() => void runCommand(() => gameApplication.advanceDay())}
          onNavigate={requestNavigation}
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
          onOpenDevices={() => requestNavigation("devices")}
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
          onOpenDevices={() => requestNavigation("devices")}
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
          onOpenDevices={() => requestNavigation("devices")}
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
          onOpenDevices={() => requestNavigation("devices")}
          onStartTraining={async (projectId, input) =>
            (await runCommand(() => gameApplication.startAiTraining(projectId, input))) !== null
          }
          onApplyOptimization={async (
            projectId: string,
            trainingJobId: string,
            type: AiOptimizationType,
          ) =>
            (await runCommand(
              () => gameApplication.applyAiOptimization(projectId, trainingJobId, type),
            )) !== null
          }
          onDeployModel={async (projectId, trainingJobId) =>
            (await runCommand(() => gameApplication.deployAiModel(projectId, trainingJobId))) !== null
          }
          onSaveVersion={async (projectId, name, configuration: AiConfiguration, datasets: AiDataset[]) =>
            (await runCommand(
              () => gameApplication.saveAiVersion(projectId, name, configuration, datasets),
            )) !== null
          }
          state={state}
        />
      )}
      {activeScreen === "devices" && (
        <DeviceDesignerPage
          isSaving={isSaving}
          onCreateCloud={async (name, configuration: CloudConfiguration) => {
            const nextState = await runCommand(() => gameApplication.createCloudProject(name, configuration));
            return nextState?.cloudProjects.at(-1)?.id ?? null;
          }}
          onCreateDevice={async (name, configuration: DeviceConfiguration) => {
            const nextState = await runCommand(() => gameApplication.createDeviceProject(name, configuration));
            return nextState?.deviceProjects.at(-1)?.id ?? null;
          }}
          onDirtyChange={setHasUnsavedDeviceDraft}
          onOpenAi={() => requestNavigation("ai")}
          onOpenComponents={() => requestNavigation("components")}
          onOpenCpu={() => requestNavigation("cpu")}
          onOpenOs={() => requestNavigation("os")}
          onSaveCloud={async (projectId, name, configuration: CloudConfiguration) =>
            (await runCommand(
              () => gameApplication.saveCloudVersion(projectId, name, configuration),
            )) !== null
          }
          onSaveDevice={async (projectId, name, configuration: DeviceConfiguration) =>
            (await runCommand(
              () => gameApplication.saveDeviceVersion(projectId, name, configuration),
            )) !== null
          }
          state={state}
        />
      )}
      {(activeScreen === "market" || activeScreen === "finance" || activeScreen === "analytics") && (
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
          onOrderComponentProduction={async (productId, quantity) =>
            (await runCommand(() => gameApplication.orderComponentProduction(productId, quantity))) !== null
          }
          onUpgradeFactory={async () =>
            (await runCommand(() => gameApplication.upgradeFactory())) !== null
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
          onAcceptOemContract={async (offerId) =>
            (await runCommand(() => gameApplication.acceptOemContract(offerId))) !== null
          }
          onDeclineOemContract={async (offerId) =>
            (await runCommand(() => gameApplication.declineOemContract(offerId))) !== null
          }
          onAcceptCommercialOffer={async (offerId) =>
            (await runCommand(() => gameApplication.acceptCommercialOffer(offerId))) !== null
          }
          onDeclineCommercialOffer={async (offerId) =>
            (await runCommand(() => gameApplication.declineCommercialOffer(offerId))) !== null
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
          isSaveBusy={isSaving || isSaveOverviewLoading || isRestoringBackup}
          onDeleteSlot={async (slotId) => {
            try {
              setSaveOverview(await gameApplication.deleteSlot(slotId));
              setSaveManagementError(false);
              return true;
            } catch {
              setSaveManagementError(true);
              return false;
            }
          }}
          onExportSave={async () => {
            try {
              return await gameApplication.exportSave();
            } catch {
              return null;
            }
          }}
          onImportSave={async (serialized) =>
            (await runCommand(
              () => gameApplication.importSave(serialized),
              { suppressErrorAlert: true },
            )) !== null
          }
          onLoadSlot={async (slotId) =>
            (await runCommand(
              () => gameApplication.loadFromSlot(slotId),
              { suppressErrorAlert: true },
            )) !== null
          }
          onRefreshSaves={() => void refreshSaveOverview()}
          onRestoreBackup={async () => {
            const nextState = await runCommand(
              () => gameApplication.restoreBackup(),
              { suppressErrorAlert: true },
            );
            if (!nextState) {
              return false;
            }
            await refreshSaveOverview();
            return true;
          }}
          onSaveToSlot={async (slotId) => {
            try {
              setSaveOverview(await gameApplication.saveToSlot(slotId));
              setSaveManagementError(false);
              return true;
            } catch {
              setSaveManagementError(true);
              return false;
            }
          }}
          onUpdate={(settings: Partial<GameSettings>) => void runCommand(() => gameApplication.updateSettings(settings))}
          saveManagementError={saveManagementError}
          saveOverview={saveOverview}
          state={state}
        />
      )}
      {(activeScreen === "cpu" || activeScreen === "components" || activeScreen === "os" || activeScreen === "ai" || activeScreen === "devices") && pendingScreen && (
        <ConfirmationBottomSheet
          cancelLabel={t.cpu.unsavedCancel}
          confirmLabel={t.cpu.unsavedConfirm}
          message={t.cpu.unsavedMessage}
          onCancel={cancelNavigation}
          onConfirm={discardDraftAndNavigate}
          title={t.cpu.unsavedTitle}
        />
      )}
      </Suspense>
      </AppShell>
      {isMainMenuOpen && (
        <MainMenu
          error={menuError}
          isSaving={isSaving}
          onContinue={() => setIsMainMenuOpen(false)}
          onNewGame={() => void startNewGame()}
          onSettings={openSettingsFromMenu}
          state={state}
        />
      )}
    </>
  );
}

function ScreenLoading({ label }: { label: string }) {
  return (
    <div className="screen-loading" role="status">
      <span className="visually-hidden">{label}</span>
      <div aria-hidden="true" className="screen-skeleton">
        <span className="screen-skeleton__eyebrow" />
        <span className="screen-skeleton__title" />
        <span className="screen-skeleton__subtitle" />
        <div className="screen-skeleton__metrics">
          {[0, 1, 2, 3].map((index) => (
            <span className="screen-skeleton__metric" key={index} />
          ))}
        </div>
        <span className="screen-skeleton__panel" />
      </div>
    </div>
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
  restoreLabel,
  restoringLabel,
  restoreErrorLabel,
  canRestoreBackup,
  isRestoringBackup,
  restoreError,
  onRetry,
  onRestoreBackup,
}: {
  label: string;
  retryLabel: string;
  restoreLabel: string;
  restoringLabel: string;
  restoreErrorLabel: string;
  canRestoreBackup: boolean;
  isRestoringBackup: boolean;
  restoreError: boolean;
  onRetry: () => void;
  onRestoreBackup: () => void;
}) {
  return (
    <div className="standalone-screen">
      <span className="brand-mark" aria-hidden="true">SD</span>
      <p role="alert">{label}</p>
      {restoreError && <p className="inline-feedback inline-feedback--error" role="alert">{restoreErrorLabel}</p>}
      <div className="standalone-screen__actions">
        <button className="button button--primary" onClick={onRetry} type="button">
          {retryLabel}
        </button>
        {canRestoreBackup && (
          <button
            className="button button--secondary"
            disabled={isRestoringBackup}
            onClick={onRestoreBackup}
            type="button"
          >
            {isRestoringBackup ? restoringLabel : restoreLabel}
          </button>
        )}
      </div>
    </div>
  );
}
