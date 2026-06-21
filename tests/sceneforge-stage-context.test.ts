import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { writeSceneArtifact } from '../electron/sceneforge/artifacts/scene-artifact-store';
import { sceneHandoffRelativePath } from '../electron/sceneforge/pipeline/scene-handoff-writer';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { SceneForgeService } from '../electron/sceneforge/service';

let tmpDir: string;
let service: SceneForgeService;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-context-'));
  await createSceneForgeProject(tmpDir);
  service = new SceneForgeService();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

const completeDesignDraft = {
  design_prompts: `## 视觉语言
市井纪实与轻喜剧压迫感并存。

## 角色设计
角色数量：2。

## 场景设计
街口摊位形成前中后景。

## 道具设计
电子秤、零钱夹、塑料袋为核心道具。

## 空间连续性
固定摊位朝向、角色左右站位和主轴线。

## 道具状态机
电子秤待机到称重，零钱夹闭合到弹开。

## 场面调度
老奶奶左前区，对手右中区。

## 节奏契约
segment_duration_seconds: 10
default_pacing_profile: balanced

## 分段节奏配置
- segment_type: lyrical，强调情绪呼吸。
- segment_type: balanced，强调信息推进。
- segment_type: kinetic，强调动作冲击。

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
电子秤待机/称重，零钱夹闭合/开启。

## 出入口与运动轴线
顾客从右后方进入，左后方离场。`,
  prop_prompts: '# 道具提示词\n\n电子秤、零钱夹、塑料袋的材质、使用痕迹、状态变化与角色交互。',
  master_reference_prompt: '# 总参考图提示词\n\n统一构图和风格。',
};

const validControlBoardPromptBody = `<copy-block type="storyboard-pack" id="pack-01" label="控制板提示词 第01包">
## Pack 1: 控制板提示词

## Control-Oriented Storyboard Board
红色人物运动箭头画在角色动作路径旁，蓝色摄影机运动箭头画在分镜画面区内部，底部轨道栏只补充说明。

### 画面区
景别采用中近景交替，机位先低位平推再侧向跟移，构图重心始终压在人物对峙轴线上，主体姿态与表演状态明确区分压迫方和受压方，空间关系保持摊位前后景层次，光线方向锁定午后侧逆光，材质与环境细节保留街口摊位、电子秤和零钱夹，镜头运动结果强调压迫感持续逼近，叙事目的聚焦冲突升级。红色人物运动箭头与蓝色摄影机运动箭头都标在分镜画面区内部。

### 控制区
#### Panel Layout
每格边界清晰。
#### Beat Line
节拍按压场起势、对手迟疑、气势锁死推进。
#### Camera Path
镜头沿摊位外弧线平推再小幅逼近。
#### Action Path
人物前压、抬手、停顿与后撤路径清楚。
#### Continuity Rules
人物朝向、电子秤位置和零钱夹状态保持连续。
#### Color Legend
红色为人物运动，蓝色为摄影机运动。
</copy-block>`;

const validStyleBoardPromptBody = `<copy-block type="storyboard-pack" id="pack-01" label="风格板提示词 第01包">
## Pack 1: 风格板提示词

## Style & Rendering Storyboard Board
统一角色渲染、材质、灯光影调和氛围。

### 画面区
景别保持与控制板一致，构图维持摊位前中后景空间层次，主体表演状态延续压迫与迟疑关系，光影使用午后暖侧逆光切出人物轮廓，材质强调旧木摊位、金属电子秤和零钱夹反光，色彩控制在纪实暖灰与局部脏红，镜头空气感保持街口微尘与热浪，叙事重点仍落在压场与受压反应。红色人物运动箭头与蓝色摄影机运动箭头仍然标在分镜画面区内部。

### 控制区
#### Lighting Strategy
统一暖色夕阳侧逆光。
</copy-block>`;

const completeStoryboardDraft = {
  storyboard_prompt_pack: `<copy-block type="storyboard-pack" id="pack-01" label="故事板提示词 第01包">
## storyboard_prompt_pack
整板故事板主包。

## beat_skeleton
Beat 01 开场建立，Beat 02 冲突升级，Beat 03 反应，Beat 04 payoff。

## storyboard_content_breakdown
按 Segment 与 Shot 拆开画面任务。

## cinematic_language_plan
景别、机位、镜头运动和构图策略明确。

## video_generation_units
VGU-01 到 VGU-04 对应关键动作与连续性锚点。

## shot_continuity_plan
说明 continuity_in / continuity_out、空间轴线与道具状态承接。

## continuity_control_system
锁定角色数量、站位、screen side 与核心道具状态。

## storyboard_prompt_pack_plan
segment_duration_seconds: 10
总镜头数：13。单包 13 格，控制板与风格板双交付；若超过 12 镜头则改为多包，并按连续动作段拆包。
- Segment 01 | time_range: 0-10s | pacing_profile: balanced | shot_count: 7 | boundary_lock: true
- Segment 02 | time_range: 10-20s | pacing_profile: lyrical | shot_count: 6 | boundary_lock: true

## storyboard_quality_check
检查角色重复、空间漂移、动作不连贯。

## design_reconciliation_review
design_revision_required: false
</copy-block>`,
  control_board_prompts: validControlBoardPromptBody,
  style_board_prompts: validStyleBoardPromptBody,
  master_board_prompt: `# 总故事板提示词

## 项目级连续性锚点
角色数量固定为 2，老奶奶左前主动位，对手右中受压位。

## 整板意图
统一压场节奏、空间轴线、冷调日光和道具状态承接。

## 最终板式约束
控制信息优先于风格修饰，不允许海报化定格。`,
};

describe('SceneForge Stage Context', () => {
  it('script context includes design prompt dependencies and priority order metadata', async () => {
    await service.submitDesignDraft(tmpDir, completeDesignDraft);
    await service.approveStage(tmpDir, 'design');
    await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'story',
      artifactKey: 'story_direction',
      kind: 'final',
      title: '故事方向',
      content: '# 故事方向\n\n六个节拍与结尾反转。',
      role: 'support_direction_asset',
      coreAsset: false,
      readableByDownstream: true,
    });

    const context = await service.getStageContext(tmpDir, 'script');
    expect(context.requiredInputs.map((input) => input.artifactId)).toEqual([
      'story.story_direction',
      'design.design_prompts',
      'design.master_reference_prompt',
    ]);
    expect(context.referencePriority.rule).toContain('优先采用阶段顺序更靠后的已确认内容');
    expect(context.referencePriority.currentInputsHighestFirst[0]?.artifactId).toContain('design.');
    const designPrompts = context.requiredInputs.find(
      (input) => input.artifactId === 'design.design_prompts',
    );
    expect(designPrompts?.priorityNote).toContain('优先保留该阶段已确认版本');
  });

  it('performance context includes design prompt dependency', async () => {
    await service.submitDesignDraft(tmpDir, completeDesignDraft);
    await service.approveStage(tmpDir, 'design');
    await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'script',
      artifactKey: 'script_draft',
      kind: 'final',
      title: '剧本草案',
      content: '# 剧本草案\n\n已确认分段与对白。',
      role: 'support_direction_asset',
      coreAsset: false,
      readableByDownstream: true,
    });

    const context = await service.getStageContext(tmpDir, 'performance');
    expect(context.requiredInputs.map((input) => input.artifactId)).toEqual([
      'script.script_draft',
      'design.character_prompts',
      'design.design_prompts',
    ]);
    expect(context.optionalInputs.map((input) => input.artifactId)).toContain(
      'design.master_reference_prompt',
    );
  });

  it('audio context includes script, performance and design dependencies', async () => {
    await service.submitDesignDraft(tmpDir, completeDesignDraft);
    await service.approveStage(tmpDir, 'design');
    await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'script',
      artifactKey: 'script_draft',
      kind: 'final',
      title: '剧本草案',
      content: '# 剧本草案\n\n## Segment 01\n老奶奶压低声线逼问；对手先硬后虚。',
      role: 'support_direction_asset',
      coreAsset: false,
      readableByDownstream: true,
    });
    await service.submitStoryboardDraft(tmpDir, completeStoryboardDraft);
    await service.approveStage(tmpDir, 'storyboard');
    await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'performance',
      artifactKey: 'performance_direction',
      kind: 'final',
      title: '表演指导',
      content: '# 表演指导\n\n镜头节奏与反应时值已确认。',
      role: 'support_direction_asset',
      coreAsset: false,
      readableByDownstream: true,
    });

    const context = await service.getStageContext(tmpDir, 'audio');
    expect(context.requiredInputs.map((input) => input.artifactId)).toEqual([
      'storyboard.storyboard_prompt_pack',
      'performance.performance_direction',
      'script.script_draft',
      'design.design_prompts',
    ]);
    expect(context.optionalInputs.map((input) => input.artifactId)).toContain(
      'design.master_reference_prompt',
    );
  });

  it('exposes policy-driven design inputs and performance to storyboard after design approval', async () => {
    await service.submitDesignDraft(tmpDir, completeDesignDraft);

    await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'design',
      artifactKey: 'preview_notes',
      kind: 'preview',
      title: '预览草稿',
      content: '# 不应进入上下文',
      role: 'core_generation_asset',
      coreAsset: true,
      readableByDownstream: true,
    });
    await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'performance',
      artifactKey: 'performance_direction',
      kind: 'final',
      title: '表演指导',
      content: '# 表演指导\n\n可供 Storyboard 使用。',
      role: 'support_direction_asset',
      coreAsset: false,
      readableByDownstream: true,
    });
    await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'assets',
      artifactKey: 'asset_plan',
      kind: 'final',
      title: '资产计划',
      content: '# 未授权给 Storyboard',
      role: 'support_direction_asset',
      coreAsset: false,
      readableByDownstream: true,
    });
    await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'story',
      artifactKey: 'story_direction',
      kind: 'final',
      title: '故事方向',
      content: '# 故事方向\n\n街头运球进入小院，最终完成凌空抽射。',
      role: 'support_direction_asset',
      coreAsset: false,
      readableByDownstream: true,
    });

    const beforeApproval = await service.getStageContext(tmpDir, 'storyboard');
    expect(beforeApproval.requiredInputs.map((input) => input.artifactId)).toEqual([
      'performance.performance_direction',
    ]);
    expect(beforeApproval.optionalInputs.map((input) => input.artifactId)).toEqual([
      'story.story_direction',
    ]);

    await service.approveStage(tmpDir, 'design');
    const context = await service.getStageContext(tmpDir, 'storyboard');

    expect(context.outputContract.requiredArtifacts).toEqual([
      'storyboard_prompt_pack',
      'control_board_prompts',
      'style_board_prompts',
      'master_board_prompt',
    ]);
    expect(context.requiredInputs.map((input) => input.artifactId)).toEqual([
      'design.design_prompts',
      'design.master_reference_prompt',
      'design.character_prompts',
      'design.scene_prompts',
      'performance.performance_direction',
    ]);
    expect(context.optionalInputs.map((input) => input.artifactId)).toContain(
      'story.story_direction',
    );
    expect(context.requiredInputs.find((i) => i.artifactId === 'design.prop_prompts')).toBeUndefined();
    const masterInput = context.requiredInputs.find(
      (i) => i.artifactId === 'design.master_reference_prompt',
    );
    expect(masterInput?.source).toBe('handoff');
  });

  it('video prompts context follows policy without nine full core artifacts', async () => {
    await service.submitDesignDraft(tmpDir, completeDesignDraft);
    await service.approveStage(tmpDir, 'design');
    await service.submitStoryboardDraft(tmpDir, completeStoryboardDraft);

    await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'audio',
      artifactKey: 'audio_design',
      kind: 'final',
      title: '声音设计',
      content: '# 声音设计\n\n配乐与音效。',
      role: 'support_direction_asset',
      coreAsset: false,
      readableByDownstream: true,
    });
    await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'performance',
      artifactKey: 'performance_direction',
      kind: 'final',
      title: '表演指导',
      content: '# 表演指导\n\nVideo 阶段需要。',
      role: 'support_direction_asset',
      coreAsset: false,
      readableByDownstream: true,
    });

    const beforeStoryboardApproval = await service.getStageContext(tmpDir, 'video_prompts');
    expect(
      beforeStoryboardApproval.requiredInputs.map((input) => input.artifactId).sort(),
    ).toEqual(
      ['audio.audio_design', 'design.master_reference_prompt', 'performance.performance_direction'].sort(),
    );
    expect(beforeStoryboardApproval.requiredInputs).toHaveLength(3);

    await service.approveStage(tmpDir, 'storyboard');
    const context = await service.getStageContext(tmpDir, 'video_prompts');

    expect(context.outputContract.requiredArtifacts).toEqual([
      'video_prompt_pack_cn',
      'video_prompt_review',
      'video_prompt_trace',
    ]);

    const requiredIds = context.requiredInputs.map((input) => input.artifactId);
    expect(requiredIds).toContain('design.master_reference_prompt');
    expect(requiredIds).toContain('storyboard.storyboard_prompt_pack');
    expect(requiredIds).toContain('storyboard.control_board_prompts');
    expect(requiredIds).toContain('storyboard.style_board_prompts');
    expect(requiredIds).toContain('audio.audio_design');
    expect(requiredIds).toContain('performance.performance_direction');
    expect(requiredIds).not.toContain('design.prop_prompts');
    expect(requiredIds).not.toContain('design.character_prompts');
    expect(requiredIds.length).toBeLessThan(9);

    const optionalIds = context.optionalInputs.map((input) => input.artifactId);
    expect(optionalIds).toContain('design.design_prompts');
    expect(optionalIds).toContain('storyboard.master_board_prompt');
    expect(optionalIds).toContain('design.character_prompts');
    expect(optionalIds).not.toContain('design.prop_prompts');

    const controlBoard = context.requiredInputs.find(
      (input) => input.artifactId === 'storyboard.control_board_prompts',
    );
    expect(controlBoard?.content).toContain('Pack 1: 控制板提示词');
    expect(controlBoard?.content).toContain('红色人物运动箭头');

    const styleBoard = context.requiredInputs.find(
      (input) => input.artifactId === 'storyboard.style_board_prompts',
    );
    expect(styleBoard?.content).toContain('Pack 1: 风格板提示词');
    expect(styleBoard?.content).toContain('Style & Rendering Storyboard Board');

    const designSummary = context.optionalInputs.find(
      (input) => input.artifactId === 'design.design_prompts',
    );
    expect(designSummary?.content).toContain('角色数量：2');
    expect(designSummary?.content).toContain('街口摊位形成前中后景');

    const characterSummary = context.optionalInputs.find(
      (input) => input.artifactId === 'design.character_prompts',
    );
    expect(characterSummary?.content).toContain('轮廓稳定');
    expect(characterSummary?.content).toContain('边界约束');
  });

  it('video prompts drops title-only optional snippets but keeps the required skeleton', async () => {
    await service.submitDesignDraft(tmpDir, completeDesignDraft);
    await service.approveStage(tmpDir, 'design');
    await service.submitStoryboardDraft(tmpDir, completeStoryboardDraft);
    await service.approveStage(tmpDir, 'storyboard');

    await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'design',
      artifactKey: 'design_prompts',
      kind: 'final',
      title: '设定图提示词',
      content: '# 设定图提示词\n\n设定图提示词包，含角色、场景、道具与总参考图片段。',
      role: 'core_generation_asset',
      coreAsset: true,
      readableByDownstream: true,
    });
    await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'design',
      artifactKey: 'character_prompts',
      kind: 'final',
      title: '角色提示词',
      content: '# 角色提示词\n\n角色提示词',
      role: 'core_generation_asset',
      coreAsset: true,
      readableByDownstream: true,
    });
    await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'storyboard',
      artifactKey: 'master_board_prompt',
      kind: 'final',
      title: '总故事板提示词',
      content: '# 总故事板提示词\n\n总故事板提示词',
      role: 'core_generation_asset',
      coreAsset: true,
      readableByDownstream: true,
    });
    await fs.rm(path.join(tmpDir, sceneHandoffRelativePath('design')), { force: true });
    await fs.rm(path.join(tmpDir, sceneHandoffRelativePath('storyboard')), { force: true });

    await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'audio',
      artifactKey: 'audio_design',
      kind: 'final',
      title: '声音设计',
      content: '# 声音设计\n\n配乐与音效。',
      role: 'support_direction_asset',
      coreAsset: false,
      readableByDownstream: true,
    });
    await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'performance',
      artifactKey: 'performance_direction',
      kind: 'final',
      title: '表演指导',
      content: '# 表演指导\n\nVideo 阶段需要。',
      role: 'support_direction_asset',
      coreAsset: false,
      readableByDownstream: true,
    });

    const context = await service.getStageContext(tmpDir, 'video_prompts');

    expect(context.requiredInputs.map((input) => input.artifactId)).toEqual(
      expect.arrayContaining([
        'design.master_reference_prompt',
        'storyboard.storyboard_prompt_pack',
        'storyboard.control_board_prompts',
        'storyboard.style_board_prompts',
        'audio.audio_design',
        'performance.performance_direction',
      ]),
    );
    expect(context.optionalInputs.map((input) => input.artifactId)).not.toContain(
      'design.design_prompts',
    );
    expect(context.optionalInputs.map((input) => input.artifactId)).not.toContain(
      'design.character_prompts',
    );
    expect(context.optionalInputs.map((input) => input.artifactId)).not.toContain(
      'storyboard.master_board_prompt',
    );
    expect(context.warnings).toEqual(
      expect.arrayContaining([
        'optional_input_low_signal:design_summary:design.design_prompts',
        'optional_input_low_signal:design_characters_snippet:design.character_prompts',
        'optional_input_low_signal:storyboard_master_board:storyboard.master_board_prompt',
      ]),
    );
  });
});
