export function trimTrailingSeparators(projectDir: string): string {
  if (!projectDir) {
    return projectDir;
  }

  return projectDir.replace(/[\\/]+$/, '');
}

export function getRemixProjectRootCandidate(projectDir: string): string | null {
  const normalized = trimTrailingSeparators(projectDir);
  if (!normalized) {
    return null;
  }

  const segments = normalized.split(/[\\/]/).filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  const leaf = segments[segments.length - 1]?.toLowerCase();
  if (leaf !== 'sceneforge') {
    return null;
  }

  const separatorMatch = normalized.match(/[/\\](?!.*[/\\])/);
  if (!separatorMatch || separatorMatch.index == null) {
    return null;
  }

  const parent = normalized.slice(0, separatorMatch.index);
  return parent || null;
}
