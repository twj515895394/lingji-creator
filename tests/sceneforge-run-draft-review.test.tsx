import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SceneRunDraftReview } from '../src/sceneforge/components/stage-run/SceneRunDraftReview';

describe('SceneRunDraftReview', () => {
  it('renders artifacts in required-key order with character counts', () => {
    const html = renderToStaticMarkup(
      <SceneRunDraftReview
        artifacts={{ second: '第二项内容', first: '第一项' }}
        requiredKeys={['first', 'second']}
        submitting={false}
        onSubmit={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(html.indexOf('first')).toBeLessThan(html.indexOf('second'));
    expect(html).toContain('3 字符');
    expect(html).toContain('5 字符');
    expect(html).toContain('提交 2 个草案到产物库');
  });

  it('disables submit and names missing or blank required keys', () => {
    const html = renderToStaticMarkup(
      <SceneRunDraftReview
        artifacts={{ first: '有效', second: '  ' }}
        requiredKeys={['first', 'second', 'third']}
        submitting={false}
        onSubmit={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(html).toContain('缺少或为空：second、third');
    expect(html).toContain('disabled=""');
  });
});
