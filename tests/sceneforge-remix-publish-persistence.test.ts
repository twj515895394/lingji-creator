import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  REMIX_UNDERSTANDING_ROLLUP_KIND,
  buildRemixUnderstandingInputFingerprint,
} from '../electron/sceneforge/remix/remix-understanding-gate';
import { createAssetLibraryDb, resolveAssetLibraryDbPath } from '../electron/sceneforge/assets/asset-library-db';
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
        overall: {
          summary: '全片摘要',
          storySummaryShort: '全片摘要',
          logline: '夜市对峙',
          storyArc: '剧情线',
          highValueSegmentIds: stored.sourceAsset.segments.map((s) => s.id),
        },
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

    expect(resolveAssetLibraryDbPath(projectDir)).toBe(path.join(projectDir, 'sceneforge', 'asset-library.db'));
    const db = createAssetLibraryDb(projectDir);
    const assetRow = db.prepare(`
      SELECT status, title, segment_count, keyframe_count, annotation_note
      FROM source_assets
      WHERE id = ?
    `).get(sourceAssetId) as {
      status: string;
      title: string;
      segment_count: number;
      keyframe_count: number;
      annotation_note: string | null;
    };
    expect(assetRow.status).toBe('published_to_library');
    expect(assetRow.title).toBe('夜市原片');
    expect(assetRow.segment_count).toBeGreaterThan(0);
    expect(assetRow.keyframe_count).toBeGreaterThan(0);
    expect(assetRow.annotation_note).toBeNull();

    const tagRows = db.prepare(`
      SELECT tag
      FROM source_asset_tags
      WHERE source_asset_id = ?
      ORDER BY id ASC
    `).all(sourceAssetId) as Array<{ tag: string }>;
    expect(tagRows.map((row) => row.tag)).toEqual(['压迫节奏']);

    const searchRow = db.prepare(`
      SELECT title, search_text
      FROM source_asset_search
      WHERE source_asset_id = ?
    `).get(sourceAssetId) as { title: string; search_text: string };
    expect(searchRow.title).toBe('夜市原片');
    expect(searchRow.search_text).toContain('全片摘要');

    db.close();
  });

  it('publishSourceAssetToLibrary 在 SQLite 写入失败时不会提前把 manifest 切到 published', async () => {
    const service = new RemixService({
      readDurationMs: async () => 9800,
      now: () => new Date('2026-06-23T13:00:00.000Z'),
      assetLibraryIngestService: {
        upsertSourceAsset: async () => {
          throw new Error('sqlite write failed');
        },
        removeSourceAsset: async () => undefined,
      } as any,
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

    await expect(
      service.publishSourceAssetToLibrary({ projectDir, sourceAssetId }),
    ).rejects.toThrow('sqlite write failed');

    const stored = await readStoredSourceAsset(projectDir, sourceAssetId);
    expect(stored.sourceAsset.status).not.toBe('published_to_library');
  });
});
