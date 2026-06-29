import { describe, expect, it } from 'vitest';
import { buildSegmentUserPrompt } from '../electron/sceneforge/remix/remix-understanding-service';

const baseSegment = {
  id: 'segment-002',
  sourceAssetId: 'source-001',
  index: 2,
  title: '片段 02',
  boundaryType: 'source_shot' as const,
  timeRange: { startMs: 3000, endMs: 6000, durationMs: 3000 },
  sourceClipPath: 'clip.mp4',
  keyframes: [],
};

describe('buildSegmentUserPrompt', () => {
  it('includes user rerun hint block when provided', () => {
    const prompt = buildSegmentUserPrompt({
      sourceAssetId: 'source-001',
      segment: baseSegment,
      transcript: null,
      neighborSummaries: {},
      understandingRerunHint: '强调人物特写',
    });
    expect(prompt).toContain('【用户补充建议】');
    expect(prompt).toContain('强调人物特写');
  });

  it('omits hint block when empty', () => {
    const prompt = buildSegmentUserPrompt({
      sourceAssetId: 'source-001',
      segment: baseSegment,
      transcript: null,
      neighborSummaries: {},
      understandingRerunHint: '   ',
    });
    expect(prompt).not.toContain('【用户补充建议】');
  });
});