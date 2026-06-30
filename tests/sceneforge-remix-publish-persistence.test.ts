import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  REMIX_UNDERSTANDING_ROLLUP_KIND,
  buildRemixUnderstandingInputFingerprint,
} from '../electron/sceneforge/remix/remix-understanding-gate';
import { RemixService } from '../electron/sceneforge/remix/remix-service';
import type { StoredSourceAssetDocument } from '../electron/sceneforge/remix/remix-store';
import { readStoredSourceAsset } from '../electron/sceneforge/remix/remix-store';

let projectDir = '';

async function seedPublishReadyUnderstanding(
  service: RemixService,
  sourceAssetId: string,
): Promise<StoredSourceAssetDocument> {
  const stored = await readStoredSourceAsset(projectDir, sourceAssetId);
  const overviewPath = stored.sourceAsset.sourceOverviewJsonPath;
  const segmentPath = stored.sourceAsset.segmentAnalysisJsonPath;
  if (!overviewPath || !segmentPath) {
    throw new Error('理解产物路径未配置');
  }
  await fs.mkdir(path.join(projectDir, path.dirname(overviewPath)), { recursive: true });
  const inputHash = buildRemixUnderstandingInputFingerprint(stored);
  await fs.writeFile(
    path.join(projectDir, overviewPath),
    `${JSON.stringify(
      {
        artifactKind: REMIX_UNDERSTANDING_ROLLUP_KIND,
        sourceAssetId,
        segmentCount: stored.sourceAsset.segments.length,
        understoodSegmentCount: stored.sourceAsset.segments.length,
        failedSegmentCount: 0,
        originalUnderstandingPath: `sceneforge/remix/source-assets/${sourceAssetId}/analysis/original_understanding.json`,
        overall: { summary: '全片摘要', storyArc: '剧情线', highValueSegmentIds: stored.sourceAsset.segments.map((s) => s.id) },
        quality: {
          segmentCount: stored.sourceAsset.segments.length,
          understoodSegmentCount: stored.sourceAsset.segments.length,
          failedSegmentCount: 0,
          needsHumanReview: true,
        },
        segmentRefs: stored.sourceAsset.segments.map((segment) => ({
          segmentId: segment.id,
          understandingPath: `segments/${segment.id}/understanding.json`,
        })),
        inputHash,
      },
      null,
      2,
    )}\n`,
  );
  await fs.writeFile(
    path.join(projectDir, `sceneforge/remix/source-assets/${sourceAssetId}/analysis/original_understanding.json`),
    '{}\n',
  );
  await fs.writeFile(
    path.join(projectDir, segmentPath),
    `${JSON.stringify(
      stored.sourceAsset.segments.map((segment) => ({
        segmentId: segment.id,
        visual: { mainAction: '人物抬头' },
        camera: { shotSize: '中近景' },
        videoPrompt: '固定镜头，人物缓慢抬头。',
      })),
      null,
      2,
    )}\n`,
  );
  stored.processingStageStates.remix_understanding = 'approved';
  stored.processingStageStates.remix_keyframes = 'approved';
  stored.processingStageStates.remix_segmentation = 'approved';
  await fs.writeFile(
    path.join(projectDir, stored.sourceAsset.sourceManifestPath),
    `${JSON.stringify(stored, null, 2)}\n`,
  );
  return stored;
}

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-remix-publish-'));
  await fs.writeFile(path.join(projectDir, 'source.mp4'), 'demo-video', 'utf8');
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('SceneForge Remix publish persistence (#04)', () => {
  it('publishSourceAssetToLibrary 在资产标签齐备时写入 published_to_library', async () => {
    const service = new RemixService({
      readDurationMs: async () => 9800,
      now: () => new Date('2026-06-23T13:00:00.000Z'),
    });

    const snapshot = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
      title: '夜市原片',
    });
    const sourceAssetId = snapshot.sourceAsset.id;
    await service.runSourceSegmentation({ projectDir, sourceAssetId });
    await service.runSourceKeyframes({ projectDir, sourceAssetId });
    await seedPublishReadyUnderstanding(service, sourceAssetId);

    await service.updateSourceAssetMetadata({
      projectDir,
      sourceAssetId,
      tags: ['压迫节奏'],
      annotationNote: null,
    });

    const published = await service.publishSourceAssetToLibrary({ projectDir, sourceAssetId });
    expect(published.sourceAsset.status).toBe('published_to_library');
    expect(published.sourceAsset.updatedAt).toBe('2026-06-23T13:00:00.000Z');
    expect(published.sourceAsset.tags).toEqual(['压迫节奏']);
    expect(published.sourceAsset.annotationNote).toBeNull();

    const manifestRaw = await fs.readFile(
      path.join(projectDir, published.sourceAsset.sourceManifestPath),
      'utf8',
    );
    expect(manifestRaw).toContain('"status": "published_to_library"');
    expect(manifestRaw).toContain('压迫节奏');
  });
});