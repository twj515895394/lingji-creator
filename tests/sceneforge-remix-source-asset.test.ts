import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RemixService } from '../electron/sceneforge/remix/remix-service';

let projectDir: string;

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-remix-source-asset-'));
  await fs.writeFile(path.join(projectDir, 'source.mp4'), 'demo-video', 'utf8');
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('SceneForge Remix source asset service', () => {
  it('creates source manifest from local video input', async () => {
    const service = new RemixService({
      readDurationMs: async () => 9800,
      now: () => new Date('2026-06-23T12:00:00.000Z'),
    });

    const snapshot = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
      title: '夜市原片',
    });

    expect(snapshot.sourceAsset.title).toBe('夜市原片');
    expect(snapshot.sourceAsset.videoMetadata.durationMs).toBe(9800);
    await expect(
      fs.readFile(path.join(projectDir, snapshot.sourceAsset.sourceManifestPath), 'utf8'),
    ).resolves.toContain('"schema": "sceneforge-remix-source-asset"');
  });

  it('persists manual metadata and blocks publish until metadata is saved', async () => {
    const service = new RemixService({
      readDurationMs: async () => 9800,
      now: () => new Date('2026-06-23T12:00:00.000Z'),
    });

    const snapshot = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
      title: '夜市原片',
    });
    await service.runSourceSegmentation({ projectDir, sourceAssetId: snapshot.sourceAsset.id });
    await service.runSourceKeyframes({ projectDir, sourceAssetId: snapshot.sourceAsset.id });
    await service.runSourceUnderstanding({ projectDir, sourceAssetId: snapshot.sourceAsset.id });

    await expect(
      service.publishSourceAssetToLibrary({ projectDir, sourceAssetId: snapshot.sourceAsset.id }),
    ).rejects.toThrow('请先保存至少一个人工标签');

    const annotated = await service.updateSourceAssetMetadata({
      projectDir,
      sourceAssetId: snapshot.sourceAsset.id,
      tags: ['night-market', 'slow-burn'],
      annotationNote: '保留停顿和压迫感。',
    });

    expect(annotated.sourceAsset.tags).toEqual(['night-market', 'slow-burn']);
    expect(annotated.sourceAsset.annotationNote).toBe('保留停顿和压迫感。');

    const reloaded = await service.getSourceAsset({
      projectDir,
      sourceAssetId: snapshot.sourceAsset.id,
    });
    expect(reloaded.sourceAsset.lastAnnotatedAt).toBe('2026-06-23T12:00:00.000Z');
  });

  it('validates media readiness and persists keyframe anomalies', async () => {
    const service = new RemixService({
      readDurationMs: async () => 9800,
      now: () => new Date('2026-06-23T12:00:00.000Z'),
    });

    const snapshot = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
      title: '夜市原片',
    });
    await service.runSourceSegmentation({ projectDir, sourceAssetId: snapshot.sourceAsset.id });
    await service.runSourceKeyframes({ projectDir, sourceAssetId: snapshot.sourceAsset.id });

    const sourceAsset = await service.getSourceAsset({
      projectDir,
      sourceAssetId: snapshot.sourceAsset.id,
    });
    const brokenKeyframePath = path.join(projectDir, sourceAsset.sourceAsset.segments[0]!.keyframes[0]!.imagePath);
    await fs.rm(brokenKeyframePath, { force: true });

    const validation = await service.validateSourceAssetMedia({
      projectDir,
      sourceAssetId: snapshot.sourceAsset.id,
    });

    expect(validation.sourceVideo.readable).toBe(true);
    expect(validation.keyframes.invalidCount).toBe(1);
    expect(validation.thumbnail.source).toBe('keyframe');

    const reloaded = await service.getSourceAsset({
      projectDir,
      sourceAssetId: snapshot.sourceAsset.id,
    });
    expect(reloaded.sourceAsset.mediaValidation?.keyframes.invalidCount).toBe(1);
  });
});
