import { Capacitor } from "@capacitor/core";

export type HapticFeedback = "light" | "success" | "warning" | "error";

/**
 * Native feedback is optional: browser builds and unsupported devices must never
 * block or fail a game command because a plugin is unavailable.
 */
export async function triggerHaptic(feedback: HapticFeedback = "light"): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");

    if (feedback === "light") {
      await Haptics.impact({ style: ImpactStyle.Light });
      return;
    }

    const type = feedback === "success"
      ? NotificationType.Success
      : feedback === "warning"
        ? NotificationType.Warning
        : NotificationType.Error;

    await Haptics.notification({ type });
  } catch {
    // Haptics are a polish layer, not a gameplay dependency.
  }
}

export async function syncStatusBar(theme: "light" | "dark"): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");

    // Android 15+ ignores overlay/background calls, but the text style still applies.
    await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => undefined);
    await StatusBar.setStyle({
      style: theme === "dark" ? Style.Dark : Style.Light,
    });
    await StatusBar.setBackgroundColor({
      color: theme === "dark" ? "#0b1322" : "#f4f7fb",
    }).catch(() => undefined);
  } catch {
    // Status-bar styling is best-effort on every platform.
  }
}
