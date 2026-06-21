import { describe, expect, it } from 'vitest';
import { parseSceneCopyBlocks } from '../src/sceneforge/lib/scene-copy-blocks';

describe('parseSceneCopyBlocks', () => {
  it('parses explicit copy-blocks with stable metadata', () => {
    const parsed = parseSceneCopyBlocks(`
<copy-block type="video-pack" id="pack-01" label="视频提示词 第01包">
包一正文
</copy-block>

<copy-block type="video-pack" id="pack-02" label="视频提示词 第02包">
包二正文
</copy-block>`);

    expect(parsed.warnings).toEqual([]);
    expect(parsed.blocks).toEqual([
      {
        type: 'video-pack',
        id: 'pack-01',
        label: '视频提示词 第01包',
        body: '包一正文',
      },
      {
        type: 'video-pack',
        id: 'pack-02',
        label: '视频提示词 第02包',
        body: '包二正文',
      },
    ]);
  });

  it('warns and ignores blocks missing required metadata', () => {
    const parsed = parseSceneCopyBlocks(`
<copy-block type="video-pack" id="pack-01">
包一正文
</copy-block>`);

    expect(parsed.blocks).toEqual([]);
    expect(parsed.warnings.map((warning) => warning.code)).toContain('SCENE_COPY_BLOCK_INVALID');
    expect(parsed.warnings.map((warning) => warning.code)).toContain('SCENE_COPY_BLOCK_PARSE_FAILED');
  });

  it('warns when copy-block tags are unbalanced', () => {
    const parsed = parseSceneCopyBlocks(`
<copy-block type="video-pack" id="pack-01" label="视频提示词 第01包">
只有开标签`);

    expect(parsed.blocks).toEqual([]);
    expect(parsed.warnings.map((warning) => warning.code)).toContain('SCENE_COPY_BLOCK_UNBALANCED');
  });
});
