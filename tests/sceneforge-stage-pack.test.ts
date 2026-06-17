import { describe, expect, it } from 'vitest';
import { loadSceneContextPolicy } from '../electron/sceneforge/pipeline/scene-context-policy';
import { loadSceneStagePack } from '../electron/sceneforge/pipeline/scene-stage-pack';

const P0_STAGES = ['design', 'storyboard', 'video_prompts', 'performance', 'audio'] as const;

describe('SceneForge stage pack (P0)', () => {
  it.each(P0_STAGES)('loads stage pack for %s without reading .agents/skills', async (stage) => {
    const pack = await loadSceneStagePack(stage);

    expect(pack.stage).toBe(stage);
    expect(pack.sourceDir).toContain(`prompts/sceneforge/stages/${stage}`);
    expect(pack.sourceDir).not.toContain('.agents/skills');
    expect(pack.systemPrompt.length).toBeGreaterThan(0);
    expect(pack.outputContract.requiredArtifacts.length).toBeGreaterThan(0);
    expect(pack.reviewChecklist.length).toBeGreaterThan(0);
  });

  it('storyboard pack matches core output contract keys', async () => {
    const pack = await loadSceneStagePack('storyboard');
    expect(pack.outputContract.requiredArtifacts).toEqual([
      'storyboard_prompt_pack',
      'control_board_prompts',
      'style_board_prompts',
      'master_board_prompt',
    ]);
  });

  it('video_prompts context policy includes audio and performance consumer inputs', async () => {
    const policy = await loadSceneContextPolicy('video_prompts');
    const ids = policy.inputs.map((i) => i.id);
    expect(ids).toContain('audio_plan');
    expect(ids).toContain('performance_sheet');
  });

  it('performance and audio packs expose handoff template paths when present', async () => {
    const performance = await loadSceneStagePack('performance');
    const audio = await loadSceneStagePack('audio');
    expect(performance.auxiliaryPaths.handoffTemplatePath).toContain('performance/handoff-template.yaml');
    expect(audio.auxiliaryPaths.handoffTemplatePath).toContain('audio/handoff-template.yaml');
  });
});