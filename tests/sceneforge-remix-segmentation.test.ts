import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RemixService } from '../electron/sceneforge/remix/remix-service';

let projectDir: string;

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-remix-segmentation-'));
  await fs.writeFile(path.join(projectDir, 'source.mp4'), 'demo-video', 'utf8');
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('SceneForge Remix segmentation service', () => {
  it('creates persisted segments and source clip artifacts', async () => {
    const service = new RemixService({
      readDurationMs: async () => 18200,
    });
    const imported = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
      title: '天台原片',
    });

    const segmented = await service.runSourceSegmentation({
      projectDir,
      sourceAssetId: imported.sourceAsset.id,
    });

    expect(segmented.sourceAsset.segments).toHaveLength(3);
    await expect(
      fs.stat(path.join(projectDir, segmented.sourceAsset.segments[0].sourceClipPath)),
    ).resolves.toBeTruthy();
  });
});
