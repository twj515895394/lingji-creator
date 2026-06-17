import fs from 'node:fs/promises';
import path from 'node:path';
import { createDefaultProjectData, type ProjectData } from '../../../src/lib/project-persistence';
import type { SceneProjectMeta } from '../../../src/types/sceneforge';
import { writeDefaultApprovalPolicy } from '../pipeline/scene-approval-policy';

const SCENE_ROOT = 'sceneforge';

export function createDefaultSceneProjectMeta(): SceneProjectMeta {
  return {
    version: 1,
    projectRoot: SCENE_ROOT,
    pipelineId: 'reference_remake',
    currentStage: 'design',
    status: 'ready',
    coreArtifacts: { design: null, storyboard: null, videoPrompts: null },
    lastExportPath: null,
  };
}

function createInitialSceneState(meta: SceneProjectMeta) {
  return {
    version: 1,
    pipelineId: meta.pipelineId,
    currentStage: meta.currentStage,
    status: meta.status,
    stages: {
      design: { status: 'ready', artifactIds: [] },
      storyboard: { status: 'ready', artifactIds: [] },
      video_prompts: { status: 'ready', artifactIds: [] },
    },
    coreArtifacts: meta.coreArtifacts,
    updatedAt: new Date().toISOString(),
  };
}

const EMPTY_ARTIFACT_MANIFEST = [
  'version: 1',
  'artifacts: []',
  '',
].join('\n');

export async function createSceneForgeProject(projectDir: string): Promise<ProjectData> {
  const meta = createDefaultSceneProjectMeta();
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
