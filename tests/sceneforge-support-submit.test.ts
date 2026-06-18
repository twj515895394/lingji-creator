import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { SceneForgeService } from '../electron/sceneforge/service';

let tmpDir: string;
let service: SceneForgeService;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-support-'));
  await createSceneForgeProject(tmpDir, 'source_intake');
  service = new SceneForgeService();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('support stage submit', () => {
  it('submits source_intake source_material', async () => {
    const result = await service.submitStageDraft({
      projectDir: tmpDir,
      stage: 'source_intake',
      artifacts: [{ artifactKey: 'source_material', content: '# 源材料\n\n测试链接\n' }],
    });
    expect(result.stage).toBe('source_intake');
    expect(result.artifactIds).toContain('source_intake.source_material');
    expect(result.validation.status).toBe('passed');
  });

  it('submits topic_gate topic_brief', async () => {
    const result = await service.submitStageDraft({
      projectDir: tmpDir,
      stage: 'topic_gate',
      artifacts: [{ artifactKey: 'topic_brief', content: '# 选题\n\ngo\n' }],
    });
    expect(result.stage).toBe('topic_gate');
    expect(result.validation.status).toBe('passed');
  });

  it('submits reference reference_notes', async () => {
    const result = await service.submitStageDraft({
      projectDir: tmpDir,
      stage: 'reference',
      artifacts: [{ artifactKey: 'reference_notes', content: '# 参考\n\n测试\n' }],
    });
    expect(result.artifactIds).toContain('reference.reference_notes');
    expect(result.validation.status).toBe('passed');
  });

  it('submits story story_direction', async () => {
    const result = await service.submitStageDraft({
      projectDir: tmpDir,
      stage: 'story',
      artifacts: [{ artifactKey: 'story_direction', content: '# 故事\n' }],
    });
    expect(result.validation.status).toBe('passed');
  });

  it('submits assets asset_plan', async () => {
    const result = await service.submitStageDraft({
      projectDir: tmpDir,
      stage: 'assets',
      artifacts: [{ artifactKey: 'asset_plan', content: '# 资产\n' }],
    });
    expect(result.validation.status).toBe('passed');
  });

  it('submits script script_draft', async () => {
    const result = await service.submitStageDraft({
      projectDir: tmpDir,
      stage: 'script',
      artifacts: [{ artifactKey: 'script_draft', content: '# 剧本\n' }],
    });
    expect(result.validation.status).toBe('passed');
  });

  it('submits performance performance_direction', async () => {
    const result = await service.submitStageDraft({
      projectDir: tmpDir,
      stage: 'performance',
      artifacts: [{ artifactKey: 'performance_direction', content: '# 表演\n' }],
    });
    expect(result.validation.status).toBe('passed');
  });

  it('submits audio audio_design', async () => {
    const result = await service.submitStageDraft({
      projectDir: tmpDir,
      stage: 'audio',
      artifacts: [{ artifactKey: 'audio_design', content: '# 声音\n' }],
    });
    expect(result.validation.status).toBe('passed');
  });

  it('rejects unknown artifact key for reference', async () => {
    await expect(
      service.submitStageDraft({
        projectDir: tmpDir,
        stage: 'reference',
        artifacts: [{ artifactKey: 'reference_analysis', content: 'x' }],
      }),
    ).rejects.toMatchObject({ code: 'INVALID_STAGE_DRAFT_ARTIFACT' });
  });
});