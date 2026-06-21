import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { buildSceneArtifactDisplayModel } from '../electron/sceneforge/artifacts/scene-artifact-display-model';
import {
  readSceneArtifact,
  writeSceneArtifact,
  type SceneArtifact,
} from '../electron/sceneforge/artifacts/scene-artifact-store';

let tmpDir: string;

function coreArtifact(partial: Partial<SceneArtifact> & Pick<SceneArtifact, 'id' | 'stage' | 'title'>): SceneArtifact {
  return {
    kind: 'final',
    role: 'core_generation_asset',
    path: `sceneforge/stages/${partial.stage}/outputs/x.md`,
    coreAsset: true,
    readableByDownstream: true,
    usedBy: [],
    viewModes: ['preview', 'structure', 'trace', 'raw'],
    createdAt: '2026-06-17T00:00:00.000Z',
    displayModelVersion: 1,
    copyTargets: ['full', 'section', 'prompt'],
    primaryCopyTarget: 'full',
    ...partial,
  };
}

describe('SceneForge artifact display model', () => {
  it('parses design_prompts into character, scene, prop and master_reference blocks', () => {
    const artifact = coreArtifact({
      id: 'design.design_prompts',
      stage: 'design',
      title: '设定图提示词',
    });
    const content = `# 设定图提示词

## 角色提示词
主角 A，圆脸。

## 场景提示词
室内厨房。

## 道具提示词
木勺。

## 总参考图提示词
全身参考。`;

    const model = buildSceneArtifactDisplayModel(artifact, content);
    expect(model?.displayModelVersion).toBe(1);
    expect(model?.copyBlocks.map((b) => b.id)).toEqual(
      expect.arrayContaining([
        'design.design_prompts.full',
        'design.design_prompts.character',
        'design.design_prompts.scene',
        'design.design_prompts.prop',
        'design.design_prompts.master_reference',
      ]),
    );
    const character = model?.copyBlocks.find((b) => b.id.endsWith('.character'));
    expect(character?.text).toContain('主角 A');
    expect(character?.format).toBe('plain_text');
  });

  it('warns on missing design sections but keeps full copy fallback', () => {
    const artifact = coreArtifact({
      id: 'design.design_prompts',
      stage: 'design',
      title: '设定图提示词',
    });
    const model = buildSceneArtifactDisplayModel(artifact, '# 只有标题\n\n无章节。');
    expect(model?.warnings.some((w) => w.code === 'SCENE_DISPLAY_MISSING_SECTIONS')).toBe(true);
    expect(model?.copyBlocks.find((b) => b.target === 'full')?.text).toContain('只有标题');
  });

  it('parses storyboard pack with control/style/master via separate artifacts', () => {
    const control = coreArtifact({
      id: 'storyboard.control_board_prompts',
      stage: 'storyboard',
      title: '控制板',
    });
    const model = buildSceneArtifactDisplayModel(control, '# 控制板\n\n镜头 A。');
    expect(model?.copyBlocks.some((b) => b.id.endsWith('.control_board'))).toBe(true);
  });

  it('keeps storyboard control board body in section copy blocks', () => {
    const control = coreArtifact({
      id: 'storyboard.control_board_prompts',
      stage: 'storyboard',
      title: '控制板提示词',
    });
    const model = buildSceneArtifactDisplayModel(
      control,
      `<copy-block type="storyboard-pack" id="pack-01" label="控制板提示词 第01包">
## Pack 1: 控制板提示词

## Control-Oriented Storyboard Board
画面区逐格描述镜头、动作、构图和红蓝箭头标注；控制区明确 Beat Line、Camera Path、Action Path、Continuity Rules。
</copy-block>`,
    );
    const block = model?.copyBlocks.find((b) => b.id.endsWith('.pack-01'));
    expect(block?.text).toContain('Control-Oriented Storyboard Board');
    expect(block?.text).toContain('画面区逐格描述镜头');
  });

  it('parses storyboard pack overview and segment prompts', () => {
    const artifact = coreArtifact({
      id: 'storyboard.storyboard_prompt_pack',
      stage: 'storyboard',
      title: '故事板包',
    });
    const content = `# Pack

## Segment 01
Shot prompt one.

## Segment 02
Shot prompt two.`;
    const model = buildSceneArtifactDisplayModel(artifact, content);
    expect(model?.copyBlocks.some((b) => b.id.includes('segment-01'))).toBe(true);
    expect(model?.warnings.some((w) => w.code === 'SCENE_DISPLAY_MISSING_SEGMENTS')).toBe(false);
  });

  it('prefers explicit storyboard copy-blocks over legacy segment parsing', () => {
    const artifact = coreArtifact({
      id: 'storyboard.storyboard_prompt_pack',
      stage: 'storyboard',
      title: '故事板包',
    });
    const content = `# Pack

<copy-block type="storyboard-pack" id="pack-01" label="故事板提示词 第01包">
第01包正文
</copy-block>

## Segment 01
不应再被识别成默认复制块。`;
    const model = buildSceneArtifactDisplayModel(artifact, content);
    expect(model?.copyBlocks.some((b) => b.id === 'storyboard.storyboard_prompt_pack.pack-01')).toBe(true);
    expect(model?.copyBlocks.some((b) => b.id.includes('segment-01'))).toBe(false);
    expect(model?.copyBlocks.find((b) => b.id === 'storyboard.storyboard_prompt_pack.pack-01')?.label).toBe(
      '复制故事板提示词 第01包',
    );
  });

  it('parses video cn pack and optional empty en with warning', () => {
    const cn = coreArtifact({
      id: 'video_prompts.video_prompt_pack_cn',
      stage: 'video_prompts',
      title: '中文包',
    });
    const cnModel = buildSceneArtifactDisplayModel(
      cn,
      '# 中文\n\n## Segment 01\nAudio: 旁白\n画面。',
    );
    expect(cnModel?.copyBlocks.some((b) => b.id.endsWith('.video_pack_cn'))).toBe(true);

    const en = coreArtifact({
      id: 'video_prompts.video_prompt_pack_en',
      stage: 'video_prompts',
      title: '英文包',
    });
    const enModel = buildSceneArtifactDisplayModel(en, '   ');
    expect(enModel?.warnings.some((w) => w.code === 'SCENE_DISPLAY_OPTIONAL_EN_MISSING')).toBe(true);
    expect(enModel?.copyBlocks.find((b) => b.target === 'full')).toBeTruthy();
  });

  it('prefers explicit video copy-blocks and falls back safely when markup is broken', () => {
    const cn = coreArtifact({
      id: 'video_prompts.video_prompt_pack_cn',
      stage: 'video_prompts',
      title: '中文包',
    });
    const explicitModel = buildSceneArtifactDisplayModel(
      cn,
      `# 中文

<copy-block type="video-pack" id="pack-01" label="视频提示词 第01包">
视频包正文
</copy-block>

## Segment 01
旧结构正文。`,
    );
    expect(explicitModel?.copyBlocks.some((b) => b.id === 'video_prompts.video_prompt_pack_cn.pack-01')).toBe(true);
    expect(explicitModel?.copyBlocks.some((b) => b.id.includes('segment-01'))).toBe(false);

    const fallbackModel = buildSceneArtifactDisplayModel(
      cn,
      `# 中文

<copy-block type="video-pack" id="pack-01" label="视频提示词 第01包">
损坏标签

## Segment 01
旧结构正文。`,
    );
    expect(fallbackModel?.warnings.map((w) => w.code)).toContain('SCENE_COPY_BLOCK_UNBALANCED');
    expect(fallbackModel?.copyBlocks.some((b) => b.id.includes('segment-01'))).toBe(true);
  });

  it('returns null for non-core artifacts', () => {
    const draft: SceneArtifact = {
      ...coreArtifact({ id: 'design.design_prompts', stage: 'design', title: 'x' }),
      kind: 'draft',
    };
    expect(buildSceneArtifactDisplayModel(draft, '# x')).toBeNull();
  });
});

describe('SceneForge artifact store display integration', () => {
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-display-'));
    await createSceneForgeProject(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('registers copy metadata on core final write and returns displayModel on read', async () => {
    const written = await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'design',
      artifactKey: 'character_prompts',
      kind: 'final',
      title: '角色提示词',
      content: '# 角色\n\n主角描述。',
      role: 'core_generation_asset',
      coreAsset: true,
      readableByDownstream: true,
    });

    expect(written.displayModelVersion).toBe(1);
    expect(written.copyTargets).toEqual(['full', 'section', 'prompt']);
    expect(written.primaryCopyTarget).toBe('full');

    const read = await readSceneArtifact(tmpDir, written.id);
    expect(read.content).toContain('主角描述');
    expect(read.displayModel?.artifactId).toBe('design.character_prompts');
    expect(read.displayModel?.copyBlocks.length).toBeGreaterThan(0);
  });

  it('returns null displayModel for support artifacts', async () => {
    const written = await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'script',
      artifactKey: 'script_draft',
      kind: 'final',
      title: '脚本',
      content: '# script',
      role: 'support_direction_asset',
      coreAsset: false,
      readableByDownstream: false,
    });
    const read = await readSceneArtifact(tmpDir, written.id);
    expect(read.displayModel).toBeNull();
  });
});
