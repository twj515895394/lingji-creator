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

  it('prefers prompt blocks over section blocks when both exist', () => {
    const html = renderToStaticMarkup(
      <ArtifactCopyPanel
        displayModel={{
          artifactId: 'video_prompts.video_prompt_pack_cn',
          displayModelVersion: 1,
          title: '视频提示词包',
          summary: '摘要',
          sections: [],
          copyBlocks: [
            { id: 'video_prompts.video_prompt_pack_cn.full', label: '复制全文', target: 'full', format: 'plain_text', text: 'full text' },
            { id: 'video_prompts.video_prompt_pack_cn.video_pack_cn', label: '中文视频提示词包', target: 'section', format: 'plain_text', text: 'section text' },
            { id: 'video_prompts.video_prompt_pack_cn.pack-01', label: '复制视频提示词 第01包', target: 'prompt', format: 'plain_text', text: 'prompt text' },
          ],
          warnings: [],
        }}
        rawContent="# raw"
        feedback={null}
        onCopyBlock={() => undefined}
        onCopyRaw={() => undefined}
      />,
    );

    expect(html).toContain('Copy Prompt');
    expect(html).toContain('复制视频提示词 第01包');
    expect(html).not.toContain('Copy Section');
    expect(html).not.toContain('中文视频提示词包');
  });

  it('shows publish section blocks alongside cover prompt blocks', () => {
    const html = renderToStaticMarkup(
      <ArtifactCopyPanel
        displayModel={{
          artifactId: 'publish.publish_notes',
          displayModelVersion: 1,
          title: '发布说明',
          summary: '摘要',
          sections: [],
          copyBlocks: [
            {
              id: 'publish.publish_notes.cover-landscape-4x3',
              label: '复制横版封面 4:3',
              target: 'prompt',
              format: 'plain_text',
              text: '横版封面正文',
            },
            {
              id: 'publish.publish_notes.cover-portrait-3x4',
              label: '复制竖版封面 3:4',
              target: 'prompt',
              format: 'plain_text',
              text: '竖版封面正文',
            },
            {
              id: 'publish.publish_notes.publish-title',
              label: '复制发布标题',
              target: 'section',
              format: 'plain_text',
              text: '标题正文',
            },
            {
              id: 'publish.publish_notes.publish-description',
              label: '复制发布简介',
              target: 'section',
              format: 'plain_text',
              text: '简介正文',
            },
            {
              id: 'publish.publish_notes.publish-tags',
              label: '复制发布标签',
              target: 'section',
              format: 'plain_text',
              text: '#标签',
            },
          ],
          warnings: [],
        }}
        rawContent="# raw"
        feedback={null}
        onCopyBlock={() => undefined}
        onCopyRaw={() => undefined}
      />,
    );

    expect(html).toContain('Copy Prompt');
    expect(html).toContain('Copy Section');
    expect(html).toContain('复制发布标题');
    expect(html).toContain('复制发布简介');
    expect(html).toContain('复制发布标签');
    expect(html).toContain('data-copy-block-id="publish.publish_notes.publish-title"');
  });
});
