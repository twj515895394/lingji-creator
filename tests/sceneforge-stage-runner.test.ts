import { describe, expect, it, vi } from 'vitest';
import {
  SceneStageRunnerNotImplementedError,
  createSceneStageRunner,
  createManualStageRunner,
} from '../electron/sceneforge/pipeline/scene-stage-runner';

describe('SceneForge stage runner', () => {
  it('manual runner returns draft and does not submit by itself', async () => {
    const submitStageDraft = vi.fn();
    const runner = createManualStageRunner();

    const result = await runner.run({
      projectDir: '/tmp/project',
      stage: 'design',
      stageContext: { stage: 'design' },
      manualArtifacts: { design_prompts: '# Design' },
      submitStageDraft,
    });

    expect(result.runnerType).toBe('manual_submit');
    expect(result.artifacts).toEqual({ design_prompts: '# Design' });
    expect(submitStageDraft).not.toHaveBeenCalled();
  });

  it('direct_llm and acp_agent runners return structured not implemented errors', async () => {
    await expect(
      createSceneStageRunner('direct_llm').run({
        projectDir: '/tmp/project',
        stage: 'design',
        stageContext: { stage: 'design' },
        submitStageDraft: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(SceneStageRunnerNotImplementedError);

    await expect(
      createSceneStageRunner('acp_agent').run({
        projectDir: '/tmp/project',
        stage: 'design',
        stageContext: { stage: 'design' },
        submitStageDraft: vi.fn(),
      }),
    ).rejects.toMatchObject({ code: 'SCENE_STAGE_RUNNER_NOT_IMPLEMENTED' });
  });
});
