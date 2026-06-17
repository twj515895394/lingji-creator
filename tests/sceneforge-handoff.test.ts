import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { writeSceneArtifact } from '../electron/sceneforge/artifacts/scene-artifact-store';
import {
  readSceneStageHandoff,
  sceneHandoffRelativePath,
  writeSceneStageHandoff,
} from '../electron/sceneforge/pipeline/scene-handoff-writer';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { SceneForgeService } from '../electron/sceneforge/service';

let tmpDir: string;
let service: SceneForgeService;

const completeDesignDraft = {
  design_prompts: '# 设定图提示词\n\n整体视觉统一。',
  character_prompts: '# 角色提示词\n\n主角、配角、服饰。',
  scene_prompts: '# 场景提示词\n\n室内、街景、光线。',
  prop_prompts: '# 道具提示词\n\n关键物件。',
  master_reference_prompt: '# 总参考图提示词\n\n统一构图和风格。',
};

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-handoff-'));
  await createSceneForgeProject(tmpDir);
  service = new SceneForgeService();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('SceneForge handoff on approve', () => {
  it('writes design.handoff.json after approve with required shape', async () => {
    await service.submitDesignDraft(tmpDir, completeDesignDraft);
    await service.approveStage(tmpDir, 'design');

    const relativePath = sceneHandoffRelativePath('design');
    const absolute = path.join(tmpDir, relativePath);
    await expect(fs.stat(absolute)).resolves.toBeDefined();

    const handoff = await readSceneStageHandoff(tmpDir, 'design');
    expect(handoff.version).toBe(1);
    expect(handoff.sourceStage).toBe('design');
    expect(typeof handoff.generatedAt).toBe('string');
    expect(Array.isArray(handoff.pointers)).toBe(true);
    expect(handoff.pointers.length).toBeGreaterThan(0);
    expect(handoff.slices.master_reference_prompt?.text).toContain('总参考图');
    expect(handoff.downstreamNotes).toBeDefined();
  });

  it('prefers handoff slices in storyboard context after design approve', async () => {
    await service.submitDesignDraft(tmpDir, completeDesignDraft);
    await service.approveStage(tmpDir, 'design');

    const context = await service.getStageContext(tmpDir, 'storyboard');
    const master = context.requiredInputs.find(
      (input) => input.artifactId === 'design.master_reference_prompt',
    );
    expect(master).toBeDefined();
    expect(master?.source).toBe('handoff');
    expect(master?.content).toContain('总参考图');
    expect(
      context.warnings.some((w) => w.startsWith('handoff_missing_fallback:design_master')),
    ).toBe(false);
  });

  it('writes performance handoff when writer is invoked after final artifact exists', async () => {
    await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'performance',
      artifactKey: 'performance_direction',
      kind: 'final',
      title: '表演指导',
      content: '# 表演指导\n\n情绪与动作。',
      role: 'support_direction_asset',
      coreAsset: false,
      readableByDownstream: true,
    });

    await writeSceneStageHandoff(tmpDir, 'performance');

    const handoffPath = path.join(tmpDir, sceneHandoffRelativePath('performance'));
    await expect(fs.stat(handoffPath)).resolves.toBeDefined();
    const handoff = await readSceneStageHandoff(tmpDir, 'performance');
    expect(handoff?.slices.performance_direction?.text).toContain('表演指导');
  });

  it('falls back when handoff file is missing without throwing', async () => {
    await service.submitDesignDraft(tmpDir, completeDesignDraft);
    await service.approveStage(tmpDir, 'design');

    const handoffPath = path.join(tmpDir, sceneHandoffRelativePath('design'));
    await fs.rm(handoffPath);

    const context = await service.getStageContext(tmpDir, 'storyboard');
    const master = context.requiredInputs.find(
      (input) => input.artifactId === 'design.master_reference_prompt',
    );
    expect(master).toBeDefined();
    expect(master?.source).toBe('artifact');
    expect(context.warnings.some((w) => w.startsWith('handoff_missing_fallback'))).toBe(true);
  });
});