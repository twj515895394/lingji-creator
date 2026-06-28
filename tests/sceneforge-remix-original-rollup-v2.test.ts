import { describe, expect, it } from 'vitest';
import {
  buildOriginalUnderstandingDocument,
  buildSourceOverviewIndexDocument,
} from '../electron/sceneforge/remix/remix-source-understanding-rollup';
import type { RemixSegmentUnderstandingDocument } from '../electron/sceneforge/remix/remix-segment-understanding-schema';

const baseDoc = {
  schema: 'sceneforge-remix-source-asset' as const,
  version: 1 as const,
  sourceAsset: {
    id: 'source-001',
    title: 'demo-v2',
    status: 'processing' as const,
    createdAt: '2026-06-28T12:00:00.000Z',
    updatedAt: '2026-06-28T12:00:00.000Z',
    sourceVideoPath: 'source.mp4',
    sourceManifestPath: 'manifest.json',
    transcriptPath: 'transcripts/source_transcript.json',
    videoMetadata: {
      durationMs: 6000,
      width: 1920,
      height: 1080,
      fps: 25,
      audioChannels: 2,
      hasAudio: true,
    },
    sourceOverviewJsonPath: 'analysis/source_overview.json',
    segmentAnalysisJsonPath: 'analysis/segment_analysis.json',
    segments: [
      {
        id: 'segment-001',
        sourceAssetId: 'source-001',
        index: 1,
        title: '片段 01',
        boundaryType: 'source_shot' as const,
        timeRange: { startMs: 0, endMs: 3000, durationMs: 3000 },
        sourceClipPath: 'clip.mp4',
        keyframes: [],
        analysisJsonPath: 'segments/segment-001/segment_understanding.json',
      },
    ],
    variantCount: 0,
    tags: [],
  },
  processingStageStates: {
    remix_source_import: 'approved' as const,
    remix_segmentation: 'approved' as const,
    remix_keyframes: 'approved' as const,
    remix_understanding: 'ready_for_review' as const,
  },
};

function segmentDocV2(id: string): RemixSegmentUnderstandingDocument {
  return {
    schema: 'sceneforge-remix-segment-understanding',
    version: 2,
    segmentId: id,
    sourceAssetId: 'source-001',
    title: id,
    mode: 'balanced',
    promptVersion: 'balanced-mvp-v2',
    inputHash: `hash-${id}`,
    generatedAt: '2026-06-28T12:00:00.000Z',
    visual: {
      sceneSummary: '场景',
      mainAction: `动作-${id}`,
      characters: [],
      environment: '室内',
      composition: '居中',
      lighting: '柔光',
      props: ['桌子'],
    },
    camera: {
      shotSize: '中景',
      angle: '平视',
      movement: '固定',
    },
    audio: {
      speechSummary: '对白',
      dialogue: [],
    },
    story: {
      plotFunction: '铺垫',
      emotion: '紧张',
      conflict: '对峙',
    },
    remix: {
      keepPoints: ['节奏'],
      replacePoints: ['台词'],
      rewriteIdeas: ['职场谈判'],
    },
    videoPrompt: {
      positivePrompt: '固定镜头',
      negativePrompt: '避免卡通',
    },
    quality: { confidence: 0.9, missingInputs: [], needsHumanReview: true, warnings: [] },
  };
}

describe('SceneForge Remix Rollup V2 & Export', () => {
  it('correctly maps V2 rollup fields with characterMap and remixStrategy', () => {
    const segmentDocuments = [segmentDocV2('segment-001')];
    const original = buildOriginalUnderstandingDocument({
      document: baseDoc,
      segmentDocuments,
      generatedAt: '2026-06-28T12:00:00.000Z',
      inputHash: 'hash-test',
      failedSegmentCount: 0,
      sourceOverviewPath: 'analysis/source_overview.json',
      segmentAnalysisPath: 'analysis/segment_analysis.json',
      logline: 'Logline V2',
      storySummaryShort: 'Summary V2',
      storyContent: 'Content V2',
      eventChain: ['开始', '结束'],
      characterMap: [{ nameOrRole: '主角', description: '主要的侦探角色', relation: '与反派对峙' }],
      mainConflict: '正面冲突',
      keyTurns: ['发现线索'],
      emotionCurve: '平缓 -> 紧张',
      visualStyle: '暗冷色调',
      dialogueStyle: '干练寡言',
      keepMust: ['必须保留的镜头'],
      canReplace: ['没用的过场台词'],
      rewriteDirections: [
        { title: '悬疑改造', idea: '加强悬念', suitableStyle: '希区柯克风格', requiredSegments: ['segment-001'], risk: '节奏太慢' }
      ],
      suggestedTags: ['悬疑', '高燃'],
    });

    expect(original.version).toBe(2);
    expect(original.inputHash).toBe('hash-test');
    expect(original.overall.logline).toBe('Logline V2');
    expect(original.overall.storySummaryShort).toBe('Summary V2');
    expect(original.overall.storyContent).toBe('Content V2');
    expect(original.overall.eventChain).toEqual(['开始', '结束']);
    expect(original.overall.characterMap[0].nameOrRole).toBe('主角');
    expect(original.remixStrategy.keepMust).toEqual(['必须保留的镜头']);
    expect(original.remixStrategy.rewriteDirections[0].title).toBe('悬疑改造');
    expect(original.remixStrategy.suggestedTags).toContain('悬疑');
    expect(original.quality.rollupConfidence).toBe(0.85);
  });
});
