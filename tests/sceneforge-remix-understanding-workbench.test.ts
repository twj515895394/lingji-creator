import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  buildAnnotationPrefillFromUnderstanding,
  loadRemixUnderstandingWorkbench,
} from '../electron/sceneforge/remix/remix-understanding-workbench';
import type { SourceAsset } from '../src/sceneforge/remix/types';
import fs from 'node:fs/promises';

vi.mock('node:fs/promises', () => {
  return {
    default: {
      readFile: vi.fn(),
      mkdir: vi.fn(),
    },
  };
});

const asset: SourceAsset = {
  id: 'source-001',
  title: '测试素材',
  status: 'ready_for_review',
  createdAt: '2026-06-27T00:00:00.000Z',
  updatedAt: '2026-06-27T00:00:00.000Z',
  sourceVideoPath: 'source.mp4',
  sourceManifestPath: 'manifest.json',
  transcriptPath: null,
  srtPath: null,
  videoMetadata: {
    durationMs: 10000,
    width: 1920,
    height: 1080,
    fps: 25,
    audioChannels: 2,
    hasAudio: true,
  },
  sourceOverviewMarkdownPath: 'analysis/source_overview.md',
  sourceOverviewJsonPath: 'analysis/source_overview.json',
  segmentAnalysisMarkdownPath: 'analysis/segment_analysis.md',
  segmentAnalysisJsonPath: 'analysis/segment_analysis.json',
  segments: [],
  variantCount: 0,
  tags: [],
  annotationNote: null,
  lastAnnotatedAt: null,
  annotatedBy: null,
  annotationSource: null,
};

describe('SceneForge Remix understanding workbench', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds annotation prefill from segment understanding cards', () => {
    const prefill = buildAnnotationPrefillFromUnderstanding(asset, [
      {
        segmentId: 'segment-001',
        segmentIndex: 1,
        title: '片段 01',
        timeRangeLabel: '00:00 - 00:10',
        thumbnailPath: null,
        transcriptSummary: '对白摘要',
        mainAction: '缓慢抬头',
        shotSummary: '中近景 / 固定镜头',
        plotFunction: '推进情绪',
        speechSummary: '对白摘要',
        positivePrompt: '固定镜头，缓慢抬头。',
        keepElements: ['压迫节奏'],
        replaceableElements: ['角色身份'],
        confidence: 0.9,
        understandingPath: 'segment-001.json',
        isPlaceholder: false,
      },
    ]);

    expect(prefill?.suggestedTags).toEqual(['压迫节奏', '角色身份']);
    expect(prefill?.suggestedNote).toContain('【AI 预填，请按真实观感修正】');
    expect(prefill?.suggestedNote).toContain('片段 01');
  });

  it('does not overwrite saved annotation content', () => {
    const savedAsset = {
      ...asset,
      tags: ['manual-tag'],
      annotationNote: '人工备注',
      lastAnnotatedAt: '2026-06-27T01:00:00.000Z',
    };
    const prefill = buildAnnotationPrefillFromUnderstanding(savedAsset, []);
    expect(prefill).toBeNull();
  });

  it('loads and maps Version 1 original understanding JSON to workbench snapshot', async () => {
    const mockV1Json = {
      schema: 'sceneforge-remix-original-understanding',
      version: 1,
      sourceAssetId: 'source-001',
      title: 'V1 Test',
      generatedAt: '2026-06-26T12:00:00.000Z',
      overall: {
        summary: '这是V1的故事总结内容',
        storyArc: '开端 -> 结尾',
        visualStyle: '写实',
        mainConflict: '冲突',
        emotionCurve: '平缓',
        remixPotential: ['二创'],
        highValueSegmentIds: [],
      },
      segmentRefs: [],
      quality: {
        segmentCount: 0,
        understoodSegmentCount: 0,
        failedSegmentCount: 0,
        needsHumanReview: true,
        avgConfidence: null,
      },
    };

    vi.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockV1Json));
    const mockAsset = { ...asset, segments: [] };
    const snapshot = await loadRemixUnderstandingWorkbench('/mock-project', mockAsset);

    expect(snapshot.rollupFallbackUsed).toBe(false);
    expect(snapshot.overviewSummary).toBe('这是V1的故事总结内容');
  });

  it('loads Version 2 original understanding JSON with fallback status and errors', async () => {
    const mockV2Json = {
      schema: 'sceneforge-remix-original-understanding',
      version: 2,
      sourceAssetId: 'source-001',
      title: 'V2 Test',
      generatedAt: '2026-06-27T12:00:00.000Z',
      overall: {
        logline: '梗概',
        storySummaryShort: '',
        storyContent: '',
        storyArc: '',
        visualStyle: '',
        mainConflict: '',
        emotionCurve: '',
        remixPotential: [],
        highValueSegmentIds: [],
      },
      segmentRefs: [],
      quality: {
        segmentCount: 0,
        understoodSegmentCount: 0,
        failedSegmentCount: 0,
        needsHumanReview: true,
        avgConfidence: null,
        rollupFallbackUsed: true,
        errors: ['AI error details'],
        warnings: [],
        staleReasons: [],
      },
    };

    vi.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockV2Json));
    const mockAsset = { ...asset, segments: [] };
    const snapshot = await loadRemixUnderstandingWorkbench('/mock-project', mockAsset);

    expect(snapshot.rollupFallbackUsed).toBe(true);
    expect(snapshot.errors).toContain('AI error details');
    // rollupFallbackUsed 为 true 时，内容必须为空
    expect(snapshot.overviewSummary).toBe('');
  });

  it('correctly calculates isStale and storyStale based on modification times', async () => {
    const mockAsset = {
      ...asset,
      segments: [
        {
          id: 'segment-001',
          index: 1,
          title: '片段 01',
          timeRange: { startMs: 0, endMs: 10000 },
          keyframes: [],
          analysisJsonPath: 'segment-001-understanding.json',
          transcriptCorrectionPath: 'segment-001-correction.json',
          segmentTranscriptJsonPath: 'segment-001-transcript.json',
        },
      ],
    };

    vi.spyOn(fs, 'readFile').mockImplementation(async (path: any) => {
      if (path.includes('source_overview.json') || path.includes('original_understanding.json')) {
        throw new Error('Not found');
      }
      if (path.includes('segment-001-understanding.json')) {
        return JSON.stringify({
          segmentId: 'segment-001',
          generatedAt: '2026-06-27T10:00:00.000Z',
          visual: { mainAction: '测试动作' },
          camera: { shotSize: '中景', movement: '固定' },
          story: { plotFunction: '铺垫' },
          audio: { speechSummary: '测试台词' },
          videoPrompt: { positivePrompt: '测试prompt' },
          remix: { keepElements: ['铺垫'], replaceableElements: [] },
          quality: { confidence: 0.9 },
        });
      }
      if (path.includes('segment-001-correction.json')) {
        return JSON.stringify({
          updatedAt: '2026-06-27T11:00:00.000Z',
          transcript: {
            asrText: '原始台词',
            correctedText: '已修改台词',
            effectiveText: '已修改台词',
            correctionStatus: 'edited',
          },
        });
      }
      return '{}';
    });

    const snapshot = await loadRemixUnderstandingWorkbench('/mock-project', mockAsset as any);

    expect(snapshot.segments[0].isStale).toBe(true);
    expect(snapshot.storyStale).toBe(true);
  });
});
