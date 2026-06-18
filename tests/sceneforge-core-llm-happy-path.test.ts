import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { createDirectLlmStageRunner } from '../electron/sceneforge/runners/scene-direct-llm-runner';
import { SceneForgeService } from '../electron/sceneforge/service';

const STAGE_FIXTURES = {
  design: {
    design_prompts: '# 设定图提示词\n\n统一设计语言。',
    character_prompts: '# 角色提示词\n\n主角造型。',
    scene_prompts: '# 场景提示词\n\n城市街景。',
    prop_prompts: '# 道具提示词\n\n关键道具。',
    master_reference_prompt: '# 总参考图提示词\n\n统一构图。',
  },
  storyboard: {
    storyboard_prompt_pack: '# 故事板提示词包\n\n镜头 1。',
    control_board_prompts: '# 控制板提示词\n\n构图控制。',
    style_board_prompts: '# 风格板提示词\n\n色彩控制。',
    master_board_prompt: '# 总故事板提示词\n\n统一风格。',
  },
  video_prompts: {
    video_prompt_pack: '# Video Prompt Pack\n\nSegment 01\nAudio: narration',
    video_prompt_pack_cn: '# 中文视频提示词包\n\nSegment 01\nAudio: 旁白',
  },
} as const;

type CoreStage = keyof typeof STAGE_FIXTURES;

let projectDir: string;
let service: SceneForgeService;

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-core-llm-'));
  await createSceneForgeProject(projectDir);
  service = new SceneForgeService();
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('SceneForge core Direct LLM happy path', () => {
  it.each(Object.keys(STAGE_FIXTURES) as CoreStage[])(
    '%s generates without writing, then explicit submit passes validation',
    async (stage) => {
      const fixture = STAGE_FIXTURES[stage];
      const runner = createDirectLlmStageRunner({
        loadSettings: async () => ({}) as never,
        generateText: vi.fn().mockResolvedValue(JSON.stringify(fixture)),
      });
      const submitStageDraft = vi.fn();

      const runResult = await runner.run({
        projectDir,
        stage,
        stageContext: await service.getStageContext(projectDir, stage, {
          runner: 'direct_llm',
        }),
        submitStageDraft,
      });

      expect(runResult.artifacts).toEqual(fixture);
      expect(runResult.requiredArtifacts).toEqual(Object.keys(fixture));
      expect(submitStageDraft).not.toHaveBeenCalled();
      expect((await service.getProjectState(projectDir)).artifacts).toEqual([]);

      const submitted = await service.submitStageDraft({
        projectDir,
        stage,
        artifacts: runResult.requiredArtifacts!.map((artifactKey) => ({
          artifactKey,
          content: runResult.artifacts[artifactKey],
        })),
      });

      expect(submitted.validation.status).toBe('passed');
      expect(submitted.artifactIds).toHaveLength(Object.keys(fixture).length);
    },
  );
});
