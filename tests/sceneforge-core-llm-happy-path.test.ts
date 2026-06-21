import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { createDirectLlmStageRunner } from '../electron/sceneforge/runners/scene-direct-llm-runner';
import { MOCK_LLM_SETTINGS } from './sceneforge-mock-llm-settings';
import { SceneForgeService } from '../electron/sceneforge/service';

const STAGE_FIXTURES = {
  design: {
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
- segment_type: lyrical
  emphasis: 情绪呼吸
- segment_type: balanced
  emphasis: 信息推进
- segment_type: kinetic
  emphasis: 动作冲击

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
    prop_prompts: '# 道具提示词\n\n关键道具。',
    master_reference_prompt: '# 总参考图提示词\n\n统一构图。',
  },
  storyboard: {
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
    control_board_prompts: `# 故事板整板 Prompt

## Control-Oriented Storyboard Board

<copy-block type="storyboard-pack" id="pack-01" label="控制板提示词 第01包">
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
</copy-block>`,
    style_board_prompts: `# 故事板整板 Prompt

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
</copy-block>`,
    master_board_prompt: '# 总故事板提示词\n\n统一风格。',
  },
  video_prompts: {
    video_prompt_pack_cn: `<copy-block type="video-pack" id="pack-01" label="视频提示词 第01包">
# 视频提示词 第01包

## video_prompt_pack_plan
本包覆盖控制故事板 Pack 01、风格故事板 Pack 01，对应 Segment 01。

## global_execution_preamble
角色数量、screen side、空间轴线和道具状态必须继承上游。

## 故事板关键帧参考规则
将"控制故事板 Pack 01"作为本段视频生成的顺序动作、镜头调度、空间关系和连续性主参考；将"风格故事板 Pack 01"作为角色渲染、场景质感、灯光影调、情绪氛围和最终画面质量辅助参考。

## 项目级全局锁定规则
- 主场景：街口摊位
- 角色锁定：2 人
- 不重复角色：禁止凭空增删人
- 画面可读性：前中后景明确
- 风格锁定：市井纪实
- 灯光锁定：自然冷调日光
- 负向边界：禁止海报化定格

## Segment 01

### Segment 01 技术控制说明
本段承接 VGU-01，continuity_in 为建立镜头，continuity_out 为抬手压场。blocking 维持老奶奶左前主动位与对手右中受压位，prop state 锁定电子秤从待机转入称重准备，next_handoff 交给下一段的对手迟疑反应。

### segment_sound_execution
#### BGM
轻微街头律动。

#### Foley-SFX
电子秤轻响与脚步摩擦。

#### Ambience
街口环境底噪。

#### Silence
抬眼前压低环境。

#### Voice
老奶奶保持低沉压场声线，对手呼吸发虚，段间不得变成新说话人。

### Segment 01 导演长版提示词
Segment 总时间轴：00:00-00:08
C01 [00:00-00:03] 景别为广角建立镜头，机位低位平推，构图明确前中后景与角色站位，动作聚焦老奶奶压场起势，情绪从冷静建立推进到压迫，道具状态锁定电子秤待机，声音承接 BGM、Foley-SFX、Ambience 与 Voice，负向边界禁止角色漂移。
C02 [00:03-00:08] 景别切到中景并稳定逼近，机位锁定老奶奶左前主动位与对手右中受压位，动作落在抬手压场并逼视对手，情绪持续施压，道具状态准备切入下一段，声音承接延续前段张力，负向边界禁止海报化定格。
</copy-block>`,
    video_prompt_review: `# 视频提示词审查记录

review_status: pass
review_round: 1
issues_found: 0
auto_fixes_applied: none
final_delivery_ready: true`,
    video_prompt_trace: `# 视频提示词溯源记录

## actual_inputs_used
- storyboard.storyboard_prompt_pack
- storyboard.control_board_prompts
- storyboard.style_board_prompts
- performance.performance_direction
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
- 无`,
  },
} as const;

type CoreStage = keyof typeof STAGE_FIXTURES;

let projectDir: string;
let service: SceneForgeService;

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-core-llm-'));
  await createSceneForgeProject(projectDir);
  service = new SceneForgeService();
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('SceneForge core Direct LLM happy path', () => {
  it.each(Object.keys(STAGE_FIXTURES) as CoreStage[])(
    '%s generates without writing, then explicit submit passes validation',
    async (stage) => {
      const fixture = STAGE_FIXTURES[stage];
      const runner = createDirectLlmStageRunner({
        loadSettings: async () => MOCK_LLM_SETTINGS,
        generateText: vi.fn().mockResolvedValue(JSON.stringify(fixture)),
      });
      const submitStageDraft = vi.fn();

      const runResult = await runner.run({
        projectDir,
        stage,
        stageContext: await service.getStageContext(projectDir, stage, {
          runner: 'direct_llm',
        }),
        submitStageDraft,
      });

      expect(runResult.artifacts).toEqual(fixture);
      expect(runResult.requiredArtifacts).toEqual(Object.keys(fixture));
      expect(submitStageDraft).not.toHaveBeenCalled();
      expect((await service.getProjectState(projectDir)).artifacts).toEqual([]);

      const submitted = await service.submitStageDraft({
        projectDir,
        stage,
        artifacts: runResult.requiredArtifacts!.map((artifactKey) => ({
          artifactKey,
          content: runResult.artifacts[artifactKey],
        })),
      });

      if (submitted.validation.status !== 'passed') {
        throw new Error(
          `${stage}: ${submitted.validation.errors.map((e) => e.code).join(', ')}`,
        );
      }
      expect(submitted.validation.status).toBe('passed');
      expect(submitted.artifactIds).toHaveLength(Object.keys(fixture).length);
    },
  );
});
