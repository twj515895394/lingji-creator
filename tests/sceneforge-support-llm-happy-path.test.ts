import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { createDirectLlmStageRunner } from '../electron/sceneforge/runners/scene-direct-llm-runner';
import { MOCK_LLM_SETTINGS } from './sceneforge-mock-llm-settings';
import { SceneForgeService } from '../electron/sceneforge/service';

let projectDir: string;
let service: SceneForgeService;

const VALID_REFERENCE_NOTES = `## reference_type
hybrid_reference

## decision_summary
保留冲突母题，镜头功能只借鉴不复刻。

## creative_direction_context
转成轻喜剧动画表达。

## reference_boundary
### primary_reference
原著母题

### secondary_reference
经典影视改编

### boundary_rule
允许继承剧情骨架，禁止照搬演员化表演。

## allowed_inheritance
- 剧情骨架
- 情绪核心

## forbidden_inheritance
- 真人演员身份绑定

## must_keep
- 主角压场反转

## must_avoid
- 逐镜复刻

## risk_notes
- 风格过近会削弱原创感。

## next_action
进入 story 阶段。`;

const VALID_STORY_DIRECTION = `## story_development_summary
围绕街口摊位误会升级与压场反转，用 4 个 beat 完成建立、升级、高潮与释放。

## logline
街口老奶奶在误会升级中反守为攻。

## story_premise
围绕误解升级与反转澄清建立轻喜剧短片。

## duration_target
target_total_duration_seconds: 45
rationale: 4 个 beat 适合 40-50 秒短片承载。

## story_beats
- beat_id: B01
  title: 摊位气压变化
  function: setup
  beat_summary: 老奶奶抬眼前先建立摊位关系和对手的轻视态度。
- beat_id: B02
  title: 误会升级
  function: escalation
  beat_summary: 对手一句话点燃冲突，电子秤和零钱夹成为压力触发器。
- beat_id: B03
  title: 老奶奶压场
  function: climax
  beat_summary: 主角用视线与手部动作压住全场，逼对手退缩。
- beat_id: B04
  title: 对手失衡收尾
  function: payoff
  beat_summary: 对手误判局势，反被主角镇住，笑点落地。

## character_functions
- character_name: 老奶奶
  story_function: 压场与完成情绪反转
  conflict_role: 主动压制对手
  emotional_task: 从平静到压场释放

## core_scene_functions
- scene_name: 街口摊位
  story_function: 承接建立、升级和压场主战场
  required_beats:
    - B01
    - B02
    - B03

## key_prop_functions
- prop_name: 电子秤
  story_function: 触发误会与动作压场锚点
  required_beats:
    - B02
    - B03

## emotional_arc
平静 -> 紧张 -> 反击 -> 释放。

## hero_moment_candidates
- hero_id: H01
  title: 老奶奶抬手压场
  related_beat: B03
  reason: 是表演、镜头和情绪的共同高潮锚点。

## ending_payoff
对手误判局势，反被主角镇住。

## story_risk_notes
- 中段不能过度拉长。

## next_action
进入 assets 阶段。`;

const VALID_ASSET_PLAN = `## story_function_summary
角色、场景与道具分别承担冲突推进、空间调度和 payoff 触发功能。

## character_assets
- role_name: 老奶奶
  reuse_status: reuse_tweak
  story_function: 压场与反转
- role_name: 对手
  reuse_status: new_light
  story_function: 制造压力并承接反应

## scene_assets
- scene_name: 街口摊位
  reuse_status: reuse_direct
  story_function: 冲突主战场

## prop_assets
- prop_name: 电子秤
  prop_status: new_core_prop
  handling_note: 触发剧情升级
- prop_name: 零钱夹
  prop_status: embed_in_character_or_scene
  handling_note: 承接手部动作

## design_actions
- tweak_targets: 老奶奶
- new_light_targets: 对手

## asset_lock_summary
- locked_characters: 老奶奶、对手
- locked_scenes: 街口摊位
- locked_props: 电子秤、零钱夹
- downstream_constraints: 不得新增未评估角色

## risk_notes
- 对手造型过强会抢戏。

## next_action
进入 design 阶段。`;

const VALID_SCRIPT_DRAFT = `## script_summary
45 秒摊位误会喜剧，按三段推进。

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
旁白：老奶奶刚一抬眼，摊位的气压都变了。
动作：她把手按在电子秤边上，停一秒再慢慢抬头。

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
- 建立镜头后切中近景，优先抓抬眼和压手。
- 第二段必须交代零钱夹被碰开，保持道具状态承接。
- 第三段保持左压右退的站位和主轴线稳定。
- boundary_lock: shots_must_not_cross_segment_boundary
- segment_boundary_note: 15 秒分段下，镜头与段级 handoff 不得出现 14s-18s 这类跨段区间。

## risk_notes
- 中段对白不要过长。

## next_action
进入 performance 阶段。`;

const VALID_PERFORMANCE_DIRECTION = `## character_performance_profiles
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
进入 storyboard 阶段。`;

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-support-llm-'));
  await createSceneForgeProject(projectDir);
  service = new SceneForgeService();
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('SceneForge support Direct LLM happy path', () => {
  it('generates performance without writing, then explicit submit passes validation', async () => {
    const runner = createDirectLlmStageRunner({
      loadSettings: async () => MOCK_LLM_SETTINGS,
      generateText: vi.fn().mockResolvedValue(
        JSON.stringify({ performance_direction: VALID_PERFORMANCE_DIRECTION }),
      ),
    });

    const runResult = await runner.run({
      projectDir,
      stage: 'performance',
      stageContext: await service.getStageContext(projectDir, 'performance', {
        runner: 'direct_llm',
      }),
      submitStageDraft: vi.fn(),
    });

    expect(runResult.artifacts).toEqual({
      performance_direction: VALID_PERFORMANCE_DIRECTION,
    });
    expect((await service.getProjectState(projectDir)).artifacts).toEqual([]);

    const submitted = await service.submitStageDraft({
      projectDir,
      stage: 'performance',
      artifacts: [
        {
          artifactKey: 'performance_direction',
          content: runResult.artifacts.performance_direction,
        },
      ],
    });

    expect(submitted.validation.status).toBe('passed');
    expect(submitted.artifactIds).toEqual(['performance.performance_direction']);
  });

  it('generates audio without writing, then explicit submit passes validation', async () => {
    const audioDraft = `## voice_direction
### voice_identity_lock
主讲人保持平稳克制，角色对白保持低频压场。
### breath_pause_pattern
关键句前短吸气，转折前留半拍。
### speaker_voice_notes
- 主讲人：平稳、克制。
- 角色：中低频、压迫感。
### segment_voice_continuity
各段保持同一发声质感，不突变成另一种腔调。
### dialogue_or_narration_plan
旁白与对白都沿用同一套重读与停顿规则。

## music_design
### BGM
分段配乐。

## foley_design
### Foley-SFX
关键动作音效。

## ambience_design
### Ambience
环境底噪与空间音。

## segment_audio_plan
### Segment 01
### Silence
关键停顿压低环境。

## video_prompt_handoff
下游继承 voice continuity 与 BGM / Foley-SFX / Ambience / Silence。

## risk_notes
- 人声不要漂移。

## next_action
进入 video_prompts。`;
    const runner = createDirectLlmStageRunner({
      loadSettings: async () => MOCK_LLM_SETTINGS,
      generateText: vi.fn().mockResolvedValue(
        JSON.stringify({ audio_design: audioDraft }),
      ),
    });

    const runResult = await runner.run({
      projectDir,
      stage: 'audio',
      stageContext: await service.getStageContext(projectDir, 'audio', {
        runner: 'direct_llm',
      }),
      submitStageDraft: vi.fn(),
    });

    expect(runResult.artifacts).toEqual({
      audio_design: audioDraft,
    });
    expect((await service.getProjectState(projectDir)).artifacts).toEqual([]);

    const submitted = await service.submitStageDraft({
      projectDir,
      stage: 'audio',
      artifacts: [
        {
          artifactKey: 'audio_design',
          content: runResult.artifacts.audio_design,
        },
      ],
    });

    expect(submitted.validation.status).toBe('passed');
    expect(submitted.artifactIds).toEqual(['audio.audio_design']);
  });

  it('generates reference without writing, then explicit submit passes validation', async () => {
    const runner = createDirectLlmStageRunner({
      loadSettings: async () => MOCK_LLM_SETTINGS,
      generateText: vi.fn().mockResolvedValue(
        JSON.stringify({
          reference_notes: VALID_REFERENCE_NOTES,
        }),
      ),
    });

    const runResult = await runner.run({
      projectDir,
      stage: 'reference',
      stageContext: await service.getStageContext(projectDir, 'reference', {
        runner: 'direct_llm',
      }),
      submitStageDraft: vi.fn(),
    });

    expect(runResult.artifacts.reference_notes).toContain('reference_type');
    expect((await service.getProjectState(projectDir)).artifacts).toEqual([]);

    const submitted = await service.submitStageDraft({
      projectDir,
      stage: 'reference',
      artifacts: [
        {
          artifactKey: 'reference_notes',
          content: runResult.artifacts.reference_notes,
        },
      ],
    });

    expect(submitted.validation.status).toBe('passed');
    expect(submitted.artifactIds).toEqual(['reference.reference_notes']);
  });

  it('generates story without writing, then explicit submit passes validation', async () => {
    const runner = createDirectLlmStageRunner({
      loadSettings: async () => MOCK_LLM_SETTINGS,
      generateText: vi.fn().mockResolvedValue(
        JSON.stringify({ story_direction: VALID_STORY_DIRECTION }),
      ),
    });
    const runResult = await runner.run({
      projectDir,
      stage: 'story',
      stageContext: await service.getStageContext(projectDir, 'story', {
        runner: 'direct_llm',
      }),
      submitStageDraft: vi.fn(),
    });

    expect((await service.getProjectState(projectDir)).artifacts).toEqual([]);
    const submitted = await service.submitStageDraft({
      projectDir,
      stage: 'story',
      artifacts: [{ artifactKey: 'story_direction', content: runResult.artifacts.story_direction }],
    });
    expect(submitted.validation.status).toBe('passed');
    expect(submitted.artifactIds).toEqual(['story.story_direction']);
  });

  it('generates assets without writing, then explicit submit passes validation', async () => {
    const runner = createDirectLlmStageRunner({
      loadSettings: async () => MOCK_LLM_SETTINGS,
      generateText: vi.fn().mockResolvedValue(
        JSON.stringify({ asset_plan: VALID_ASSET_PLAN }),
      ),
    });
    const runResult = await runner.run({
      projectDir,
      stage: 'assets',
      stageContext: await service.getStageContext(projectDir, 'assets', {
        runner: 'direct_llm',
      }),
      submitStageDraft: vi.fn(),
    });

    expect((await service.getProjectState(projectDir)).artifacts).toEqual([]);
    const submitted = await service.submitStageDraft({
      projectDir,
      stage: 'assets',
      artifacts: [{ artifactKey: 'asset_plan', content: runResult.artifacts.asset_plan }],
    });
    expect(submitted.validation.status).toBe('passed');
    expect(submitted.artifactIds).toEqual(['assets.asset_plan']);
  });

  it('generates script without writing, then explicit submit passes validation', async () => {
    const runner = createDirectLlmStageRunner({
      loadSettings: async () => MOCK_LLM_SETTINGS,
      generateText: vi.fn().mockResolvedValue(
        JSON.stringify({ script_draft: VALID_SCRIPT_DRAFT }),
      ),
    });
    const runResult = await runner.run({
      projectDir,
      stage: 'script',
      stageContext: await service.getStageContext(projectDir, 'script', {
        runner: 'direct_llm',
      }),
      submitStageDraft: vi.fn(),
    });

    expect(runResult.artifacts.script_draft).toContain('script_summary');
    expect((await service.getProjectState(projectDir)).artifacts).toEqual([]);
    const submitted = await service.submitStageDraft({
      projectDir,
      stage: 'script',
      artifacts: [{ artifactKey: 'script_draft', content: runResult.artifacts.script_draft }],
    });
    expect(submitted.validation.status).toBe('passed');
    expect(submitted.artifactIds).toEqual(['script.script_draft']);
  });
});
