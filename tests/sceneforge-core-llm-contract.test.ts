import { describe, expect, it } from 'vitest';
import {
  assertSceneStagePackOutputContract,
  loadSceneStagePack,
  SceneStagePackError,
} from '../electron/sceneforge/pipeline/scene-stage-pack';
import { getSceneStageDefinition } from '../electron/sceneforge/pipeline/scene-stage-definitions';

const CORE_STAGES = ['design', 'storyboard', 'video_prompts'] as const;

describe('SceneForge core LLM output contracts', () => {
  it.each(CORE_STAGES)('%s pack matches the stage definition', async (stage) => {
    const pack = await loadSceneStagePack(stage);

    expect(pack.outputContract.requiredArtifacts).toEqual(
      getSceneStageDefinition(stage).requiredArtifacts,
    );
  });

  it('rejects a pack whose output contract drifts from the stage definition', () => {
    expect(() =>
      assertSceneStagePackOutputContract({
        stage: 'design',
        requiredArtifacts: ['design_prompts'],
      }),
    ).toThrowError(
      expect.objectContaining<Partial<SceneStagePackError>>({
        code: 'SCENE_STAGE_OUTPUT_CONTRACT_MISMATCH',
      }),
    );
  });
});
