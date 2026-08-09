import { describe, expect, it, vi } from 'vitest';
import { createTopicIntentDirectLlmChecker } from '../electron/sceneforge/topic-intent-check';
import { buildTopicBriefMarkdown, createTopicBriefHash } from '../src/sceneforge/lib/topic-gate-form';

const mockSettings = {
  llmProviders: [
    {
      id: 'provider-1',
      name: 'Test Provider',
      enabled: true,
      type: 'openai_compatible',
      apiKey: 'test-key',
      baseUrl: 'https://example.com',
      models: ['test-model'],
    },
  ],
  defaultLlmProviderId: 'provider-1',
  defaultLlmModel: 'test-model',
} as const;

describe('SceneForge topic intent checker', () => {
  it('returns missing dimensions and suggestions when intent is too thin', async () => {
    const generateText = vi.fn().mockResolvedValue(
      JSON.stringify({
        status: 'needs_more',
        summary: '当前描述太薄，继续分析容易导致后续产物跑偏。',
        missingDimensions: [
          {
            id: 'narrative_hook',
            label: '关键动作推进',
            reason: '没有说明视频到底会发生什么、如何展开。',
          },
        ],
        suggestions: [
          {
            dimensionId: 'narrative_hook',
            tips: ['补一句主要动作过程，例如谁在做什么、冲突怎么升级、最后停在什么结果上。'],
          },
        ],
      }),
    );
    const checker = createTopicIntentDirectLlmChecker({
      loadSettings: async () => mockSettings as never,
      generateText,
    });

    const topicBriefMarkdown = buildTopicBriefMarkdown({
      intent: '做一个有意思的视频',
      totalDurationSec: 60,
      segmentDurationSec: 8,
    });
    const result = await checker.check({ topicBriefMarkdown });

    expect(result.artifactKey).toBe('intent_check');
    expect(result.content).toContain(
      `intent_hash: ${createTopicBriefHash({ intent: '做一个有意思的视频', totalDurationSec: 60, segmentDurationSec: 8 })}`,
    );
    expect(result.content).toContain('narrative_hook');
    expect(result.content).toContain('主要动作过程');
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(generateText.mock.calls[0]?.[2]).toContain('成片总时长：60 秒');
    expect(generateText.mock.calls[0]?.[2]).toContain('每段时长：8 秒');
    expect(generateText.mock.calls[0]?.[2]).toContain('时间或场景、人物、发生的事情、时长约束');
    expect(generateText.mock.calls[0]?.[2]).toContain('不要因为没有写明情感方向、中心表达、视觉风格');
  });

  it('allows pass with optional enrichment suggestions', async () => {
    const generateText = vi.fn().mockResolvedValue(
      JSON.stringify({
        status: 'pass',
        summary: '当前描述已经具备人物、场景、事件和时长约束，可以继续进入后续分析。',
        missingDimensions: [],
        suggestions: [
          {
            dimensionId: 'expression_goal',
            tips: ['可以补一句想让观众感到热血、轻松还是悬念，这能帮助后续故事节奏更稳。'],
          },
          {
            dimensionId: 'theme_expression',
            tips: ['如果你想借这个故事表达一个记忆点，也可以顺手补一句，但这不是当前必填。'],
          },
        ],
      }),
    );
    const checker = createTopicIntentDirectLlmChecker({
      loadSettings: async () => mockSettings as never,
      generateText,
    });

    const topicBriefMarkdown = buildTopicBriefMarkdown({
      intent: '两个年轻人在傍晚的街头球场斗牛，一攻一防，最后进攻者晃倒对手后完成扣篮，全场欢呼。',
      totalDurationSec: 20,
      segmentDurationSec: 5,
    });
    const result = await checker.check({ topicBriefMarkdown });

    expect(result.content).toContain('status: pass');
    expect(result.content).toContain('expression_goal');
    expect(result.content).toContain('theme_expression');
    expect(result.content).toContain('这不是当前必填');
  });
});
