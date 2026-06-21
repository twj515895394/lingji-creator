import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { SceneForgeService } from '../electron/sceneforge/service';

const MVP = '# MVP 占位\n\n测试\n';

const STORYBOARD_MVP = `<copy-block type="storyboard-pack" id="pack-01" label="故事板提示词 第01包">
## storyboard_prompt_pack
整板故事板主包。

## beat_skeleton
Beat 01 开场建立，Beat 02 冲突升级。

## storyboard_content_breakdown
按 Segment 与 Shot 拆开画面任务。

## cinematic_language_plan
景别、机位、镜头运动和构图策略明确。

## video_generation_units
VGU-01 到 VGU-02。

## shot_continuity_plan
说明 continuity_in / continuity_out 与空间轴线承接。

## continuity_control_system
锁定角色数量、站位、screen side 与核心道具状态。

## storyboard_prompt_pack_plan
segment_duration_seconds: 5
总镜头数：4。单包 4 格。
- Segment 01 | time_range: 0-5s | pacing_profile: balanced | shot_count: 4 | boundary_lock: true

## storyboard_quality_check
检查角色重复、空间漂移、动作不连贯。

## design_reconciliation_review
design_revision_required: false
</copy-block>`;

const VIDEO_MVP = `<copy-block type="video-pack" id="pack-01" label="视频提示词 第01包">
# 视频提示词 第01包

## video_prompt_pack_plan
本包覆盖控制故事板 Pack 01、风格故事板 Pack 01，对应 Segment 01。

## global_execution_preamble
继承上游锁定规则。

## 故事板关键帧参考规则
将"控制故事板 Pack 01"作为本段视频生成的顺序动作、镜头调度、空间关系和连续性主参考；将"风格故事板 Pack 01"作为角色渲染、场景质感、灯光影调、情绪氛围和最终画面质量辅助参考。

## 项目级全局锁定规则
- 主场景：街口摊位
- 角色锁定：2 人
- 不重复角色：禁止增删人
- 画面可读性：主体清晰
- 风格锁定：市井纪实
- 灯光锁定：自然日光
- 负向边界：禁止海报化

## Segment 01

### Segment 01 技术控制说明
本段承接 VGU-01，continuity_in 为建立镜头，continuity_out 为角色压场落点。blocking 锁定老奶奶左前主动位与对手右中受压位，prop state 保持电子秤待机并准备进入下一段，next_handoff 交给对手迟疑反应。

### segment_sound_execution
#### BGM
轻微底乐。

#### Foley-SFX
电子秤轻响。

#### Ambience
街口底噪。

#### Silence
抬眼前压低环境。

#### Voice
老奶奶声线保持低沉压场，对手气息发虚，不得突然换成新说话人质感。

### Segment 01 导演长版提示词
Segment 总时间轴：00:00-00:06
C01 [00:00-00:03] 景别为广角建立镜头，机位低位平推，构图明确前中后景，动作聚焦老奶奶压场起势，情绪从冷静建立推进到压迫，道具状态锁定电子秤待机，声音承接 BGM、Foley-SFX、Ambience 与 Voice，负向边界禁止角色漂移。
C02 [00:03-00:06] 景别切到中景，机位稳定逼近，构图锁定老奶奶左前主动位与对手右中受压位，动作落在抬手压场，情绪保持持续施压，道具状态准备切入下一段，声音承接延续前段张力，负向边界禁止海报化定格。
</copy-block>`;

const VIDEO_TRACE_MVP = `# 视频提示词溯源记录

## actual_inputs_used
- storyboard.storyboard_prompt_pack
- storyboard.control_board_prompts
- storyboard.style_board_prompts
- audio.audio_design

## pack_mapping
- storyboard Pack 01 -> video Pack 01

## segment_trace
### Segment 01
- storyboard: Shot 01-02 / VGU-01
- performance: 压场节奏
- audio: BGM / Foley-SFX / Ambience / Silence / Voice

## optional_input_effectiveness
- design.design_prompts: effective

## continuity_sources
- 角色连续性：design.master_reference_prompt
- 人声连续性：audio.audio_design

## open_risks
- 无
`;

let tmpDir: string;
let service: SceneForgeService;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-core-mvp-'));
  await createSceneForgeProject(tmpDir, 'topic_gate');
  service = new SceneForgeService();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('core MVP placeholder submit', () => {
  it('storyboard placeholder passes validation', async () => {
    const keys = [
      'storyboard_prompt_pack',
      'control_board_prompts',
      'style_board_prompts',
      'master_board_prompt',
    ] as const;
    const result = await service.submitStageDraft({
      projectDir: tmpDir,
      stage: 'storyboard',
      artifacts: keys.map((artifactKey) => ({
        artifactKey,
        content:
          artifactKey === 'storyboard_prompt_pack'
            ? STORYBOARD_MVP
            : artifactKey === 'control_board_prompts'
              ? `# 故事板整板 Prompt

## Control-Oriented Storyboard Board

<copy-block type="storyboard-pack" id="pack-01" label="控制板提示词 第01包">
## Pack 1: 控制板提示词

## Control-Oriented Storyboard Board
红色人物运动箭头画在角色动作路径旁，蓝色摄影机运动箭头画在分镜画面区内部。

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
</copy-block>`
              : artifactKey === 'style_board_prompts'
                ? `# 故事板整板 Prompt

## Style & Rendering Storyboard Board

<copy-block type="storyboard-pack" id="pack-01" label="风格板提示词 第01包">
## Pack 1: 风格板提示词

## Style & Rendering Storyboard Board
统一角色渲染、材质、灯光影调和氛围。

### 画面区
景别保持与控制板一致，构图维持摊位前中后景空间层次，主体表演状态延续压迫与迟疑关系，光影使用午后暖侧逆光切出人物轮廓，材质强调旧木摊位、金属电子秤和零钱夹反光，色彩控制在纪实暖灰与局部脏红，镜头空气感保持街口微尘与热浪，叙事重点仍落在压场与受压反应。红色人物运动箭头与蓝色摄影机运动箭头仍然标在分镜画面区内部。

### 控制区
#### Lighting Strategy
统一暖色夕阳侧逆光。
</copy-block>`
                : MVP,
      })),
    });
    expect(result.validation.status).toBe('passed');
  });

  it('video_prompts placeholder passes validation', async () => {
    const result = await service.submitStageDraft({
      projectDir: tmpDir,
      stage: 'video_prompts',
      artifacts: [
        { artifactKey: 'video_prompt_pack_cn', content: VIDEO_MVP },
        {
          artifactKey: 'video_prompt_review',
          content: `# 视频提示词审查记录

review_status: pass
review_round: 1
issues_found: 0
auto_fixes_applied: none
final_delivery_ready: true`,
        },
        {
          artifactKey: 'video_prompt_trace',
          content: VIDEO_TRACE_MVP,
        },
      ],
    });
    expect(result.validation.status).toBe('passed');
  });
});
