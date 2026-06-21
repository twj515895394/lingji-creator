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

    const storyboardPack = policy.inputs.find((i) => i.id === 'storyboard_pack');
    expect(storyboardPack?.delivery).toBe('full');
  });

  it('video_prompts policy does not default all design and storyboard keys to full delivery', async () => {
    const policy = await loadSceneContextPolicy('video_prompts');

    const fullInputs = policy.inputs.filter((i) => i.delivery === 'full');
    const fullKeys = fullInputs.map((i) => `${i.fromStage}:${i.artifactKey}`);

    expect(fullKeys).not.toContain('design:character_prompts');
    expect(fullKeys).not.toContain('design:scene_prompts');
    expect(fullKeys).not.toContain('design:prop_prompts');

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

  it('video_prompts policy requires storyboard control and style boards', async () => {
    const policy = await loadSceneContextPolicy('video_prompts');
    const requiredKeys = policy.inputs.map((i) => `${i.fromStage}:${i.artifactKey}`);
    expect(requiredKeys).toContain('storyboard:control_board_prompts');
    expect(requiredKeys).toContain('storyboard:style_board_prompts');
  });

  it('performance policy requires script_draft and design character + design_prompts', async () => {
    const policy = await loadSceneContextPolicy('performance');
    const requiredIds = policy.inputs.map((i) => i.id);
    expect(requiredIds).toContain('script_draft');
    expect(requiredIds).toContain('design_character_prompts');
    expect(requiredIds).toContain('design_prompts');

    const script = policy.inputs.find((i) => i.id === 'script_draft');
    expect(script?.delivery).toBe('handoff_first');
    expect(script?.fallback).toBe('full');

    const character = policy.inputs.find((i) => i.id === 'design_character_prompts');
    expect(character?.artifactKey).toBe('character_prompts');
    expect(character?.delivery).toBe('handoff_first');
  });

  it('storyboard policy includes performance_direction as full', async () => {
    const policy = await loadSceneContextPolicy('storyboard');
    expect(policy.inputs.map((input) => input.id)).toContain('design_prompts');
    expect(policy.inputs.map((input) => input.id)).toContain('design_scenes');
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

  it('publish policy requires video pack, story direction, and design master for publish copy', async () => {
    const policy = await loadSceneContextPolicy('publish');
    expect(policy.stage).toBe('publish');
    const requiredIds = policy.inputs.filter((i) => i.required).map((i) => i.id);
    expect(requiredIds).toContain('video_prompt_pack');
    expect(requiredIds).toContain('story_direction');
    expect(requiredIds).toContain('design_master');

    const story = policy.inputs.find((i) => i.id === 'story_direction');
    expect(story?.fromStage).toBe('story');
    expect(story?.artifactKey).toBe('story_direction');

    const optionalIds = (policy.optionalInputs ?? []).map((i) => i.id);
    expect(optionalIds).toContain('topic_brief');
    expect(optionalIds).toContain('topic_analysis');
  });

  it('throws stable error when policy file is missing', async () => {
    await expect(loadSceneContextPolicy('source_intake')).rejects.toBeInstanceOf(
      SceneContextPolicyError,
    );
  });
});
