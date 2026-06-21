import type { SceneStageId } from '../../types/sceneforge';

export type PrepSupportSubmitStage =
  | 'reference'
  | 'story'
  | 'assets'
  | 'script'
  | 'performance'
  | 'audio'
  | 'publish';

/** gate 之后、design 之前的支撑链 MVP */
export const PREP_SUPPORT_SUBMIT_STAGES = new Set<PrepSupportSubmitStage>([
  'reference',
  'story',
  'assets',
]);

/** design 之后、storyboard 之前的制作链支撑 MVP */
export const PRODUCTION_SUPPORT_SUBMIT_STAGES = new Set<PrepSupportSubmitStage>([
  'script',
  'performance',
  'audio',
  'publish',
]);

export const MARKDOWN_SUPPORT_SUBMIT_STAGES = new Set<SceneStageId>([
  ...PREP_SUPPORT_SUBMIT_STAGES,
  ...PRODUCTION_SUPPORT_SUBMIT_STAGES,
]);

export interface PrepSupportStageConfig {
  artifactKey: string;
  artifactLabel: string;
  placeholder: string;
  lead: string;
}

export const PREP_SUPPORT_STAGE_CONFIG: Record<PrepSupportSubmitStage, PrepSupportStageConfig> = {
  reference: {
    artifactKey: 'reference_notes',
    artifactLabel: '参考分析笔记',
    lead: '填写参考片、风格包或分析要点，提交后写入产物库并自动校验。',
    placeholder: `# 参考分析

## reference_type
hybrid_reference

## decision_summary
（一句话说明：本项目以什么为主参考，借什么，不借什么）

## creative_direction_context
（说明本轮改编的风格方向、表达目标与转译策略）

## reference_boundary
### primary_reference
（主参考：原著母题 / 核心设定 / 关键冲突）

### secondary_reference
（辅助参考：某版改编、某类镜头语言、某种风格气质）

### boundary_rule
（允许继承什么，禁止照搬什么）

## allowed_inheritance
- 剧情骨架
- 情绪核心

## forbidden_inheritance
- 可识别演员绑定
- 逐镜复刻

## must_keep
- （必须保留的母题 / 关系 / 视觉锚点）

## must_avoid
- （必须避开的旧版痕迹 / 风格风险）

## risk_notes
- （最可能误读或失控的地方）

## next_action
进入 story 阶段，基于上述边界继续拆故事骨架。
`,
  },
  story: {
    artifactKey: 'story_direction',
    artifactLabel: '故事方向',
    lead: '填写故事结构、改编方向或叙事要点，提交后自动校验。',
    placeholder: `# 故事方向

## story_development_summary
（一句话说明：这次具体讲什么、如何推进、高潮与 payoff 在哪里）

## logline
（一句话故事）

## story_premise
（用 2-3 句说明冲突、转折与改编 premise）

## duration_target
target_total_duration_seconds: 45
rationale: 4-6 个 beat，适合 40-60 秒短片承载。

## story_beats
- beat_id: B01
  title: 开场建立
  function: setup
  beat_summary: 建立主角、目标与当前局势。
  emotion_goal: 让观众快速进入关系与冲突前夜。
  dramatic_question: 接下来会出什么问题？
  payoff_seed: 埋下后续反转或升级伏笔。
- beat_id: B02
  title: 冲突升级
  function: escalation
  beat_summary: 第一轮误会或阻力出现，推动局势失衡。
  emotion_goal: 压力上升。
  dramatic_question: 主角还能不能扳回来？
  payoff_seed: 为高潮动作或台词埋钩子。
- beat_id: B03
  title: 高潮触发
  function: climax
  beat_summary: 核心动作、冲突爆点或情绪压场发生。
  emotion_goal: 紧张顶到最高点。
  dramatic_question: 结果会倒向哪边？
  payoff_seed: 为最后释放做承接。
- beat_id: B04
  title: 结尾释放
  function: payoff
  beat_summary: 误会揭晓、反击落地或笑点兑现。
  emotion_goal: 释放与回味。
  dramatic_question: 这个结局留下了什么记忆点？
  payoff_seed: 对应主反转或尾笑点。

## character_functions
- character_name: 主角
  story_function: 推动冲突与完成反转
  conflict_role: 主动发起或被动承压
  emotional_task: 从起势走到变化

## core_scene_functions
- scene_name: 主场景
  story_function: 承接 setup、升级与高潮
  required_beats:
    - B01
    - B02
    - B03

## key_prop_functions
- prop_name: 核心道具
  story_function: 触发误会、升级局势或兑现 payoff
  required_beats:
    - B02
    - B03

## emotional_arc
平静 -> 紧张 -> 高压 -> 释放

## hero_moment_candidates
- hero_id: H01
  title: 主角压场或反击瞬间
  related_beat: B03
  reason: 这是表演与画面共同的高潮锚点。

## ending_payoff
（一句话说明最后的反转 / 释放 / 尾笑点）

## story_risk_notes
- （中段是否拖沓、高潮是否过早、尾声是否不够响）

## next_action
进入 assets 阶段，把角色、场景、道具按剧情功能锁定下来。
`,
  },
  assets: {
    artifactKey: 'asset_plan',
    artifactLabel: '资产规划',
    lead: '填写角色/场景/道具等资产规划要点，提交后自动校验。',
    placeholder: `# 资产规划

## 角色
## 场景
`,
  },
  script: {
    artifactKey: 'script_draft',
    artifactLabel: '剧本草案',
    lead: '填写可录制、可表演、可分镜的正式剧本草案，提交后自动校验并作为 performance/storyboard 上游输入。',
    placeholder: `# 剧本草案

## script_summary
（一句话说明：本版剧本如何推进冲突、高潮与 payoff）

## segment_strategy
target_total_duration_seconds: 45
segment_duration_seconds: 15
segment_count: 3
segmentation_mode: equal_split
segment_01_time_range: 0-15s
segment_02_time_range: 15-30s
segment_03_time_range: 30-45s
rationale: 3 段递进，便于后续 storyboard 与 video_prompts 继承。

## story_beats
- beat_id: B01
  title: 开场建立
  function: setup
  beat_summary: 建立主角、对手与当前局势。
  emotion_goal: 让观众快速进入关系。
  visual_focus: 主角起势前的压场空间。
  action_focus: 视线试探、手部预备动作。
  performance_hint: 先收住，再释放。
- beat_id: B02
  title: 冲突升级
  function: escalation
  beat_summary: 对手一句话触发误会升级。
  emotion_goal: 压力上升。
  visual_focus: 核心道具与双方距离。
  action_focus: 抬手、后退、迟疑反应。
  performance_hint: 停顿后再推进。
- beat_id: B03
  title: 压场反击
  function: climax
  beat_summary: 主角用动作和眼神压住全场。
  emotion_goal: 高压释放。
  visual_focus: 眼神、手部、对手退缩。
  action_focus: 逼近、压手、卡住节奏。
  performance_hint: 动作克制但压迫感明确。

## beat_table
- beat_id: B01
  dramatic_role: setup
  emotional_turn: 平静 -> 审视
  action_chain_role: 建立电子秤与手部动作锚点
  continuity_risk: 开场站位不能漂移
  target_duration_seconds: 12
- beat_id: B02
  dramatic_role: escalation
  emotional_turn: 审视 -> 紧张
  action_chain_role: 对手后退与零钱夹被碰开
  continuity_risk: 道具状态要连续
  target_duration_seconds: 15
- beat_id: B03
  dramatic_role: climax_payoff
  emotional_turn: 紧张 -> 压场释放
  action_chain_role: 抬眼、压手、逼近半步
  continuity_risk: 视线与 screen side 不能反
  target_duration_seconds: 18

## video_generation_unit_plan
- vgu_id: VGU-01
  linked_beat_ids:
    - B01
  narrative_goal: 建立人物关系与主场景压迫感
  target_duration_seconds: 12
  pacing_profile: lyrical
  shot_density_hint: 低到中
  action_continuity_focus: 手靠近电子秤边缘
  emotion_continuity_focus: 平静里藏压迫
- vgu_id: VGU-02
  linked_beat_ids:
    - B02
    - B03
  narrative_goal: 让误会升级并完成压场反击
  target_duration_seconds: 33
  pacing_profile: kinetic
  shot_density_hint: 中到高
  bridge_required: true
  action_continuity_focus: 零钱夹位移、对手后退、主角逼近
  emotion_continuity_focus: 紧张持续抬升后释放

## script_body
## 第1段
旁白：街口摊位还没吵起来，空气已经先紧了一层。
动作：老奶奶把手停在电子秤边，先不抬眼，只让对手感到被盯住。

## 第2段
对白：你刚才说谁不懂规矩？
动作：她这句先压低，再抬眼；对手后退半步，手肘碰开零钱夹，节奏一下乱掉。

## 第3段
旁白：她不需要提高音量，手往前一压，场子就已经归她了。
动作：主角逼近半步，视线不躲；对手想解释却先卡住，最后只能收声。

## performance_handoff
- 主角关键表演锚点：停顿、抬眼、压手、逼近半步。
- 对手关键反应：先嘴硬，后迟疑，再在零钱夹失手时露出破绽。
- 节奏要求：第二段问句前先压半拍，第三段压场动作后留出 reaction hold。

## storyboard_handoff
- 建立镜头先锁摊位左右站位，再切中近景捕捉抬眼与手压电子秤。
- 第二段要交代零钱夹被碰开，避免下段道具状态断裂。
- 第三段优先给主角 eye-line 与对手退缩 reaction，保持主轴线稳定。
- boundary_lock: shots_must_not_cross_segment_boundary
- segment_boundary_note: 15 秒分段下，镜头与段级 handoff 不得出现 14s-18s 这类跨段区间。

## risk_notes
- 中段对白不要过长，避免把压场戏写成解释戏。
- 不要堆 design 级材质描写，重点保持动作与情绪可拍。

## next_action
进入 performance 阶段，把停顿、视线、手部动作和 reaction timing 细化成可执行表演表。
`,
  },
  performance: {
    artifactKey: 'performance_direction',
    artifactLabel: '表演指导',
    lead: '填写可直接交给 storyboard 的正式表演表，提交后自动校验（storyboard 依赖本阶段）。',
    placeholder: `# 表演指导

## character_performance_profiles
- character_id: C01
  character_name: 主角
  acting_energy: 外冷内压，动作克制但控制力强
  eye_focus_pattern: 先不看人，关键句前才抬眼锁定对手
  facial_expression_range: 细微压迫感，不靠怒吼
  body_language: 重心前压，手部动作少但准
  signature_gesture: 手压台面或核心道具后再开口
- character_id: C02
  character_name: 对手
  acting_energy: 先硬撑，后露怯
  eye_focus_pattern: 先直视，失势后开始闪躲
  facial_expression_range: 嘴硬 -> 犹豫 -> 被压住
  body_language: 站位逐渐后撤，动作开始乱
  signature_gesture: 解释前手先乱碰道具

## beat_performance_notes
- beat_id: B01
  emotional_goal: 平静里先压出威慑
  main_expression: 表情不大，但眼神尚未抬起时先给对手压力
  micro_expression: 嘴角轻收、下颌绷住
  eye_action: 先避实再锁定
  body_action: 手停在电子秤边缘，肩膀不动
  pause_or_hold: 开口前停半拍
  transition_to_next_beat: 用抬眼接到冲突升级
- beat_id: B02
  emotional_goal: 让对手先乱，再完成反压
  main_expression: 问句压低，情绪不炸但控制力增强
  micro_expression: 对手先怔住，再嘴硬
  eye_action: 主角直视，对手视线开始飘
  body_action: 主角逼近半步；对手后退、碰开零钱夹
  pause_or_hold: 对手碰开道具后留 reaction hold
  transition_to_next_beat: 用对手收声衔接压场释放

## action_continuity_chains
- chain_id: action_01
  source_beats:
    - B01
    - B02
  involved_characters: 主角、对手
  carry_over_action: 手贴电子秤边缘 -> 抬眼 -> 逼近半步
  handoff_signal: 主角问句前的停顿与对手后撤
  break_risk: 若中景切太快会丢失压手到逼近的连续性

## emotion_continuity_chains
- chain_id: emotion_01
  source_beats:
    - B01
    - B02
  involved_characters: 主角、对手
  emotion_arc: 平静审视 -> 紧张升级 -> 压场释放
  carry_over_expression: 主角一直不炸裂，只持续增加压迫感；对手从嘴硬转露怯
  reset_risk: 若对手 reaction 过大，会把主角压场戏演成争吵

## continuity_rules
- 视线连续性：主角的 eye-line 必须稳定压向对手，不能突然看向镜头外。
- blocking 连续性：主角保持左前主动位，对手保持右中受压位。
- 道具连续性：零钱夹从闭合到被碰开，电子秤始终是手部动作锚点。
- 情绪连续性：主角全程靠控制力压场，不改成爆发式吼叫。

## storyboard_handoff
- camera_focus_suggestions: 优先给抬眼、压手、零钱夹被碰开和对手迟疑 reaction。
- closeup_priority: 主角抬眼瞬间与对手卡住解释前的嘴角/眼神。
- reaction_shot_priority: 对手后退半步后的短停顿必须保留。
- blocking_support: 保持左压右退的 screen side。
- prop_state_support: 交代电子秤与零钱夹的状态变化。

## risk_notes
- 不要把表演写成抽象情绪词列表，必须保留可拍动作。
- 不要为了喜剧效果破坏主角的控制力。

## next_action
进入 storyboard 阶段，把 reaction timing、blocking 与道具连续性转成镜头调度。
`,
  },
  audio: {
    artifactKey: 'audio_design',
    artifactLabel: '声音设计',
    lead: '填写 BGM / 音效规划要点，提交后自动校验（video_prompts 依赖本阶段）。',
    placeholder: `# 声音设计

## 音乐
## 音效
`,
  },
  publish: {
    artifactKey: 'publish_notes',
    artifactLabel: '发布说明',
    lead: '填写横竖版封面提示词、标题、简介与标签；使用 copy-block 分块复制。提交后自动校验。',
    placeholder: `# 发布说明

<copy-block type="cover_prompt" id="cover-landscape-4x3" label="横版封面 4:3">
（横版 4:3 封面图提示词）
</copy-block>

<copy-block type="cover_prompt" id="cover-portrait-3x4" label="竖版封面 3:4">
（竖版 3:4 封面图提示词）
</copy-block>

<copy-block type="publish_meta" id="publish-title" label="发布标题">
（标题）
</copy-block>

<copy-block type="publish_meta" id="publish-description" label="发布简介">
（简介）
</copy-block>

<copy-block type="publish_meta" id="publish-tags" label="发布标签">
（标签，逗号或 # 分隔）
</copy-block>
`,
  },
};

export function getPrepSupportConfig(stage: SceneStageId): PrepSupportStageConfig | null {
  if (isMarkdownSupportSubmitStage(stage)) {
    return PREP_SUPPORT_STAGE_CONFIG[stage];
  }
  return null;
}

export function isMarkdownSupportSubmitStage(
  stage: SceneStageId,
): stage is PrepSupportSubmitStage {
  return MARKDOWN_SUPPORT_SUBMIT_STAGES.has(stage);
}
