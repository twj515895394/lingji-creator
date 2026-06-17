import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { loadProjectFile } from '../electron/project-file';
import { SceneForgeService } from '../electron/sceneforge/service';

let tmpDir: string;
let service: SceneForgeService;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-export-'));
  await createSceneForgeProject(tmpDir);
  service = new SceneForgeService();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

const designDraft = {
  design_prompts: '# 设定图提示词\n\nDesign content',
  character_prompts: '# 角色提示词\n\nCharacter content',
  scene_prompts: '# 场景提示词\n\nScene content',
  prop_prompts: '# 道具提示词\n\nProp content',
  master_reference_prompt: '# 总参考图提示词\n\nMaster reference content',
};

const storyboardDraft = {
  storyboard_prompt_pack: '# 故事板提示词包\n\nStoryboard content',
  control_board_prompts: '# 控制板提示词\n\nControl board content',
  style_board_prompts: '# 风格板提示词\n\nStyle board content',
  master_board_prompt: '# 总故事板提示词\n\nMaster board content',
};

const videoDraft = {
  video_prompt_pack: '# 视频提示词包\n\nSegment 01\nAudio: narration',
  video_prompt_pack_cn: '# 中文视频提示词包\n\nSegment 01\nAudio: 旁白',
};

async function approveDesignAndStoryboard() {
  await service.submitDesignDraft(tmpDir, designDraft);
  await service.approveStage(tmpDir, 'design');
  await service.submitStoryboardDraft(tmpDir, storyboardDraft);
  await service.approveStage(tmpDir, 'storyboard');
}

async function approveAllCoreStages() {
  await approveDesignAndStoryboard();
  await service.submitVideoPromptsDraft(tmpDir, videoDraft);
  await service.approveStage(tmpDir, 'video_prompts');
}

describe('SceneForge Prompt Pack export', () => {
  it('exports approved final core artifacts with a stable manifest and updates project lastExportPath', async () => {
    await approveAllCoreStages();

    const exported = await service.exportPromptPack(tmpDir);

    expect(exported.exportDir).toBe(path.join(tmpDir, 'sceneforge', 'exports', 'prompt_pack'));
    expect(exported.files.map((file) => file.fileName)).toEqual([
      'design_prompts.md',
      'storyboard_prompts.md',
      'video_prompts.md',
      'final_prompt_pack.md',
      'manifest.json',
    ]);

    const finalPromptPack = await fs.readFile(
      path.join(exported.exportDir, 'final_prompt_pack.md'),
      'utf-8',
    );
    expect(finalPromptPack.indexOf('## Design Prompts')).toBeLessThan(
      finalPromptPack.indexOf('## Storyboard Prompts'),
    );
    expect(finalPromptPack.indexOf('## Storyboard Prompts')).toBeLessThan(
      finalPromptPack.indexOf('## Video Prompts'),
    );

    const manifest = JSON.parse(
      await fs.readFile(path.join(exported.exportDir, 'manifest.json'), 'utf-8'),
    );
    expect(manifest.artifacts.map((artifact: { stage: string }) => artifact.stage)).toEqual([
      'design',
      'storyboard',
      'video_prompts',
    ]);
    expect(manifest.files.map((file: { fileName: string }) => file.fileName)).toEqual(
      exported.files.map((file) => file.fileName),
    );

    const project = await loadProjectFile(tmpDir);
    expect(project.sceneforge?.lastExportPath).toBe(exported.exportDir);
  });

  it('does not export unapproved core stages', async () => {
    await approveDesignAndStoryboard();
    await service.submitVideoPromptsDraft(tmpDir, videoDraft);

    const exported = await service.exportPromptPack(tmpDir);

    expect(exported.artifactIds).toEqual([
      'design.design_prompts',
      'storyboard.storyboard_prompt_pack',
    ]);
    await expect(fs.access(path.join(exported.exportDir, 'video_prompts.md'))).rejects.toThrow();
    const finalPromptPack = await fs.readFile(
      path.join(exported.exportDir, 'final_prompt_pack.md'),
      'utf-8',
    );
    expect(finalPromptPack).not.toContain('## Video Prompts');
  });
});
