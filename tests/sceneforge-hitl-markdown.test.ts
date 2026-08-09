import { describe, expect, it } from 'vitest';
import {
  buildAdaptationSelectionMarkdown,
  buildGateConfirmationsMarkdown,
  buildTopicIntentCheckMarkdown,
  buildTopicAnalysisMarkdown,
  parseAdaptationDirectionsFromMarkdown,
  parseGateScoresFromMarkdown,
  parseGateHITLFromArtifacts,
  parseTopicIntentCheckFromMarkdown,
  parseTopicAnalysisFromMarkdown,
  isTopicGateStyleBlockingDownstream,
} from '../src/sceneforge/lib/scene-hitl-markdown';

describe('scene-hitl-markdown', () => {
  it('parses adaptation direction bullets', () => {
    const md = `# 源材料

## 改编方向
- id: a1 | title: 悬疑重构 | summary: 保留核心诡计
- 温情向：弱化冲突
`;
    const dirs = parseAdaptationDirectionsFromMarkdown(md);
    expect(dirs).toHaveLength(2);
    expect(dirs[0].id).toBe('a1');
    expect(dirs[0].title).toBe('悬疑重构');
    expect(dirs[1].title).toBe('温情向');
  });

  it('builds adaptation selection artifact', () => {
    const out = buildAdaptationSelectionMarkdown({ id: 'a1', title: '悬疑重构' });
    expect(out).toMatch(/status: selected/);
    expect(out).toMatch(/selected_id: a1/);
  });

  it('parses gate style and confirmations', () => {
    const brief = `## 决策
go

## 风格候选
- id: pixar_like | label: 皮克斯 | family: animation
`;
    const conf = buildGateConfirmationsMarkdown({
      decision: 'go',
      styleId: 'pixar_like',
      styleLabel: '皮克斯',
      styleFamily: 'animation',
    });
    const state = parseGateHITLFromArtifacts(brief, conf);
    expect(state.decision).toBe('go');
    expect(state.styleConfirmed).toBe(true);
    expect(state.selectedStyleId).toBe('pixar_like');
    expect(isTopicGateStyleBlockingDownstream(conf, brief)).toBe(false);
  });

  it('blocks downstream when style not confirmed', () => {
    expect(isTopicGateStyleBlockingDownstream(null, '# brief')).toBe(true);
  });

  it('parses gate score items with Chinese and English colons', () => {
    const scores = parseGateScoresFromMarkdown(`# 选题简报

## 评分
- 传播潜力: 8/10
- 制作可行性：高
-
- 无法拆分

## 决策
go
`);

    expect(scores).toEqual({
      items: [
        { label: '传播潜力', value: '8/10' },
        { label: '制作可行性', value: '高' },
      ],
      rawSection: '- 传播潜力: 8/10\n- 制作可行性：高\n-\n- 无法拆分',
    });
  });

  it('returns an honest empty score state when the section is absent', () => {
    expect(parseGateScoresFromMarkdown('# 选题简报\n\n## 决策\ngo\n')).toEqual({
      items: [],
      rawSection: null,
    });
  });

  it('keeps legacy style options without a family', () => {
    const state = parseGateHITLFromArtifacts(
      '## 风格候选\n- id: legacy | label: 旧项目风格\n',
      null,
    );

    expect(state.styleOptions).toEqual([
      { id: 'legacy', label: '旧项目风格', family: undefined },
    ]);
  });

  it('builds and parses topic analysis markdown', () => {
    const markdown = buildTopicAnalysisMarkdown({
      summary: '热点强、制作可控，建议继续推进。',
      totalScore: '82',
      decisionSuggestion: 'go',
      productionLevelSuggestion: 'focus',
      scores: [
        { label: '传播潜力', value: '82/100' },
        { label: '制作可行性', value: '高' },
      ],
      styleCandidates: [
        { id: 'pixar_like', label: '动画·皮克斯感', family: 'animation' },
        { id: 'documentary', label: '纪实·解说', family: 'documentary' },
      ],
    });

    expect(parseTopicAnalysisFromMarkdown(markdown)).toEqual({
      summary: '热点强、制作可控，建议继续推进。',
      totalScore: '82',
      decisionSuggestion: 'go',
      productionLevelSuggestion: 'focus',
      scoreState: {
        items: [
          { label: '传播潜力', value: '82/100' },
          { label: '制作可行性', value: '高' },
        ],
        rawSection: '- 传播潜力: 82/100\n- 制作可行性: 高',
      },
      styleCandidates: [
        { id: 'pixar_like', label: '动画·皮克斯感', family: 'animation' },
        { id: 'documentary', label: '纪实·解说', family: 'documentary' },
      ],
    });
  });

  it('returns an honest empty topic analysis state for legacy projects', () => {
    expect(parseTopicAnalysisFromMarkdown('# 选题分析\n\n暂无')).toEqual({
      summary: null,
      totalScore: null,
      decisionSuggestion: null,
      productionLevelSuggestion: null,
      scoreState: { items: [], rawSection: null },
      styleCandidates: [],
    });
  });

  it('builds and parses topic intent check markdown with suggestions', () => {
    const markdown = buildTopicIntentCheckMarkdown({
      status: 'needs_more',
      summary: '当前描述还不足以稳定推导整段视频方向。',
      intentHash: 'abc123',
      missingDimensions: [
        {
          id: 'narrative_hook',
          label: '改编角度 / 叙事抓手',
          reason: '没有说明从哪个冲突或切口切入',
        },
        {
          id: 'style_direction',
          label: '目标画面或风格倾向',
          reason: '没有说明画面偏动画、实拍还是纪实',
        },
      ],
      suggestions: [
        {
          dimensionId: 'narrative_hook',
          tips: [
            '你最想放大的冲突、反差或情绪点是什么？',
            '如果只能保留一个记忆点，希望观众记住什么？',
          ],
        },
        {
          dimensionId: 'style_direction',
          tips: ['更偏动画、实拍、纪实、夸张喜剧还是治愈感？'],
        },
      ],
    });

    expect(parseTopicIntentCheckFromMarkdown(markdown)).toEqual({
      status: 'needs_more',
      summary: '当前描述还不足以稳定推导整段视频方向。',
      intentHash: 'abc123',
      missingDimensions: [
        {
          id: 'narrative_hook',
          label: '改编角度 / 叙事抓手',
          reason: '没有说明从哪个冲突或切口切入',
        },
        {
          id: 'style_direction',
          label: '目标画面或风格倾向',
          reason: '没有说明画面偏动画、实拍还是纪实',
        },
      ],
      suggestions: [
        {
          dimensionId: 'narrative_hook',
          tips: [
            '你最想放大的冲突、反差或情绪点是什么？',
            '如果只能保留一个记忆点，希望观众记住什么？',
          ],
        },
        {
          dimensionId: 'style_direction',
          tips: ['更偏动画、实拍、纪实、夸张喜剧还是治愈感？'],
        },
      ],
    });
  });

  it('returns an honest empty topic intent check state for legacy projects', () => {
    expect(parseTopicIntentCheckFromMarkdown('# 创作意图检查\n\n暂无')).toEqual({
      status: 'unknown',
      summary: null,
      intentHash: null,
      missingDimensions: [],
      suggestions: [],
    });
  });

  it('parses pass-state topic intent suggestions as optional advice', () => {
    const markdown = buildTopicIntentCheckMarkdown({
      status: 'pass',
      summary: '当前创作意图已经足够明确，可以继续。',
      intentHash: 'pass123',
      missingDimensions: [],
      suggestions: [
        {
          dimensionId: 'expression_goal',
          tips: ['可以顺手补一句想让观众感到热血还是轻松，让后续节奏更稳。'],
        },
      ],
    });

    expect(parseTopicIntentCheckFromMarkdown(markdown)).toEqual({
      status: 'pass',
      summary: '当前创作意图已经足够明确，可以继续。',
      intentHash: 'pass123',
      missingDimensions: [],
      suggestions: [
        {
          dimensionId: 'expression_goal',
          tips: ['可以顺手补一句想让观众感到热血还是轻松，让后续节奏更稳。'],
        },
      ],
    });
  });
});
