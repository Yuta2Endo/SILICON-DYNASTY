import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isNativePlatform: vi.fn(),
  addListener: vi.fn(),
  remove: vi.fn(),
  exitApp: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: mocks.isNativePlatform,
  },
}));

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: mocks.addListener,
    exitApp: mocks.exitApp,
  },
}));

import { exitNativeApp, registerNativeLifecycle } from "./app-lifecycle";

describe("native app lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isNativePlatform.mockReturnValue(false);
    mocks.addListener.mockResolvedValue({ remove: mocks.remove });
    mocks.exitApp.mockResolvedValue(undefined);
  });

  it("does nothing outside a native platform", async () => {
    const onBack = vi.fn();
    const cleanup = registerNativeLifecycle({ onBack });
    cleanup();
    await Promise.resolve();

    expect(mocks.addListener).not.toHaveBeenCalled();
    expect(mocks.exitApp).not.toHaveBeenCalled();
  });

  it("registers back and active-state listeners and removes them on cleanup", async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    const onBack = vi.fn();
    const onActiveChange = vi.fn();
    const cleanup = registerNativeLifecycle({ onBack, onActiveChange });

    await vi.waitFor(() => expect(mocks.addListener).toHaveBeenCalledTimes(2));
    const backCall = mocks.addListener.mock.calls.find(([event]) => event === "backButton");
    const activeCall = mocks.addListener.mock.calls.find(([event]) => event === "appStateChange");
    (backCall?.[1] as (() => void) | undefined)?.();
    (activeCall?.[1] as ((state: { isActive: boolean }) => void) | undefined)?.({ isActive: true });

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onActiveChange).toHaveBeenCalledWith(true);

    cleanup();
    expect(mocks.remove).toHaveBeenCalledTimes(2);
  });

  it("exits the native app and swallows failures", async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    await exitNativeApp();
    expect(mocks.exitApp).toHaveBeenCalledTimes(1);

    mocks.exitApp.mockRejectedValueOnce(new Error("unavailable"));
    await expect(exitNativeApp()).resolves.toBeUndefined();
  });
});
