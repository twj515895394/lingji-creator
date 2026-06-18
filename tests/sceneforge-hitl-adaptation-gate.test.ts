import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { SceneForgeService } from '../electron/sceneforge/service';

let tmpDir: string;
let service: SceneForgeService;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-hitl-'));
  await createSceneForgeProject(tmpDir, 'source_intake');
  service = new SceneForgeService();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('intake adaptation gate', () => {
  it('fails validate when directions listed but no selection artifact', async () => {
    await service.submitStageDraft({
      projectDir: tmpDir,
      stage: 'source_intake',
      artifacts: [
        {
          artifactKey: 'source_material',
          content: '# 源材料\n\n## 改编方向\n- id: a1 | title: 方向A | summary: 测试\n',
        },
      ],
    });
    const validation = await service.validateStage(tmpDir, 'source_intake');
    expect(validation.status).toBe('failed');
    expect(validation.errors.some((e) => e.code === 'SCENE_INTAKE_ADAPTATION_PENDING')).toBe(true);
  });

  it('passes validate after adaptation_selection submitted', async () => {
    await service.submitStageDraft({
      projectDir: tmpDir,
      stage: 'source_intake',
      artifacts: [
        {
          artifactKey: 'source_material',
          content: '# 源材料\n\n## 改编方向\n- id: a1 | title: 方向A\n',
        },
      ],
    });
    await service.submitStageDraft({
      projectDir: tmpDir,
      stage: 'source_intake',
      artifacts: [
        {
          artifactKey: 'adaptation_selection',
          content: '# 改编方向确认\n\nstatus: selected\nselected_id: a1\nselected_title: 方向A\n',
        },
      ],
    });
    const validation = await service.validateStage(tmpDir, 'source_intake');
    expect(validation.status).toBe('passed');
  });
});