import { describe, expect, it, vi } from 'vitest';
import { createDirectLlmStageRunner } from '../electron/sceneforge/runners/scene-direct-llm-runner';
import type { SceneStageContext } from '../electron/sceneforge/pipeline/scene-context-builder';

const designContext: SceneStageContext = {
  stage: 'design',
  requiredInputs: [],
  optionalInputs: [],
  outputContract: {
    requiredArtifacts: [
      'design_prompts',
      'character_prompts',
      'scene_prompts',
      'prop_prompts',
      'master_reference_prompt',
    ],
  },
  forbiddenActions: [],
  warnings: [],
  handoffRefs: [],
};

describe('SceneForge direct_llm runner', () => {
  it('returns artifact map from mocked LLM without calling submitStageDraft', async () => {
    const submitStageDraft = vi.fn();
    const generateText = vi.fn().mockResolvedValue(
      JSON.stringify({
        design_prompts: '# Design',
        character_prompts: '# Char',
        scene_prompts: '# Scene',
        prop_prompts: '# Prop',
        master_reference_prompt: '# Master',
      }),
    );

    const runner = createDirectLlmStageRunner({
      loadSettings: async () => ({ llmProviders: [], defaultProviderId: null, defaultModel: null } as never),
      generateText,
    });

    const result = await runner.run({
      projectDir: process.cwd(),
      stage: 'design',
      stageContext: designContext,
      submitStageDraft,
    });

    expect(result.runnerType).toBe('direct_llm');
    expect(result.artifacts.design_prompts).toContain('Design');
    expect(submitStageDraft).not.toHaveBeenCalled();
    expect(generateText).toHaveBeenCalled();
  });
});