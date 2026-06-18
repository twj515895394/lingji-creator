import fs from 'node:fs/promises';
import path from 'node:path';
import { createDefaultProjectData, type ProjectData } from '../../../src/lib/project-persistence';
import type { SceneEntryPath, SceneProjectMeta, SceneStageId } from '../../../src/types/sceneforge';
import { SCENE_STAGE_IDS } from '../../../src/types/sceneforge';
import { writeDefaultApprovalPolicy } from '../pipeline/scene-approval-policy';

const SCENE_ROOT = 'sceneforge';

export function createDefaultSceneProjectMeta(entryPath: SceneEntryPath = 'topic_gate'): SceneProjectMeta {
  const startStage: SceneStageId =
    entryPath === 'source_intake' ? 'source_intake' : 'topic_gate';
  return {
    version: 1,
    projectRoot: SCENE_ROOT,
    pipelineId: 'reference_remake',
    entryPath,
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
  const raw = await fs.readFile(path.join(projectDir, 'project.json'), 'utf-8');
  const data = JSON.parse(raw) as { sceneforge?: SceneProjectMeta };
  const entry = data.sceneforge?.entryPath;
  if (entry === 'source_intake' || entry === 'topic_gate') {
    return entry;
  }
  return 'topic_gate';
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
