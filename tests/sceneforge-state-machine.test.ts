import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import {
  SceneStateMachineError,
  approveSceneStage,
  markSceneStageDraftSubmitted,
  markSceneStageValidated,
  readSceneState,
} from '../electron/sceneforge/pipeline/scene-state-machine';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-state-'));
  await createSceneForgeProject(tmpDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('SceneForge state machine', () => {
  it('keeps validated separate from approved for required stages', async () => {
    await markSceneStageDraftSubmitted(tmpDir, 'design', [
      'design.design_prompts',
      'design.character_prompts',
    ]);
    await markSceneStageValidated(tmpDir, 'design', 'required');

    const waitingState = await readSceneState(tmpDir);
    expect(waitingState.stages.design.status).toBe('waiting_approval');
    expect(waitingState.stages.design.validatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(waitingState.stages.design.approvedAt).toBeNull();

    await approveSceneStage(tmpDir, 'design');

    const approvedState = await readSceneState(tmpDir);
    expect(approvedState.stages.design.status).toBe('approved');
    expect(approvedState.stages.design.approvedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('rejects approval before the stage is waiting for approval', async () => {
    await expect(approveSceneStage(tmpDir, 'design')).rejects.toBeInstanceOf(
      SceneStateMachineError,
    );
    await expect(approveSceneStage(tmpDir, 'design')).rejects.toMatchObject({
      code: 'SCENE_STAGE_NOT_VALIDATED',
    });
  });
});
