import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { listSceneArtifacts } from '../electron/sceneforge/artifacts/scene-artifact-store';
import { readSceneState } from '../electron/sceneforge/pipeline/scene-state-machine';
import { SceneForgeService, SceneForgeServiceError } from '../electron/sceneforge/service';

let tmpDir: string;
let service: SceneForgeService;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-service-'));
  await createSceneForgeProject(tmpDir);
  service = new SceneForgeService();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

const completeDesignDraft = {
  design_prompts: '# 设定图提示词\n\n整体视觉统一。',
  character_prompts: '# 角色提示词\n\n主角、配角、服饰。',
  scene_prompts: '# 场景提示词\n\n室内、街景、光线。',
  prop_prompts: '# 道具提示词\n\n关键物件。',
  master_reference_prompt: '# 总参考图提示词\n\n统一构图和风格。',
};

describe('SceneForgeService design flow', () => {
  it('submits, validates and approves design through the service', async () => {
    const submit = await service.submitDesignDraft(tmpDir, completeDesignDraft);

    expect(submit.validation.status).toBe('passed');
    expect(submit.status).toBe('waiting_approval');
    expect(submit.artifactIds).toEqual([
      'design.design_prompts',
      'design.character_prompts',
      'design.scene_prompts',
      'design.prop_prompts',
      'design.master_reference_prompt',
    ]);

    const artifacts = await listSceneArtifacts(tmpDir);
    expect(artifacts).toHaveLength(5);
    expect(artifacts.every((artifact) => artifact.role === 'core_generation_asset')).toBe(true);

    const emptyContext = await service.getStageContext(tmpDir, 'storyboard');
    expect(emptyContext.requiredInputs).toEqual([]);

    await service.approveStage(tmpDir, 'design');

    const state = await readSceneState(tmpDir);
    expect(state.stages.design.status).toBe('approved');

    const context = await service.getStageContext(tmpDir, 'storyboard');
    expect(context.requiredInputs.map((input) => input.artifactId)).toEqual([
      'design.master_reference_prompt',
      'design.character_prompts',
    ]);
    expect(context.requiredInputs[0].content).toContain('总参考图');
  });

  it('does not approve a design draft that failed validation', async () => {
    const submit = await service.submitDesignDraft(tmpDir, {
      design_prompts: '# 设定图提示词\n\n只有一个产物。',
    });

    expect(submit.validation.status).toBe('failed');
    expect(submit.status).toBe('validation_failed');

    await expect(service.approveStage(tmpDir, 'design')).rejects.toMatchObject({
      code: 'SCENE_STAGE_NOT_VALIDATED',
    });
  });

  it('rejects unknown design artifact keys at the service boundary', async () => {
    await expect(
      service.submitDesignDraft(tmpDir, {
        design_prompts: '# 设定图提示词',
        not_a_design_artifact: '# 非法产物',
      } as never),
    ).rejects.toBeInstanceOf(SceneForgeServiceError);

    await expect(
      service.submitDesignDraft(tmpDir, {
        not_a_design_artifact: '# 非法产物',
      } as never),
    ).rejects.toMatchObject({ code: 'INVALID_DESIGN_DRAFT_ARTIFACT' });
  });
});
