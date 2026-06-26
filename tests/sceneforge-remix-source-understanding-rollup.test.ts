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
    title: 'demo',
    status: 'processing' as const,
    createdAt: '2026-06-26T12:00:00.000Z',
    updatedAt: '2026-06-26T12:00:00.000Z',
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
      {
        id: 'segment-002',
        sourceAssetId: 'source-001',
        index: 2,
        title: '片段 02',
        boundaryType: 'source_shot' as const,
        timeRange: { startMs: 3000, endMs: 6000, durationMs: 3000 },
        sourceClipPath: 'clip2.mp4',
        keyframes: [],
        analysisJsonPath: 'segments/segment-002/segment_understanding.json',
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

function segmentDoc(id: string, plot: string): RemixSegmentUnderstandingDocument {
  return {
    schema: 'sceneforge-remix-segment-understanding',
    version: 1,
    segmentId: id,
    sourceAssetId: 'source-001',
    title: id,
    mode: 'balanced',
    promptVersion: 'balanced-mvp-v1',
    inputHash: `hash-${id}`,
    generatedAt: '2026-06-26T12:00:00.000Z',
    visual: {
      sceneSummary: '场景',
      mainAction: `动作-${id}`,
      characters: [],
      environmentDetails: '室内',
      lighting: '柔光',
      colorTone: '暖色',
    },
    camera: {
      shotSize: '中景',
      angle: '平视',
      movement: '固定',
      composition: '居中',
      focus: '人物',
      editingRole: '铺垫',
    },
    audio: {
      speechSummary: '对白',
      dialogue: [],
      ambient: '环境声',
      music: '无',
      silenceOrPause: '无',
    },
    story: {
      plotFunction: plot,
      emotion: '紧张',
      conflict: '对峙',
      beforeAfterRelation: '承接',
    },
    remix: {
      keepElements: ['节奏'],
      replaceableElements: ['台词'],
      rewriteIdeas: ['职场谈判'],
      reuseScenarios: ['谈判'],
      riskNotes: [],
    },
    videoPrompt: {
      positivePrompt: '固定镜头',
      negativePrompt: '避免卡通',
      motionPrompt: '缓慢抬头',
      cameraPrompt: '平视',
      dialoguePrompt: '迟疑',
    },
    quality: { confidence: 0.9, missingInputs: [], needsHumanReview: true, warnings: [] },
    videoPromptText: '固定镜头',
  };
}

describe('SceneForge Remix source understanding rollup', () => {
  it('builds original understanding and source overview index from segment docs', () => {
    const segmentDocuments = [
      segmentDoc('segment-001', '铺垫'),
      segmentDoc('segment-002', '爆发'),
    ];
    const original = buildOriginalUnderstandingDocument({
      document: baseDoc,
      segmentDocuments,
      generatedAt: '2026-06-26T12:00:00.000Z',
      failedSegmentCount: 0,
      sourceOverviewPath: 'analysis/source_overview.json',
      segmentAnalysisPath: 'analysis/segment_analysis.json',
    });
    expect(original.quality.understoodSegmentCount).toBe(2);
    expect(original.overall.storyArc).toContain('铺垫');
    expect(original.segmentRefs).toHaveLength(2);

    const index = buildSourceOverviewIndexDocument({
      original,
      originalUnderstandingPath: 'analysis/original_understanding.json',
      inputHash: { segments: 'a', keyframes: 'b' },
      partialFailures: [],
    });
    expect(index.artifactKind).toBe('source_understanding_rollup');
    expect(index.originalUnderstandingPath).toBe('analysis/original_understanding.json');
    expect(index.quality.failedSegmentCount).toBe(0);
    expect(index.overall.highValueSegmentIds.length).toBeGreaterThan(0);
  });
});
