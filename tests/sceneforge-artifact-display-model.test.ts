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