import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isNativePlatform: vi.fn(),
  impact: vi.fn(),
  notification: vi.fn(),
  setStyle: vi.fn(),
  setBackgroundColor: vi.fn(),
  setOverlaysWebView: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: mocks.isNativePlatform,
  },
}));

vi.mock("@capacitor/haptics", () => ({
  Haptics: {
    impact: mocks.impact,
    notification: mocks.notification,
  },
  ImpactStyle: { Light: "LIGHT" },
  NotificationType: {
    Success: "SUCCESS",
    Warning: "WARNING",
    Error: "ERROR",
  },
}));

vi.mock("@capacitor/status-bar", () => ({
  StatusBar: {
    setStyle: mocks.setStyle,
    setBackgroundColor: mocks.setBackgroundColor,
    setOverlaysWebView: mocks.setOverlaysWebView,
  },
  Style: {
    Dark: "DARK",
    Light: "LIGHT",
  },
}));

import { syncStatusBar, triggerHaptic } from "./native-services";

describe("native services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isNativePlatform.mockReturnValue(false);
    mocks.impact.mockResolvedValue(undefined);
    mocks.notification.mockResolvedValue(undefined);
    mocks.setStyle.mockResolvedValue(undefined);
    mocks.setBackgroundColor.mockResolvedValue(undefined);
    mocks.setOverlaysWebView.mockResolvedValue(undefined);
  });

  it("does nothing outside a native platform", async () => {
    await triggerHaptic("success");
    await syncStatusBar("dark");

    expect(mocks.impact).not.toHaveBeenCalled();
    expect(mocks.notification).not.toHaveBeenCalled();
    expect(mocks.setStyle).not.toHaveBeenCalled();
  });

  it("uses a light impact for ordinary successful actions", async () => {
    mocks.isNativePlatform.mockReturnValue(true);

    await triggerHaptic();

    expect(mocks.impact).toHaveBeenCalledWith({ style: "LIGHT" });
    expect(mocks.notification).not.toHaveBeenCalled();
  });

  it("maps notification feedback types", async () => {
    mocks.isNativePlatform.mockReturnValue(true);

    await triggerHaptic("success");
    await triggerHaptic("warning");
    await triggerHaptic("error");

    expect(mocks.notification).toHaveBeenNthCalledWith(1, { type: "SUCCESS" });
    expect(mocks.notification).toHaveBeenNthCalledWith(2, { type: "WARNING" });
    expect(mocks.notification).toHaveBeenNthCalledWith(3, { type: "ERROR" });
  });

  it("styles the status bar for the active theme", async () => {
    mocks.isNativePlatform.mockReturnValue(true);

    await syncStatusBar("light");
    expect(mocks.setStyle).toHaveBeenLastCalledWith({ style: "LIGHT" });
    expect(mocks.setBackgroundColor).toHaveBeenLastCalledWith({ color: "#f4f7fb" });

    await syncStatusBar("dark");
    expect(mocks.setStyle).toHaveBeenLastCalledWith({ style: "DARK" });
    expect(mocks.setBackgroundColor).toHaveBeenLastCalledWith({ color: "#0b1322" });
  });

  it("swallows plugin failures", async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.impact.mockRejectedValue(new Error("unavailable"));
    mocks.setStyle.mockRejectedValue(new Error("unavailable"));

    await expect(triggerHaptic()).resolves.toBeUndefined();
    await expect(syncStatusBar("dark")).resolves.toBeUndefined();
  });
});
