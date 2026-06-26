import type {
  RecentProjectEntry,
  RecentProjectIdentity,
  RemixProjectIntent,
} from './electron-api';
import {
  parseRemixPath,
  type RemixRoute,
} from '../sceneforge/remix/lib/remix-routing';

function normalizeRemixRoutePath(routePath?: string | null): string | null {
  if (!routePath?.trim()) {
    return null;
  }

  return parseRemixPath(routePath.trim()) ? routePath.trim() : null;
}

export function getRecentProjectDisplayLabel(project: RecentProjectEntry): string {
  if (project.projectKind === 'remix') {
    return project.remixEntryIntent === 'creation' ? 'Remix 二创·二次创作' : 'Remix 二创·资产入库';
  }

  if (project.projectKind === 'sceneforge') {
    return 'SceneForge';
  }

  return '普通剪辑';
}

export function normalizeRecentProjectIdentity(
  identity?: RecentProjectIdentity | null,
): RecentProjectIdentity {
  if (identity?.projectKind === 'remix') {
    return {
      projectKind: 'remix',
      remixEntryIntent: identity.remixEntryIntent === 'creation' ? 'creation' : 'asset-ingestion',
      remixRoutePath: normalizeRemixRoutePath(identity.remixRoutePath),
    };
  }

  if (identity?.projectKind === 'sceneforge') {
    return { projectKind: 'sceneforge', remixEntryIntent: null, remixRoutePath: null };
  }

  return { projectKind: 'script', remixEntryIntent: null, remixRoutePath: null };
}

export function resolveRecentProjectOpenOptions(project: RecentProjectEntry): {
  remixRoute?: RemixRoute;
  remixEntryIntent?: RemixProjectIntent;
} {
  if (project.projectKind === 'remix') {
    const route = normalizeRemixRoutePath(project.remixRoutePath);
    return {
      remixRoute: route ? parseRemixPath(route) ?? { kind: 'asset-library' } : { kind: 'asset-library' },
      remixEntryIntent: project.remixEntryIntent === 'creation' ? 'creation' : 'asset-ingestion',
    };
  }

  return {};
}
