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
  setSceneCurrentStage,
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

  it('persists currentStage without mutating existing stage runtime status', async () => {
    await markSceneStageDraftSubmitted(tmpDir, 'design', ['design.design_prompts']);

    const before = await readSceneState(tmpDir);
    expect(before.currentStage).toBe('design');
    expect(before.stages.design.status).toBe('draft_submitted');

    await setSceneCurrentStage(tmpDir, 'script');

    const after = await readSceneState(tmpDir);
    expect(after.currentStage).toBe('script');
    expect(after.stages.design.status).toBe('draft_submitted');
    expect(after.stages.script.status).toBe('ready');
  });

  it('migrates legacy export stage out of state.json', async () => {
    const statePath = path.join(tmpDir, 'sceneforge', 'state.json');
    await fs.writeFile(
      statePath,
      JSON.stringify(
        {
          version: 1,
          pipelineId: 'reference_remake',
          currentStage: 'export',
          status: 'in_progress',
          stages: {
            export: {
              status: 'validated',
              artifactIds: ['export.final_prompt_pack'],
              validation: { status: 'passed', errorCodes: [] },
              validatedAt: '2026-01-01T00:00:00.000Z',
              approvedAt: null,
              revisionNote: null,
            },
            design: {
              status: 'approved',
              artifactIds: [],
              validation: null,
              validatedAt: null,
              approvedAt: null,
              revisionNote: null,
            },
          },
          coreArtifacts: { design: null, storyboard: null, videoPrompts: null },
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        null,
        2,
      ),
      'utf-8',
    );

    const state = await readSceneState(tmpDir);
    expect(state.currentStage).toBe('publish');
    expect(state.stages.export).toBeUndefined();
    expect(state.stages.publish?.status).toBe('validated');

    const persisted = JSON.parse(await fs.readFile(statePath, 'utf-8'));
    expect(persisted.currentStage).toBe('publish');
    expect(persisted.stages.export).toBeUndefined();
  });
});