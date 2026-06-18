import { describe, expect, it } from 'vitest';
import {
  buildAdaptationSelectionMarkdown,
  buildGateConfirmationsMarkdown,
  parseAdaptationDirectionsFromMarkdown,
  parseGateHITLFromArtifacts,
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
});