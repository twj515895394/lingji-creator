import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { writeSceneArtifact } from '../electron/sceneforge/artifacts/scene-artifact-store';
import { validateSceneStage } from '../electron/sceneforge/validators/scene-validator';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-validator-'));
  await createSceneForgeProject(tmpDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function writeDesignArtifact(artifactKey: string, content = '# 产物\n\n有效内容') {
  return writeSceneArtifact({
    projectDir: tmpDir,
    stage: 'design',
    artifactKey,
    kind: 'final',
    title: artifactKey,
    content,
    role: 'core_generation_asset',
    coreAsset: true,
    readableByDownstream: true,
  });
}

async function writeStoryboardArtifact(artifactKey: string, content = '# 分镜产物\n\n有效内容') {
  return writeSceneArtifact({
    projectDir: tmpDir,
    stage: 'storyboard',
    artifactKey,
    kind: 'final',
    title: artifactKey,
    content,
    role: 'core_generation_asset',
    coreAsset: true,
    readableByDownstream: true,
  });
}

async function writeVideoArtifact(artifactKey: string, content = '# 视频提示词\n\nSegment 01\nAudio: narration') {
  return writeSceneArtifact({
    projectDir: tmpDir,
    stage: 'video_prompts',
    artifactKey,
    kind: 'final',
    title: artifactKey,
    content,
    role: 'core_generation_asset',
    coreAsset: true,
    readableByDownstream: true,
  });
}

describe('SceneForge validator', () => {
  it('fails design when required core artifacts are missing', async () => {
    await writeDesignArtifact('design_prompts');

    const result = await validateSceneStage(tmpDir, 'design');

    expect(result.status).toBe('failed');
    expect(result.errors.map((error) => error.code)).toEqual([
      'SCENE_DESIGN_MISSING_CHARACTER_PROMPTS',
      'SCENE_DESIGN_MISSING_SCENE_PROMPTS',
      'SCENE_DESIGN_MISSING_PROP_PROMPTS',
      'SCENE_DESIGN_MISSING_MASTER_REFERENCE_PROMPT',
    ]);
  });

  it('passes design when all required core artifacts are registered', async () => {
    await writeDesignArtifact('design_prompts');
    await writeDesignArtifact('character_prompts');
    await writeDesignArtifact('scene_prompts');
    await writeDesignArtifact('prop_prompts');
    await writeDesignArtifact('master_reference_prompt');

    const result = await validateSceneStage(tmpDir, 'design');

    expect(result.status).toBe('passed');
    expect(result.errors).toEqual([]);
    expect(result.validatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('validates storyboard required artifacts', async () => {
    await writeStoryboardArtifact('storyboard_prompt_pack');

    const failed = await validateSceneStage(tmpDir, 'storyboard');
    expect(failed.status).toBe('failed');
    expect(failed.errors.map((error) => error.code)).toEqual([
      'SCENE_STORYBOARD_MISSING_CONTROL_BOARD_PROMPTS',
      'SCENE_STORYBOARD_MISSING_STYLE_BOARD_PROMPTS',
      'SCENE_STORYBOARD_MISSING_MASTER_BOARD_PROMPT',
    ]);

    await writeStoryboardArtifact('control_board_prompts');
    await writeStoryboardArtifact('style_board_prompts');
    await writeStoryboardArtifact('master_board_prompt');

    const passed = await validateSceneStage(tmpDir, 'storyboard');
    expect(passed.status).toBe('passed');
    expect(passed.errors).toEqual([]);
  });

  it('validates video prompt required artifacts and segment/audio structure', async () => {
    await writeVideoArtifact('video_prompt_pack', '# 视频提示词\n\nSegment 01 only');
    await writeVideoArtifact('video_prompt_pack_cn', '# 中文视频提示词\n\nSegment 01 only');

    const structureFailed = await validateSceneStage(tmpDir, 'video_prompts');
    expect(structureFailed.status).toBe('failed');
    expect(structureFailed.errors.map((error) => error.code)).toEqual([
      'SCENE_VIDEO_PROMPTS_MISSING_AUDIO_EXECUTION',
    ]);

    await writeVideoArtifact('video_prompt_pack');
    await writeVideoArtifact('video_prompt_pack_cn', '# 中文视频提示词\n\nSegment 01\nAudio: 旁白');

    const passed = await validateSceneStage(tmpDir, 'video_prompts');
    expect(passed.status).toBe('passed');
    expect(passed.errors).toEqual([]);
  });
});
