import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { writeSceneArtifact } from '../electron/sceneforge/artifacts/scene-artifact-store';
import { sceneHandoffRelativePath } from '../electron/sceneforge/pipeline/scene-handoff-writer';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { SceneForgeService } from '../electron/sceneforge/service';
import { createDirectLlmStageRunner } from '../electron/sceneforge/runners/scene-direct-llm-runner';
import { vi } from 'vitest';

let tmpDir: string;
let service: SceneForgeService;

const completeDesignDraft = {
  design_prompts: '# 设定图\n\n统一。',
  character_prompts: '# 角色\n\n主角。',
  scene_prompts: '# 场景\n\n街景。',
  prop_prompts: '# 道具\n\n物件。',
  master_reference_prompt: '# 总参考\n\n构图。',
};

const completeStoryboardDraft = {
  storyboard_prompt_pack: '# 故事板包\n\n镜头 1。',
  control_board_prompts: '# 控制板\n\n构图。',
  style_board_prompts: '# 风格板\n\n色彩。',
  master_board_prompt: '# 总故事板\n\n风格。',
};

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-phase2-int-'));
  await createSceneForgeProject(tmpDir);
  service = new SceneForgeService();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('SceneForge Phase 2 integration', () => {
  it('approve design writes handoff and storyboard reads design via handoff source', async () => {
    await service.submitDesignDraft(tmpDir, completeDesignDraft);
    await service.approveStage(tmpDir, 'design');

    const handoffPath = path.join(tmpDir, sceneHandoffRelativePath('design'));
    await expect(fs.stat(handoffPath)).resolves.toBeDefined();

    const storyboard = await service.getStageContext(tmpDir, 'storyboard');
    const master = storyboard.requiredInputs.find((i) => i.artifactId === 'design.master_reference_prompt');
    expect(master?.source).toBe('handoff');
  });

  it('video context includes audio and performance without nine full core artifacts', async () => {
    await service.submitDesignDraft(tmpDir, completeDesignDraft);
    await service.approveStage(tmpDir, 'design');
    await service.submitStoryboardDraft(tmpDir, completeStoryboardDraft);
    await service.approveStage(tmpDir, 'storyboard');

    await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'audio',
      artifactKey: 'audio_design',
      kind: 'final',
      title: '声音设计',
      content: '# 声音设计\n\nBGM 与音效。',
      role: 'support_direction_asset',
      coreAsset: false,
      readableByDownstream: true,
    });
    await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'performance',
      artifactKey: 'performance_direction',
      kind: 'final',
      title: '表演指导',
      content: '# 表演指导\n\n情绪线。',
      role: 'support_direction_asset',
      coreAsset: false,
      readableByDownstream: true,
    });

    const context = await service.getStageContext(tmpDir, 'video_prompts', { runner: 'acp_agent' });
    const ids = context.requiredInputs.map((i) => i.artifactId);

    expect(ids).toContain('audio.audio_design');
    expect(ids).toContain('performance.performance_direction');
    expect(ids).toContain('storyboard.storyboard_prompt_pack');
    expect(ids.length).toBeLessThan(9);
    expect(context.runner).toBe('acp_agent');
    expect(context.contextCharBudget).toBe(120000);
  });

  it('direct_llm mock path produces artifacts then submit updates manifest', async () => {
    const generateText = vi.fn().mockResolvedValue(
      JSON.stringify({
        design_prompts: '# D',
        character_prompts: '# C',
        scene_prompts: '# S',
        prop_prompts: '# P',
        master_reference_prompt: '# M',
      }),
    );

    const runner = createDirectLlmStageRunner({
      loadSettings: async () => ({ llmProviders: [], defaultProviderId: null, defaultModel: null } as never),
      generateText,
    });

    const stageContext = await service.getStageContext(tmpDir, 'design', { runner: 'direct_llm' });
    const runResult = await runner.run({
      projectDir: tmpDir,
      stage: 'design',
      stageContext,
      submitStageDraft: vi.fn(),
    });

    expect(Object.keys(runResult.artifacts).length).toBe(5);

    const before = await service.getProjectState(tmpDir);
    expect(before.artifacts).toHaveLength(0);

    const submit = await service.submitDesignDraft(tmpDir, runResult.artifacts);
    expect(submit.validation.status).toBe('passed');

    const after = await service.getProjectState(tmpDir);
    expect(after.artifacts.length).toBe(5);
  });
});