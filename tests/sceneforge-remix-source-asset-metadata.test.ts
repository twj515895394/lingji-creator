import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RemixService } from '../electron/sceneforge/remix/remix-service';

let projectDir: string;

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-remix-metadata-'));
  await fs.writeFile(path.join(projectDir, 'source.mp4'), 'demo-video', 'utf8');
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('SceneForge Remix source asset metadata (#14)', () => {
  it('persists tags and annotation note and blocks publish until saved', async () => {
    const service = new RemixService({
      readDurationMs: async () => 9800,
      now: () => new Date('2026-06-23T12:00:00.000Z'),
    });

    const snapshot = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
      title: '夜市原片',
    });
    const sourceAssetId = snapshot.sourceAsset.id;
    await service.runSourceSegmentation({ projectDir, sourceAssetId });
    await service.runSourceKeyframes({ projectDir, sourceAssetId });
    await service.runSourceUnderstanding({ projectDir, sourceAssetId });

    await expect(service.publishSourceAssetToLibrary({ projectDir, sourceAssetId })).rejects.toThrow(
      '请先保存至少一个人工标签',
    );

    const annotated = await service.updateSourceAssetMetadata({
      projectDir,
      sourceAssetId,
      tags: ['night-market'],
      annotationNote: '保留停顿。',
    });
    expect(annotated.sourceAsset.tags).toEqual(['night-market']);

    const reloaded = await service.getSourceAsset({ projectDir, sourceAssetId });
    expect(reloaded.sourceAsset.annotationNote).toBe('保留停顿。');
    expect(reloaded.sourceAsset.lastAnnotatedAt).toBe('2026-06-23T12:00:00.000Z');
  });
});
