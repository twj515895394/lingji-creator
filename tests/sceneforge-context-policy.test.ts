import { describe, expect, it } from 'vitest';
import {
  loadDefaultSceneContextPolicy,
  loadSceneContextPolicy,
  SceneContextPolicyError,
} from '../electron/sceneforge/pipeline/scene-context-policy';
import type { SceneStageId } from '../src/types/sceneforge';

const CORE_POLICY_STAGES: SceneStageId[] = ['design', 'storyboard', 'video_prompts'];

describe('SceneForge context policy loader', () => {
  it('loads default pipeline policy with version 1', async () => {
    const policy = await loadDefaultSceneContextPolicy();
    expect(policy.version).toBe(1);
    expect(policy.runnerOverrides).toBeDefined();
  });

  it.each(CORE_POLICY_STAGES)('loads context-policy.yaml for core stage %s', async (stage) => {
    const policy = await loadSceneContextPolicy(stage);
    expect(policy.version).toBe(1);
    expect(policy.stage).toBe(stage);
    expect(Array.isArray(policy.inputs)).toBe(true);
    expect(policy.inputs.length).toBeGreaterThan(0);
  });

  it('video_prompts policy includes audio and performance inputs', async () => {
    const policy = await loadSceneContextPolicy('video_prompts');

    const inputIds = policy.inputs.map((i) => i.id);
    expect(inputIds).toContain('audio_plan');
    expect(inputIds).toContain('performance_sheet');

    const audio = policy.inputs.find((i) => i.id === 'audio_plan');
    expect(audio?.fromStage).toBe('audio');
    expect(audio?.artifactKey).toBe('audio_design');

    const performance = policy.inputs.find((i) => i.id === 'performance_sheet');
    expect(performance?.fromStage).toBe('performance');
    expect(performance?.artifactKey).toBe('performance_direction');
    expect(performance?.delivery).toBe('full');
  });

  it('video_prompts policy does not default all design and storyboard keys to full delivery', async () => {
    const policy = await loadSceneContextPolicy('video_prompts');

    const fullInputs = policy.inputs.filter((i) => i.delivery === 'full');
    const fullKeys = fullInputs.map((i) => `${i.fromStage}:${i.artifactKey}`);

    expect(fullKeys).not.toContain('design:character_prompts');
    expect(fullKeys).not.toContain('design:scene_prompts');
    expect(fullKeys).not.toContain('design:prop_prompts');
    expect(fullKeys).not.toContain('storyboard:control_board_prompts');
    expect(fullKeys).not.toContain('storyboard:style_board_prompts');

    const nineKeyFullRule = policy.inputs.filter(
      (i) =>
        i.delivery === 'full' &&
        (i.fromStage === 'design' || i.fromStage === 'storyboard'),
    );
    expect(nineKeyFullRule.length).toBeLessThan(9);
  });

  it('video_prompts forbidden blocks bulk full-read of optional design/storyboard artifacts', async () => {
    const policy = await loadSceneContextPolicy('video_prompts');
    expect(policy.forbidden?.length).toBeGreaterThan(0);

    const forbiddenKeys = (policy.forbidden ?? []).map(
      (f) => `${f.fromStage}:${f.artifactKey}`,
    );
    expect(forbiddenKeys).toContain('design:prop_prompts');
  });

  it('storyboard policy includes performance_direction as full', async () => {
    const policy = await loadSceneContextPolicy('storyboard');
    const perf = policy.inputs.find(
      (i) => i.fromStage === 'performance' && i.artifactKey === 'performance_direction',
    );
    expect(perf).toBeDefined();
    expect(perf?.delivery).toBe('full');
  });

  it('throws stable error for unknown stage id', async () => {
    await expect(
      loadSceneContextPolicy('__not_a_stage__' as SceneStageId),
    ).rejects.toMatchObject({
      code: 'INVALID_STAGE',
    });
  });

  it('throws stable error when policy file is missing', async () => {
    await expect(loadSceneContextPolicy('publish')).rejects.toBeInstanceOf(
      SceneContextPolicyError,
    );
  });
});