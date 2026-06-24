import fs from 'node:fs/promises';
import path from 'node:path';
import type { SourceSegment } from '../../../src/sceneforge/remix/types';
import { getRemixSegmentClipPath, getRemixSegmentManifestIndexPath, getRemixSegmentManifestPath } from './remix-artifact-paths';
import { assertFileExists, resolveProjectFile } from './remix-validators';
import type { StoredSourceAssetDocument } from './remix-store';
import { readStoredSourceAsset, writeStoredSourceAsset } from './remix-store';

function nowIso(now: () => Date): string {
  return now().toISOString();
}

function buildSegmentRanges(durationMs: number): Array<{ startMs: number; endMs: number; boundaryType: SourceSegment['boundaryType'] }> {
  if (durationMs <= 9000) {
    return [{ startMs: 0, endMs: durationMs, boundaryType: 'long_segment' }];
  }
  if (durationMs <= 18000) {
    const split = Math.round(durationMs / 2);
    return [
      { startMs: 0, endMs: split, boundaryType: 'source_shot' },
      { startMs: split, endMs: durationMs, boundaryType: 'split_long_shot' },
    ];
  }

  const step = Math.round(durationMs / 3);
  return [
    { startMs: 0, endMs: step, boundaryType: 'source_shot' },
    { startMs: step, endMs: step * 2, boundaryType: 'merged_short_shots' },
    { startMs: step * 2, endMs: durationMs, boundaryType: 'long_segment' },
  ];
}

async function writeSegmentArtifacts(
  projectDir: string,
  sourceVideoPath: string,
  sourceAssetId: string,
  segments: SourceSegment[],
): Promise<void> {
  for (const segment of segments) {
    const clipPath = resolveProjectFile(projectDir, segment.sourceClipPath);
    await fs.mkdir(path.dirname(clipPath), { recursive: true });
    await fs.copyFile(sourceVideoPath, clipPath);
    await fs.writeFile(
      resolveProjectFile(projectDir, getRemixSegmentManifestPath(sourceAssetId, segment.id)),
      `${JSON.stringify(segment, null, 2)}\n`,
      'utf8',
    );
  }

  await fs.writeFile(
    resolveProjectFile(projectDir, getRemixSegmentManifestIndexPath(sourceAssetId)),
    `${JSON.stringify({ segmentIds: segments.map((segment) => segment.id) }, null, 2)}\n`,
    'utf8',
  );
}

export interface RemixSegmentationServiceOptions {
  now?: () => Date;
}

export class RemixSegmentationService {
  private readonly now;

  constructor(options: RemixSegmentationServiceOptions = {}) {
    this.now = options.now ?? (() => new Date());
  }

  async run(projectDir: string, sourceAssetId: string): Promise<StoredSourceAssetDocument> {
    const document = await readStoredSourceAsset(projectDir, sourceAssetId);
    await assertFileExists(document.sourceAsset.sourceVideoPath, '原片视频');

    const ranges = buildSegmentRanges(document.sourceAsset.videoMetadata.durationMs);
    const segments: SourceSegment[] = ranges.map((range, index) => {
      const segmentId = `segment-${String(index + 1).padStart(3, '0')}`;
      return {
        id: segmentId,
        sourceAssetId,
        index: index + 1,
        title: `片段 ${String(index + 1).padStart(2, '0')}`,
        boundaryType: range.boundaryType,
        timeRange: {
          startMs: range.startMs,
          endMs: range.endMs,
          durationMs: range.endMs - range.startMs,
        },
        sourceClipPath: getRemixSegmentClipPath(sourceAssetId, segmentId),
        keyframes: [],
        analysisMarkdownPath: document.sourceAsset.segmentAnalysisMarkdownPath ?? null,
        analysisJsonPath: document.sourceAsset.segmentAnalysisJsonPath ?? null,
      };
    });

    await writeSegmentArtifacts(
      projectDir,
      document.sourceAsset.sourceVideoPath,
      sourceAssetId,
      segments,
    );

    document.sourceAsset.segments = segments;
    document.sourceAsset.updatedAt = nowIso(this.now);
    document.processingStageStates.remix_segmentation = 'approved';
    document.processingStageStates.remix_keyframes = 'ready_for_review';
    await writeStoredSourceAsset(projectDir, document);
    return document;
  }
}
