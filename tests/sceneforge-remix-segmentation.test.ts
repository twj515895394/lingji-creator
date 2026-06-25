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

    expect(segmented.sourceAsset.segments.length).toBeGreaterThanOrEqual(3);
    expect(segmented.sourceAsset.segmentationDiagnostics?.mode).toBe('fast');
    expect(segmented.sourceAsset.segments[0]?.boundary).toBeTruthy();
    expect(segmented.sourceAsset.segments.some((segment) => segment.reviewStatus === 'needs_review')).toBe(true);
    await expect(
      fs.stat(path.join(projectDir, segmented.sourceAsset.segments[0].sourceClipPath)),
    ).resolves.toBeTruthy();
  });

  it('supports accurate mode diagnostics and manual override persistence', async () => {
    const service = new RemixService({
      readDurationMs: async () => 15400,
      now: () => new Date('2026-06-25T11:00:00.000Z'),
    });
    const imported = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
      title: '雨夜对峙',
    });

    const segmented = await service.runSourceSegmentation({
      projectDir,
      sourceAssetId: imported.sourceAsset.id,
      mode: 'accurate',
      preserveManualEdits: true,
    });

    expect(segmented.sourceAsset.segmentationDiagnostics?.mode).toBe('accurate');
    expect(segmented.sourceAsset.segmentationDiagnostics?.usedFallback).toBe(true);

    const mergedSegments = segmented.sourceAsset.segments.slice(1);
    mergedSegments[0] = {
      ...mergedSegments[0]!,
      timeRange: {
        startMs: 0,
        endMs: mergedSegments[0]!.timeRange.endMs,
        durationMs: mergedSegments[0]!.timeRange.endMs,
      },
      reviewStatus: 'manual_adjusted',
      boundary: {
        ...(mergedSegments[0]!.boundary ?? {
          startConfidence: 1,
          endConfidence: 1,
          startSources: ['manual_override'],
          endSources: ['manual_override'],
          boundaryType: 'manual',
        }),
        boundaryType: 'manual',
      },
    };

    const updated = await service.updateSourceSegments({
      projectDir,
      sourceAssetId: imported.sourceAsset.id,
      segments: mergedSegments,
      reason: 'merge',
      preserveOnRerun: true,
    });

    expect(updated.sourceAsset.manualSegmentationOverride?.segments).toHaveLength(mergedSegments.length);

    const rerun = await service.runSourceSegmentation({
      projectDir,
      sourceAssetId: imported.sourceAsset.id,
      mode: 'fast',
      preserveManualEdits: true,
    });

    expect(rerun.sourceAsset.segments).toHaveLength(mergedSegments.length);
    expect(rerun.sourceAsset.segments[0]?.reviewStatus).toBe('manual_adjusted');
  });
});
