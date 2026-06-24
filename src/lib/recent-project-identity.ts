import type {
  RecentProjectEntry,
  RecentProjectIdentity,
  RemixProjectIntent,
} from './electron-api';
import type { RemixRoute } from '../sceneforge/remix/lib/remix-routing';

export function getRecentProjectDisplayLabel(project: RecentProjectEntry): string {
  if (project.projectKind === 'remix') {
    return project.remixEntryIntent === 'creation' ? 'Remix·二次创作' : 'Remix·资产入库';
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
    };
  }

  if (identity?.projectKind === 'sceneforge') {
    return { projectKind: 'sceneforge', remixEntryIntent: null };
  }

  return { projectKind: 'script', remixEntryIntent: null };
}

export function resolveRecentProjectOpenOptions(project: RecentProjectEntry): {
  remixRoute?: RemixRoute;
  remixEntryIntent?: RemixProjectIntent;
} {
  if (project.projectKind === 'remix') {
    return {
      remixRoute: { kind: 'asset-library' },
      remixEntryIntent: project.remixEntryIntent === 'creation' ? 'creation' : 'asset-ingestion',
    };
  }

  return {};
}
