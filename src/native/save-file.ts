import { Capacitor } from "@capacitor/core";

/**
 * Writes a save to the native cache and opens the Android share sheet.
 * Returns false on web or on any plugin failure so the caller can use the
 * existing browser download path.
 */
export async function exportSaveWithNativeShare(
  serialized: string,
  fileName: string,
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);

    const result = await Filesystem.writeFile({
      path: fileName,
      data: serialized,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
      recursive: true,
    });

    await Share.share({
      title: fileName,
      text: "Silicon Dynasty save",
      url: result.uri,
      dialogTitle: fileName,
    });

    return true;
  } catch {
    return false;
  }
}
