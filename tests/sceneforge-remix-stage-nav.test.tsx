import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RemixStageNav } from '../src/sceneforge/remix/components/RemixStageNav';

describe('RemixStageNav', () => {
  it('renders only asset-processing stages in processing workspace', () => {
    const html = renderToStaticMarkup(
      <RemixStageNav scope="asset-processing" activeItemId="understanding" />,
    );

    expect(html).toContain('导入原片');
    expect(html).toContain('真实镜头切片');
    expect(html).toContain('原片理解');
    expect(html).toContain('资产标记');
    expect(html).toContain('保存入库');
    expect(html).not.toContain('创建二创版本');
    expect(html).not.toContain('Seedance 2.0 视频提示词');
  });

  it('renders only creation stages in creation workspace', () => {
    const html = renderToStaticMarkup(
      <RemixStageNav scope="creation" activeItemId="design" />,
    );

    expect(html).toContain('选择资产');
    expect(html).toContain('创建二创版本');
    expect(html).toContain('画面设计');
    expect(html).toContain('发布清单');
    expect(html).not.toContain('导入原片');
    expect(html).not.toContain('真实镜头切片');
  });
});
