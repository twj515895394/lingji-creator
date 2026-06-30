import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  REMIX_UNDERSTANDING_ROLLUP_KIND,
  buildRemixUnderstandingInputFingerprint,
} from '../electron/sceneforge/remix/remix-understanding-gate';
import {
  assertPublishReady,
  assertSourceAssetStageReady,
} from '../electron/sceneforge/remix/remix-validators';

let projectDir = '';

const baseDocument = {
  schema: 'sceneforge-remix-source-asset' as const,
  version: 1 as const,
  sourceAsset: {
    id: 'source-001',
    title: 'demo',
    status: 'processing' as const,
    createdAt: '2026-06-23T12:00:00.000Z',
    updatedAt: '2026-06-23T12:00:00.000Z',
    sourceVideoPath: '/tmp/demo.mp4',
    sourceManifestPath: 'sceneforge/remix/source-assets/source-001/source_manifest.json',
    transcriptPath: null,
    srtPath: null,
    videoMetadata: {
      durationMs: 1000,
      width: 1920,
      height: 1080,
      fps: 25,
      audioChannels: 2,
      hasAudio: true,
    },
    sourceOverviewMarkdownPath: null,
    sourceOverviewJsonPath: null,
    segmentAnalysisMarkdownPath: null,
    segmentAnalysisJsonPath: null,
    segments: [],
    variantCount: 0,
    tags: ['ready'],
    annotationNote: '保留压迫节奏。',
  },
  processingStageStates: {
    remix_source_import: 'approved' as const,
    remix_segmentation: 'approved' as const,
    remix_keyframes: 'ready_for_review' as const,
    remix_understanding: 'approved' as const,
  },
};

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-remix-validators-'));
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('SceneForge Remix validators', () => {
  it('allows approved stages at status gate level', () => {
    expect(() => assertSourceAssetStageReady(baseDocument, 'remix_segmentation')).not.toThrow();
  });

  it('rejects publish when prerequisite stages are missing', async () => {
    await expect(
      assertPublishReady(projectDir, {
        ...baseDocument,
        processingStageStates: {
          ...baseDocument.processingStageStates,
          remix_keyframes: 'not_started',
        },
      }),
    ).rejects.toThrow('Source Asset 阶段未完成');
  });

  it('assertPublishReady 在缺少资产标签时阻止入库', async () => {
    const overviewPath = 'sceneforge/remix/source-assets/source-001/analysis/source_overview.json';
    const segmentPath = 'sceneforge/remix/source-assets/source-001/analysis/segment_analysis.json';
    await fs.mkdir(path.join(projectDir, path.dirname(overviewPath)), { recursive: true });

    const doc = {
      ...baseDocument,
      sourceAsset: {
        ...baseDocument.sourceAsset,
        tags: [],
        sourceOverviewJsonPath: overviewPath,
        segmentAnalysisJsonPath: segmentPath,
        segments: [
          {
            id: 'segment-001',
            sourceAssetId: 'source-001',
            index: 1,
            title: '片段 01',
            boundaryType: 'source_shot' as const,
            timeRange: { startMs: 0, endMs: 1000, durationMs: 1000 },
            sourceClipPath: 'clip.mp4',
            keyframes: [],
          },
        ],
      },
    };
    const inputHash = buildRemixUnderstandingInputFingerprint(doc);

    await fs.writeFile(
      path.join(projectDir, overviewPath),
      JSON.stringify(
        {
          artifactKind: REMIX_UNDERSTANDING_ROLLUP_KIND,
          sourceAssetId: 'source-001',
          segmentCount: 1,
          understoodSegmentCount: 1,
          failedSegmentCount: 0,
          originalUnderstandingPath: 'analysis/original_understanding.json',
          overall: { summary: '全片摘要', storyArc: '剧情线', highValueSegmentIds: ['segment-001'] },
          quality: { segmentCount: 1, understoodSegmentCount: 1, failedSegmentCount: 0, needsHumanReview: true },
          segmentRefs: [{ segmentId: 'segment-001', understandingPath: 'segments/segment-001/understanding.json' }],
          inputHash,
        },
        null,
        2,
      ) + '\n',
    );
    await fs.writeFile(
      path.join(projectDir, 'sceneforge/remix/source-assets/source-001/analysis/original_understanding.json'),
      JSON.stringify({ schema: 'sceneforge-remix-original-understanding', quality: { understoodSegmentCount: 1 } }, null, 2) + '\n',
    );
    await fs.writeFile(
      path.join(projectDir, segmentPath),
      JSON.stringify(
        [{ segmentId: 'segment-001', visual: { mainAction: '抬头' }, camera: { shotSize: '中近景' }, videoPrompt: '固定镜头。' }],
        null,
        2,
      ) + '\n',
    );

    await expect(assertPublishReady(projectDir, doc)).rejects.toThrow('请先保存至少一个资产标签。');
  });

  it('assertPublishReady 不再强制要求人工备注', async () => {
    const overviewPath = 'sceneforge/remix/source-assets/source-001/analysis/source_overview.json';
    const segmentPath = 'sceneforge/remix/source-assets/source-001/analysis/segment_analysis.json';
    await fs.mkdir(path.join(projectDir, path.dirname(overviewPath)), { recursive: true });

    const doc = {
      ...baseDocument,
      sourceAsset: {
        ...baseDocument.sourceAsset,
        tags: ['night-market'],
        annotationNote: null,
        sourceOverviewJsonPath: overviewPath,
        segmentAnalysisJsonPath: segmentPath,
        segments: [
          {
            id: 'segment-001',
            sourceAssetId: 'source-001',
            index: 1,
            title: '片段 01',
            boundaryType: 'source_shot' as const,
            timeRange: { startMs: 0, endMs: 1000, durationMs: 1000 },
            sourceClipPath: 'clip.mp4',
            keyframes: [],
          },
        ],
      },
    };
    const inputHash = buildRemixUnderstandingInputFingerprint(doc);

    await fs.writeFile(
      path.join(projectDir, overviewPath),
      JSON.stringify(
        {
          artifactKind: REMIX_UNDERSTANDING_ROLLUP_KIND,
          sourceAssetId: 'source-001',
          segmentCount: 1,
          understoodSegmentCount: 1,
          failedSegmentCount: 0,
          originalUnderstandingPath: 'analysis/original_understanding.json',
          overall: { summary: '全片摘要', storyArc: '剧情线', highValueSegmentIds: ['segment-001'] },
          quality: { segmentCount: 1, understoodSegmentCount: 1, failedSegmentCount: 0, needsHumanReview: true },
          segmentRefs: [{ segmentId: 'segment-001', understandingPath: 'segments/segment-001/understanding.json' }],
          inputHash,
        },
        null,
        2,
      ) + '\n',
    );
    await fs.writeFile(
      path.join(projectDir, 'sceneforge/remix/source-assets/source-001/analysis/original_understanding.json'),
      JSON.stringify({ schema: 'sceneforge-remix-original-understanding', quality: { understoodSegmentCount: 1 } }, null, 2) + '\n',
    );
    await fs.writeFile(
      path.join(projectDir, segmentPath),
      JSON.stringify(
        [{ segmentId: 'segment-001', visual: { mainAction: '抬头' }, camera: { shotSize: '中近景' }, videoPrompt: '固定镜头。' }],
        null,
        2,
      ) + '\n',
    );

    await expect(assertPublishReady(projectDir, doc)).resolves.toBeUndefined();
  });
});

describe('SceneForge Remix publish understanding gate', () => {
  it('rejects publish when understanding artifacts are still placeholder', async () => {
    const overviewPath = 'sceneforge/remix/source-assets/source-001/analysis/source_overview.json';
    const segmentPath = 'sceneforge/remix/source-assets/source-001/analysis/segment_analysis.json';
    await fs.mkdir(path.join(projectDir, path.dirname(overviewPath)), { recursive: true });
    await fs.writeFile(
      path.join(projectDir, overviewPath),
      JSON.stringify(
        {
          artifactKind: 'segment_boundary_summary',
          artifactStatus: 'placeholder',
          sourceAssetId: 'source-001',
          segmentCount: 0,
          durationMs: 1000,
        },
        null,
        2,
      ) + '\n',
    );
    await fs.writeFile(path.join(projectDir, segmentPath), '[]\n');

    await expect(
      assertPublishReady(projectDir, {
        ...baseDocument,
        sourceAsset: {
          ...baseDocument.sourceAsset,
          sourceOverviewJsonPath: overviewPath,
          segmentAnalysisJsonPath: segmentPath,
        },
      }),
    ).rejects.toThrow('占位');
  });

  it('allows publish when rollup understanding artifacts are complete', async () => {
    const overviewPath = 'sceneforge/remix/source-assets/source-001/analysis/source_overview.json';
    const segmentPath = 'sceneforge/remix/source-assets/source-001/analysis/segment_analysis.json';
    await fs.mkdir(path.join(projectDir, path.dirname(overviewPath)), { recursive: true });

    const doc = {
      ...baseDocument,
      sourceAsset: {
        ...baseDocument.sourceAsset,
        sourceOverviewJsonPath: overviewPath,
        segmentAnalysisJsonPath: segmentPath,
        segments: [
          {
            id: 'segment-001',
            sourceAssetId: 'source-001',
            index: 1,
            title: '片段 01',
            boundaryType: 'source_shot' as const,
            timeRange: { startMs: 0, endMs: 1000, durationMs: 1000 },
            sourceClipPath: 'clip.mp4',
            keyframes: [],
          },
        ],
      },
    };
    const inputHash = buildRemixUnderstandingInputFingerprint(doc);

    await fs.writeFile(
      path.join(projectDir, overviewPath),
      JSON.stringify(
        {
          artifactKind: REMIX_UNDERSTANDING_ROLLUP_KIND,
          sourceAssetId: 'source-001',
          segmentCount: 1,
          understoodSegmentCount: 1,
          failedSegmentCount: 0,
          originalUnderstandingPath: 'analysis/original_understanding.json',
          overall: { summary: '全片摘要', storyArc: '剧情线', highValueSegmentIds: ['segment-001'] },
          quality: { segmentCount: 1, understoodSegmentCount: 1, failedSegmentCount: 0, needsHumanReview: true },
          segmentRefs: [
            {
              segmentId: 'segment-001',
              understandingPath: 'segments/segment-001/understanding.json',
            },
          ],
          inputHash,
        },
        null,
        2,
      ) + '\n',
    );
    await fs.writeFile(
      path.join(projectDir, 'sceneforge/remix/source-assets/source-001/analysis/original_understanding.json'),
      JSON.stringify({ schema: 'sceneforge-remix-original-understanding', quality: { understoodSegmentCount: 1 } }, null, 2) + '\n',
    );
    await fs.writeFile(
      path.join(projectDir, segmentPath),
      JSON.stringify(
        [
          {
            segmentId: 'segment-001',
            visual: { mainAction: '抬头回应' },
            camera: { shotSize: '中近景' },
            videoPrompt: '固定镜头，人物缓慢抬头。',
          },
        ],
        null,
        2,
      ) + '\n',
    );

    await expect(assertPublishReady(projectDir, doc)).resolves.toBeUndefined();
  });
});
