import { describe, expect, it } from 'vitest';
import {
  buildTopicBriefMarkdown,
  createTopicBriefHash,
  createTopicIntentHash,
  isTopicBriefFormComplete,
  parseTopicBriefForm,
} from '../src/sceneforge/lib/topic-gate-form';

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

  it('round-trips multiline intent content', () => {
    const md = buildTopicBriefMarkdown({
      intent: '第一行：讲一个婚礼翻车桥段。\n第二行：强调新郎硬撑体面。\n第三行：整体偏夸张喜剧。',
      totalDurationSec: 60,
      segmentDurationSec: 8,
    });
    const parsed = parseTopicBriefForm(md);
    expect(parsed.intent).toBe(
      '第一行：讲一个婚礼翻车桥段。\n第二行：强调新郎硬撑体面。\n第三行：整体偏夸张喜剧。',
    );
  });

  it('creates a stable intent hash from normalized content', () => {
    expect(createTopicIntentHash('  同一个意图  ')).toBe(createTopicIntentHash('同一个意图'));
    expect(createTopicIntentHash('A\nB')).not.toBe(createTopicIntentHash('A\nC'));
  });

  it('creates a stable brief hash from intent and duration fields', () => {
    expect(
      createTopicBriefHash({ intent: '同一个选题', totalDurationSec: 60, segmentDurationSec: 8 }),
    ).toBe(createTopicBriefHash({ intent: ' 同一个选题 ', totalDurationSec: 60, segmentDurationSec: 8 }));
    expect(
      createTopicBriefHash({ intent: '同一个选题', totalDurationSec: 60, segmentDurationSec: 8 }),
    ).not.toBe(createTopicBriefHash({ intent: '同一个选题', totalDurationSec: 90, segmentDurationSec: 8 }));
  });

  it('recognizes whether the topic brief form is complete', () => {
    expect(
      isTopicBriefFormComplete({ intent: '完整选题', totalDurationSec: 60, segmentDurationSec: 8 }),
    ).toBe(true);
    expect(
      isTopicBriefFormComplete({ intent: '  ', totalDurationSec: 60, segmentDurationSec: 8 }),
    ).toBe(false);
    expect(
      isTopicBriefFormComplete({ intent: '完整选题', totalDurationSec: null, segmentDurationSec: 8 }),
    ).toBe(false);
  });
});
