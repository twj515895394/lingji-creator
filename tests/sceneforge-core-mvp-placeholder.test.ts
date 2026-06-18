import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { SceneForgeService } from '../electron/sceneforge/service';

const MVP = '# MVP 占位\n\n测试\n';

const VIDEO_MVP = `# MVP

## Segment 1
测试

## Audio
环境音
`;

let tmpDir: string;
let service: SceneForgeService;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-core-mvp-'));
  await createSceneForgeProject(tmpDir, 'topic_gate');
  service = new SceneForgeService();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('core MVP placeholder submit', () => {
  it('storyboard placeholder passes validation', async () => {
    const keys = [
      'storyboard_prompt_pack',
      'control_board_prompts',
      'style_board_prompts',
      'master_board_prompt',
    ] as const;
    const result = await service.submitStageDraft({
      projectDir: tmpDir,
      stage: 'storyboard',
      artifacts: keys.map((artifactKey) => ({ artifactKey, content: MVP })),
    });
    expect(result.validation.status).toBe('passed');
  });

  it('video_prompts placeholder passes validation', async () => {
    const result = await service.submitStageDraft({
      projectDir: tmpDir,
      stage: 'video_prompts',
      artifacts: [
        { artifactKey: 'video_prompt_pack', content: VIDEO_MVP },
        { artifactKey: 'video_prompt_pack_cn', content: VIDEO_MVP },
      ],
    });
    expect(result.validation.status).toBe('passed');
  });
});