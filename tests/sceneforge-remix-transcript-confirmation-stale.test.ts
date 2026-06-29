import fs from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadRemixUnderstandingWorkbench } from '../electron/sceneforge/remix/remix-understanding-workbench';
import type { SourceAsset } from '../src/sceneforge/remix/types';

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(),
  },
}));

const asset: SourceAsset = {
  id: 'source-001',
  title: '测试素材',
  status: 'ready_for_review',
  createdAt: '2026-06-29T00:00:00.000Z',
  updatedAt: '2026-06-29T00:00:00.000Z',
  sourceVideoPath: 'source.mp4',
  sourceManifestPath: 'manifest.json',
  transcriptPath: 'analysis/source-transcript.json',
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
  segments: [
    {
      id: 'segment-001',
      sourceAssetId: 'source-001',
      index: 1,
      title: '片段 01',
      boundaryType: 'source_shot',
      timeRange: { startMs: 0, endMs: 10000, durationMs: 10000 },
      sourceClipPath: 'clips/segment-001.mp4',
      keyframes: [],
      analysisMarkdownPath: 'analysis/segment-001.md',
      analysisJsonPath: 'analysis/segment-001.json',
      segmentTranscriptJsonPath: 'analysis/segment-001-transcript.json',
      transcriptCorrectionPath: 'analysis/segment-001-correction.json',
    },
  ],
  variantCount: 0,
  tags: [],
  annotationNote: null,
  lastAnnotatedAt: null,
  annotatedBy: null,
  annotationSource: null,
};

describe('SceneForge Remix transcript confirmation stale closure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not mark overview stale when transcript is only confirmed without text change', async () => {
    vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
      const ref = String(filePath);
      if (ref.includes('source_overview.json')) {
        return JSON.stringify({
          originalUnderstandingPath: 'analysis/original_understanding.json',
        });
      }
      if (ref.includes('original_understanding.json')) {
        return JSON.stringify({
          schema: 'sceneforge-remix-original-understanding',
          version: 2,
          sourceAssetId: 'source-001',
          generatedAt: '2026-06-29T10:00:00.000Z',
          overall: {
            logline: '梗概',
            storySummaryShort: '短摘要',
            storyContent: '故事内容',
            eventChain: [],
            characterMap: [],
            mainConflict: '冲突',
            emotionCurve: '起伏',
            visualStyle: '写实',
            dialogueStyle: '平静',
          },
          remixStrategy: {
            suggestedTags: [],
            rewriteDirections: [],
          },
          quality: {
            rollupFallbackUsed: false,
            errors: [],
            warnings: [],
          },
        });
      }
      if (ref.includes('segment_analysis.json')) {
        return JSON.stringify([
          {
            segmentId: 'segment-001',
            status: 'ready',
          },
        ]);
      }
      if (ref.includes('segment-001-transcript.json')) {
        return JSON.stringify({
          schema: 'sceneforge-remix-segment-transcript',
          version: 2,
          segmentId: 'segment-001',
          sourceAssetId: 'source-001',
          timeRange: {
            sourceStartMs: 0,
            sourceEndMs: 10000,
            durationMs: 10000,
          },
          source: 'segment_audio_sensevoice_gguf',
          engine: 'funasr_sensevoice_gguf',
          mode: 'segment_audio_asr',
          timestampLevel: 'segment_range',
          utterances: [],
          plainText: '原样台词',
          quality: {
            hasSpeech: true,
            avgConfidence: null,
            needsReview: false,
            warnings: [],
          },
        });
      }
      if (ref.includes('segment-001-correction.json')) {
        return JSON.stringify({
          schema: 'sceneforge-remix-segment-transcript-correction',
          version: 1,
          sourceAssetId: 'source-001',
          segmentId: 'segment-001',
          generatedAt: '2026-06-29T09:59:00.000Z',
          updatedAt: '',
          inputRefs: {
            sourceTranscriptPath: null,
            segmentTranscriptPath: 'analysis/segment-001-transcript.json',
          },
          transcript: {
            asrText: '原样台词',
            correctedText: '',
            effectiveText: '原样台词',
            correctionStatus: 'confirmed',
            language: 'zh-CN',
            notes: [],
          },
          dialogueLines: [],
          quality: {
            needsHumanReview: false,
            warnings: [],
          },
        });
      }
      if (ref.includes('segment-001.json')) {
        return JSON.stringify({
          schema: 'sceneforge-remix-segment-understanding',
          version: 2,
          sourceAssetId: 'source-001',
          segmentId: 'segment-001',
          generatedAt: '2026-06-29T09:58:00.000Z',
          visual: {
            sceneSummary: '屋内对话',
            mainAction: '说话',
            characters: [],
            environmentDetails: '',
            lighting: '',
            colorTone: '',
          },
          camera: {
            shotSize: '中景',
            movement: '固定',
          },
          story: {
            plotFunction: '推进',
          },
          remix: {
            keepElements: [],
            replaceableElements: [],
            rewriteIdeas: [],
            riskNotes: [],
          },
          videoPrompt: {
            fullChinesePrompt: '测试 prompt',
            negativePrompt: '',
          },
          quality: {
            confidence: 0.9,
            needsHumanReview: false,
            warnings: [],
          },
        });
      }
      throw new Error(`unexpected readFile: ${ref}`);
    });

    const snapshot = await loadRemixUnderstandingWorkbench('/mock-project', asset);
    expect(snapshot.isStale).toBe(false);
    expect(snapshot.segments[0]?.isStale).toBe(false);
  });
});
