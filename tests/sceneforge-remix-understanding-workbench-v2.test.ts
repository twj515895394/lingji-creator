import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SourceAsset } from '../src/sceneforge/remix/types';
import {
  loadRemixUnderstandingWorkbench,
} from '../electron/sceneforge/remix/remix-understanding-workbench';
import {
  getRemixOriginalUnderstandingJsonPath,
  getRemixSegmentUnderstandingJsonPath,
  getRemixSegmentFrameVisionJsonPath,
  getRemixSegmentTranscriptCorrectionJsonPath,
} from '../electron/sceneforge/remix/remix-artifact-paths';
import { buildSegmentUnderstandingInputHash } from '../electron/sceneforge/remix/remix-segment-understanding-schema';
import { RemixTranscriptCorrectionService } from '../electron/sceneforge/remix/remix-transcript-correction-service';

let projectDir: string;
const sourceAssetId = 'asset-test-v2';

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-remix-workbench-v2-'));
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true }).catch(() => {});
});

describe('RemixUnderstandingWorkbench V2 Aggregator', () => {
  it('aggregates complete V2 documents successfully', async () => {
    // 1. Mock StoredSourceAsset
    const sourceAsset: SourceAsset = {
      id: sourceAssetId,
      title: '测试视频 V2',
      status: 'ready_for_review',
      sourceOverviewJsonPath: 'sceneforge/remix/source-assets/asset-test-v2/source_overview.json',
      segmentAnalysisJsonPath: 'sceneforge/remix/source-assets/asset-test-v2/segment_analysis.json',
      segments: [
        {
          id: 'seg-1',
          index: 0,
          title: '片段 1',
          timeRange: { startMs: 0, endMs: 5000 },
          keyframes: [{ id: 'kf-1', timestampMs: 2500, imagePath: 'keyframes/kf-1.jpg', frameRole: 'middle' }],
          segmentTranscriptJsonPath: 'transcripts/seg-1.json',
          transcriptCorrectionPath: 'corrections/seg-1.json',
          analysisJsonPath: `sceneforge/remix/source-assets/${sourceAssetId}/seg-1.analysis.json`,
        },
      ],
    };

    // 2. Mock source_overview.json
    const overviewDir = path.join(projectDir, `sceneforge/remix/source-assets/${sourceAssetId}`);
    await fs.mkdir(overviewDir, { recursive: true });
    await fs.writeFile(
      path.join(overviewDir, 'source_overview.json'),
      JSON.stringify({
        schema: 'sceneforge-remix-source-overview',
        version: 2,
        originalUnderstandingPath: `sceneforge/remix/source-assets/${sourceAssetId}/original_understanding.json`,
        segmentRefs: [
          {
            segmentId: 'seg-1',
            understandingPath: `sceneforge/remix/source-assets/${sourceAssetId}/seg-1.analysis.json`,
          },
        ],
      }),
      'utf8',
    );

    // 3. Mock original_understanding.json (V2)
    const originalDoc = {
      schema: 'sceneforge-remix-original-understanding',
      version: 2,
      sourceAssetId,
      generatedAt: new Date().toISOString(),
      overall: {
        logline: '一句话故事',
        storySummaryShort: '短故事',
        storyContent: '长剧情影视解说内容',
        eventChain: ['开局对峙', '中局交锋', '收尾'],
        characterMap: [{ nameOrRole: 'A', description: '神态严肃', relation: '对手' }],
      },
      remixStrategy: {
        rewriteDirections: [{ title: '方向A', idea: '创意A', suitableStyle: '赛博', risk: '无' }],
        suggestedTags: ['标签1'],
      },
      quality: {
        rollupFallbackUsed: false,
        warnings: [],
      },
    };
    await fs.writeFile(
      path.join(overviewDir, 'original_understanding.json'),
      JSON.stringify(originalDoc),
      'utf8',
    );

    // 4. Mock segment_analysis.json (gate)
    await fs.writeFile(
      path.join(overviewDir, 'segment_analysis.json'),
      JSON.stringify([{ segmentId: 'seg-1', videoPrompt: 'prompt', visual: {}, camera: {} }]),
      'utf8',
    );

    // 5. Mock transcripts
    const transDir = path.join(projectDir, 'transcripts');
    await fs.mkdir(transDir, { recursive: true });
    await fs.writeFile(
      path.join(transDir, 'seg-1.json'),
      JSON.stringify({ plainText: '原始台词文字' }),
      'utf8',
    );

    // 6. 计算真实的 Hash 防止其过期
    const correctHash = buildSegmentUnderstandingInputHash({
      segment: sourceAsset.segments[0],
      transcript: { plainText: '原始台词文字' } as any,
      keyframes: sourceAsset.segments[0].keyframes,
    });

    // 7. Mock segment understanding analysis (V2)
    const segUnderstanding = {
      schema: 'sceneforge-remix-segment-understanding',
      version: 2,
      generatedAt: new Date(Date.now() - 10000).toISOString(),
      inputHash: correctHash,
      visual: {
        sceneSummary: '室内',
        mainAction: '抬头',
        characters: ['A'],
        environment: '暗室',
        props: ['枪'],
        lighting: '暗光',
        colorTone: '冷调',
      },
      camera: { shotSize: '特写', movement: '推镜头' },
      story: { plotFunction: '爆发点' },
      remix: { keepElements: ['保留要素'], replaceableElements: ['替换要素'] },
      videoPrompt: {
        version: 2,
        fullChinesePrompt: '完整 Prompt',
        dimensions: [{ key: 'subject', label: '主体', text: '描述' }],
        negativePrompt: '负向 Prompt',
      },
      quality: { confidence: 0.95, needsHumanReview: false, warnings: [] },
    };
    await fs.writeFile(
      path.join(overviewDir, 'seg-1.analysis.json'),
      JSON.stringify(segUnderstanding),
      'utf8',
    );

    // 8. Mock frame_vision.json (旧时间，不 stale)
    const fvPath = path.join(projectDir, getRemixSegmentFrameVisionJsonPath(sourceAssetId, 'seg-1'));
    await fs.mkdir(path.dirname(fvPath), { recursive: true });
    await fs.writeFile(
      fvPath,
      JSON.stringify({
        generatedAt: new Date(Date.now() - 20000).toISOString(),
        segmentVisualSummary: '画面描述内容',
        quality: { warnings: [] },
      }),
      'utf8',
    );

    // Run loadRemixUnderstandingWorkbench
    const snapshot = await loadRemixUnderstandingWorkbench(projectDir, sourceAsset);

    expect(snapshot.ready).toBe(true);
    expect(snapshot.version).toBe(2);
    expect(snapshot.isStale).toBe(false);
    expect(snapshot.rollupFallbackUsed).toBe(false);
    expect(snapshot.overview.logline).toBe('一句话故事');
    expect(snapshot.overview.storyContent).toBe('长剧情影视解说内容');
    expect(snapshot.overview.eventChain).toContain('开局对峙');
    expect(snapshot.overview.remixDirections[0].title).toBe('方向A');
    expect(snapshot.overview.characterMap[0].nameOrRole).toBe('A');

    const card = snapshot.segments[0];
    expect(card.segmentId).toBe('seg-1');
    expect(card.transcript.asrText).toBe('原始台词文字');
    expect(card.visual.mainAction).toBe('抬头');
    expect(card.camera.shotSize).toBe('特写');
    expect(card.videoPrompt.fullChinesePrompt).toBe('完整 Prompt');
    expect(card.videoPrompt.dimensions[0].key).toBe('subject');
    expect(card.frameVision.available).toBe(true);
    expect(card.frameVision.segmentVisualSummary).toBe('画面描述内容');
  });

  it('detects freshness changes and reports stale segments', async () => {
    // 1. Mock StoredSourceAsset
    const sourceAsset: SourceAsset = {
      id: sourceAssetId,
      title: '测试视频 Stale',
      status: 'ready_for_review',
      sourceOverviewJsonPath: 'sceneforge/remix/source-assets/asset-test-v2/source_overview.json',
      segments: [
        {
          id: 'seg-1',
          index: 0,
          title: '片段 1',
          timeRange: { startMs: 0, endMs: 5000 },
          keyframes: [],
          segmentTranscriptJsonPath: 'transcripts/seg-1.json',
          transcriptCorrectionPath: 'corrections/seg-1.json',
          analysisJsonPath: `sceneforge/remix/source-assets/${sourceAssetId}/seg-1.analysis.json`,
        },
      ],
    };

    const overviewDir = path.join(projectDir, `sceneforge/remix/source-assets/${sourceAssetId}`);
    await fs.mkdir(overviewDir, { recursive: true });
    await fs.writeFile(
      path.join(overviewDir, 'source_overview.json'),
      JSON.stringify({
        schema: 'sceneforge-remix-source-overview',
        version: 2,
        originalUnderstandingPath: `sceneforge/remix/source-assets/${sourceAssetId}/original_understanding.json`,
        segmentRefs: [
          {
            segmentId: 'seg-1',
            understandingPath: `sceneforge/remix/source-assets/${sourceAssetId}/seg-1.analysis.json`,
          },
        ],
      }),
      'utf8',
    );

    // Mock segment understanding (generated 10s ago)
    const segUnderstanding = {
      generatedAt: new Date(Date.now() - 10000).toISOString(),
      inputHash: 'some-hash',
      visual: { mainAction: '动作' },
      videoPrompt: { fullChinesePrompt: 'Prompt' },
    };
    await fs.writeFile(
      path.join(overviewDir, 'seg-1.analysis.json'),
      JSON.stringify(segUnderstanding),
      'utf8',
    );

    // Mock original_understanding.json
    await fs.writeFile(
      path.join(overviewDir, 'original_understanding.json'),
      JSON.stringify({
        generatedAt: new Date(Date.now() - 8000).toISOString(),
        overall: { storyContent: '整体解说' },
      }),
      'utf8',
    );

    // Case 1: transcript correction path exists but has newer mtimeMs
    const corrDir = path.join(projectDir, 'corrections');
    await fs.mkdir(corrDir, { recursive: true });
    const corrPath = path.join(corrDir, 'seg-1.json');
    await fs.writeFile(
      corrPath,
      JSON.stringify({
        updatedAt: new Date(Date.now() - 1000).toISOString(), // 1秒前更新，比 10秒前的 understanding 更晚
        transcript: {
          correctedText: '已修改台词',
          effectiveText: '已修改台词',
          correctionStatus: 'edited',
        },
      }),
      'utf8',
    );

    // 重新修改文件修改时间 mtime，确保 mtimeMs 比 originalTime 晚
    const stats = await fs.stat(corrPath);
    const futureTime = (Date.now() + 5000) / 1000;
    await fs.utimes(corrPath, futureTime, futureTime);

    let snapshot = await loadRemixUnderstandingWorkbench(projectDir, sourceAsset);
    expect(snapshot.isStale).toBe(true);
    expect(snapshot.staleSegmentIds).toContain('seg-1');
    expect(snapshot.staleReasons).toContain('transcript_correction_changed');

    // Case 2: frame_vision.json generatedAt is newer than understanding
    // 把 corrections 改为 raw (不触发 mtime 变更)
    await fs.writeFile(
      corrPath,
      JSON.stringify({
        updatedAt: new Date(Date.now() - 50000).toISOString(),
        transcript: {
          correctedText: '',
          effectiveText: '',
          correctionStatus: 'raw',
        },
      }),
      'utf8',
    );
    // 重置 corrPath 时间为旧时间
    const oldTime = (Date.now() - 60000) / 1000;
    await fs.utimes(corrPath, oldTime, oldTime);

    const fvPath = path.join(projectDir, getRemixSegmentFrameVisionJsonPath(sourceAssetId, 'seg-1'));
    await fs.mkdir(path.dirname(fvPath), { recursive: true });
    await fs.writeFile(
      fvPath,
      JSON.stringify({
        generatedAt: new Date().toISOString(), // 刚刚生成，比 10秒前更晚
        segmentVisualSummary: '最新画面视觉描述',
      }),
      'utf8',
    );

    snapshot = await loadRemixUnderstandingWorkbench(projectDir, sourceAsset);
    expect(snapshot.isStale).toBe(true);
    expect(snapshot.staleSegmentIds).toContain('seg-1');
    expect(snapshot.staleReasons).toContain('frame_vision_changed');
  });

  it('fails gracefully when files are missing', async () => {
    const sourceAsset: SourceAsset = {
      id: sourceAssetId,
      title: '缺少文件测试',
      status: 'ready_for_review',
      segments: [
        {
          id: 'seg-1',
          index: 0,
          title: '片段 1',
          timeRange: { startMs: 0, endMs: 5000 },
          keyframes: [],
        },
      ],
    };

    const snapshot = await loadRemixUnderstandingWorkbench(projectDir, sourceAsset);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.isPlaceholder).toBe(true);
    expect(snapshot.errors.length).toBeGreaterThan(0);
    expect(snapshot.errors[0]).toContain('source_overview.json');
    expect(snapshot.segments[0].isPlaceholder).toBe(true);
    expect(snapshot.segments[0].visual.mainAction).toBe('待生成');
  });

  it('confirms all segment transcripts successfully in batch', async () => {
    // 1. Mock StoredSourceAsset
    const sourceAsset: SourceAsset = {
      id: sourceAssetId,
      title: '测试视频 Batch Confirm',
      status: 'ready_for_review',
      sourceManifestPath: `sceneforge/remix/source-assets/${sourceAssetId}/source_manifest.json`,
      sourceOverviewJsonPath: 'sceneforge/remix/source-assets/asset-test-v2/source_overview.json',
      segmentAnalysisJsonPath: 'sceneforge/remix/source-assets/asset-test-v2/segment_analysis.json',
      segments: [
        {
          id: 'seg-1',
          index: 0,
          title: '片段 1',
          timeRange: { startMs: 0, endMs: 5000 },
          keyframes: [],
          segmentTranscriptJsonPath: 'transcripts/seg-1.json',
          transcriptCorrectionPath: getRemixSegmentTranscriptCorrectionJsonPath(sourceAssetId, 'seg-1'),
          analysisJsonPath: `sceneforge/remix/source-assets/${sourceAssetId}/seg-1.analysis.json`,
        },
      ],
    };

    // 写入 StoredSourceAssetDocument 到项目文件
    const docPath = path.join(projectDir, `sceneforge/remix/source-assets/${sourceAssetId}/source_manifest.json`);
    await fs.mkdir(path.dirname(docPath), { recursive: true });
    await fs.writeFile(
      docPath,
      JSON.stringify({
        schema: 'sceneforge-remix-stored-source-asset',
        version: 1,
        sourceAsset,
        processingStageStates: { remix_understanding: 'approved' },
      }),
      'utf8',
    );

    // 写入 transcripts/seg-1.json
    const transDir = path.join(projectDir, 'transcripts');
    await fs.mkdir(transDir, { recursive: true });
    await fs.writeFile(
      path.join(transDir, 'seg-1.json'),
      JSON.stringify({ plainText: '原始台词' }),
      'utf8',
    );

    // 写入初始状态为 edited 的 corrections/seg-1.json
    const corrRel = getRemixSegmentTranscriptCorrectionJsonPath(sourceAssetId, 'seg-1');
    const corrPath = path.join(projectDir, corrRel);
    await fs.mkdir(path.dirname(corrPath), { recursive: true });
    await fs.writeFile(
      corrPath,
      JSON.stringify({
        schema: 'sceneforge-remix-segment-transcript-correction',
        version: 1,
        sourceAssetId,
        segmentId: 'seg-1',
        generatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        inputRefs: { sourceTranscriptPath: null, segmentTranscriptPath: null },
        transcript: {
          asrText: '原始台词',
          correctedText: '已修改台词',
          effectiveText: '已修改台词',
          correctionStatus: 'edited',
        },
        quality: { needsHumanReview: true, warnings: [] },
      }),
      'utf8',
    );

    // 运行 batch confirm
    const service = new RemixTranscriptCorrectionService();
    const result = await service.confirmAllSegmentTranscripts(projectDir, sourceAssetId);

    // 验证返回的 snapshot 中已经变为了 confirmed 状态
    expect(result.segments[0].transcript.correctionStatus).toBe('confirmed');

    // 验证物理文件的状态也已经被更新为 confirmed
    const updatedCorr = JSON.parse(await fs.readFile(corrPath, 'utf8'));
    expect(updatedCorr.transcript.correctionStatus).toBe('confirmed');
    expect(updatedCorr.quality.needsHumanReview).toBe(false);
  });
});
