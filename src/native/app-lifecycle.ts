import { Capacitor } from "@capacitor/core";

export interface NativeLifecycleCallbacks {
  onBack: () => void;
  onActiveChange?: (isActive: boolean) => void;
}

/**
 * Registers native Back and app-state listeners. Browsers and test
 * environments get a no-op cleanup function.
 */
export function registerNativeLifecycle(callbacks: NativeLifecycleCallbacks): () => void {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  let disposed = false;
  let cleanup = () => {};

  void (async () => {
    try {
      const { App } = await import("@capacitor/app");
      const handles = [
        await App.addListener("backButton", () => {
          callbacks.onBack();
        }),
        await App.addListener("appStateChange", ({ isActive }) => {
          callbacks.onActiveChange?.(isActive);
        }),
      ];

      if (disposed) {
        handles.forEach((handle) => {
          void handle.remove();
        });
        return;
      }

      cleanup = () => {
        handles.forEach((handle) => {
          void handle.remove();
        });
      };
    } catch {
      // Native lifecycle is an enhancement, not a gameplay dependency.
    }
  })();

  return () => {
    disposed = true;
    cleanup();
  };
}

export async function exitNativeApp(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const { App } = await import("@capacitor/app");
    await App.exitApp();
  } catch {
    // Closing the app is best-effort.
  }
}
