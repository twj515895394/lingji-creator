import { describe, expect, it } from 'vitest';
import { loadSceneStagePack } from '../electron/sceneforge/pipeline/scene-stage-pack';

describe('SceneForge stage pack', () => {
  it('loads rules and contracts for design stage', async () => {
    const pack = await loadSceneStagePack('design');

    expect(pack.stage).toBe('design');
    expect(pack.systemPrompt).toContain('Design');
    expect(pack.userPrompt).toContain('{{stageContext}}');
    expect(pack.agentInstructions).toContain('scene_submit_stage_draft');
    expect(pack.outputContract.requiredArtifacts).toEqual([
      'design_prompts',
      'character_prompts',
      'scene_prompts',
      'prop_prompts',
      'master_reference_prompt',
    ]);
    expect(pack.reviewChecklist.length).toBeGreaterThan(0);
    expect(pack.sourceDir).toContain('prompts/sceneforge/stages/design');
    expect(pack.sourceDir).not.toContain('.agents/skills');
  });
});
