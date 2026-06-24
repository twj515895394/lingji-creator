import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RemixModeEntryDialog } from '../src/sceneforge/remix/components/RemixModeEntryDialog';

describe('Remix mode entry dialog', () => {
  it('renders ingestion and creation choices', () => {
    const html = renderToStaticMarkup(
      <RemixModeEntryDialog open onOpenChange={() => undefined} onConfirm={() => undefined} />,
    );

    expect(html).toContain('进入 Remix Mode');
    expect(html).toContain('资产入库');
    expect(html).toContain('二次创作');
    expect(html).toContain('选择项目并进入');
  });
});
