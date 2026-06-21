import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { SceneForgeService } from '../electron/sceneforge/service';

let tmpDir: string;
let service: SceneForgeService;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-stage-pack-context-'));
  await createSceneForgeProject(tmpDir);
  service = new SceneForgeService();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('SceneForge Stage Context stage pack integration', () => {
  it('includes program-loaded stage pack summary and output contract', async () => {
    const context = await service.getStageContext(tmpDir, 'design');

    expect(context.stagePack).toMatchObject({
      stage: 'design',
      hasSystemPrompt: true,
      hasUserPrompt: true,
      hasAgentInstructions: true,
      reviewChecklistCount: expect.any(Number),
    });
    expect(context.stagePack?.sourceDir).toContain('prompts/sceneforge/stages/design');
    expect(context.outputContract.requiredArtifacts).toEqual([
      'design_prompts',
      'character_prompts',
      'scene_prompts',
      'prop_prompts',
      'master_reference_prompt',
    ]);
  });

  it('injects asset library snippets when selectedAssetIds are provided', async () => {
    const context = await service.getStageContext(tmpDir, 'storyboard', {
      selectedAssetIds: ['style.pixar_like', 'cinematic.shot_language', 'adaptation.idea_seed'],
    });

    expect(context.assetLibrary?.selectedAssets).toEqual([
      'style.pixar_like',
      'cinematic.shot_language',
    ]);
    expect(context.assetLibrary?.snippets.length).toBeGreaterThan(0);
    expect(context.assetLibrary?.snippets[0]).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      type: expect.any(String),
      text: expect.any(String),
    });
  });

  it('defaults to project-level style selection when stage context has no override', async () => {
    await service.updateStyleSelection({
      projectDir: tmpDir,
      selectedStyleProfileId: 'style.pixar_like',
      selectedAssetIds: ['cinematic.shot_language'],
    });

    const context = await service.getStageContext(tmpDir, 'storyboard');

    expect(context.assetLibrary?.selectedAssets).toEqual([
      'style.pixar_like',
      'cinematic.shot_language',
    ]);
  });

  it('filters project-level assets by current stage policy instead of reusing all selected assets', async () => {
    await service.updateStyleSelection({
      projectDir: tmpDir,
      selectedStyleProfileId: 'style.pixar_like',
      selectedAssetIds: ['adaptation.idea_seed', 'cinematic.shot_language'],
    });

    const storyContext = await service.getStageContext(tmpDir, 'story');
    const audioContext = await service.getStageContext(tmpDir, 'audio');

    expect(storyContext.assetLibrary?.selectedAssets).toEqual(['adaptation.idea_seed']);
    expect(audioContext.assetLibrary).toBeUndefined();
  });

  it('manual runStage returns draft without bypassing submitStageDraft', async () => {
    const result = await service.runStage({
      projectDir: tmpDir,
      stage: 'design',
      runnerType: 'manual_submit',
      manualArtifacts: { design_prompts: '# Design' },
    });

    expect(result.runnerType).toBe('manual_submit');
    expect(result.artifacts).toEqual({ design_prompts: '# Design' });
    const state = await service.getProjectState(tmpDir);
    expect(state.artifacts).toEqual([]);
  });

  it('reports missing required upstream for performance direct_llm context', async () => {
    const context = await service.getStageContext(tmpDir, 'performance', {
      runner: 'direct_llm',
    });
    const scriptRequired = context.requiredInputs.find(
      (input) => input.policyInputId === 'script_draft',
    );
    expect(scriptRequired?.satisfied).toBe(false);
    await expect(
      service.runStage({
        projectDir: tmpDir,
        stage: 'performance',
        runnerType: 'direct_llm',
      }),
    ).rejects.toThrow(/无法运行|script/);
  });
});
