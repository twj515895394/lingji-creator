import fs from 'node:fs/promises';
import path from 'node:path';
import { createDefaultProjectData, type ProjectData } from '../../../src/lib/project-persistence';
import type { SceneEntryPath, SceneProjectMeta, SceneStageId } from '../../../src/types/sceneforge';
import { SCENE_STAGE_IDS } from '../../../src/types/sceneforge';
import { loadProjectFile } from '../../project-file';
import { writeDefaultApprovalPolicy } from '../pipeline/scene-approval-policy';

const SCENE_ROOT = 'sceneforge';

export interface SceneProjectStyleSelection {
  selectedStyleProfileId: string | null;
  selectedAssetIds: string[];
}

type SceneProjectMetaInput = Partial<SceneProjectMeta> | undefined;

function normalizeSceneProjectMeta(meta: SceneProjectMetaInput): SceneProjectMeta {
  const base = createDefaultSceneProjectMeta(meta?.entryPath ?? 'topic_gate');
  return {
    ...base,
    ...meta,
    entryPath: meta?.entryPath ?? base.entryPath,
    selectedStyleProfileId: meta?.selectedStyleProfileId ?? null,
    selectedAssetIds: Array.isArray(meta?.selectedAssetIds)
      ? Array.from(new Set(meta.selectedAssetIds.filter((value): value is string => typeof value === 'string')))
      : [],
  };
}

export function createDefaultSceneProjectMeta(entryPath: SceneEntryPath = 'topic_gate'): SceneProjectMeta {
  const startStage: SceneStageId =
    entryPath === 'source_intake' ? 'source_intake' : 'topic_gate';
  return {
    version: 1,
    projectRoot: SCENE_ROOT,
    pipelineId: entryPath === 'source_intake' ? 'reference_remake' : 'original_scene',
    entryPath,
    selectedStyleProfileId: null,
    selectedAssetIds: [],
    currentStage: startStage,
    status: 'ready',
    coreArtifacts: { design: null, storyboard: null, videoPrompts: null },
    lastExportPath: null,
  };
}

function createInitialSceneState(meta: SceneProjectMeta) {
  const stages: Record<string, { status: 'ready'; artifactIds: [] }> = {};
  for (const stageId of SCENE_STAGE_IDS) {
    stages[stageId] = { status: 'ready', artifactIds: [] };
  }
  return {
    version: 1,
    pipelineId: meta.pipelineId,
    currentStage: meta.currentStage,
    status: meta.status,
    stages,
    coreArtifacts: meta.coreArtifacts,
    updatedAt: new Date().toISOString(),
  };
}

const EMPTY_ARTIFACT_MANIFEST = [
  'version: 1',
  'artifacts: []',
  '',
].join('\n');

export async function readSceneProjectEntryPath(projectDir: string): Promise<SceneEntryPath> {
  const meta = await readSceneProjectMeta(projectDir);
  const entry = meta.entryPath;
  if (entry === 'source_intake' || entry === 'topic_gate') {
    return entry;
  }
  return 'topic_gate';
}

export async function readSceneProjectMeta(projectDir: string): Promise<SceneProjectMeta> {
  const data = await loadProjectFile(projectDir);
  return normalizeSceneProjectMeta(data.sceneforge);
}

export async function readSceneProjectStyleSelection(
  projectDir: string,
): Promise<SceneProjectStyleSelection> {
  const meta = await readSceneProjectMeta(projectDir);
  return {
    selectedStyleProfileId: meta.selectedStyleProfileId ?? null,
    selectedAssetIds: meta.selectedAssetIds ?? [],
  };
}

export function getEffectiveSceneSelectedAssetIds(
  selection: SceneProjectStyleSelection,
): string[] {
  return Array.from(
    new Set(
      [selection.selectedStyleProfileId, ...selection.selectedAssetIds].filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      ),
    ),
  );
}

export async function updateSceneProjectStyleSelection(
  projectDir: string,
  selection: SceneProjectStyleSelection,
): Promise<SceneProjectMeta> {
  const data = await loadProjectFile(projectDir);
  const nextMeta = normalizeSceneProjectMeta({
    ...data.sceneforge,
    selectedStyleProfileId: selection.selectedStyleProfileId,
    selectedAssetIds: selection.selectedAssetIds,
  });
  const nextData: ProjectData = {
    ...data,
    type: 'sceneforge',
    sceneforge: nextMeta,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(path.join(projectDir, 'project.json'), JSON.stringify(nextData, null, 2), 'utf-8');
  return nextMeta;
}

export async function syncSceneProjectMetaFromState(
  projectDir: string,
  state: import('../pipeline/scene-state-machine').SceneState,
): Promise<SceneProjectMeta> {
  const data = await loadProjectFile(projectDir);
  const nextMeta = normalizeSceneProjectMeta({
    ...data.sceneforge,
    currentStage: state.currentStage,
    status: state.status,
    coreArtifacts: state.coreArtifacts,
  });
  const nextData: ProjectData = {
    ...data,
    type: 'sceneforge',
    sceneforge: nextMeta,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(path.join(projectDir, 'project.json'), JSON.stringify(nextData, null, 2), 'utf-8');
  return nextMeta;
}

export async function createSceneForgeProject(
  projectDir: string,
  entryPath: SceneEntryPath = 'topic_gate',
): Promise<ProjectData> {
  const meta = createDefaultSceneProjectMeta(entryPath);
  const data: ProjectData = {
    ...createDefaultProjectData(),
    type: 'sceneforge',
    sceneforge: meta,
  };

  const sceneDir = path.join(projectDir, SCENE_ROOT);
  await fs.mkdir(path.join(projectDir, 'inputs'), { recursive: true });
  await fs.mkdir(sceneDir, { recursive: true });

  await Promise.all([
    fs.writeFile(path.join(projectDir, 'project.json'), JSON.stringify(data, null, 2), 'utf-8'),
    fs.writeFile(
      path.join(projectDir, 'inputs', 'source.md'),
      '# 源材料\n\n',
      'utf-8',
    ),
    fs.writeFile(
      path.join(sceneDir, 'state.json'),
      JSON.stringify(createInitialSceneState(meta), null, 2),
      'utf-8',
    ),
    writeDefaultApprovalPolicy(projectDir),
    fs.writeFile(
      path.join(sceneDir, 'artifact_manifest.yaml'),
      EMPTY_ARTIFACT_MANIFEST,
      'utf-8',
    ),
  ]);

  return data;
}
