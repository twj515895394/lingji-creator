import type { FileEntry } from './electron-api';
import type { ProjectData } from './project-persistence';
import type { RemixEntryIntent } from '../sceneforge/remix/components/RemixModeEntryDialog';
import type { SceneProjectMeta } from '../types/sceneforge';
import { canBootstrapRemixAssetIngestionProject } from '../sceneforge/remix/lib/remix-entry-project';
import { getRemixProjectRootCandidate } from '../sceneforge/remix/lib/remix-project-dir';
import { REMIX_DEFAULT_ROUTE } from './remix-app-session';
import type { RemixRoute } from '../sceneforge/remix/lib/remix-routing';

export type RemixEntryFailureReason =
  | 'asset-ingestion-invalid-dir'
  | 'creation-requires-sceneforge';

export type RemixEntryPlan =
  | {
      kind: 'open';
      projectDir: string;
      remixRoute: RemixRoute;
      remixEntryIntent: RemixEntryIntent;
    }
  | {
      kind: 'bootstrap-then-open';
      projectDir: string;
      remixRoute: RemixRoute;
      remixEntryIntent: RemixEntryIntent;
    }
  | {
      kind: 'fail';
      reason: RemixEntryFailureReason;
    };

export interface RemixEntryProjectApi {
  loadProject: (projectDir: string) => Promise<string>;
  readDirectory: (projectDir: string) => Promise<FileEntry[]>;
  createSceneForgeProject: (
    projectDir: string,
    entryPath: 'source_intake',
    options?: { pipelineId?: SceneProjectMeta['pipelineId'] },
  ) => Promise<string>;
}

export function decideRemixEntryPlan(input: {
  intent: RemixEntryIntent;
  projectData: ProjectData;
  projectDir: string;
  topLevelEntries: FileEntry[];
}): RemixEntryPlan {
  const openPlan: RemixEntryPlan = {
    kind: 'open',
    projectDir: input.projectDir,
    remixRoute: REMIX_DEFAULT_ROUTE,
    remixEntryIntent: input.intent,
  };

  if (input.projectData.type === 'sceneforge') {
    return openPlan;
  }

  if (input.intent === 'asset-ingestion') {
    if (canBootstrapRemixAssetIngestionProject(input.projectData, input.topLevelEntries)) {
      return {
        kind: 'bootstrap-then-open',
        projectDir: input.projectDir,
        remixRoute: REMIX_DEFAULT_ROUTE,
        remixEntryIntent: input.intent,
      };
    }
    return { kind: 'fail', reason: 'asset-ingestion-invalid-dir' };
  }

  return { kind: 'fail', reason: 'creation-requires-sceneforge' };
}

export async function resolveRemixProjectDir(
  candidateDir: string,
  api: Pick<RemixEntryProjectApi, 'loadProject'>,
): Promise<string> {
  let remixProjectDir = candidateDir;
  const parentCandidate = getRemixProjectRootCandidate(candidateDir);
  if (!parentCandidate) {
    return remixProjectDir;
  }

  try {
    const raw = await api.loadProject(parentCandidate);
    const projectData = JSON.parse(raw) as ProjectData;
    if (projectData.type === 'sceneforge') {
      return parentCandidate;
    }
  } catch {
    // 父目录不是合法工程时保持原选择。
  }

  return remixProjectDir;
}

export async function planRemixModeEntry(
  candidateDir: string,
  intent: RemixEntryIntent,
  api: RemixEntryProjectApi,
): Promise<RemixEntryPlan> {
  const projectDir = await resolveRemixProjectDir(candidateDir, api);
  const raw = await api.loadProject(projectDir);
  const projectData = JSON.parse(raw) as ProjectData;
  const topLevelEntries = await api.readDirectory(projectDir);
  return decideRemixEntryPlan({ intent, projectData, projectDir, topLevelEntries });
}

export function remixEntryFailureMessage(reason: RemixEntryFailureReason): string {
  switch (reason) {
    case 'asset-ingestion-invalid-dir':
      return '资产入库需要 SceneForge 工程目录，或选择一个空白目录用于初始化 Remix 工程。';
    case 'creation-requires-sceneforge':
      return '二次创作仅支持已有的 SceneForge 工程，请先选择已入库资产所在项目。';
    default:
      return '无法进入 Remix 模式，请检查项目目录。';
  }
}

export interface ExecuteRemixEntryCallbacks {
  openProject: (
    projectDir: string,
    options: { remixRoute: RemixRoute; remixEntryIntent: RemixEntryIntent },
  ) => Promise<void>;
  onFailure: (message: string) => void;
}

export async function executeRemixEntryPlan(
  plan: RemixEntryPlan,
  api: RemixEntryProjectApi,
  callbacks: ExecuteRemixEntryCallbacks,
): Promise<void> {
  if (plan.kind === 'fail') {
    callbacks.onFailure(remixEntryFailureMessage(plan.reason));
    return;
  }

  if (plan.kind === 'bootstrap-then-open') {
    await api.createSceneForgeProject(plan.projectDir, 'source_intake', {
      pipelineId: 'reference_remake',
    });
  }

  await callbacks.openProject(plan.projectDir, {
    remixRoute: plan.remixRoute,
    remixEntryIntent: plan.remixEntryIntent,
  });
}

export async function enterRemixModeFromDirectory(
  candidateDir: string,
  intent: RemixEntryIntent,
  api: RemixEntryProjectApi,
  callbacks: ExecuteRemixEntryCallbacks,
): Promise<void> {
  const plan = await planRemixModeEntry(candidateDir, intent, api);
  await executeRemixEntryPlan(plan, api, callbacks);
}
