import { describe, expect, it } from 'vitest';
import { alignUtterancesToSegments, assignUtteranceToSegment } from '../electron/sceneforge/remix/remix-transcript-aligner';

const segments = [
  {
    id: 'segment-001',
    sourceAssetId: 'source-001',
    index: 1,
    title: '片段 01',
    boundaryType: 'source_shot' as const,
    timeRange: { startMs: 0, endMs: 5000, durationMs: 5000 },
    sourceClipPath: 'clip-1.mp4',
    keyframes: [],
  },
  {
    id: 'segment-002',
    sourceAssetId: 'source-001',
    index: 2,
    title: '片段 02',
    boundaryType: 'source_shot' as const,
    timeRange: { startMs: 5000, endMs: 10000, durationMs: 5000 },
    sourceClipPath: 'clip-2.mp4',
    keyframes: [],
  },
];

describe('SceneForge Remix transcript aligner', () => {
  it('assigns utterances by center point across segment boundaries', () => {
    expect(
      assignUtteranceToSegment(
        { id: 'utt_001', text: '前段', startMs: 1200, endMs: 3800 },
        segments,
      ),
    ).toBe('segment-001');
    expect(
      assignUtteranceToSegment(
        { id: 'utt_002', text: '后段', startMs: 5200, endMs: 7800 },
        segments,
      ),
    ).toBe('segment-002');
  });

  it('builds per-segment transcript plainText from aligned utterances', () => {
    const aligned = alignUtterancesToSegments(
      'source-001',
      'transcripts/source_transcript.json',
      [
        { id: 'utt_001', text: '前段台词', startMs: 1200, endMs: 3800 },
        { id: 'utt_002', text: '后段台词', startMs: 5200, endMs: 7800 },
      ],
      segments,
    );

    expect(aligned[0].plainText).toBe('前段台词');
    expect(aligned[1].plainText).toBe('后段台词');
    expect(aligned[0].utterances[0].relativeStartMs).toBe(1200);
  });
});
