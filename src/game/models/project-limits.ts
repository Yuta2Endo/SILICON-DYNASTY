export const PROJECT_LIMITS = {
  maxVersionsPerProject: 100,
} as const;

export function isProjectVersionLimitReached(versions: readonly unknown[]): boolean {
  return versions.length >= PROJECT_LIMITS.maxVersionsPerProject;
}
