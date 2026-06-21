import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { writeSceneArtifact } from '../electron/sceneforge/artifacts/scene-artifact-store';
import {
  readSceneStageHandoff,
  sceneHandoffRelativePath,
  writeSceneStageHandoff,
} from '../electron/sceneforge/pipeline/scene-handoff-writer';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { SceneForgeService } from '../electron/sceneforge/service';

let tmpDir: string;
let service: SceneForgeService;

const completeDesignDraft = {
  design_prompts: `## 视觉语言
市井纪实感与轻喜剧压迫感并存，角色、空间、道具统一在同一材质和光照系统内。

## 角色设计
角色数量：2。主角为时髦老奶奶，配角为摊位对手，禁止擅自增删角色。

## 场景设计
主街口摊位、过道、收银台和后侧货架形成清晰前中后景。

## 道具设计
电子秤、零钱夹、塑料袋、折叠凳作为关键道具。

## 空间连续性
固定街口摊位朝向、出入口逻辑、角色左右站位与镜头轴线。

## 道具状态机
电子秤从待机到称重，零钱夹从闭合到打开，塑料袋从堆叠到拎起。

## 场面调度
老奶奶默认占据画面左前区，对手占据右中区，观众通道保持后景通行。

## 节奏契约
segment_duration_seconds: 10
段长：10秒
default_pacing_profile: balanced

## 分段节奏配置
- Segment 01: balanced，先建立再施压。
- Segment 02: lyrical，留出反应与收束余量。

## 镜头密度期望
- 5秒：lyrical 3-5，balanced 4-6，kinetic 5-8
- 6秒：lyrical 4-6，balanced 5-7，kinetic 6-9
- 8秒：lyrical 5-7，balanced 6-8，kinetic 7-10
- 10秒：lyrical 6-8，balanced 6-10，kinetic 7-12
- 15秒：lyrical 8-11，balanced 10-13，kinetic 12-16

## 边界规则
- shots_must_not_cross_segment_boundary: true
- 镜头不得跨段。`,
  character_prompts: `# 角色说明书

## 多视角
正面、3/4、侧面、背面。

## 轮廓剪影
轮廓稳定，街头掌控者姿态明确。

## 表情系统
平静、自信、审视、轻蔑、得意、发火。

## 微表情
挑眉、抿嘴、眼角轻抬。

## 动作姿态
插兜站立、抬手示意、回头审视、快步逼近。

## 关键道具交互
与零钱夹和电子秤关系明确。

## 细节区
面部年龄纹理、布料磨损、鞋面旧痕。

## 比例对照
与摊位和电子秤比例对照。

## 边界约束
中文主导，非海报。`,
  scene_prompts: `# 全场景资产总参考图提示词

## 主场景空间布局
街口摊位位于前景左侧，收银台与电子秤在中景，后侧为货架与过道。

## 角色默认站位
角色数量为 2；老奶奶站在左前区，对手站在右中区。

## 核心道具位置
电子秤位于收银台中央，零钱夹贴近老奶奶手侧。

## 道具状态矩阵
电子秤待机/称重，零钱夹闭合/开启，塑料袋折叠/展开。

## 出入口与运动轴线
顾客从右后方进入，左后方离场。`,
  prop_prompts: '# 道具提示词\n\n电子秤、零钱夹、塑料袋的材质、使用痕迹、状态变化与角色交互。',
  master_reference_prompt: '# 总参考图提示词\n\n统一构图和风格。',
};

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-handoff-'));
  await createSceneForgeProject(tmpDir);
  service = new SceneForgeService();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('SceneForge handoff on approve', () => {
  it('writes design.handoff.json after approve with required shape', async () => {
    await service.submitDesignDraft(tmpDir, completeDesignDraft);
    await service.approveStage(tmpDir, 'design');

    const relativePath = sceneHandoffRelativePath('design');
    const absolute = path.join(tmpDir, relativePath);
    await expect(fs.stat(absolute)).resolves.toBeDefined();

    const handoff = await readSceneStageHandoff(tmpDir, 'design');
    expect(handoff.version).toBe(1);
    expect(handoff.sourceStage).toBe('design');
    expect(typeof handoff.generatedAt).toBe('string');
    expect(Array.isArray(handoff.pointers)).toBe(true);
    expect(handoff.pointers.length).toBeGreaterThan(0);
    expect(handoff.slices.master_reference_prompt?.text).toContain('总参考图');
    expect(handoff.downstreamNotes).toBeDefined();
  });

  it('prefers handoff slices in storyboard context after design approve', async () => {
    await service.submitDesignDraft(tmpDir, completeDesignDraft);
    await service.approveStage(tmpDir, 'design');

    const context = await service.getStageContext(tmpDir, 'storyboard');
    const master = context.requiredInputs.find(
      (input) => input.artifactId === 'design.master_reference_prompt',
    );
    expect(master).toBeDefined();
    expect(master?.source).toBe('handoff');
    expect(master?.content).toContain('总参考图');
    expect(
      context.warnings.some((w) => w.startsWith('handoff_missing_fallback:design_master')),
    ).toBe(false);
  });

  it('writes script handoff with performance-oriented script_draft slice after script approve', async () => {
    const scriptContent = [
      '# 剧本草案',
      '',
      '## segment_strategy',
      'segment_duration_seconds: 10',
      'Segment 1 (0-10s): 街头运球',
      '',
      '## story_beats',
      '- **beat_01**: 抛球启程',
      '- **beat_02**: 避障华尔兹',
      '- **beat_03**: 冲向主场',
      '',
      '## script_body',
      '动作：脚背接球，视线从疲惫转为专注。',
      '',
      '## performance_handoff',
      '- 起跑前 0.5 秒停顿，视线切换要明确。',
    ].join('\n');

    await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'script',
      artifactKey: 'script_draft',
      kind: 'final',
      title: '剧本草案',
      content: scriptContent,
      role: 'support_direction_asset',
      coreAsset: false,
      readableByDownstream: true,
    });

    await writeSceneStageHandoff(tmpDir, 'script');

    const handoff = await readSceneStageHandoff(tmpDir, 'script');
    expect(handoff?.slices.script_draft?.text).toContain('story_beats');
    expect(handoff?.slices.script_draft?.text).toContain('beat_01');
    expect(handoff?.slices.script_draft?.text).toContain('performance_handoff');
    expect(handoff?.slices.script_draft?.text).toContain('performance 上游切片');
  });

  it('writes performance handoff when writer is invoked after final artifact exists', async () => {
    await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'performance',
      artifactKey: 'performance_direction',
      kind: 'final',
      title: '表演指导',
      content: '# 表演指导\n\n情绪与动作。',
      role: 'support_direction_asset',
      coreAsset: false,
      readableByDownstream: true,
    });

    await writeSceneStageHandoff(tmpDir, 'performance');

    const handoffPath = path.join(tmpDir, sceneHandoffRelativePath('performance'));
    await expect(fs.stat(handoffPath)).resolves.toBeDefined();
    const handoff = await readSceneStageHandoff(tmpDir, 'performance');
    expect(handoff?.slices.performance_direction?.text).toContain('表演指导');
  });

  it('prefers rich copy-block content over generic display summary for storyboard board handoff', async () => {
    await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'storyboard',
      artifactKey: 'control_board_prompts',
      kind: 'final',
      title: '控制板提示词',
      content: `# 故事板整板 Prompt

## Control-Oriented Storyboard Board

<copy-block type="storyboard-pack" id="pack-01" label="控制板提示词 第01包">
## Pack 1: 控制板提示词

画面区逐格描述镜头、动作、构图和红蓝箭头标注；控制区明确 Beat Line、Camera Path、Action Path、Continuity Rules。
</copy-block>`,
      role: 'core_generation_asset',
      coreAsset: true,
      readableByDownstream: true,
    });

    await writeSceneStageHandoff(tmpDir, 'storyboard');

    const handoff = await readSceneStageHandoff(tmpDir, 'storyboard');
    expect(handoff?.slices.control_board_prompts?.text).toContain('Pack 1: 控制板提示词');
    expect(handoff?.slices.control_board_prompts?.text).toContain('画面区逐格描述镜头');
    expect(handoff?.slices.control_board_prompts?.text).not.toBe('控制板提示词');
  });

  it('falls back when handoff file is missing without throwing', async () => {
    await service.submitDesignDraft(tmpDir, completeDesignDraft);
    await service.approveStage(tmpDir, 'design');

    const handoffPath = path.join(tmpDir, sceneHandoffRelativePath('design'));
    await fs.rm(handoffPath);

    const context = await service.getStageContext(tmpDir, 'storyboard');
    const master = context.requiredInputs.find(
      (input) => input.artifactId === 'design.master_reference_prompt',
    );
    expect(master).toBeDefined();
    expect(master?.source).toBe('artifact');
    expect(context.warnings.some((w) => w.startsWith('handoff_missing_fallback'))).toBe(true);
  });
});
