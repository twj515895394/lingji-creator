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

  it('allows manual adding and deleting of a middle keyframe', async () => {
    const service = new RemixService({
      readDurationMs: async () => 4000,
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
      minDurationForMiddleFrameSec: 8,
    });

    const segment = keyframed.sourceAsset.segments[0];
    expect(segment.keyframes.length).toBe(2);
    expect(segment.keyframes.map((k) => k.frameRole)).toEqual(['first', 'last']);

    // 1. Manually add middle keyframe
    const addedMiddle = await service.addSegmentMiddleKeyframe({
      projectDir,
      sourceAssetId: imported.sourceAsset.id,
      segmentId: segment.id,
    });

    const updatedSegment1 = addedMiddle.sourceAsset.segments[0];
    expect(updatedSegment1.keyframes.length).toBe(3);
    expect(updatedSegment1.keyframes.map((k) => k.frameRole)).toEqual(['first', 'middle', 'last']);

    const middleKf = updatedSegment1.keyframes.find((k) => k.frameRole === 'middle')!;
    await expect(
      fs.stat(path.join(projectDir, middleKf.imagePath)),
    ).resolves.toBeTruthy();

    // 2. Delete middle keyframe
    const deletedMiddle = await service.deleteSegmentMiddleKeyframe({
      projectDir,
      sourceAssetId: imported.sourceAsset.id,
      segmentId: segment.id,
    });

    const updatedSegment2 = deletedMiddle.sourceAsset.segments[0];
    expect(updatedSegment2.keyframes.length).toBe(2);
    expect(updatedSegment2.keyframes.map((k) => k.frameRole)).toEqual(['first', 'last']);

    await expect(
      fs.stat(path.join(projectDir, middleKf.imagePath)),
    ).rejects.toThrow();
  });
});


  it('marks understanding as stale after rerunning keyframes', async () => {
    const service = new RemixService({ readDurationMs: async () => 12000 });
    const imported = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
    });
    await service.runSourceSegmentation({ projectDir, sourceAssetId: imported.sourceAsset.id });
    const firstKeyframes = await service.runSourceKeyframes({ projectDir, sourceAssetId: imported.sourceAsset.id });
    expect(firstKeyframes.processingStageStates.remix_understanding).toBe('not_started');

    const understood = await service.runSourceUnderstanding({ projectDir, sourceAssetId: imported.sourceAsset.id });
    understood.processingStageStates.remix_understanding = 'approved';
    await fs.writeFile(
      path.join(projectDir, understood.sourceAsset.sourceManifestPath),
      `${JSON.stringify(understood, null, 2)}\n`,
    );

    const rerun = await service.runSourceKeyframes({ projectDir, sourceAssetId: imported.sourceAsset.id });
    expect(rerun.processingStageStates.remix_understanding).toBe('needs_input');
  });
