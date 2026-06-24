import { describe, expect, it } from 'vitest';
import {
  assertPublishReady,
  assertSourceAssetStageReady,
} from '../electron/sceneforge/remix/remix-validators';

describe('SceneForge Remix validators', () => {
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

  it('allows approved stages and publish-ready source assets', () => {
    expect(() => assertSourceAssetStageReady(baseDocument, 'remix_segmentation')).not.toThrow();
    expect(() => assertPublishReady(baseDocument)).not.toThrow();
  });

  it('rejects publish when prerequisite stages are missing', () => {
    expect(() =>
      assertPublishReady({
        ...baseDocument,
        processingStageStates: {
          ...baseDocument.processingStageStates,
          remix_keyframes: 'not_started',
        },
      }),
    ).toThrow('Source Asset 阶段未完成');
  });
});
