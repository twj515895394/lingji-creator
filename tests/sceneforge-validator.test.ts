import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { writeSceneArtifact } from '../electron/sceneforge/artifacts/scene-artifact-store';
import { validateSceneStage } from '../electron/sceneforge/validators/scene-validator';
import { buildTopicBriefMarkdown } from '../src/sceneforge/lib/topic-gate-form';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-validator-'));
  await createSceneForgeProject(tmpDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function writeDesignArtifact(artifactKey: string, content = '# 产物\n\n有效内容') {
  return writeSceneArtifact({
    projectDir: tmpDir,
    stage: 'design',
    artifactKey,
    kind: 'final',
    title: artifactKey,
    content,
    role: 'core_generation_asset',
    coreAsset: true,
    readableByDownstream: true,
  });
}

const validDesignOverviewBody = `## 视觉语言
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
default_pacing_profile: balanced
rhythm_goal: 让 design、script 和 storyboard 继承同一段长与镜头节奏边界。

## 分段节奏配置
- segment_type: lyrical
  emphasis: 关系、停顿、情绪呼吸
- segment_type: balanced
  emphasis: 信息推进与动作可读性平衡
- segment_type: kinetic
  emphasis: 动作冲击、快速反应与高密度切换

## 镜头密度期望
- 5s: lyrical 3-4 | balanced 4-6 | kinetic 6-8
- 6s: lyrical 4-5 | balanced 5-7 | kinetic 7-9
- 8s: lyrical 5-6 | balanced 6-8 | kinetic 8-10
- 10s: lyrical 6-7 | balanced 7-9 | kinetic 9-12
- 15s: lyrical 8-10 | balanced 10-12 | kinetic 12-16

## 边界规则
- shots_must_not_cross_segment_boundary: true
- 镜头不得跨段；若 segment 为 10 秒，禁止生成 9s-13s 这类跨 segment 镜头。`;

const validSceneReferenceBoardBody = `# 全场景资产总参考图提示词

## 主场景空间布局
街口摊位位于前景左侧，收银台与电子秤在中景，后侧为货架与过道。

## 角色默认站位
角色数量为 2；老奶奶默认站在摊位内侧左前区，对手站在右中区，避免角色数量漂移。

## 核心道具位置
电子秤位于收银台中央，零钱夹贴近老奶奶手侧，塑料袋挂在摊位右前角。

## 道具状态矩阵
电子秤待机/称重，零钱夹闭合/开启，塑料袋折叠/展开。

## 出入口与运动轴线
顾客从右后方进入，左后方离场，主要运动轴线保持右后到左前。`;

async function writeStoryboardArtifact(artifactKey: string, content = '# 分镜产物\n\n有效内容') {
  return writeSceneArtifact({
    projectDir: tmpDir,
    stage: 'storyboard',
    artifactKey,
    kind: 'final',
    title: artifactKey,
    content,
    role: 'core_generation_asset',
    coreAsset: true,
    readableByDownstream: true,
  });
}

const validStoryboardPackBody = `<copy-block type="storyboard-pack" id="pack-01" label="故事板提示词 第01包">
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
总镜头数：13。单包 13 格，控制板与风格板双交付；若超过 12 镜头则多包并按连续动作段拆包。
- Segment 01 | time_range: 0-10s | pacing_profile: balanced | shot_count: 7 | boundary_lock: true
- Segment 02 | time_range: 10-20s | pacing_profile: lyrical | shot_count: 6 | boundary_lock: true

## storyboard_quality_check
检查角色重复、空间漂移、动作不连贯。

## design_reconciliation_review
design_revision_required: false
</copy-block>`;

const validStoryboardPackMultilineMarkdownBody = `<copy-block type="storyboard-pack" id="pack-01" label="故事板提示词 第01包">
## 1. beat_skeleton
Beat 01 开场建立，Beat 02 转场，Beat 03 抽射，Beat 04 庆祝。

## 2. storyboard_content_breakdown
按 Segment 与 Shot 拆分动作、镜头与连续性任务。

## 3. cinematic_language_plan
前段偏 kinetic，后段偏 balanced，保持动作可读与情绪延展。

## 4. video_generation_units
VGU-01 到 VGU-04 对应街头盘带、撞门转场、凌空抽射与庆祝收束。

## 5. shot_continuity_plan
锁定书包摆动、院门开启角度、足球运动方向与 screen side。

## 6. continuity_control_system
角色、场景、道具与轴线全部继承上游锁定，不得漂移。

## 7. storyboard_prompt_pack_plan
*   **总镜头数**: 13 个镜头 (Shot 1 - Shot 13)
*   **分包决策**: 多包决策。由于总镜头数超过 12 个，拆成 2 包。
*   **每包覆盖范围**:
    *   **Pack 01**: Shot 1 - Shot 7 (0.0s - 10.0s)
    *   **Pack 02**: Shot 8 - Shot 13 (10.0s - 20.0s)
*   **分段参数锁定**:
    *   **Segment 1**:
        *   \`segment_duration_seconds\`: 10.0s
        *   \`time_range\`: 0.0s - 10.0s
        *   \`pacing_profile\`: kinetic
        *   \`shot_count\`: 7
        *   \`boundary_lock\`: 10.0s 绝对剪辑点
    *   **Segment 2**:
        *   \`segment_duration_seconds\`: 10.0s
        *   \`time_range\`: 10.0s - 20.0s
        *   \`pacing_profile\`: balanced
        *   \`shot_count\`: 6
        *   \`boundary_lock\`: 10.0s 绝对剪辑点

## 8. storyboard_quality_check
检查跨段、轴线漂移、角色增删与动作不连贯。

## 9. design_reconciliation_review
design_revision_required: false

## 10. storyboard_prompt_pack
正式故事板主包正文。
</copy-block>`;

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

const validVideoPromptPackBody = `<copy-block type="video-pack" id="pack-01" label="视频提示词 第01包">
# 视频提示词 第01包

## video_prompt_pack_plan
本包覆盖控制故事板 Pack 01、风格故事板 Pack 01，对应 Segment 01-02，先建立人物和空间，再推进冲突升级。

## global_execution_preamble
所有镜头必须继承 design 与 storyboard 已锁定的角色数量、站位与空间轴线。

## 故事板关键帧参考规则
将"控制故事板 Pack 01"作为本段视频生成的顺序动作、镜头调度、空间关系和连续性主参考；将"风格故事板 Pack 01"作为角色渲染、场景质感、灯光影调、情绪氛围和最终画面质量辅助参考。

## 项目级全局锁定规则
- 主场景：街口摊位
- 角色锁定：2 人
- 不重复角色：禁止凭空增删人
- 画面可读性：前中后景明确
- 风格锁定：市井纪实
- 灯光锁定：自然日光偏冷
- 负向边界：禁止海报化定格

## Segment 01

### Segment 01 技术控制说明
本段承接 VGU-01，continuity_in 为街口摊位建立镜头，continuity_out 为老奶奶抬手示意。blocking 维持老奶奶左前主动位与对手右中受压位，主轴线维持右后到左前，prop state 锁定电子秤开场待机并在结尾进入称重准备，next_handoff 交给下一段的对手迟疑反应。

### segment_sound_execution
#### BGM
轻微街头律动底乐，避免抢对白。

#### Foley-SFX
塑料袋摩擦、鞋底蹭地、电子秤按钮轻响。

#### Ambience
街口远处车辆声、人群碎语、风吹篷布声。

#### Silence
老奶奶凝视对手前，压低环境以制造张力空隙。

#### Voice
老奶奶保持低沉压场声线，对手呼吸发虚并延续上一段停顿习惯，不得突然变成新说话人。

### Segment 01 导演长版提示词
Segment 总时间轴：00:00-00:10
C01 [00:00-00:02] 景别为广角建立镜头，机位低位平推，构图明确街口摊位与角色站位，动作聚焦老奶奶压场起势，情绪从冷静建立推进到压迫，道具状态锁定电子秤待机，声音承接 BGM、Foley-SFX、Ambience 与 Voice，负向边界禁止空间漂移与新增角色。
C02 [00:02-00:05] 景别切到中景并稳定逼近，机位锁定老奶奶左前主动位与对手右中受压位，构图保持前中后景明确，动作落在抬手示意与逼视对手，情绪持续施压，道具状态保持电子秤待机，声音承接延续前段张力，负向边界禁止角色换位。
C03 [00:05-00:10] 景别转入近景反应镜头，机位平稳锁定对手与零钱夹手部动作，构图强调受压反应与道具状态，动作落在对手迟疑后撤，情绪推进到受压收束，道具状态准备切入下一段，声音承接保持环境钩子与 Voice 节奏，负向边界禁止海报化定格。
</copy-block>`;

const validVideoPromptReviewBody = `# 视频提示词审查记录

review_status: pass
review_round: 1
issues_found: 0
auto_fixes_applied: none
final_delivery_ready: true`;

const validVideoPromptTraceBody = `# 视频提示词溯源记录

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
- storyboard: Shot 01-03 / VGU-01
- performance: 压迫式节奏
- audio: BGM / Foley-SFX / Ambience / Silence / Voice

## optional_input_effectiveness
- design.design_prompts: effective

## continuity_sources
- 角色连续性：design.master_reference_prompt
- 人声连续性：audio.audio_design

## open_risks
- 无`;

async function writeVideoArtifact(artifactKey: string, content = validVideoPromptPackBody) {
  return writeSceneArtifact({
    projectDir: tmpDir,
    stage: 'video_prompts',
    artifactKey,
    kind: 'final',
    title: artifactKey,
    content,
    role: 'core_generation_asset',
    coreAsset: true,
    readableByDownstream: true,
  });
}

async function writeVideoReviewArtifact(content = validVideoPromptReviewBody) {
  return writeSceneArtifact({
    projectDir: tmpDir,
    stage: 'video_prompts',
    artifactKey: 'video_prompt_review',
    kind: 'final',
    title: 'video_prompt_review',
    content,
    role: 'core_generation_asset',
    coreAsset: true,
    readableByDownstream: true,
  });
}

async function writeVideoTraceArtifact(content = validVideoPromptTraceBody) {
  return writeSceneArtifact({
    projectDir: tmpDir,
    stage: 'video_prompts',
    artifactKey: 'video_prompt_trace',
    kind: 'final',
    title: 'video_prompt_trace',
    content,
    role: 'core_generation_asset',
    coreAsset: true,
    readableByDownstream: true,
  });
}

async function writeReferenceArtifact(content = '# 参考说明\n\n有效内容') {
  return writeSceneArtifact({
    projectDir: tmpDir,
    stage: 'reference',
    artifactKey: 'reference_notes',
    kind: 'final',
    title: 'reference_notes',
    content,
    role: 'core_generation_asset',
    coreAsset: true,
    readableByDownstream: true,
  });
}

async function writeTopicGateArtifact(content: string) {
  return writeSceneArtifact({
    projectDir: tmpDir,
    stage: 'topic_gate',
    artifactKey: 'topic_brief',
    kind: 'final',
    title: 'topic_brief',
    content,
    role: 'core_generation_asset',
    coreAsset: true,
    readableByDownstream: true,
  });
}

async function writeStoryArtifact(content = '# 故事方向\n\n有效内容') {
  return writeSceneArtifact({
    projectDir: tmpDir,
    stage: 'story',
    artifactKey: 'story_direction',
    kind: 'final',
    title: 'story_direction',
    content,
    role: 'core_generation_asset',
    coreAsset: true,
    readableByDownstream: true,
  });
}

async function writeAssetsArtifact(content = '# 资产规划\n\n有效内容') {
  return writeSceneArtifact({
    projectDir: tmpDir,
    stage: 'assets',
    artifactKey: 'asset_plan',
    kind: 'final',
    title: 'asset_plan',
    content,
    role: 'core_generation_asset',
    coreAsset: true,
    readableByDownstream: true,
  });
}

async function writeScriptArtifact(content = '# 剧本草案\n\n有效内容') {
  return writeSceneArtifact({
    projectDir: tmpDir,
    stage: 'script',
    artifactKey: 'script_draft',
    kind: 'final',
    title: 'script_draft',
    content,
    role: 'core_generation_asset',
    coreAsset: true,
    readableByDownstream: true,
  });
}

async function writePerformanceArtifact(content = '# 表演指导\n\n有效内容') {
  return writeSceneArtifact({
    projectDir: tmpDir,
    stage: 'performance',
    artifactKey: 'performance_direction',
    kind: 'final',
    title: 'performance_direction',
    content,
    role: 'core_generation_asset',
    coreAsset: true,
    readableByDownstream: true,
  });
}

async function writeAudioArtifact(content = '# 声音设计\n\n有效内容') {
  return writeSceneArtifact({
    projectDir: tmpDir,
    stage: 'audio',
    artifactKey: 'audio_design',
    kind: 'final',
    title: 'audio_design',
    content,
    role: 'core_generation_asset',
    coreAsset: true,
    readableByDownstream: true,
  });
}

const validReferenceNotesBody = `## reference_type
hybrid_reference

## decision_summary
以原著母题为主，辅以某版影视改编的镜头功能参考。

## creative_direction_context
保留冲突母题与角色关系，执行动画化转译。

## reference_boundary
### primary_reference
原著母题

### secondary_reference
经典影视改编

### boundary_rule
允许继承剧情骨架与镜头功能，禁止照搬可识别演员表达。

## allowed_inheritance
- 剧情骨架
- 情绪核心
- 镜头动势

## forbidden_inheritance
- 角色身份绑定到真人演员

## must_keep
- 保留主冲突关系

## must_avoid
- 避免逐镜复刻

## risk_notes
- 若镜头和服装同时贴近旧版，容易过度相似。

## next_action
进入 story 阶段，围绕保留冲突关系搭建 6 Beat 骨架。`;

const validStoryDirectionBody = `## story_development_summary
围绕误解升级与压场反转建立 6 个 beat 的轻量故事骨架，确保高潮与尾声可直接交给 assets 和 design。

## logline
一位街头老奶奶在摊位危机中反守为攻。

## story_premise
围绕误解升级与反转澄清建立轻喜剧短片。

## duration_target
target_total_duration_seconds: 45
rationale: 6 个 beat 适合 40-50 秒短片承载。

## story_beats
- beat_id: B01
  title: 摊位秩序建立
  function: setup
  beat_summary: 建立街口摊位秩序、主角气场与对手轻视。
- beat_id: B02
  title: 误会起火
  function: escalation
  beat_summary: 一句质疑让冲突正式点燃，电子秤成为触发器。
- beat_id: B03
  title: 动作试探
  function: escalation
  beat_summary: 主角先用停顿和视线试探，局势继续升高。
- beat_id: B04
  title: 压场爆点
  function: climax
  beat_summary: 老奶奶抬手压场，迫使对手失去节奏。
- beat_id: B05
  title: 对手退缩
  function: climax
  beat_summary: 对手后退、零钱夹失控，局面倒向主角。
- beat_id: B06
  title: 反转释放
  function: payoff
  beat_summary: 对手误判局势，反被主角镇住，笑点兑现。

## character_functions
- character_name: 老奶奶
  story_function: 主动压场与推动情绪反转
  conflict_role: 正面压制
  emotional_task: 从平静建立走到压场释放

## core_scene_functions
- scene_name: 街口摊位
  story_function: 冲突升级与压场主战场
  required_beats:
    - B01
    - B02
    - B03
    - B04
    - B05

## key_prop_functions
- prop_name: 电子秤
  story_function: 触发误会升级并作为压场动作锚点
  required_beats:
    - B02
    - B04

## emotional_arc
自信 -> 紧张 -> 反击 -> 释放。

## hero_moment_candidates
- hero_id: H01
  title: 老奶奶抬手压场
  related_beat: B04
  reason: 适合作为表演和镜头共同的高潮锚点。

## ending_payoff
对手误判局势，反被主角镇住。

## story_risk_notes
- 中段升级不能挤压结尾释放空间。

## next_action
进入 assets 阶段锁定角色、摊位和核心道具。`;

const validAssetPlanBody = `## story_function_summary
关键角色为老奶奶与对手，关键场景为街口摊位，关键道具为电子秤与零钱夹。它们分别承担剧情推进、冲突升级与结尾 payoff 的功能。

## character_assets
- 角色资产清单
- role_name: 老奶奶
  reuse_status: reuse_tweak
  story_function: 主动压场并推动情绪反转
- role_name: 对手
  reuse_status: new_light
  story_function: 制造外部压力并承接误判反应

## scene_assets
- 场景资产清单
- scene_name: 街口摊位
  reuse_status: reuse_direct
  story_function: 作为冲突升级与空间调度的主战场

## prop_assets
- 道具资产清单
- prop_name: 电子秤
  prop_status: new_core_prop
  handling_note: 作为剧情升级触发器，需要单独锁定状态变化
- prop_name: 零钱夹
  prop_status: embed_in_character_or_scene
  handling_note: 作为角色附属道具处理

## design_actions
- tweak_targets: 老奶奶
- new_light_targets: 对手

## asset_lock_summary
- locked_characters: 老奶奶、对手
- locked_scenes: 街口摊位
- locked_props: 电子秤、零钱夹
- downstream_constraints: 不得新增未评估角色外观锚点

## risk_notes
- 若对手造型过强，可能抢掉主角焦点。

## next_action
进入 design 阶段输出角色说明书板与全场景资产总参考图。`;

const validScriptDraftBody = `## script_summary
45 秒街口摊位误会喜剧，按 3 段推进。

## segment_strategy
target_total_duration_seconds: 45
segment_duration_seconds: 15
segment_count: 3
segmentation_mode: equal_split
segment_01_time_range: 0-15s
segment_02_time_range: 15-30s
segment_03_time_range: 30-45s
rationale: 三段递进，便于 storyboard 继承稳定段界。

## story_beats
- beat_id: B01
  beat_summary: 开场建立摊位秩序与主角压迫感。
- beat_id: B02
  beat_summary: 对手一句话触发误会升级。
- beat_id: B03
  beat_summary: 主角抬眼压手，把场子重新压住。
- beat_id: B04
  beat_summary: 对手露怯，尾笑点落地。

## beat_table
- beat_id: B01
  dramatic_role: setup
  emotional_turn: 平静 -> 审视
  continuity_risk: 左右站位不能漂移
- beat_id: B02
  dramatic_role: escalation
  emotional_turn: 审视 -> 紧张
  continuity_risk: 零钱夹状态要连续
- beat_id: B03
  dramatic_role: climax
  emotional_turn: 紧张 -> 压场释放
  continuity_risk: 抬眼与压手动作不能断
- beat_id: B04
  dramatic_role: payoff
  emotional_turn: 压迫 -> 失衡收束
  continuity_risk: 对手 reaction 要接住上一拍

## video_generation_unit_plan
- vgu_id: VGU-01
  linked_beat_ids:
    - B01
  narrative_goal: 建立街口摊位关系和主角压迫感
  pacing_profile: lyrical
  shot_density_hint: 低到中
  target_duration_seconds: 15
- vgu_id: VGU-02
  linked_beat_ids:
    - B02
    - B03
  narrative_goal: 完成误会升级与压场反击
  pacing_profile: balanced
  shot_density_hint: 中密度
  target_duration_seconds: 20
- vgu_id: VGU-03
  linked_beat_ids:
    - B04
  narrative_goal: 用对手露怯完成尾笑点
  pacing_profile: kinetic
  shot_density_hint: 中到高
  target_duration_seconds: 10

## script_body
## 第1段
旁白：老奶奶刚一抬眼，整条摊位的气压都变了。
动作：她把手按在电子秤边上，先停一秒，再慢慢抬头看向对手。

## 第2段
对白：你刚才说谁不懂规矩？
动作：对手后退半步，零钱夹被手肘碰开。

## 第3段
旁白：她没再提高音量，手往前一压，场子已经归她了。
动作：主角逼近半步，视线不躲；对手想解释却先卡住。

## performance_handoff
- 主角关键动作：停顿、抬眼、压手、逼近半步。
- 对手关键 reaction：后退、碰开零钱夹、解释前卡住。
- 节奏要求：问句前压半拍，压手后给 reaction hold。

## storyboard_handoff
- 第一段用建立镜头，第二段切中近景反应，保留电子秤与零钱夹状态承接。
- 第三段保持左压右退的站位和主轴线稳定。
- boundary_lock: shots_must_not_cross_segment_boundary
- segment_boundary_note: 15 秒分段下，镜头与段级 handoff 不得出现 14s-18s 这类跨段区间。

## risk_notes
- 中段对白不要过长。

## next_action
进入 performance 阶段细化视线、停顿与动作链。`;

const validPerformanceDirectionBody = `## character_performance_profiles
- character_id: C01
  character_name: 老奶奶
  eye_focus_pattern: 先不看人，关键句前再抬眼锁住对手
  body_weight: 重心前压，肩膀稳定
  hand_action_pattern: 手贴电子秤边缘，再慢慢前压
- character_id: C02
  character_name: 对手
  eye_focus_pattern: 先硬顶，失势后开始闪躲
  body_weight: 站位逐渐后撤
  hand_action_pattern: 想解释时先碰乱零钱夹

## beat_performance_notes
- beat_id: B01
  emotional_goal: 平静里先压出威慑
  eye_action: 先不抬眼，开口前再锁定对手
  body_action: 手压电子秤边缘，肩膀不动
  pause_or_hold: 开口前停半拍
- beat_id: B02
  emotional_goal: 让对手先乱，再完成反压
  eye_action: 主角直视，对手开始闪躲
  body_action: 主角逼近半步，对手后退并碰开零钱夹
  reaction_timing: 零钱夹松动后给对手一个短停顿

## action_continuity_chains
- chain_01：抬眼 -> 压手 -> 逼近半步，handoff 到对手后退与零钱夹失手。

## emotion_continuity_chains
- chain_emo_01：平静 -> 审视 -> 紧张升级 -> 压场释放。

## continuity_rules
- 保持老奶奶左侧主动位、对手右侧退缩位、零钱夹手部连续性。
- 主角全程不能演成怒吼，只能靠控制力施压。

## storyboard_handoff
- 需要中近景捕捉眼神、手部和迟疑 reaction。
- 保持左压右退的 blocking，并交代电子秤与零钱夹状态变化。

## risk_notes
- 不要把压场演成怒吼。

## next_action
进入 storyboard 阶段分配反应镜头与停顿时值。`;

const validAudioDesignBody = `## voice_direction
### voice_identity_lock
老奶奶保持低频压场、句尾收紧；对手保持先硬后虚的发声路径，跨段不切换成另一种声线。

### breath_pause_pattern
老奶奶关键压迫句前有半拍吸气，抬眼前停顿半秒；对手反击句前先短促换气。

### speaker_voice_notes
- 老奶奶：中低频、慢半拍、压场感强，句尾略压低。
- 对手：起句偏硬、后半句发虚，遇到压场时语速被迫放慢。

### segment_voice_continuity
Segment 01 建立两人声线差异；Segment 02 延续老奶奶压场节奏；Segment 03 对手语气继续发虚，不得突然切成轻松旁白腔。

### dialogue_or_narration_plan
对白重读落在“多少钱”“别装糊涂”等关键词；若拆成多段视频，旁白与对白的语速和停顿规则必须保持一致。

## music_design
### BGM
轻微街头律动，冲突升级时低频略压。

## foley_design
### Foley-SFX
电子秤按键、零钱夹弹开、鞋底挪步声。

## ambience_design
### Ambience
街口车流远噪、人群碎语、篷布摩擦。

## segment_audio_plan
### Segment 01
### Silence
抬眼前压低环境，形成停顿张力。

## video_prompt_handoff
下游 video_prompts 必须继承 BGM、Foley-SFX、Ambience、Silence、段间声音钩子，以及老奶奶/对手已锁定的人声节奏与停顿习惯。

## risk_notes
- 音效不要盖住关键对白。

## next_action
进入 video_prompts 阶段展开每段声音执行块。`;

describe('SceneForge validator', () => {
  it('fails design when required core artifacts are missing', async () => {
    await writeDesignArtifact('design_prompts');

    const result = await validateSceneStage(tmpDir, 'design');

    expect(result.status).toBe('failed');
    expect(result.errors.map((error) => error.code)).toEqual([
      'SCENE_DESIGN_PROMPTS_MISSING_SYSTEM_MARKERS',
      'SCENE_DESIGN_RHYTHM_CONTRACT_MISSING_SEGMENT_DURATION',
      'SCENE_DESIGN_RHYTHM_CONTRACT_MISSING_DENSITY_TABLE',
      'SCENE_DESIGN_RHYTHM_CONTRACT_MISSING_BOUNDARY_RULE',
      'SCENE_DESIGN_MISSING_CHARACTER_PROMPTS',
      'SCENE_DESIGN_MISSING_SCENE_PROMPTS',
      'SCENE_DESIGN_MISSING_PROP_PROMPTS',
      'SCENE_DESIGN_MISSING_MASTER_REFERENCE_PROMPT',
    ]);
  });

  it('passes design when all required core artifacts are registered', async () => {
    await writeDesignArtifact('design_prompts', validDesignOverviewBody);
    await writeDesignArtifact(
      'character_prompts',
      `# 角色说明书

## 多视角
正面、3/4、侧面、背面。

## 轮廓剪影
外轮廓干净，老太太街头掌控者姿态明显。

## 表情系统
平静、自信、审视、轻蔑、得意、发火。

## 微表情
挑眉、抿嘴、眼角轻抬。

## 动作姿态
插兜站立、抬手示意、回头审视、快步逼近。

## 关键道具交互
与围裙口袋、手推车、零钱夹的交互关系明确。

## 细节区
面部年龄纹理、布料磨损、鞋面旧痕、手部骨感。

## 比例对照
与常见街头摊位和手推车高度对照。

## 边界约束
中文主导，非海报，禁止单人英雄海报化构图。`,
    );
    await writeDesignArtifact('scene_prompts', validSceneReferenceBoardBody);
    await writeDesignArtifact('prop_prompts');
    await writeDesignArtifact('master_reference_prompt');

    const result = await validateSceneStage(tmpDir, 'design');

    expect(result.status).toBe('passed');
    expect(result.errors).toEqual([]);
    expect(result.validatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('accepts character prompts when LLM uses 角色设计板 heading alias', async () => {
    await writeDesignArtifact('design_prompts', validDesignOverviewBody);
    await writeDesignArtifact(
      'character_prompts',
      `# 角色设计板

## 多视角
正面、3/4、侧面、背面。

## 轮廓剪影
外轮廓干净，老太太街头掌控者姿态明显。

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
    );
    await writeDesignArtifact('scene_prompts', validSceneReferenceBoardBody);
    await writeDesignArtifact('prop_prompts');
    await writeDesignArtifact('master_reference_prompt');

    const result = await validateSceneStage(tmpDir, 'design');
    expect(result.status).toBe('passed');
    expect(result.errors).toEqual([]);
  });

  it('accepts non-face cooking character prompts when micro expression is explicitly marked not applicable', async () => {
    await writeDesignArtifact('design_prompts', validDesignOverviewBody);
    await writeDesignArtifact(
      'character_prompts',
      `# 角色说明书

## 多视角
俯视锅内、灶台侧视、手部近景、出锅成品斜前视。

## 轮廓剪影
番茄块、蛋液、锅铲和手部工作姿态轮廓清楚。

## 表情系统
本项目不靠脸部表情推进，而靠食材状态、锅内节奏和手部动作强弱表达情绪变化。

## 动作姿态
打蛋、翻炒、颠锅、起锅装盘的手部姿态连续明确。

## 关键道具交互
鸡蛋、番茄、锅铲、炒锅、盘子之间的交互顺序与接触关系明确。

## 细节区
蛋液凝固层次、番茄出汁状态、锅边油光与蒸汽变化。

## 比例对照
鸡蛋、番茄块、锅铲与炒锅口径比例统一。

## 边界约束
无人脸、非人脸主角、无面部特写；本项目以手部动作、食材状态、火候变化和器具交互为主。

## 微表情
不适用：本项目为番茄炒蛋料理制作视频，不涉及人脸或面部近景，以手部动作、食材状态、火候变化和器具交互表达情绪与节奏。`,
    );
    await writeDesignArtifact('scene_prompts', validSceneReferenceBoardBody);
    await writeDesignArtifact('prop_prompts');
    await writeDesignArtifact('master_reference_prompt');

    const result = await validateSceneStage(tmpDir, 'design');
    expect(result.status).toBe('passed');
    expect(result.errors).toEqual([]);
  });

  it('fails design when character prompts degrade into a light poster-style summary', async () => {
    await writeDesignArtifact('design_prompts', validDesignOverviewBody);
    await writeDesignArtifact(
      'character_prompts',
      `# 角色设计板提示词

## 角色核心设定
80岁街头掌控者，时髦老奶奶。

Character design sheet, multi-view, an 80-year-old stylish grandma with silver hair.
single portrait, cinematic portrait, hero poster.`,
    );
    await writeDesignArtifact('scene_prompts', validSceneReferenceBoardBody);
    await writeDesignArtifact('prop_prompts');
    await writeDesignArtifact('master_reference_prompt');

    const result = await validateSceneStage(tmpDir, 'design');

    expect(result.status).toBe('failed');
    expect(result.errors.map((error) => error.code)).toEqual([
      'SCENE_DESIGN_CHARACTER_PROMPTS_MISSING_SECTIONS',
      'SCENE_DESIGN_CHARACTER_PROMPTS_NOT_CHINESE_LED',
      'SCENE_DESIGN_CHARACTER_PROMPTS_POSTER_DRIFT',
    ]);
  });

  it('fails design when overview and scene board miss space continuity markers', async () => {
    await writeDesignArtifact('design_prompts', '# 设定总览\n\n只有风格形容词，没有 continuity 结构。');
    await writeDesignArtifact(
      'character_prompts',
      `# 角色说明书

## 多视角
正面、3/4、侧面、背面。

## 轮廓剪影
轮廓稳定。

## 表情系统
惊讶、自信、紧张、喜悦、困惑、决心。

## 微表情
挑眉、抿嘴。

## 动作姿态
站立、转身、抬手、快步。

## 关键道具交互
与电子秤和零钱夹交互。

## 细节区
面部纹理、服装材质。

## 比例对照
与摊位和电子秤比例对照。

## 边界约束
中文主导，非海报。`,
    );
    await writeDesignArtifact('scene_prompts', '# 场景提示词\n\n一个热闹街头摊位。');
    await writeDesignArtifact('prop_prompts');
    await writeDesignArtifact('master_reference_prompt');

    const result = await validateSceneStage(tmpDir, 'design');

    expect(result.status).toBe('failed');
    expect(result.errors.map((error) => error.code)).toEqual([
      'SCENE_DESIGN_PROMPTS_MISSING_SYSTEM_MARKERS',
      'SCENE_DESIGN_RHYTHM_CONTRACT_MISSING_SEGMENT_DURATION',
      'SCENE_DESIGN_RHYTHM_CONTRACT_MISSING_DENSITY_TABLE',
      'SCENE_DESIGN_RHYTHM_CONTRACT_MISSING_BOUNDARY_RULE',
      'SCENE_DESIGN_SCENE_PROMPTS_MISSING_LAYOUT_MARKERS',
    ]);
  });

  it('fails design when rhythm contract misses duration, density table and boundary rule', async () => {
    await writeDesignArtifact(
      'design_prompts',
      `## visual_language
市井纪实感与轻喜剧压迫感并存。

## character_designs
角色数量：2。

## scene_designs
街口摊位、过道、收银台形成清晰前中后景。

## prop_designs
电子秤、零钱夹、塑料袋作为关键道具。

## space_continuity_seed
固定摊位朝向、角色左右站位与镜头轴线。

## prop_state_machines
电子秤从待机到称重，零钱夹从闭合到打开。

## blocking_map
老奶奶占据左前区，对手占据右中区。

## rhythm_contract
default_pacing_profile: balanced

## segment_rhythm_profiles
- segment_type: lyrical
  emphasis: 情绪呼吸

## cut_density_expectation
- lyrical: 偏低
- kinetic: 偏高

## boundary_rules
- 保持连续性。`,
    );
    await writeDesignArtifact(
      'character_prompts',
      `# 角色说明书

## 多视角
正面、3/4、侧面、背面。

## 轮廓剪影
轮廓稳定。

## 表情系统
惊讶、自信、紧张、喜悦、困惑、决心。

## 微表情
挑眉、抿嘴。

## 动作姿态
站立、转身、抬手、快步。

## 关键道具交互
与电子秤和零钱夹交互。

## 细节区
面部纹理、服装材质。

## 比例对照
与摊位和电子秤比例对照。

## 边界约束
中文主导，非海报。`,
    );
    await writeDesignArtifact('scene_prompts', validSceneReferenceBoardBody);
    await writeDesignArtifact('prop_prompts');
    await writeDesignArtifact('master_reference_prompt');

    const result = await validateSceneStage(tmpDir, 'design');

    expect(result.status).toBe('failed');
    expect(result.errors.map((error) => error.code)).toEqual([
      'SCENE_DESIGN_RHYTHM_CONTRACT_MISSING_SEGMENT_DURATION',
      'SCENE_DESIGN_RHYTHM_CONTRACT_MISSING_DENSITY_TABLE',
      'SCENE_DESIGN_RHYTHM_CONTRACT_MISSING_BOUNDARY_RULE',
    ]);
  });

  it('validates storyboard required artifacts', async () => {
    await writeStoryboardArtifact('storyboard_prompt_pack', validStoryboardPackBody);

    const failed = await validateSceneStage(tmpDir, 'storyboard');
    expect(failed.status).toBe('failed');
    expect(failed.errors.map((error) => error.code)).toEqual([
      'SCENE_STORYBOARD_MISSING_CONTROL_BOARD_PROMPTS',
      'SCENE_STORYBOARD_MISSING_STYLE_BOARD_PROMPTS',
      'SCENE_STORYBOARD_MISSING_MASTER_BOARD_PROMPT',
    ]);

    await writeStoryboardArtifact('control_board_prompts', validControlBoardPromptBody);
    await writeStoryboardArtifact('style_board_prompts', validStyleBoardPromptBody);
    await writeStoryboardArtifact('master_board_prompt');

    const passed = await validateSceneStage(tmpDir, 'storyboard');
    expect(passed.status).toBe('passed');
    expect(passed.errors).toEqual([]);
  });

  it('accepts storyboard pack plan written as multiline markdown bullets with quoted field names', async () => {
    await writeStoryboardArtifact('storyboard_prompt_pack', validStoryboardPackMultilineMarkdownBody);
    await writeStoryboardArtifact('control_board_prompts', validControlBoardPromptBody);
    await writeStoryboardArtifact('style_board_prompts', validStyleBoardPromptBody);
    await writeStoryboardArtifact('master_board_prompt');

    const result = await validateSceneStage(tmpDir, 'storyboard');
    expect(result.status).toBe('passed');
    expect(result.errors).toEqual([]);
  });

  it('accepts storyboard pack with numbered Title Case section headings (no snake_case literals)', async () => {
    const titleCasePackBody = `# Storyboard Prompt Pack: 放学路上的世界杯

## 1. Beat Skeleton (节拍骨架)
Beat 01 抛球启程，Beat 02 避障，Beat 03 冲向主场，Beat 04 凌空抽射，Beat 05 胜利狂欢。

## 2. Storyboard Content Breakdown (分镜内容拆解)
共 13 镜，Segment 1 街头 7 镜，Segment 2 小院 6 镜。

## 3. Cinematic Language Plan (镜头语言规划)
前段 kinetic 低机位跟拍，后段 balanced 逆光剪影。

## 4. Video Generation Units (视频生成单元)
VGU_01 街头 0-10s，VGU_02 小院 10-20s。

## 5. Shot Continuity Plan (镜头连续性计划)
书包摆动链、重心转换链、视线锁定链一致。

## 6. Continuity Control System (连续性控制系统)
轴线 L-to-R，10.0s boundary_lock。

## 7. Storyboard Prompt Pack Plan (故事板分包规划)
总镜头数：13。多包决策，拆成 2 包。
segment_duration_seconds: 10
- Segment 01 | time_range: 0-10s | pacing_profile: kinetic | shot_count: 7 | boundary_lock: true
- Segment 02 | time_range: 10-20s | pacing_profile: balanced | shot_count: 6 | boundary_lock: true

## 8. Storyboard Quality Check (故事板质量检查)
节拍对齐、无跨段、跨 Pack 衔接明确。

## 9. Design Reconciliation Review (设计一致性审查)
design_revision_required: false

<copy-block type="storyboard-pack" id="pack-01" label="故事板提示词 第01包">
## Pack 1:
Shot 01-07 街头盘带正式出板正文，含景别机位构图与叙事目的。
</copy-block>
<copy-block type="storyboard-pack" id="pack-02" label="故事板提示词 第02包">
## Pack 2:
Shot 08-13 小院射门庆祝正式出板正文。
</copy-block>`;

    await writeStoryboardArtifact('storyboard_prompt_pack', titleCasePackBody);
    await writeStoryboardArtifact('control_board_prompts', validControlBoardPromptBody);
    await writeStoryboardArtifact('style_board_prompts', validStyleBoardPromptBody);
    await writeStoryboardArtifact('master_board_prompt');

    const result = await validateSceneStage(tmpDir, 'storyboard');
    expect(result.status).toBe('passed');
    expect(result.errors).toEqual([]);
  });

  it('accepts storyboard pack segment plan in markdown table rows', async () => {
    const tablePlanBody = `# Storyboard Prompt Pack

## beat_skeleton
Beat 01 到 Beat 05 覆盖 20 秒。

## storyboard_content_breakdown
Segment 1 与 Segment 2 拆解。

## cinematic_language_plan
低机位与逆光剪影。

## video_generation_units
VGU_01 与 VGU_02。

## shot_continuity_plan
书包与轴线连续。

## continuity_control_system
boundary_lock 在 10.0s。

## storyboard_prompt_pack_plan
- **总镜头数 (total_shots)**：14
- **分包决策**：多包

| Segment ID | 时间区间 (time_range) | 段长 (seconds) | 节奏类型 (pacing_profile) | 镜头数 (shot_count) | 边界锁定 (boundary_lock) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Segment 1** | 0.0s - 10.0s | 10.0s | kinetic (高密度) | 8 | 10.0s |
| **Segment 2** | 10.0s - 20.0s | 10.0s | balanced (中密度) | 6 | 20.0s |

## storyboard_quality_check
检查通过。

## design_reconciliation_review
design_revision_required: false

<copy-block type="storyboard-pack" id="pack-01" label="故事板提示词 第01包">
## Pack 1:
正式 Pack 正文。
</copy-block>`;

    await writeStoryboardArtifact('storyboard_prompt_pack', tablePlanBody);
    await writeStoryboardArtifact('control_board_prompts', validControlBoardPromptBody);
    await writeStoryboardArtifact('style_board_prompts', validStyleBoardPromptBody);
    await writeStoryboardArtifact('master_board_prompt');

    const result = await validateSceneStage(tmpDir, 'storyboard');
    expect(result.status).toBe('passed');
    expect(result.errors).toEqual([]);
  });

  it('accepts storyboard pack segment plan in prose bullet lines (segment_duration_seconds 锁定为)', async () => {
    const prosePlanBody = `# Storyboard Prompt Pack

## beat_skeleton
Segment 1 与 Segment 2。

## storyboard_content_breakdown
14 镜拆解。

## cinematic_language_plan
低机位与逆光。

## video_generation_units
VGU_01 与 VGU_02。

## shot_continuity_plan
轴线连续。

## continuity_control_system
boundary_lock。

## storyboard_prompt_pack_plan
- **总镜头数 (total_shots)**: 14 个镜头
- **分包决策**: 多包
- **分段参数锁定**:
  - \`segment_duration_seconds\` 锁定为 10 秒。
  - **Segment 1**: 时间区间 \`0.0s - 10.0s\`，节奏类型 \`kinetic\`，镜头数 \`8\`，边界锁定 \`boundary_lock: 10.0s\`。
  - **Segment 2**: 时间区间 \`10.0s - 20.0s\`，节奏类型 \`balanced\`，镜头数 \`6\`，边界锁定 \`boundary_lock: 10.0s\`。

## storyboard_quality_check
检查通过。

## design_reconciliation_review
design_revision_required: false

<copy-block type="storyboard-pack" id="pack-01" label="故事板提示词 第01包">
## Pack 1:
正式 Pack 正文。
</copy-block>`;

    await writeStoryboardArtifact('storyboard_prompt_pack', prosePlanBody);
    await writeStoryboardArtifact('control_board_prompts', validControlBoardPromptBody);
    await writeStoryboardArtifact('style_board_prompts', validStyleBoardPromptBody);
    await writeStoryboardArtifact('master_board_prompt');

    const result = await validateSceneStage(tmpDir, 'storyboard');
    expect(result.status).toBe('passed');
    expect(result.errors).toEqual([]);
  });

  it('accepts control board with 画面内控制标注 and static camera wording', async () => {
    const controlBody = `<copy-block type="storyboard-pack" id="pack-01" label="控制板提示词 第01包">
## Pack 1: 测试包

## Control-Oriented Storyboard Board

### 画面区 (Screen Area)

#### Shot 01
- **画面描述**：中景，低角度。构图重心在画面右下，主体姿态疲惫前行，前景石子路，背景红砖墙，侧光斜射，质感粗糙，跟拍推进，此镜头用于建立情绪。
- **画面内控制标注**：
  - **红色人物运动箭头**：在男孩脚部标出向前红色折线箭头。
  - **蓝色摄影机运动箭头**：画面内无摄影机运动，显式标注“固定机位”。

### 控制区
#### Panel Layout
1x1
#### Beat Line
beat_01
#### Camera Path
固定机位
#### Action Path
步行
#### Continuity Rules
轴线锁定
#### Color Legend
红=人物，蓝=镜头
</copy-block>`;

    await writeStoryboardArtifact('storyboard_prompt_pack', validStoryboardPackBody);
    await writeStoryboardArtifact('control_board_prompts', controlBody);
    await writeStoryboardArtifact('style_board_prompts', validStyleBoardPromptBody);
    await writeStoryboardArtifact('master_board_prompt');

    const result = await validateSceneStage(tmpDir, 'storyboard');
    const arrowError = result.errors.find((e) => e.code === 'SCENE_STORYBOARD_CONTROL_PROMPT_MISSING_ARROW_RULES');
    expect(arrowError).toBeUndefined();
  });

  it('infers segment duration from uniform segment plans when the explicit field is omitted', async () => {
    await writeStoryboardArtifact(
      'storyboard_prompt_pack',
      `<copy-block type="storyboard-pack" id="pack-01" label="故事板提示词 第01包">
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
总镜头数：12。单包 12 格，控制板与风格板双交付。
- Segment 01 | time_range: 0-10s | pacing_profile: balanced | shot_count: 6 | boundary_lock: true
- Segment 02 | time_range: 10-20s | pacing_profile: balanced | shot_count: 6 | boundary_lock: true

## storyboard_quality_check
检查角色重复、空间漂移、动作不连贯。

## design_reconciliation_review
design_revision_required: false
</copy-block>`,
    );
    await writeStoryboardArtifact('control_board_prompts', validControlBoardPromptBody);
    await writeStoryboardArtifact('style_board_prompts', validStyleBoardPromptBody);
    await writeStoryboardArtifact('master_board_prompt');

    const result = await validateSceneStage(tmpDir, 'storyboard');
    expect(result.status).toBe('passed');
    expect(result.errors).toEqual([]);
  });

  it('fails storyboard when pack and board prompts lack formal delivery structure', async () => {
    await writeStoryboardArtifact('storyboard_prompt_pack', '# Storyboard Pack\n\nOnly shot list, no Chinese-led pack plan, no total_shots, no single/multi pack decision.');
    await writeStoryboardArtifact(
      'control_board_prompts',
      '# Control Board Prompt\n\nA tabular shot list with no formal board prompt and no arrow rules.',
    );
    await writeStoryboardArtifact(
      'style_board_prompts',
      '# Style Board Prompt\n\nOnly some style words, no formal board prompt structure.',
    );
    await writeStoryboardArtifact('master_board_prompt');

    const result = await validateSceneStage(tmpDir, 'storyboard');

    expect(result.status).toBe('failed');
    expect(result.errors.map((error) => error.code).sort()).toEqual([
      'SCENE_STORYBOARD_CONTROL_PROMPT_MISSING_ARROW_RULES',
      'SCENE_STORYBOARD_CONTROL_PROMPT_MISSING_CONTROL_SECTIONS',
      'SCENE_STORYBOARD_CONTROL_PROMPT_MISSING_FORMAT',
      'SCENE_STORYBOARD_CONTROL_PROMPT_NOT_CHINESE_LED',
      'SCENE_STORYBOARD_CONTROL_PROMPT_THIN_VISUAL_DESCRIPTION',
      'SCENE_STORYBOARD_PACK_MISSING_COPY_BLOCKS',
      'SCENE_STORYBOARD_PACK_MISSING_PACK_PLAN_RULES',
      'SCENE_STORYBOARD_PACK_MISSING_RHYTHM_CONTRACT',
      'SCENE_STORYBOARD_PACK_MISSING_SYSTEM_MARKERS',
      'SCENE_STORYBOARD_PACK_NOT_CHINESE_LED',
      'SCENE_STORYBOARD_STYLE_PROMPT_MISSING_ARROW_RULES',
      'SCENE_STORYBOARD_STYLE_PROMPT_MISSING_FORMAT',
      'SCENE_STORYBOARD_STYLE_PROMPT_NOT_CHINESE_LED',
      'SCENE_STORYBOARD_STYLE_PROMPT_THIN_VISUAL_DESCRIPTION',
    ]);
  });

  it('validates video prompt required artifacts and formal pack structure', async () => {
    await writeVideoArtifact('video_prompt_pack_cn', '# 中文视频提示词\n\nSegment 01 only');

    const structureFailed = await validateSceneStage(tmpDir, 'video_prompts');
    expect(structureFailed.status).toBe('failed');
    expect(structureFailed.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        'SCENE_VIDEO_PROMPTS_MISSING_VIDEO_PROMPT_REVIEW',
        'SCENE_VIDEO_PROMPTS_MISSING_VIDEO_PROMPT_TRACE',
        'SCENE_VIDEO_PROMPTS_MISSING_PACK_MARKERS',
        'SCENE_VIDEO_PROMPTS_REVIEW_MISSING_MARKERS',
        'SCENE_VIDEO_PROMPTS_TRACE_MISSING_MARKERS',
        'SCENE_VIDEO_PROMPTS_MISSING_AUDIO_EXECUTION',
        'SCENE_VIDEO_PROMPTS_MISSING_COPY_READY_BLOCKS',
        'SCENE_VIDEO_PROMPTS_CN_NOT_CHINESE_LED',
        'SCENE_VIDEO_PROMPTS_MISSING_PACK_COVERAGE',
        'SCENE_VIDEO_PROMPTS_MISSING_COPY_BLOCKS',
        'SCENE_VIDEO_PROMPTS_MISSING_STORYBOARD_PACK_REFERENCES',
        'SCENE_VIDEO_PROMPTS_MISSING_VGU_TRACE',
        'SCENE_VIDEO_PROMPTS_MISSING_TIMECODE_FLOW',
      ]),
    );

    await writeVideoArtifact(
      'video_prompt_pack_cn',
      validVideoPromptPackBody.replace('# 视频提示词 第01包', '# 中文视频提示词 第01包'),
    );
    await writeVideoReviewArtifact();
    await writeVideoTraceArtifact();

    const passed = await validateSceneStage(tmpDir, 'video_prompts');
    expect(passed.status).toBe('passed');
    expect(passed.errors).toEqual([]);
  });

  it('accepts storyboard pack references as bullet 主参考/辅助参考 lines', async () => {
    const packBody = validVideoPromptPackBody.replace(
      `将"控制故事板 Pack 01"作为本段视频生成的顺序动作、镜头调度、空间关系和连续性主参考；将"风格故事板 Pack 01"作为角色渲染、场景质感、灯光影调、情绪氛围和最终画面质量辅助参考。`,
      `- **动作与连续性主参考**: 控制故事板 Pack 01 (Control-Oriented Storyboard Board Pack 1)
- **渲染与氛围辅助参考**: 风格故事板 Pack 01 (Style & Rendering Storyboard Board Pack 1)`,
    );

    await writeVideoArtifact('video_prompt_pack_cn', packBody);
    await writeVideoReviewArtifact();
    await writeVideoTraceArtifact();

    const result = await validateSceneStage(tmpDir, 'video_prompts');
    expect(result.errors.map((e) => e.code)).not.toContain(
      'SCENE_VIDEO_PROMPTS_MISSING_STORYBOARD_PACK_REFERENCES',
    );
    expect(result.status).toBe('passed');
  });

  it('fails video prompts when the output drifts into english memo or compiled-prompt style', async () => {
    await writeVideoArtifact(
      'video_prompt_pack_cn',
      `# Video Prompt Pack 01

## video_prompt_pack_plan
Pack 01 covers storyboard Pack 01 and Segment 01.

## global_execution_preamble
Keep the same characters and continuity.

## 故事板关键帧参考规则
将"控制故事板 Pack 01"作为动作主参考，将"风格故事板 Pack 01"作为渲染辅助参考。

## 项目级全局锁定规则
two characters, street stall, no extra cast.

## Segment 01

### Segment 01 技术控制说明
compiled prompt memo, key-value, YAML style notes only.

### segment_sound_execution
#### BGM
urban pulse

#### Foley-SFX
bag rustle

#### Ambience
street noise

#### Silence
dramatic pause

### Segment 01 导演长版提示词
Segment 总时间轴：00:00-00:10
C01 [00:00-00:02] Wide shot.
C02 [00:02-00:05] Mid shot.
English compiled prompt with Chinese notes.`,
    );
    await writeVideoReviewArtifact();
    await writeVideoTraceArtifact();

    const result = await validateSceneStage(tmpDir, 'video_prompts');

    expect(result.status).toBe('failed');
    expect(result.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        'SCENE_VIDEO_PROMPTS_CN_NOT_CHINESE_LED',
        'SCENE_VIDEO_PROMPTS_MISSING_PROJECT_LOCK_RULE_ITEMS',
        'SCENE_VIDEO_PROMPTS_MISSING_DIRECTOR_PROMPT_DETAILS',
        'SCENE_VIDEO_PROMPTS_FORMAT_DRIFT',
      ]),
    );
  });

  it('fails video prompts when pack count drifts from storyboard multi-pack plan', async () => {
    await writeStoryboardArtifact(
      'storyboard_prompt_pack',
      validStoryboardPackBody.replace('总镜头数：13。单包 13 格，控制板与风格板双交付；若超过 12 镜头则多包并按连续动作段拆包。', '总镜头数：19。多包。Pack 1 覆盖 Shot 01-06，Pack 2 覆盖 Shot 07-12，Pack 3 覆盖 Shot 13-19。'),
    );
    await writeVideoArtifact(
      'video_prompt_pack_cn',
      validVideoPromptPackBody.replace('对应 Segment 01-02，先建立人物和空间，再推进冲突升级。', '对应 Segment 01-02，先建立人物和空间，再推进冲突升级。'),
    );
    await writeVideoReviewArtifact();
    await writeVideoTraceArtifact();

    const result = await validateSceneStage(tmpDir, 'video_prompts');
    expect(result.status).toBe('failed');
    expect(result.errors.map((error) => error.code)).toContain(
      'SCENE_VIDEO_PROMPTS_PACK_MISMATCH_WITH_STORYBOARD',
    );
  });

  it('fails storyboard when storyboard_prompt_pack omits pack-level copy-block', async () => {
    await writeStoryboardArtifact(
      'storyboard_prompt_pack',
      validStoryboardPackBody.replace(/^<copy-block[\s\S]*?>\n?/, '').replace(/\n?<\/copy-block>$/, ''),
    );
    await writeStoryboardArtifact('control_board_prompts', validControlBoardPromptBody);
    await writeStoryboardArtifact('style_board_prompts', validStyleBoardPromptBody);
    await writeStoryboardArtifact('master_board_prompt');

    const result = await validateSceneStage(tmpDir, 'storyboard');

    expect(result.status).toBe('failed');
    expect(result.errors.map((error) => error.code)).toContain(
      'SCENE_STORYBOARD_PACK_MISSING_COPY_BLOCKS',
    );
  });

  it('accepts storyboard boards that use the full red/blue arrow wording', async () => {
    await writeStoryboardArtifact('storyboard_prompt_pack', validStoryboardPackBody);
    await writeStoryboardArtifact('control_board_prompts', validControlBoardPromptBody);
    await writeStoryboardArtifact('style_board_prompts', validStyleBoardPromptBody);
    await writeStoryboardArtifact('master_board_prompt');

    const result = await validateSceneStage(tmpDir, 'storyboard');

    expect(result.status).toBe('passed');
    expect(result.errors).toEqual([]);
  });

  it('fails storyboard when control board visual description is too thin', async () => {
    await writeStoryboardArtifact('storyboard_prompt_pack', validStoryboardPackBody);
    await writeStoryboardArtifact(
      'control_board_prompts',
      validControlBoardPromptBody.replace(
        /### 画面区[\s\S]*?### 控制区/u,
        `### 画面区
一句画面概述，红色人物运动箭头和蓝色摄影机运动箭头都在分镜画面区内部。

### 控制区`,
      ),
    );
    await writeStoryboardArtifact('style_board_prompts', validStyleBoardPromptBody);
    await writeStoryboardArtifact('master_board_prompt');

    const result = await validateSceneStage(tmpDir, 'storyboard');

    expect(result.status).toBe('failed');
    expect(result.errors.map((error) => error.code)).toContain(
      'SCENE_STORYBOARD_CONTROL_PROMPT_THIN_VISUAL_DESCRIPTION',
    );
  });

  it('fails storyboard when segment plan crosses the configured boundary', async () => {
    await writeStoryboardArtifact(
      'storyboard_prompt_pack',
      validStoryboardPackBody.replace(
        '- Segment 02 | time_range: 10-20s | pacing_profile: lyrical | shot_count: 6 | boundary_lock: true',
        '- Segment 02 | time_range: 9-13s | pacing_profile: lyrical | shot_count: 6 | boundary_lock: true',
      ),
    );
    await writeStoryboardArtifact('control_board_prompts', validControlBoardPromptBody);
    await writeStoryboardArtifact('style_board_prompts', validStyleBoardPromptBody);
    await writeStoryboardArtifact('master_board_prompt');

    const result = await validateSceneStage(tmpDir, 'storyboard');
    expect(result.status).toBe('failed');
    expect(result.errors.map((error) => error.code)).toContain(
      'SCENE_STORYBOARD_PACK_SEGMENT_BOUNDARY_CROSSED',
    );
  });

  it('fails storyboard when shot density falls outside the hard duration range', async () => {
    await writeStoryboardArtifact(
      'storyboard_prompt_pack',
      validStoryboardPackBody.replace(
        '- Segment 01 | time_range: 0-10s | pacing_profile: balanced | shot_count: 7 | boundary_lock: true',
        '- Segment 01 | time_range: 0-10s | pacing_profile: balanced | shot_count: 4 | boundary_lock: true',
      ),
    );
    await writeStoryboardArtifact('control_board_prompts', validControlBoardPromptBody);
    await writeStoryboardArtifact('style_board_prompts', validStyleBoardPromptBody);
    await writeStoryboardArtifact('master_board_prompt');

    const result = await validateSceneStage(tmpDir, 'storyboard');
    expect(result.status).toBe('failed');
    expect(result.errors.map((error) => error.code)).toContain(
      'SCENE_STORYBOARD_PACK_INVALID_SHOT_DENSITY',
    );
  });

  it('warns storyboard when pacing profile and shot density do not match', async () => {
    await writeStoryboardArtifact(
      'storyboard_prompt_pack',
      validStoryboardPackBody
        .replace('总镜头数：13。', '总镜头数：17。')
        .replace(
          '- Segment 01 | time_range: 0-10s | pacing_profile: balanced | shot_count: 7 | boundary_lock: true',
          '- Segment 01 | time_range: 0-10s | pacing_profile: lyrical | shot_count: 11 | boundary_lock: true',
        ),
    );
    await writeStoryboardArtifact('control_board_prompts', validControlBoardPromptBody);
    await writeStoryboardArtifact('style_board_prompts', validStyleBoardPromptBody);
    await writeStoryboardArtifact('master_board_prompt');

    const result = await validateSceneStage(tmpDir, 'storyboard');
    expect(result.status).toBe('passed');
    expect(result.errors.map((error) => error.code)).toEqual([
      'SCENE_STORYBOARD_PACK_PACING_MISMATCH',
    ]);
  });

  it('fails video prompts when video_prompt_pack_cn omits pack-level copy-block', async () => {
    await writeVideoArtifact(
      'video_prompt_pack_cn',
      validVideoPromptPackBody.replace(/^<copy-block[\s\S]*?>\n?/, '').replace(/\n?<\/copy-block>$/, ''),
    );
    await writeVideoReviewArtifact();
    await writeVideoTraceArtifact();

    const result = await validateSceneStage(tmpDir, 'video_prompts');

    expect(result.status).toBe('failed');
    expect(result.errors.map((error) => error.code)).toContain(
      'SCENE_VIDEO_PROMPTS_MISSING_COPY_BLOCKS',
    );
  });

  it('accepts natural-language next handoff variants in technical control blocks', async () => {
    await writeVideoArtifact(
      'video_prompt_pack_cn',
      validVideoPromptPackBody.replace('next_handoff 交给下一段的对手迟疑反应。', '下一段交接给对手迟疑反应镜头。'),
    );
    await writeVideoReviewArtifact();
    await writeVideoTraceArtifact();

    const result = await validateSceneStage(tmpDir, 'video_prompts');
    expect(result.status).toBe('passed');
    expect(result.errors).toEqual([]);
  });

  it('accepts shot-style timecodes with en dash and decimal seconds', async () => {
    await writeVideoArtifact(
      'video_prompt_pack_cn',
      validVideoPromptPackBody
        .replace('C01 [00:00-00:02]', '**Shot 17 [00:26–00:27.5]**')
        .replace('C02 [00:02-00:05]', '**Shot 18 [00:27.5–00:28.5]**')
        .replace('C03 [00:05-00:10]', '**Shot 19 [00:28.5–00:30]**'),
    );
    await writeVideoReviewArtifact();
    await writeVideoTraceArtifact();

    const result = await validateSceneStage(tmpDir, 'video_prompts');
    expect(result.status).toBe('passed');
    expect(result.errors).toEqual([]);
  });

  it('accepts natural Chinese director prompt prose without literal marker words', async () => {
    await writeVideoArtifact(
      'video_prompt_pack_cn',
      validVideoPromptPackBody.replace(
        'C01 [00:00-00:02] 景别为广角建立镜头，机位低位平推，构图明确街口摊位与角色站位，动作聚焦老奶奶压场起势，情绪从冷静建立推进到压迫，道具状态锁定电子秤待机，声音承接 BGM、Foley-SFX、Ambience 与 Voice，负向边界禁止空间漂移与新增角色。',
        'C01 [00:00-00:02] 广角建立镜头，低位平推，前中后景关系清晰。老奶奶抬手起势并压迫对手，电子秤保持待机，严禁空间漂移与新增角色。',
      ),
    );
    await writeVideoReviewArtifact();
    await writeVideoTraceArtifact();

    const result = await validateSceneStage(tmpDir, 'video_prompts');
    expect(result.status).toBe('passed');
    expect(result.errors).toEqual([]);
  });

  it('accepts generic director prompt prose without relying on case-specific verbs or props', async () => {
    await writeVideoArtifact(
      'video_prompt_pack_cn',
      validVideoPromptPackBody
        .replace(
          'C01 [00:00-00:02] 景别为广角建立镜头，机位低位平推，构图明确街口摊位与角色站位，动作聚焦老奶奶压场起势，情绪从冷静建立推进到压迫，道具状态锁定电子秤待机，声音承接 BGM、Foley-SFX、Ambience 与 Voice，负向边界禁止空间漂移与新增角色。',
          'C01 [00:00-00:02] 广角建立镜头，低位平推，前中后景关系清晰。角色向前移动后短暂停顿，神态从冷静转为克制紧张，手中物件保持原位，严禁空间漂移与新增角色。',
        )
        .replace(
          'C02 [00:02-00:05] 景别切到中景并稳定逼近，机位锁定老奶奶左前主动位与对手右中受压位，构图保持前中后景明确，动作落在抬手示意与逼视对手，情绪持续施压，道具状态保持电子秤待机，声音承接延续前段张力，负向边界禁止角色换位。',
          'C02 [00:02-00:05] 中景稳定逼近，角色靠近对方后伸手示意，表情持续施压，物件仍保持既有状态，禁止角色换位。',
        )
        .replace(
          'C03 [00:05-00:10] 景别转入近景反应镜头，机位平稳锁定对手与零钱夹手部动作，构图强调受压反应与道具状态，动作落在对手迟疑后撤，情绪推进到受压收束，道具状态准备切入下一段，声音承接保持环境钩子与 Voice 节奏，负向边界禁止海报化定格。',
          'C03 [00:05-00:10] 近景反应镜头，固定视角，主体后退并转头，迟疑神态逐渐收束，物件从持有状态准备切换到下一段，避免海报化定格。',
        ),
    );
    await writeVideoReviewArtifact();
    await writeVideoTraceArtifact();

    const result = await validateSceneStage(tmpDir, 'video_prompts');
    expect(result.status).toBe('passed');
    expect(result.errors).toEqual([]);
  });

  it('accepts natural Chinese technical-control prose without literal blocking or prop-state labels', async () => {
    await writeVideoArtifact(
      'video_prompt_pack_cn',
      validVideoPromptPackBody.replace(
        '本段承接 VGU-01，continuity_in 为街口摊位建立镜头，continuity_out 为老奶奶抬手示意。blocking 维持老奶奶左前主动位与对手右中受压位，主轴线维持右后到左前，prop state 锁定电子秤开场待机并在结尾进入称重准备，next_handoff 交给下一段的对手迟疑反应。',
        '本段承接 VGU-01，对应街口摊位建立镜头到老奶奶抬手示意的连续推进。动作设计维持老奶奶左前主动位与对手右中受压位，主轴线保持右后到左前。道具状态要求电子秤开场待机并在结尾进入称重准备，下一步承接对手迟疑反应镜头。',
      ),
    );
    await writeVideoReviewArtifact();
    await writeVideoTraceArtifact();

    const result = await validateSceneStage(tmpDir, 'video_prompts');
    expect(result.status).toBe('passed');
    expect(result.errors).toEqual([]);
  });

  it('accepts technical-control prose with natural blocking description and next-step handoff wording', async () => {
    await writeVideoArtifact(
      'video_prompt_pack_cn',
      validVideoPromptPackBody.replace(
        '本段承接 VGU-01，continuity_in 为街口摊位建立镜头，continuity_out 为老奶奶抬手示意。blocking 维持老奶奶左前主动位与对手右中受压位，主轴线维持右后到左前，prop state 锁定电子秤开场待机并在结尾进入称重准备，next_handoff 交给下一段的对手迟疑反应。',
        '本段承接 VGU-01，从街口摊位建立镜头推进到老奶奶抬手示意。老奶奶位于左前主动位，对手保持右中受压位，主轴线维持右后到左前；电子秤开场待机并在结尾进入称重准备，下一步承接对手迟疑反应镜头。',
      ),
    );
    await writeVideoReviewArtifact();
    await writeVideoTraceArtifact();

    const result = await validateSceneStage(tmpDir, 'video_prompts');
    expect(result.status).toBe('passed');
    expect(result.errors).toEqual([]);
  });

  it('fails when director long prompt is reduced to very short timecode bullets', async () => {
    await writeVideoArtifact(
      'video_prompt_pack_cn',
      validVideoPromptPackBody.replace(
        /### Segment 01 导演长版提示词[\s\S]*$/,
        [
          '### Segment 01 导演长版提示词',
          'Segment 总时间轴：00:00-00:10',
          'C01 [00:00-00:02] 建立镜头。',
          'C02 [00:02-00:05] 对峙推进。',
        ].join('\n'),
      ),
    );
    await writeVideoReviewArtifact();
    await writeVideoTraceArtifact();

    const result = await validateSceneStage(tmpDir, 'video_prompts');
    expect(result.status).toBe('failed');
    expect(result.errors.map((error) => error.code)).toContain(
      'SCENE_VIDEO_PROMPTS_MISSING_DIRECTOR_PROMPT_DETAILS',
    );
  });

  it('validates reference formal boundary structure', async () => {
    await writeReferenceArtifact('# 参考说明\n\n保留原著气质，别太像原片。');

    const failed = await validateSceneStage(tmpDir, 'reference');
    expect(failed.status).toBe('failed');
    expect(failed.errors.map((error) => error.code)).toEqual([
      'SCENE_REFERENCE_NOTES_MISSING_MARKERS',
      'SCENE_REFERENCE_NOTES_MISSING_BOUNDARY_ROLES',
    ]);

    await writeReferenceArtifact(validReferenceNotesBody);
    const passed = await validateSceneStage(tmpDir, 'reference');
    expect(passed.status).toBe('passed');
    expect(passed.errors).toEqual([]);
  });

  it('accepts reference notes with Chinese ## headings via normalize on validate', async () => {
    const chineseOnly = `## 参考类型
混合参考

## 决策摘要
保留冲突母题。

## 创作方向
动画化转译，保留关系张力。

## 参考边界
### 主参考
原著母题

### 辅助参考
某版影视镜头功能

## 允许继承
- 剧情骨架

## 禁止继承
- 演员身份

## 必须保留
- 主冲突

## 必须避免
- 逐镜复刻

## 风险说明
- 造型过近

## 下一步
进入 story。`;
    await writeReferenceArtifact(chineseOnly);
    const result = await validateSceneStage(tmpDir, 'reference');
    expect(result.status).toBe('passed');
    expect(result.errors).toEqual([]);
  });

  it('validates topic gate formal brief structure while keeping score optional', async () => {
    await writeTopicGateArtifact('# 选题简报\n\n## 创作意图\n桥段重构\n');

    const failed = await validateSceneStage(tmpDir, 'topic_gate');
    expect(failed.status).toBe('failed');
    expect(failed.errors.map((error) => error.code)).toEqual([
      'SCENE_GATE_TOPIC_BRIEF_MISSING_SECTIONS',
      'SCENE_GATE_TOPIC_BRIEF_INVALID_DECISION',
      'SCENE_GATE_TOPIC_BRIEF_MISSING_DURATION',
      'SCENE_GATE_TOPIC_BRIEF_MISSING_STYLE_OPTIONS',
    ]);

    await writeTopicGateArtifact(
      buildTopicBriefMarkdown({
        intent: '80年代街头少年踢球回院子的短视频改编',
        totalDurationSec: 20,
        segmentDurationSec: 10,
      }),
    );
    const passed = await validateSceneStage(tmpDir, 'topic_gate');
    expect(passed.status).toBe('passed');
    expect(passed.errors).toEqual([]);
  });

  it('validates story formal beat skeleton structure', async () => {
    await writeStoryArtifact(`# logline
一个短故事。

## story_beats
- beat_id: B01
- beat_id: B02
- beat_id: B03`);

    const failed = await validateSceneStage(tmpDir, 'story');
    expect(failed.status).toBe('failed');
    expect(failed.errors.map((error) => error.code)).toEqual([
      'SCENE_STORY_DIRECTION_NOT_CHINESE_LED',
      'SCENE_STORY_DIRECTION_MISSING_MARKERS',
      'SCENE_STORY_DIRECTION_INVALID_BEAT_COUNT',
      'SCENE_STORY_DIRECTION_MISSING_BEAT_DETAILS',
    ]);

    await writeStoryArtifact(`## story_development_summary
围绕误会升级和压场反转建立 3 个 beat 的短片骨架。

## logline
一个短故事。

## story_premise
短片误会故事。

## duration_target
target_total_duration_seconds: 45
rationale: 3 个 beat 会偏紧，但用于验证数量下限。

## story_beats
- beat_id: B01
  title: 开场建立
  function: setup
  beat_summary: 建立人物关系和问题种子。
- beat_id: B02
  title: 冲突升级
  function: escalation
  beat_summary: 误会被放大，局势开始失衡。
- beat_id: B03
  title: 高潮反击
  function: climax
  beat_summary: 主角做出关键反击动作。

## character_functions
- character_name: 主角
  story_function: 推进误会并完成反击
  conflict_role: 承压后反击
  emotional_task: 从侥幸走向释放

## core_scene_functions
- scene_name: 摊位
  story_function: 承载冲突升级与反击
  required_beats:
    - B01
    - B02
    - B03

## key_prop_functions
- prop_name: 电子秤
  story_function: 制造误判并推动冲突升级
  required_beats:
    - B02

## emotional_arc
紧张到释放。

## hero_moment_candidates
- hero_id: H01
  title: 主角反击
  related_beat: B03
  reason: 承担情绪高潮和后续反转承接。

## ending_payoff
真相揭晓。

## story_risk_notes
- 结尾别太弱。

## next_action
进入 assets。`);
    const beatCountFailed = await validateSceneStage(tmpDir, 'story');
    expect(beatCountFailed.status).toBe('failed');
    expect(beatCountFailed.errors.map((error) => error.code)).toEqual([
      'SCENE_STORY_DIRECTION_INVALID_BEAT_COUNT',
    ]);

    await writeStoryArtifact(validStoryDirectionBody);
    const passed = await validateSceneStage(tmpDir, 'story');
    expect(passed.status).toBe('passed');
    expect(passed.errors).toEqual([]);
  });

  it('accepts markdown-emphasized story beat fields', async () => {
    await writeStoryArtifact(`## story_development_summary
围绕放学回家运球挑战建立 5 个 beat 的成长小故事。

## logline
小男孩一路运球回家，最终在院子里完成一脚漂亮射门。

## story_premise
用放学回家这段路上的连续控球挑战，推动节奏、情绪和最后的院中射门 payoff。

## duration_target
target_total_duration_seconds: 20
rationale: 5 个短 beat 适合 20 秒内容。

## story_beats
- **beat_id**: beat_01
  - **title**: 挑战开始
  - **function**: 建立主角目标与初始状态（Setup）
  - **beat_summary**: 小男孩在放学路上开启回家的运球挑战。
- **beat_id**: beat_02
  - **title**: 避开水坑
  - **function**: 引入环境阻碍，展现角色技巧（Progression）
  - **beat_summary**: 男孩灵活拨球，避开积水与碎砖。
- **beat_id**: beat_03
  - **title**: 临门一脚的门槛
  - **function**: 场景转换，推向高潮前奏（Transition）
  - **beat_summary**: 男孩在院门口停球，抬头看向自制球门。
- **beat_id**: beat_04
  - **title**: 黄金射门
  - **function**: 故事的最高潮（Climax）
  - **beat_summary**: 男孩调整步伐后起脚怒射。
- **beat_id**: beat_05
  - **title**: 院子里的冠军
  - **function**: 情感释放与故事收尾（Payoff）
  - **beat_summary**: 足球入网，男孩在夕阳里欢呼。

## character_functions
- character_name: 小男孩
  story_function: 挑战执行者与情绪主轴
  conflict_role: 主动迎接挑战
  emotional_task: 从专注走向兴奋释放

## core_scene_functions
- scene_name: 放学路与小院门口
  story_function: 承接挑战推进与最终射门
  required_beats:
    - beat_01
    - beat_02
    - beat_03
    - beat_04

## key_prop_functions
- prop_name: 足球
  story_function: 串联动作挑战并兑现结尾 payoff
  required_beats:
    - beat_01
    - beat_02
    - beat_04

## emotional_arc
期待 -> 紧张 -> 屏息 -> 爆发 -> 满足

## hero_moment_candidates
- hero_id: H01
  title: 黄金射门
  related_beat: beat_04
  reason: 是动作与情绪的共同高潮。

## ending_payoff
足球精准入网，男孩在小院里完成属于自己的冠军时刻。

## story_risk_notes
- 中段路面障碍不要喧宾夺主。

## next_action
进入 assets 阶段锁定男孩、石子路、小院和足球。`);

    const result = await validateSceneStage(tmpDir, 'story');
    expect(result.status).toBe('passed');
    expect(result.errors).toEqual([]);
  });

  it('counts story beats from ### Beat N subsection headings', async () => {
    await writeStoryArtifact(`## story_development_summary
纪实披萨手作全过程。

## logline
面团到出炉的 20 秒蜕变。

## story_premise
手作温度与食物本真。

## duration_target
target_total_duration_seconds: 20

## story_beats

### Beat 1: 和面建立
*   **beat_id**: beat_01
*   **title**: 唤醒面团
*   **function**: Setup
*   **beat_summary**: 双手按压拉伸面团。

### Beat 2: 配料展开
*   **beat_id**: beat_02
*   **title**: 酱汁与配料
*   **function**: Setup Completion
*   **beat_summary**: 番茄酱螺旋抹开并撒芝士。

### Beat 3: 烈火推进
*   **beat_id**: beat_03
*   **title**: 烈火蜕变
*   **function**: Climax
*   **beat_summary**: 送入窑炉芝士融化冒泡。

### Beat 4: 出炉释放
*   **beat_id**: beat_04
*   **title**: 出炉瞬间
*   **function**: Falling Action
*   **beat_summary**: 托铲取出带蒸汽的成品。

### Beat 5: 分享收束
*   **beat_id**: beat_05
*   **title**: 酥脆终章
*   **function**: Resolution
*   **beat_summary**: 摇刀切块展示拉丝。

## character_functions
*   **匠人之手**: 引导节奏

## core_scene_functions
*   **准备工作台**: 故事起点

## key_prop_functions
*   **发酵面团**: 展现形变

## emotional_arc
平静到满足。

## hero_moment_candidates
*   窑炉芝士融化特写

## ending_payoff
切块拉丝收尾。

## story_risk_notes
节奏要紧凑。

## next_action
进入 design。`);

    const result = await validateSceneStage(tmpDir, 'story');
    expect(result.status).toBe('passed');
    expect(result.errors).toEqual([]);
  });

  it('validates assets formal lock structure', async () => {
    await writeAssetsArtifact(`# 资产规划
这里有角色、场景、道具的剧情功能说明，但没有正式锁定 section，也没有复用分类或道具处理分类，所以还不能供 design 阶段直接继承。`);

    const failed = await validateSceneStage(tmpDir, 'assets');
    expect(failed.status).toBe('failed');
    expect(failed.errors.map((error) => error.code)).toEqual([
      'SCENE_ASSET_PLAN_MISSING_MARKERS',
      'SCENE_ASSET_PLAN_MISSING_REUSE_STATUS',
      'SCENE_ASSET_PLAN_MISSING_PROP_STATUS',
    ]);

    await writeAssetsArtifact(validAssetPlanBody);
    const passed = await validateSceneStage(tmpDir, 'assets');
    expect(passed.status).toBe('passed');
    expect(passed.errors).toEqual([]);
  });

  it('accepts script_draft with Chinese section headings for risk and next action', async () => {
    await writeScriptArtifact(`## 剧本摘要
摘要内容足够长，用于通过语义校验的最小长度要求，并描述黄昏街道上的足球挑战。

## 分段策略
segment_duration_seconds: 10
Segment 1 (0-10s): 街头
Segment 2 (10-20s): 小院

## 故事节拍
- **beat_01 (0-3s)**: 启程
- **beat_02 (3-7s)**: 避障
- **beat_03 (7-10s)**: 进门

## 节拍表
| beat_01 | setup |

## 视频生成单元规划
### VGU 1 (0-10s)
- **Narrative Goal**: 运球
- **Pacing Profile**: Dynamic
- **Shot Density Hint**: 高动势拆镜头
### VGU 2 (10-20s)
- **Narrative Goal**: 射门
- **Pacing Profile**: Build-up
- **Shot Density Hint**: 中密度

## 剧本文本
### 段一
旁白：起跑。
动作：停顿抬眼。
### 段二
对白：走吧。
动作：蹬地抽射。

## 表演交接
- 停顿与视线节奏要明确。

## 分镜交接
- 镜头跟拍脚部。
- boundary_lock: 不得跨 10.0s 边界。

## 风险说明
- 节奏过紧。

## 下一步行动
- 进入分镜阶段。`);
    const result = await validateSceneStage(tmpDir, 'script');
    expect(result.status).toBe('passed');
    expect(result.errors).toEqual([]);
  });

  it('validates script formal handoff structure', async () => {
    await writeScriptArtifact('# 剧本\n\n## 第1段\n旁白：一句话。');
    const failed = await validateSceneStage(tmpDir, 'script');
    expect(failed.status).toBe('failed');
    expect(failed.errors.map((error) => error.code)).toContain('SCENE_SCRIPT_DRAFT_MISSING_MARKERS');

    await writeScriptArtifact(validScriptDraftBody);
    const passed = await validateSceneStage(tmpDir, 'script');
    expect(passed.status).toBe('passed');
    expect(passed.errors).toEqual([]);
  });

  it('validates performance formal sheet structure', async () => {
    await writePerformanceArtifact('情绪：生气。动作：抬手。');
    const failed = await validateSceneStage(tmpDir, 'performance');
    expect(failed.status).toBe('failed');
    expect(failed.errors.map((error) => error.code)).toContain(
      'SCENE_PERFORMANCE_DIRECTION_MISSING_MARKERS',
    );

    await writePerformanceArtifact(validPerformanceDirectionBody);
    const passed = await validateSceneStage(tmpDir, 'performance');
    expect(passed.status).toBe('passed');
    expect(passed.errors).toEqual([]);
  });

  it('validates audio formal layered structure', async () => {
    await writeAudioArtifact('加点背景音乐和环境音。');
    const failed = await validateSceneStage(tmpDir, 'audio');
    expect(failed.status).toBe('failed');
    expect(failed.errors.map((error) => error.code)).toContain(
      'SCENE_AUDIO_DESIGN_MISSING_MARKERS',
    );
    expect(failed.errors.map((error) => error.code)).toContain(
      'SCENE_AUDIO_DESIGN_MISSING_SOUND_LAYERS',
    );

    await writeAudioArtifact(validAudioDesignBody);
    const passed = await validateSceneStage(tmpDir, 'audio');
    expect(passed.status).toBe('passed');
    expect(passed.errors).toEqual([]);
  });

  it('does not require dialogue_or_narration_plan when audio declares no dialogue', async () => {
    const noDialogueAudioBody = `## voice_direction
本片为无台词（No-dialogue）叙事，角色的非言语人声是情感核心。

### voice_identity_lock
Boy_Hero 保持 8 岁男孩明亮、偏高的非言语发声特征，跨段不漂移。

### breath_pause_pattern
起跑前一次深呼吸，射门前短促憋气，进球后长呼气接大笑。

### speaker_voice_notes
- Boy_Hero：无对白，仅呼吸、轻哼、大笑等非言语人声。

### segment_voice_continuity
Segment 01 到 Segment 02 延续同一男孩非言语声线，不得突然变成成人旁白腔。

## music_design
### BGM
黄昏街头轻快底乐，进球后情绪上扬。

## foley_design
### Foley-SFX
球鞋蹭地、足球撞击、院门摆动。

## ambience_design
### Ambience
街口远噪、院内微风与鸟鸣。

## segment_audio_plan
### Segment 01
### Silence
撞门前 0.2 秒压低环境，突出蓄力。

## video_prompt_handoff
下游 video_prompts 继承 BGM、Foley-SFX、Ambience、Silence 与非言语人声节奏。

## risk_notes
- 无台词时表情与呼吸/笑声音轨必须对齐。

## next_action
进入 video_prompts 阶段。`;

    await writeAudioArtifact(noDialogueAudioBody);
    const result = await validateSceneStage(tmpDir, 'audio');
    expect(result.errors.map((e) => e.code)).not.toContain('SCENE_AUDIO_DESIGN_MISSING_DIALOGUE_PLAN');
    expect(result.status).toBe('passed');
  });

  it('rejects english-led audio body and accepts chinese foley aliases', async () => {
    await writeAudioArtifact(`## voice_direction
### voice_identity_lock
Narrator keeps a calm, neutral studio voice.
### breath_pause_pattern
Short inhale before each reveal sentence.
### speaker_voice_notes
- Narrator: calm, neutral, steady.
### segment_voice_continuity
Keep the same narrator tone across all segments.

## music_design
### BGM
Light tension bed.

## foley_design
### Foley
Cash register clicks and cloth friction.

## ambience_design
### Ambience
Street bed with low traffic noise.

## segment_audio_plan
### Segment 01
### Silence
Pause before reveal.

## video_prompt_handoff
Carry the same voice persona and sound hooks downstream.

## risk_notes
- Avoid over-compression.

## next_action
Move to video prompts.`);
    const englishLed = await validateSceneStage(tmpDir, 'audio');
    expect(englishLed.status).toBe('failed');
    expect(englishLed.errors.map((error) => error.code)).toContain(
      'SCENE_AUDIO_DESIGN_NOT_CHINESE_LED',
    );
    expect(englishLed.errors.map((error) => error.code)).not.toContain(
      'SCENE_AUDIO_DESIGN_MISSING_SOUND_LAYERS',
    );
  });

  const validPublishNotesBody = `# 发布说明

<copy-block type="cover_prompt" id="cover-landscape-4x3" label="横版封面 4:3">
横版 4:3，市井纪实暖调，老奶奶与街口摊位，侧逆光轮廓。
</copy-block>

<copy-block type="cover_prompt" id="cover-portrait-3x4" label="竖版封面 3:4">
竖版 3:4，同一视觉锚点，竖构图突出人物压场神态。
</copy-block>

<copy-block type="publish_meta" id="publish-title" label="发布标题">
街口老奶奶：三秒压场
</copy-block>

<copy-block type="publish_meta" id="publish-description" label="发布简介">
45 秒轻喜剧短片，误会升级与反转释放。
</copy-block>

<copy-block type="publish_meta" id="publish-tags" label="发布标签">
#市井喜剧 #短片 #AI视频
</copy-block>`;

  async function writePublishArtifact(content = validPublishNotesBody) {
    return writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'publish',
      artifactKey: 'publish_notes',
      kind: 'final',
      title: 'publish_notes',
      content,
      role: 'support_direction_asset',
      coreAsset: false,
      readableByDownstream: false,
    });
  }

  it('validates publish copy-block structure', async () => {
    await writePublishArtifact('# 发布\n\n无 copy-block');

    const failed = await validateSceneStage(tmpDir, 'publish');
    expect(failed.status).toBe('failed');
    expect(failed.errors.map((error) => error.code)).toContain(
      'SCENE_PUBLISH_MISSING_COPY_BLOCKS',
    );

    await writePublishArtifact(validPublishNotesBody);
    const passed = await validateSceneStage(tmpDir, 'publish');
    expect(passed.status).toBe('passed');
    expect(passed.errors).toEqual([]);
  });

  it('rejects publish_notes when cover copy-blocks are English-led', async () => {
    const englishCovers = `# 发布说明

<copy-block type="cover_prompt" id="cover-landscape-4x3" label="横版封面 4:3">
Pixar-style 3D animation, golden hour, warm nostalgic scene, aspect ratio 4:3 landscape orientation with volumetric sunlight and soft shadows across the entire frame.
</copy-block>

<copy-block type="cover_prompt" id="cover-portrait-3x4" label="竖版封面 3:4">
Pixar-style 3D animation, dynamic close-up, portrait orientation 3:4, high-fidelity stylized textures and clay-like rendering throughout the composition.
</copy-block>

<copy-block type="publish_meta" id="publish-title" label="发布标题">
放学路上的世界杯
</copy-block>

<copy-block type="publish_meta" id="publish-description" label="发布简介">
80 年代童年足球小故事。
</copy-block>

<copy-block type="publish_meta" id="publish-tags" label="发布标签">
#童年 #足球
</copy-block>`;

    await writePublishArtifact(englishCovers);
    const failed = await validateSceneStage(tmpDir, 'publish');
    expect(failed.status).toBe('failed');
    expect(failed.errors.map((error) => error.code)).toContain(
      'SCENE_PUBLISH_COVER_LANDSCAPE_4X3_NOT_CHINESE_LED',
    );
  });
});
