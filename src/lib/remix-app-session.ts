import type { AppPage, RecentProjectIdentity, RemixProjectIntent } from './electron-api';
import type { ProjectData } from './project-persistence';
import type { RemixEntryIntent } from '../sceneforge/remix/components/RemixModeEntryDialog';
import {
  buildRemixPath,
  getAppPageForRemixRoute,
  isRemixAppPage,
  parseRemixPath,
  readRemixPathFromHash,
  type RemixRoute,
} from '../sceneforge/remix/lib/remix-routing';

export const REMIX_DEFAULT_ROUTE: RemixRoute = { kind: 'asset-library' };

export function clearRemixHashIfPresent(): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (window.location.hash.startsWith('#/remix/')) {
    window.history.replaceState(
      { appPage: 'welcome' },
      '',
      window.location.pathname + window.location.search,
    );
  }
}

export function applyRemixRouteToHistory(
  route: RemixRoute,
  historyMode: 'push' | 'replace',
): { appPage: AppPage; remixPath: string } {
  const path = buildRemixPath(route);
  const state = { appPage: getAppPageForRemixRoute(route), remixPath: path };
  if (historyMode === 'replace') {
    window.history.replaceState(state, '', `#${path}`);
  } else {
    window.history.pushState(state, '', `#${path}`);
  }
  return state;
}

export function readRemixRouteFromLocationHash(): RemixRoute | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const initialPath = readRemixPathFromHash(window.location.hash);
  if (!initialPath) {
    return null;
  }
  return parseRemixPath(initialPath);
}

export function parseRemixRouteFromHash(hash: string): RemixRoute | null {
  const path = readRemixPathFromHash(hash);
  if (!path) {
    return null;
  }
  return parseRemixPath(path);
}

export function resolveRemixRecentProjectIdentity(input: {
  page: AppPage;
  remixEntryIntent: RemixEntryIntent;
  remixRoute: RemixRoute;
}): RecentProjectIdentity | null {
  if (isRemixAppPage(input.page)) {
    return {
      projectKind: 'remix',
      remixEntryIntent: input.page === 'sceneforge-remix-creation' ? 'creation' : input.remixEntryIntent,
      remixRoutePath: buildRemixPath(input.remixRoute),
    };
  }
  if (input.page === 'sceneforge-studio') {
    return { projectKind: 'sceneforge', remixEntryIntent: null, remixRoutePath: null };
  }
  if (
    input.page === 'script-workbench' ||
    input.page === 'editor' ||
    input.page === 'auto-run' ||
    input.page === 'publish'
  ) {
    return { projectKind: 'script', remixEntryIntent: null, remixRoutePath: null };
  }
  return null;
}

export interface RemixOpenProjectOptions {
  remixRoute?: RemixRoute | null;
  remixEntryIntent?: RemixProjectIntent;
  recentProjectIdentity?: RecentProjectIdentity | null;
}

export function buildRecentProjectIdentityForOpen(
  options: RemixOpenProjectOptions,
  projectData: ProjectData,
): RecentProjectIdentity {
  if (options.recentProjectIdentity) {
    return options.recentProjectIdentity;
  }
  if (options.remixRoute) {
    return {
      projectKind: 'remix',
      remixEntryIntent: options.remixEntryIntent === 'creation' ? 'creation' : 'asset-ingestion',
      remixRoutePath: null,
    };
  }
  if (projectData.type === 'sceneforge') {
    return { projectKind: 'sceneforge', remixEntryIntent: null, remixRoutePath: null };
  }
  return { projectKind: 'script', remixEntryIntent: null, remixRoutePath: null };
}

export function shouldRejectRemixOpenOnProject(projectData: ProjectData): boolean {
  return projectData.type !== 'sceneforge';
}

export const REMIX_OPEN_ON_NON_SCENEFORGE_MESSAGE =
  'Remix Mode 仅支持 SceneForge 项目，请选择 SceneForge 工程目录。';
