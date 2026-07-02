import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createAssetLibraryDb } from '../electron/sceneforge/assets/asset-library-db';
import { RemixService } from '../electron/sceneforge/remix/remix-service';
import {
  REMIX_UNDERSTANDING_ROLLUP_KIND,
  buildRemixUnderstandingInputFingerprint,
} from '../electron/sceneforge/remix/remix-understanding-gate';
import { readStoredSourceAsset } from '../electron/sceneforge/remix/remix-store';

let projectDir = '';

async function seedPublishReadyUnderstanding(
  service: RemixService,
  sourceAssetId: string,
) {
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
    `${JSON.stringify({
      artifactKind: REMIX_UNDERSTANDING_ROLLUP_KIND,
      sourceAssetId,
      segmentCount: stored.sourceAsset.segments.length,
      understoodSegmentCount: stored.sourceAsset.segments.length,
      failedSegmentCount: 0,
      originalUnderstandingPath: `sceneforge/remix/source-assets/${sourceAssetId}/analysis/original_understanding.json`,
      overall: {
        logline: '夜市对峙',
        storySummaryShort: '全片摘要',
        storyContent: '完整剧情',
        eventChain: ['开场对峙', '情绪升级'],
        characterMap: [{ nameOrRole: '摊主', description: '防备心很强', relation: '与顾客对峙' }],
        mainConflict: '价格与面子冲突',
        keyTurns: ['翻脸时刻'],
        visualStyle: '写实夜市',
        dialogueStyle: '带火药味',
      },
      remixStrategy: {
        rewriteDirections: [
          {
            title: '职场冲突版',
            idea: '把夜市争执改成办公室对线',
            suitableStyle: '黑色幽默',
            requiredSegments: stored.sourceAsset.segments.map((segment) => segment.id),
            risk: '节奏容易过满',
          },
        ],
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
    }, null, 2)}\n`,
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
        story: { plotFunction: '铺垫', emotion: '紧绷' },
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
}

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-asset-library-query-'));
  await fs.writeFile(path.join(projectDir, 'source.mp4'), 'demo-video', 'utf8');
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('asset library query and rebuild', () => {
  it('supports published asset search and exposes structured fields', async () => {
    let tick = 0;
    const service = new RemixService({
      readDurationMs: async () => 9800,
      now: () => new Date(`2026-06-30T10:00:0${tick++}.000Z`),
    });

    const imported = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
      title: '夜市对线原片',
    });
    const sourceAssetId = imported.sourceAsset.id;
    await service.runSourceSegmentation({ projectDir, sourceAssetId });
    await service.runSourceKeyframes({ projectDir, sourceAssetId });
    await seedPublishReadyUnderstanding(service, sourceAssetId);
    await service.updateSourceAssetMetadata({
      projectDir,
      sourceAssetId,
      tags: ['夜市冲突', '高压对白'],
      annotationNote: '适合做高压对线型二创',
    });
    await service.publishSourceAssetToLibrary({ projectDir, sourceAssetId });

    const searchResult = await service.searchPublishedSourceAssets({
      projectDir,
      query: '夜市',
      limit: 5,
    });
    expect(searchResult.sourceAssets).toHaveLength(1);
    expect(searchResult.sourceAssets[0].id).toBe(sourceAssetId);
    expect(searchResult.sourceAssets[0].tags).toEqual(['夜市冲突', '高压对白']);
    expect(searchResult.sourceAssets[0].annotationNote).toContain('高压对线');
    expect(searchResult.sourceAssets[0].logline).toBe('夜市对峙');
    expect(searchResult.sourceAssets[0].thumbnailPath).toContain('.png');
  });

  it('rebuildPublishedSourceAssetLibrary can backfill missing db rows and skip unpublished assets', async () => {
    let tick = 0;
    const service = new RemixService({
      readDurationMs: async () => 9800,
      now: () => new Date(`2026-06-30T10:00:0${tick++}.000Z`),
    });

    const publishedImported = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
      title: '已发布素材',
    });
    const publishedId = publishedImported.sourceAsset.id;
    await service.runSourceSegmentation({ projectDir, sourceAssetId: publishedId });
    await service.runSourceKeyframes({ projectDir, sourceAssetId: publishedId });
    await seedPublishReadyUnderstanding(service, publishedId);
    await service.updateSourceAssetMetadata({
      projectDir,
      sourceAssetId: publishedId,
      tags: ['夜市冲突'],
      annotationNote: null,
    });
    await service.publishSourceAssetToLibrary({ projectDir, sourceAssetId: publishedId });

    const draftImported = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
      title: '未发布素材',
    });

    const db = createAssetLibraryDb(projectDir);
    db.prepare('DELETE FROM source_assets WHERE id = ?').run(publishedId);
    db.close();

    const before = await service.searchPublishedSourceAssets({
      projectDir,
      query: '已发布',
    });
    expect(before.sourceAssets).toHaveLength(0);

    const rebuilt = await service.rebuildPublishedSourceAssetLibrary({ projectDir });
    expect(rebuilt.rebuiltAssetIds).toContain(publishedId);
    expect(rebuilt.skippedAssetIds).toContain(draftImported.sourceAsset.id);

    const after = await service.searchPublishedSourceAssets({
      projectDir,
      query: '已发布',
    });
    expect(after.sourceAssets).toHaveLength(1);
    expect(after.sourceAssets[0].id).toBe(publishedId);
  });

  it('rebuildSourceAssetVideoMetadata rewrites stored manifest metadata and syncs published sqlite rows', async () => {
    let tick = 0;
    const bootstrapService = new RemixService({
      readDurationMs: async () => 9800,
      now: () => new Date(`2026-06-30T11:00:0${tick++}.000Z`),
    });

    const publishedImported = await bootstrapService.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
      title: '待回填已发布素材',
    });
    const publishedId = publishedImported.sourceAsset.id;
    await bootstrapService.runSourceSegmentation({ projectDir, sourceAssetId: publishedId });
    await bootstrapService.runSourceKeyframes({ projectDir, sourceAssetId: publishedId });
    await seedPublishReadyUnderstanding(bootstrapService, publishedId);
    await bootstrapService.updateSourceAssetMetadata({
      projectDir,
      sourceAssetId: publishedId,
      tags: ['回填测试'],
      annotationNote: '旧资产规格需要修正',
    });
    await bootstrapService.publishSourceAssetToLibrary({ projectDir, sourceAssetId: publishedId });

    const draftImported = await bootstrapService.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
      title: '待回填草稿素材',
    });
    const draftId = draftImported.sourceAsset.id;

    const beforePublished = await readStoredSourceAsset(projectDir, publishedId);
    expect(beforePublished.sourceAsset.videoMetadata.width).toBe(1920);
    expect(beforePublished.sourceAsset.videoMetadata.height).toBe(1080);

    const dbBefore = createAssetLibraryDb(projectDir);
    const beforeRow = dbBefore
      .prepare('SELECT width, height, fps FROM source_assets WHERE id = ?')
      .get(publishedId) as { width: number; height: number; fps: number | null } | undefined;
    dbBefore.close();
    expect(beforeRow).toMatchObject({ width: 1920, height: 1080, fps: 25 });

    const repairService = new RemixService({
      readVideoMetadata: async (filePath) => {
        const basename = path.basename(filePath);
        if (basename === 'source.mp4') {
          return {
            durationMs: 8033,
            width: 852,
            height: 480,
            fps: 29.97,
            audioChannels: 1,
            hasAudio: false,
          };
        }
        throw new Error(`unexpected file: ${basename}`);
      },
      now: () => new Date('2026-06-30T11:10:00.000Z'),
    });

    const rebuilt = await repairService.rebuildSourceAssetVideoMetadata({
      projectDir,
      sourceAssetIds: [publishedId, draftId, 'missing-asset'],
    });
    expect(rebuilt.rebuiltAssetIds).toEqual([publishedId, draftId]);
    expect(rebuilt.syncedPublishedAssetIds).toEqual([publishedId]);
    expect(rebuilt.failedAssets).toHaveLength(1);
    expect(rebuilt.failedAssets[0]?.sourceAssetId).toBe('missing-asset');

    const publishedAfter = await readStoredSourceAsset(projectDir, publishedId);
    const draftAfter = await readStoredSourceAsset(projectDir, draftId);
    expect(publishedAfter.sourceAsset.videoMetadata).toEqual({
      durationMs: 8033,
      width: 852,
      height: 480,
      fps: 29.97,
      audioChannels: 1,
      hasAudio: false,
    });
    expect(draftAfter.sourceAsset.videoMetadata.width).toBe(852);
    expect(draftAfter.sourceAsset.videoMetadata.height).toBe(480);

    const dbAfter = createAssetLibraryDb(projectDir);
    const publishedRow = dbAfter
      .prepare('SELECT width, height, fps FROM source_assets WHERE id = ?')
      .get(publishedId) as { width: number; height: number; fps: number | null } | undefined;
    const draftRow = dbAfter
      .prepare('SELECT width, height, fps FROM source_assets WHERE id = ?')
      .get(draftId) as { width: number; height: number; fps: number | null } | undefined;
    dbAfter.close();

    expect(publishedRow).toMatchObject({ width: 852, height: 480, fps: 29.97 });
    expect(draftRow).toBeUndefined();
  });
});
