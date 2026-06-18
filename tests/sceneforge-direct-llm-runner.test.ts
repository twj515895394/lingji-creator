import { describe, expect, it, vi } from 'vitest';
import {
  createDirectLlmStageRunner,
  SceneDirectLlmRunnerError,
} from '../electron/sceneforge/runners/scene-direct-llm-runner';
import type { SceneStageContext } from '../electron/sceneforge/pipeline/scene-context-builder';
import type { SceneStageId } from '../electron/sceneforge/types';

const REQUIRED_ARTIFACTS = {
  design: [
      'design_prompts',
      'character_prompts',
      'scene_prompts',
      'prop_prompts',
      'master_reference_prompt',
  ],
  storyboard: [
    'storyboard_prompt_pack',
    'control_board_prompts',
    'style_board_prompts',
    'master_board_prompt',
  ],
  video_prompts: ['video_prompt_pack', 'video_prompt_pack_cn'],
} as const;

function makeContext(stage: keyof typeof REQUIRED_ARTIFACTS): SceneStageContext {
  return {
    stage,
    requiredInputs: [],
    optionalInputs: [],
    outputContract: {
      requiredArtifacts: [...REQUIRED_ARTIFACTS[stage]],
    },
    forbiddenActions: [],
    warnings: [],
    handoffRefs: [],
  };
}

function makeArtifacts(stage: keyof typeof REQUIRED_ARTIFACTS): Record<string, string> {
  return Object.fromEntries(
    REQUIRED_ARTIFACTS[stage].map((key) => [key, `# ${key}`]),
  );
}

function createRunner(raw: string, loadSettings = async () => ({}) as never) {
  return createDirectLlmStageRunner({
    loadSettings,
    generateText: vi.fn().mockResolvedValue(raw),
  });
}

const CORE_STAGES: Array<keyof typeof REQUIRED_ARTIFACTS> = [
  'design',
  'storyboard',
  'video_prompts',
];

const baseInput = {
  projectDir: process.cwd(),
  manualArtifacts: undefined,
  submitStageDraft: vi.fn(),
};

describe('SceneForge direct_llm runner', () => {
  it.each(CORE_STAGES)('returns a complete %s artifact map without submitting', async (stage) => {
    const submitStageDraft = vi.fn();
    const artifacts = makeArtifacts(stage);
    const runner = createRunner(JSON.stringify(artifacts));

    const result = await runner.run({
      ...baseInput,
      stage,
      stageContext: makeContext(stage),
      submitStageDraft,
    });

    expect(result.runnerType).toBe('direct_llm');
    expect(result.artifacts).toEqual(artifacts);
    expect(submitStageDraft).not.toHaveBeenCalled();
  });

  it.each([
    ['missing key', { design_prompts: '# Design' }],
    ['blank key', { ...makeArtifacts('design'), character_prompts: '   ' }],
  ])('rejects a design response with a %s', async (_label, artifacts) => {
    const runner = createRunner(JSON.stringify(artifacts));

    await expect(
      runner.run({
        ...baseInput,
        stage: 'design',
        stageContext: makeContext('design'),
      }),
    ).rejects.toMatchObject<Partial<SceneDirectLlmRunnerError>>({
      code: 'SCENE_DIRECT_LLM_MISSING_ARTIFACTS',
    });
  });

  it('rejects invalid JSON with a parse error', async () => {
    const runner = createRunner('not-json');

    await expect(
      runner.run({
        ...baseInput,
        stage: 'design',
        stageContext: makeContext('design'),
      }),
    ).rejects.toMatchObject<Partial<SceneDirectLlmRunnerError>>({
      code: 'SCENE_DIRECT_LLM_PARSE_FAILED',
    });
  });

  it('fails before generation when settings are missing', async () => {
    const runner = createRunner(JSON.stringify(makeArtifacts('design')), async () => null);

    await expect(
      runner.run({
        ...baseInput,
        stage: 'design' as SceneStageId,
        stageContext: makeContext('design'),
      }),
    ).rejects.toMatchObject<Partial<SceneDirectLlmRunnerError>>({
      code: 'SCENE_DIRECT_LLM_NO_SETTINGS',
    });
  });
});
