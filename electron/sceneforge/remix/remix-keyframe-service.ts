import fs from 'node:fs/promises';
import path from 'node:path';
import type { RemixKeyframeRole, SourceKeyframe } from '../../../src/sceneforge/remix/types';
import { getRemixSegmentKeyframePath, getRemixSegmentManifestPath } from './remix-artifact-paths';
import { assertSourceAssetStageReady, resolveProjectFile } from './remix-validators';
import type { StoredSourceAssetDocument } from './remix-store';
import { readStoredSourceAsset, writeStoredSourceAsset } from './remix-store';

const ONE_PIXEL_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360606060000000050001a5f645400000000049454e44ae426082',
  'hex',
);

function buildKeyframesForSegment(
  sourceAssetId: string,
  segmentId: string,
  startMs: number,
  endMs: number,
): SourceKeyframe[] {
  const roles: RemixKeyframeRole[] = ['first', 'last'];
  if (endMs - startMs > 8000) {
    roles.splice(1, 0, 'middle');
  }

  return roles.map((frameRole) => ({
    id: `${sourceAssetId}-${segmentId}-${frameRole}`,
    sourceAssetId,
    segmentId,
    frameRole,
    timestampMs:
      frameRole === 'first'
        ? startMs
        : frameRole === 'last'
          ? endMs
          : Math.round((startMs + endMs) / 2),
    imagePath: getRemixSegmentKeyframePath(sourceAssetId, segmentId, frameRole),
  }));
}

export class RemixKeyframeService {
  async run(projectDir: string, sourceAssetId: string): Promise<StoredSourceAssetDocument> {
    const document = await readStoredSourceAsset(projectDir, sourceAssetId);
    assertSourceAssetStageReady(document, 'remix_segmentation');

    for (const segment of document.sourceAsset.segments) {
      segment.keyframes = buildKeyframesForSegment(
        sourceAssetId,
        segment.id,
        segment.timeRange.startMs,
        segment.timeRange.endMs,
      );

      for (const keyframe of segment.keyframes) {
        const filePath = resolveProjectFile(projectDir, keyframe.imagePath);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, ONE_PIXEL_PNG);
      }

      await fs.writeFile(
        resolveProjectFile(projectDir, getRemixSegmentManifestPath(sourceAssetId, segment.id)),
        `${JSON.stringify(segment, null, 2)}\n`,
        'utf8',
      );
    }

    document.sourceAsset.updatedAt = new Date().toISOString();
    document.processingStageStates.remix_keyframes = 'approved';
    document.processingStageStates.remix_understanding = 'ready_for_review';
    await writeStoredSourceAsset(projectDir, document);
    return document;
  }
}
