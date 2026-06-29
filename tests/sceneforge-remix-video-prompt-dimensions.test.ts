import { describe, expect, it } from 'vitest';
import {
  buildVideoPromptDimensionsFromChinesePrompt,
  normalizeSegmentUnderstandingPayload,
} from '../electron/sceneforge/remix/remix-segment-understanding-schema';

const segment = {
  id: 'seg-1',
  sourceAssetId: 'src-1',
  index: 0,
  title: '片段 1',
  boundaryType: 'source_shot' as const,
  timeRange: { startMs: 0, endMs: 3000, durationMs: 3000 },
  sourceClipPath: 'clip.mp4',
  keyframes: [],
};

describe('video prompt dimensions and dialogue', () => {
  it('builds 14 dimensions from chinese prompt fields', () => {
    const dims = buildVideoPromptDimensionsFromChinesePrompt({
      language: 'zh-CN',
      fullChinesePrompt: '完整',
      subjectPrompt: '男子',
      scenePrompt: '街头',
      actionPrompt: '行走',
      performancePrompt: '口型自然',
      cameraPrompt: '中景',
      lightingPrompt: '日光',
      colorPrompt: '暖色',
      emotionPrompt: '紧张',
      rhythmPrompt: '平稳',
      dialoguePrompt: '台词',
      soundPrompt: '环境声',
      stylePrompt: '写实',
      continuityPrompt: '连贯',
      remixControlPrompt: '保留动作',
      negativePrompt: '抖动',
    });
    expect(dims.length).toBeGreaterThanOrEqual(14);
    expect(dims.find((d) => d.key === 'dialogue')?.text).toContain('台词');
  });

  it('injects speaking and corrected transcript into dialoguePrompt', () => {
    const doc = normalizeSegmentUnderstandingPayload(
      { videoPrompt: { subjectPrompt: '女主' } },
      {
        segment,
        sourceAssetId: 'src-1',
        transcript: null,
        effectiveTranscriptText: '这是校对后的台词',
        asrTranscriptText: '这是ASR错字',
        keyframes: [],
        generatedAt: new Date().toISOString(),
      },
    );
    expect(doc.videoPrompt.dialoguePrompt).toContain('说话');
    expect(doc.videoPrompt.dialoguePrompt).toContain('这是校对后的台词');
    expect(doc.videoPrompt.performancePrompt).toContain('口型');
    expect(doc.videoPrompt.fullChinesePrompt).toContain('这是校对后的台词');
    const dims = buildVideoPromptDimensionsFromChinesePrompt(doc.videoPrompt);
    expect(dims.some((d) => d.key === 'dialogue' && d.text.includes('校对后的台词'))).toBe(true);
  });

  it('uses on-screen subtitles over effective transcript in dialoguePrompt', () => {
    const doc = normalizeSegmentUnderstandingPayload(
      { videoPrompt: { subjectPrompt: '男主' } },
      {
        segment,
        sourceAssetId: 'src-1',
        transcript: null,
        effectiveTranscriptText: 'ASR或校对台词',
        asrTranscriptText: 'ASR原文',
        frameVision: {
          schema: 'sceneforge-remix-segment-frame-vision',
          version: 1,
          sourceAssetId: 'src-1',
          segmentId: 'seg-1',
          generatedAt: '',
          inputHash: '',
          provider: null,
          model: null,
          frames: [],
          segmentVisualSummary: '',
          onScreenSubtitles: ['烧录字幕为准'],
          quality: { needsHumanReview: false, warnings: [] },
        },
        keyframes: [],
        generatedAt: new Date().toISOString(),
      },
    );
    expect(doc.videoPrompt.dialoguePrompt).toContain('烧录字幕');
    expect(doc.videoPrompt.dialoguePrompt).toContain('烧录字幕为准');
    expect(doc.videoPrompt.fullChinesePrompt).toContain('烧录字幕为准');
  });
});