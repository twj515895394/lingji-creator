import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RemixService } from '../electron/sceneforge/remix/remix-service';

let projectDir: string;

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-remix-keyframe-'));
  await fs.writeFile(path.join(projectDir, 'source.mp4'), 'demo-video', 'utf8');
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('SceneForge Remix keyframe service', () => {
  it('extracts first and last keyframes, and middle for long segments', async () => {
    const service = new RemixService({
      readDurationMs: async () => 12000,
    });
    const imported = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
    });
    const segmented = await service.runSourceSegmentation({
      projectDir,
      sourceAssetId: imported.sourceAsset.id,
    });

    const keyframed = await service.runSourceKeyframes({
      projectDir,
      sourceAssetId: imported.sourceAsset.id,
    });

    expect(keyframed.sourceAsset.segments[0].keyframes.length).toBeGreaterThanOrEqual(2);
    await expect(
      fs.stat(path.join(projectDir, segmented.sourceAsset.segments[0].keyframes[0]?.imagePath ?? '')),
    ).resolves.toBeTruthy();
  });
});
