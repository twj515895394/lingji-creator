import { describe, expect, it } from 'vitest';
import { buildTopicBriefMarkdown, parseTopicBriefForm } from '../src/sceneforge/lib/topic-gate-form';

describe('topic-gate-form', () => {
  it('round-trips duration fields', () => {
    const md = buildTopicBriefMarkdown({
      intent: '测试选题',
      totalDurationSec: 90,
      segmentDurationSec: 10,
    });
    expect(md).toMatch(/total_duration_sec: 90/);
    expect(md).toMatch(/segment_duration_sec: 10/);
    const parsed = parseTopicBriefForm(md);
    expect(parsed.intent).toBe('测试选题');
    expect(parsed.totalDurationSec).toBe(90);
    expect(parsed.segmentDurationSec).toBe(10);
  });
});