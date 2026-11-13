import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isNativePlatform: vi.fn(),
  writeFile: vi.fn(),
  share: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: mocks.isNativePlatform,
  },
}));

vi.mock("@capacitor/filesystem", () => ({
  Filesystem: {
    writeFile: mocks.writeFile,
  },
  Directory: { Cache: "CACHE" },
  Encoding: { UTF8: "utf8" },
}));

vi.mock("@capacitor/share", () => ({
  Share: {
    share: mocks.share,
  },
}));

import { exportSaveWithNativeShare } from "./save-file";

describe("native save export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isNativePlatform.mockReturnValue(false);
    mocks.writeFile.mockResolvedValue({ uri: "file:///cache/save.json" });
    mocks.share.mockResolvedValue(undefined);
  });

  it("falls back to the browser outside a native platform", async () => {
    await expect(exportSaveWithNativeShare("{}", "save.json")).resolves.toBe(false);
    expect(mocks.writeFile).not.toHaveBeenCalled();
    expect(mocks.share).not.toHaveBeenCalled();
  });

  it("writes the save to cache and opens the share sheet", async () => {
    mocks.isNativePlatform.mockReturnValue(true);

    await expect(exportSaveWithNativeShare("{\"ok\":true}", "save.json")).resolves.toBe(true);

    expect(mocks.writeFile).toHaveBeenCalledWith({
      path: "save.json",
      data: "{\"ok\":true}",
      directory: "CACHE",
      encoding: "utf8",
      recursive: true,
    });
    expect(mocks.share).toHaveBeenCalledWith({
      title: "save.json",
      text: "Silicon Dynasty save",
      url: "file:///cache/save.json",
      dialogTitle: "save.json",
    });
  });

  it("returns false and does not share when writing fails", async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.writeFile.mockRejectedValue(new Error("unavailable"));

    await expect(exportSaveWithNativeShare("{}", "save.json")).resolves.toBe(false);
    expect(mocks.share).not.toHaveBeenCalled();
  });
});
