import { describe, expect, it } from 'vitest';
import {
  normalizeSegmentUnderstandingPayload,
  validateSegmentUnderstandingDocument,
} from '../electron/sceneforge/remix/remix-segment-understanding-schema';

const segment = {
  id: 'segment-001',
  sourceAssetId: 'source-001',
  index: 1,
  title: '片段 01',
  boundaryType: 'source_shot' as const,
  timeRange: { startMs: 0, endMs: 3000, durationMs: 3000 },
  sourceClipPath: 'clip.mp4',
  keyframes: [
    {
      id: 'kf-start',
      sourceAssetId: 'source-001',
      segmentId: 'segment-001',
      frameRole: 'start' as const,
      timestampMs: 0,
      imagePath: 'frames/start.jpg',
    },
  ],
};

describe('SceneForge Remix segment understanding schema', () => {
  it('normalizes LLM payload into balanced segment understanding document', () => {
    const doc = normalizeSegmentUnderstandingPayload(
      {
        visual: { mainAction: '人物抬头', shotSize: 'wrong' },
        camera: { shotSize: '中近景', movement: '固定镜头' },
        story: { plotFunction: '铺垫情绪' },
        videoPrompt: {
          positivePrompt: '固定中近景，人物缓慢抬头。',
          negativePrompt: '避免卡通风格。',
          motionPrompt: '先停顿再抬头。',
          cameraPrompt: '平视固定镜头。',
          dialoguePrompt: '语气迟疑。',
        },
      },
      {
        segment,
        sourceAssetId: 'source-001',
        transcript: {
          schema: 'sceneforge-remix-segment-transcript',
          version: 1,
          segmentId: 'segment-001',
          sourceAssetId: 'source-001',
          timeRange: { sourceStartMs: 0, sourceEndMs: 3000, durationMs: 3000 },
          source: 'aligned_from_source_transcript',
          sourceTranscriptPath: 'transcripts/source_transcript.json',
          utterances: [],
          plainText: '你好',
          quality: { hasSpeech: true, avgConfidence: 0.9, needsReview: false },
        },
        keyframes: segment.keyframes,
        generatedAt: '2026-06-26T12:00:00.000Z',
      },
    );

    expect(doc.visual.mainAction).toBe('人物抬头');
    expect(doc.camera.shotSize).toBe('中近景');
    expect(doc.videoPrompt.fullChinesePrompt).toContain('抬头');
    expect(validateSegmentUnderstandingDocument(doc)).toEqual([]);
  });
});
