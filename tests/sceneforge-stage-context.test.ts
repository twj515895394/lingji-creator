import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { writeSceneArtifact } from '../electron/sceneforge/artifacts/scene-artifact-store';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { SceneForgeService } from '../electron/sceneforge/service';

let tmpDir: string;
let service: SceneForgeService;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-context-'));
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

const completeStoryboardDraft = {
  storyboard_prompt_pack: '# 故事板提示词\n\n镜头 1。',
  control_board_prompts: '# 控制板提示词\n\n构图与镜头。',
  style_board_prompts: '# 风格板提示词\n\n色彩与材质。',
  master_board_prompt: '# 总故事板提示词\n\n统一分镜风格。',
};

describe('SceneForge Stage Context', () => {
  it('exposes only approved design final artifacts and authorized support artifacts to storyboard', async () => {
    await service.submitDesignDraft(tmpDir, completeDesignDraft);

    await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'design',
      artifactKey: 'preview_notes',
      kind: 'preview',
      title: '预览草稿',
      content: '# 不应进入上下文',
      role: 'core_generation_asset',
      coreAsset: true,
      readableByDownstream: true,
    });
    await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'performance',
      artifactKey: 'performance_direction',
      kind: 'final',
      title: '表演指导',
      content: '# 表演指导\n\n可供 Storyboard 使用。',
      role: 'support_direction_asset',
      coreAsset: false,
      readableByDownstream: true,
    });
    await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'assets',
      artifactKey: 'asset_plan',
      kind: 'final',
      title: '资产计划',
      content: '# 未授权给 Storyboard',
      role: 'support_direction_asset',
      coreAsset: false,
      readableByDownstream: true,
    });

    const beforeApproval = await service.getStageContext(tmpDir, 'storyboard');
    expect(beforeApproval.requiredInputs).toEqual([]);
    expect(beforeApproval.optionalInputs.map((input) => input.artifactId)).toEqual([
      'performance.performance_direction',
    ]);

    await service.approveStage(tmpDir, 'design');
    const context = await service.getStageContext(tmpDir, 'storyboard');

    expect(context.outputContract.requiredArtifacts).toEqual([
      'storyboard_prompt_pack',
      'control_board_prompts',
      'style_board_prompts',
      'master_board_prompt',
    ]);
    expect(context.requiredInputs.map((input) => input.artifactId)).toEqual([
      'design.design_prompts',
      'design.character_prompts',
      'design.scene_prompts',
      'design.prop_prompts',
      'design.master_reference_prompt',
    ]);
    expect(context.optionalInputs.map((input) => input.artifactId)).toEqual([
      'performance.performance_direction',
    ]);
  });

  it('exposes approved design and approved storyboard to video prompts without mixing unapproved storyboard drafts', async () => {
    await service.submitDesignDraft(tmpDir, completeDesignDraft);
    await service.approveStage(tmpDir, 'design');
    await service.submitStoryboardDraft(tmpDir, completeStoryboardDraft);

    const beforeStoryboardApproval = await service.getStageContext(tmpDir, 'video_prompts');
    expect(beforeStoryboardApproval.requiredInputs.map((input) => input.stage)).toEqual([
      'design',
      'design',
      'design',
      'design',
      'design',
    ]);

    await service.approveStage(tmpDir, 'storyboard');
    const context = await service.getStageContext(tmpDir, 'video_prompts');

    expect(context.outputContract.requiredArtifacts).toEqual([
      'video_prompt_pack',
      'video_prompt_pack_cn',
    ]);
    expect(context.requiredInputs.map((input) => input.artifactId)).toEqual([
      'design.design_prompts',
      'design.character_prompts',
      'design.scene_prompts',
      'design.prop_prompts',
      'design.master_reference_prompt',
      'storyboard.storyboard_prompt_pack',
      'storyboard.control_board_prompts',
      'storyboard.style_board_prompts',
      'storyboard.master_board_prompt',
    ]);
  });
});
