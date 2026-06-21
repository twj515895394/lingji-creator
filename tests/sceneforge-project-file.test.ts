import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  createSceneForgeProject,
  readSceneProjectStyleSelection,
  updateSceneProjectStyleSelection,
} from '../electron/sceneforge/project/scene-project-file';
import { loadProjectFile } from '../electron/project-file';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-project-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('createSceneForgeProject', () => {
  it('initializes the SceneForge project skeleton inside the selected directory', async () => {
    const data = await createSceneForgeProject(tmpDir);

    expect(data.type).toBe('sceneforge');
    expect(data.sceneforge).toEqual({
      version: 1,
      projectRoot: 'sceneforge',
      pipelineId: 'reference_remake',
      currentStage: 'topic_gate',
      entryPath: 'topic_gate',
      selectedStyleProfileId: null,
      selectedAssetIds: [],
      status: 'ready',
      coreArtifacts: { design: null, storyboard: null, videoPrompts: null },
      lastExportPath: null,
    });

    await expect(fs.access(path.join(tmpDir, 'project.json'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(tmpDir, 'inputs', 'source.md'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(tmpDir, 'sceneforge', 'state.json'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(tmpDir, 'sceneforge', 'approval_policy.yaml'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(tmpDir, 'sceneforge', 'artifact_manifest.yaml'))).resolves.toBeUndefined();

    const persisted = JSON.parse(
      await fs.readFile(path.join(tmpDir, 'project.json'), 'utf-8'),
    );
    expect(persisted.type).toBe('sceneforge');
    expect(persisted.sceneforge.currentStage).toBe('topic_gate');
  });

  it('keeps SceneForge project.json compatible with loadProjectFile', async () => {
    await createSceneForgeProject(tmpDir);

    const data = await loadProjectFile(tmpDir);

    expect(data.type).toBe('sceneforge');
    expect(data.sceneforge?.projectRoot).toBe('sceneforge');
    expect(data.timeline).toBeNull();
    expect(data.aiAnalysis).toEqual({ analysisResult: null, coverCandidates: [] });
  });

  it('persists project-level style selection inside sceneforge metadata', async () => {
    await createSceneForgeProject(tmpDir);

    await updateSceneProjectStyleSelection(tmpDir, {
      selectedStyleProfileId: 'style.pixar_like',
      selectedAssetIds: ['cinematic.shot_language', 'storyboard.methodology_index'],
    });

    await expect(readSceneProjectStyleSelection(tmpDir)).resolves.toEqual({
      selectedStyleProfileId: 'style.pixar_like',
      selectedAssetIds: ['cinematic.shot_language', 'storyboard.methodology_index'],
    });
  });
});
