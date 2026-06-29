import { describe, expect, it } from 'vitest';
import {
  mergeOnScreenSubtitlesFromFrameVision,
  resolvePrimarySpokenTextForVideoPrompt,
} from '../electron/sceneforge/remix/remix-on-screen-subtitle';

describe('on-screen subtitle authority', () => {
  it('prefers burned-in subtitles over ASR and effective transcript', () => {
    const resolved = resolvePrimarySpokenTextForVideoPrompt({
      onScreenSubtitles: ['画面字幕原文'],
      effectiveTranscript: '校对台词',
      asrTranscript: 'ASR错字',
    });
    expect(resolved.source).toBe('on_screen_subtitle');
    expect(resolved.text).toBe('画面字幕原文');
    expect(resolved.authorityNote).toContain('烧录字幕');
  });

  it('merges subtitles from frame vision frames', () => {
    const merged = mergeOnScreenSubtitlesFromFrameVision({
      schema: 'sceneforge-remix-segment-frame-vision',
      version: 1,
      sourceAssetId: 'a',
      segmentId: 's',
      generatedAt: '',
      inputHash: '',
      provider: null,
      model: null,
      frames: [
        {
          frameId: 'f1',
          frameRole: 'first',
          timestampMs: 0,
          imagePath: 'x',
          caption: '',
          onScreenSubtitles: ['第一句'],
          visibleCharacters: [],
          visibleActions: [],
          environment: '',
          props: [],
          lighting: '',
          composition: '',
          confidence: 1,
          warnings: [],
        },
        {
          frameId: 'f2',
          frameRole: 'last',
          timestampMs: 1000,
          imagePath: 'y',
          caption: '',
          onScreenSubtitles: ['第一句', '第二句'],
          visibleCharacters: [],
          visibleActions: [],
          environment: '',
          props: [],
          lighting: '',
          composition: '',
          confidence: 1,
          warnings: [],
        },
      ],
      segmentVisualSummary: '',
      onScreenSubtitles: [],
      quality: { needsHumanReview: false, warnings: [] },
    });
    expect(merged).toEqual(['第一句', '第二句']);
  });
});