import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArtifactCopyPanel } from '../src/sceneforge/components/artifacts/ArtifactCopyPanel';
import { copyPlainTextToClipboard } from '../src/sceneforge/lib/scene-copy';

describe('copyPlainTextToClipboard', () => {
  it('writes text via navigator.clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await copyPlainTextToClipboard('hello prompt');
    expect(writeText).toHaveBeenCalledWith('hello prompt');
    vi.unstubAllGlobals();
  });
});

describe('ArtifactCopyPanel', () => {
  it('renders copy blocks by target group without empty buttons', () => {
    const html = renderToStaticMarkup(
      <ArtifactCopyPanel
        displayModel={{
          artifactId: 'design.design_prompts',
          displayModelVersion: 1,
          title: '设定图',
          summary: '摘要',
          sections: [],
          copyBlocks: [
            { id: 'design.design_prompts.full', label: '复制全文', target: 'full', format: 'plain_text', text: 'full text' },
            { id: 'design.design_prompts.character', label: '角色', target: 'section', format: 'plain_text', text: 'char' },
            { id: 'design.design_prompts.empty', label: '空', target: 'section', format: 'plain_text', text: '   ' },
          ],
          warnings: [],
        }}
        rawContent="# raw"
        feedback={null}
        onCopyBlock={() => undefined}
        onCopyRaw={() => undefined}
      />,
    );
    expect(html).toContain('Copy Full');
    expect(html).toContain('Copy Section');
    expect(html).toContain('data-testid="scene-copy-block"');
    expect(html).not.toContain('空');
  });
});