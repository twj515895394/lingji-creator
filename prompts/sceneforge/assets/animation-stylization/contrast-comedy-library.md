# SceneForge v4 执行期反差喜剧资产库

> 位置：`assets/animation-stylization/contrast-comedy-library.md`
>
> 作用：供 SceneForge v4 流程执行读取的反差喜剧 / 反差表达资产库。
>
> 本库与 `assets/animation-stylization/effect-library.md` 配合使用：前者负责“反差笑点与角色记忆点”，后者负责“动画物理、VFX、动作伤害尺度”。

---

## 1. 使用原则

### 1.1 定义

```text
反差喜剧 = 观众预期 A 与画面实际 B 之间产生有意落差，形成笑点、角色记忆点或情绪释放。
```

典型例子：

```text
一个身形庞大、气场像动作片硬汉的超级奶爸，认真骑着一辆明显过小的小自行车。
```

该类表达不是纯剧本、纯表演或纯画面效果，而是跨阶段能力：

```text
剧本发起 → 角色成立 → 表演放大 → 分镜兑现 → 特效辅助
```

### 1.2 使用边界

```yaml
contrast_comedy_policy:
  use_when:
    - character_introduction
    - comedic_payoff
    - tension_release
    - hero_moment
    - visual_reveal
    - character_softening
  avoid_when:
    - serious_emotional_scene
    - climax_tension_without_release
    - repeated_same_gag
    - exposition_heavy_scene
    - scene_needs_clear_threat
  must_serve:
    - character
    - story
    - emotional_turn
    - visual_payoff
  must_not_be:
    - random_meme_stack
    - every_scene_gag
    - character_inconsistency
    - cheap_visual_noise
```

### 1.3 密度规则

```yaml
contrast_density_rules:
  project_level:
    max_core_contrasts_per_project: 2
    description: 一个项目最多抓 1 到 2 个核心反差母题。
  segment_level:
    max_hero_contrast_per_segment: 1
    description: 一个视频分段最多一个主反差笑点。
  beat_level:
    allow_minor_supporting_contrast: selective
    description: 小反差可作为辅助，但不能抢走主笑点。
  repetition_rule:
    avoid_repeated_same_gag: true
    require_variation_if_reused: true
```

---

## 2. 反差类型枚举：`contrast_types`

```yaml
contrast_types:
  size_mismatch:
    label: 体型反差
    description: 角色体型与道具、空间、对手或动作之间形成比例错位。

  prop_scale_irony:
    label: 道具比例反差
    description: 角色身份气质与所使用的小道具、可爱道具或不匹配道具形成反差。

  personality_gap:
    label: 性格反差
    description: 外表、身份或气场与真实性格不一致。

  identity_behavior_gap:
    label: 身份行为反差
    description: 角色社会身份或类型片身份与实际行为产生落差。

  emotion_gap:
    label: 情绪反差
    description: 场景整体情绪与某角色反应不一致。

  visual_context_gap:
    label: 画面语境反差
    description: 使用严肃、史诗、动作片或恐怖片画面语法拍摄生活化或荒诞行为。

  capability_gap:
    label: 能力反差
    description: 看起来弱的角色很强，看起来强的角色被小事难住。

  voice_body_gap:
    label: 声音体型反差
    description: 体型、外表与声音、语气、说话方式不匹配。

  status_object_gap:
    label: 身份道具反差
    description: 高身份或强气场人物使用低配、可爱、生活化或儿童化道具。

  genre_behavior_gap:
    label: 类型行为反差
    description: 用一个类型片的气氛承载另一个类型的行为。
```

---

## 3. 类型模板库

### 3.1 体型反差：`size_mismatch`

```yaml
size_mismatch:
  examples:
    - 大块头骑明显过小的小自行车
    - 高大硬汉坐儿童塑料椅
    - 巨大机器人端着迷你茶杯
    - 小角色拖着比自己大十倍的行李箱
    - 小宠物顶住巨大怪物
    - 巨人钻进迷你帐篷
    - 肌肉猛男小心翼翼坐旋转木马
  best_for:
    - character_introduction
    - character_softening
    - visual_payoff
    - short_video_memory_point
  performance_notes:
    - 角色越一本正经，反差越强
    - 道具可以轻微变形，但不要抢戏
    - 镜头要让观众清楚看到比例关系
  storyboard_notes:
    - 先用局部特写建立角色气场
    - 再用宽镜头 reveal 比例差
    - 保留 0.3 到 0.6 秒停顿
  vfx_support:
    - tiny_prop_squash
    - subtle_wobble
    - soft_tire_squeak
    - small_dust_puff
  avoid:
    - 反复使用同一种大小梗
    - 让核心人物显得愚蠢或失去能力
    - 用过度特效盖住比例反差
  prompt_fragment_cn: >
    通过体型与道具比例反差制造喜剧。角色身形庞大、气场压迫，却认真使用一个明显过小的道具。镜头先建立角色的强大外形，再切全身镜头揭示道具过小的反差，并停顿半秒让观众看清楚。
```

### 3.2 道具比例反差：`prop_scale_irony`

```yaml
prop_scale_irony:
  examples:
    - 硬汉拿粉色小饭盒
    - 反派撑儿童雨伞
    - 超级英雄骑共享单车
    - 黑帮大哥背小熊书包
    - 巨大怪兽用小勺子吃布丁
    - 高级特工从卡通贴纸盒里拿装备
  best_for:
    - personality_softening
    - identity_reveal
    - comedic_payoff
  performance_notes:
    - 角色不要主动吐槽道具
    - 让道具自然存在，反而更好笑
    - 道具越生活化，类型反差越强
  storyboard_notes:
    - 用严肃构图拍道具
    - 给道具一个清楚的特写
    - 再切回角色严肃表情
  avoid:
    - 道具与剧情完全无关
    - 道具过多导致梗堆叠
  prompt_fragment_cn: >
    使用道具反差强化角色：一个气场强大的角色自然地使用可爱、迷你或生活化道具。画面不要让角色自嘲，而是一本正经地继续行动，让观众从道具与身份错位中感到喜剧效果。
```

### 3.3 性格反差：`personality_gap`

```yaml
personality_gap:
  examples:
    - 外表凶狠但内心温柔
    - 看起来柔弱但战斗力极强
    - 高冷角色其实社恐
    - 不靠谱角色关键时刻最稳
    - 反派造型但很会照顾小孩
    - 冷酷角色偷偷喜欢可爱贴纸
  best_for:
    - character_depth
    - audience_affection
    - emotional_turn
  performance_notes:
    - 外表和动作可以压迫，细节行为要温柔
    - 不要让反差破坏角色核心一致性
    - 可以通过微表情、手部动作、声音停顿体现
  storyboard_notes:
    - 先建立观众对角色的刻板预期
    - 再用一个小动作打破预期
    - 反差揭示后给角色保留尊严
  prompt_fragment_cn: >
    角色外表具有强烈压迫感，但行为细节非常温柔。镜头先建立他凶狠或冷酷的外在气质，随后用一个细腻动作揭示他的温柔本质。反差要服务角色立体感，而不是把角色变成纯笑料。
```

### 3.4 身份行为反差：`identity_behavior_gap`

```yaml
identity_behavior_gap:
  examples:
    - 奶爸像黑帮大哥一样登场，却认真接孩子
    - 老板像实习生一样紧张汇报
    - 反派排队买菜并认真挑番茄
    - 英雄登场后蹲下修儿童玩具
    - 魔王认真读育儿手册
    - 刺客在任务前给猫喂饭
  best_for:
    - character_introduction
    - comedic_reveal
    - tension_release
  performance_notes:
    - 行为要具体、生活化
    - 身份气质要先建立，反差才成立
    - 角色最好不自知
  storyboard_notes:
    - 用类型片镜头建立身份
    - 用生活化动作完成反差 reveal
    - 停顿给观众反应时间
  prompt_fragment_cn: >
    先用强类型片方式建立角色身份和气场，再揭示他正在做极生活化、温柔或琐碎的行为。反差来自身份预期与实际行为之间的落差，画面保持电影质感，不要变成低幼闹剧。
```

### 3.5 情绪反差：`emotion_gap`

```yaml
emotion_gap:
  examples:
    - 全员紧张，只有一个角色淡定吃东西
    - 大家欢呼，一个角色认真检查账单
    - 角色气势汹汹冲来，开口却委屈撒娇
    - 全场沉默，只有小孩鼓掌
    - 反派愤怒爆发，宠物在旁边睡着
  best_for:
    - tension_release
    - awkward_comedy
    - group_scene
  performance_notes:
    - 反差角色的节奏要比群体慢半拍或快半拍
    - 不要让情绪反差破坏关键剧情信息
  storyboard_notes:
    - 先拍群体统一情绪
    - 再切反差角色
    - 可用反应镜头强化落差
  prompt_fragment_cn: >
    场景中大多数角色处于同一种强烈情绪，但有一个角色以完全不同的节奏和情绪反应。镜头先建立群体情绪，再切到反差角色的平静、委屈或生活化反应，形成轻喜剧落差。
```

### 3.6 画面语境反差：`visual_context_gap`

```yaml
visual_context_gap:
  examples:
    - 用史诗低机位拍买菜
    - 用战斗打光拍接孩子放学
    - 用黑帮谈判构图拍亲子沟通
    - 用恐怖片推镜拍角色打开便当
    - 用超级英雄登场音乐拍修自行车
  best_for:
    - high_quality_comedy
    - genre_parody
    - visual_memory_point
  performance_notes:
    - 表演要克制，不要主动解释笑点
    - 画面越认真，内容越日常，反差越强
  storyboard_notes:
    - 镜头语言先严肃
    - reveal 内容必须清楚
    - 不要过早泄露实际行为
  prompt_fragment_cn: >
    使用严肃、史诗或动作片式镜头语言拍摄一个非常日常的行为。镜头先让观众以为会发生重大事件，再揭示实际只是生活小事。喜剧来自画面语法和事件内容之间的反差。
```

### 3.7 能力反差：`capability_gap`

```yaml
capability_gap:
  examples:
    - 看起来弱小的角色轻松推开巨门
    - 肌肉壮汉打不开儿童安全锁
    - 小孩淡定解决成年人搞不定的问题
    - 顶级特工不会用婴儿车
    - 巨大怪兽害怕小虫子
  best_for:
    - character_reversal
    - comedic_payoff
    - underdog_moment
  performance_notes:
    - 能力反差要有铺垫
    - 不能让角色能力体系完全崩坏
  prompt_fragment_cn: >
    通过能力预期反差制造笑点：看起来强大的角色被小事难住，或看起来弱小的角色轻松完成困难动作。反差要有铺垫，并保持角色逻辑一致。
```

### 3.8 声音体型反差：`voice_body_gap`

```yaml
voice_body_gap:
  examples:
    - 巨大角色声音很轻很温柔
    - 小角色声音低沉有压迫感
    - 凶狠外表角色说话奶声奶气
    - 严肃角色使用过于礼貌的客服语气
  best_for:
    - audio_comedy
    - character_softening
    - reveal_moment
  audio_notes:
    - 声音反差要和表情停顿配合
    - 不要用嘲笑口音或歧视性声音特征
  prompt_fragment_cn: >
    角色的声音与外形形成反差。巨大或凶狠的外表配上非常轻柔、礼貌或奶声奶气的语气，制造可爱化喜剧效果。声音设计应服务角色，不要变成嘲笑。
```

---

## 4. 反差桥段模板：`contrast_beat_templates`

### 4.1 先藏后露 reveal

```yaml
contrast_beat_template: hide_then_reveal
structure:
  setup: 先只展示角色气场、局部特写或类型片氛围
  conceal: 暂时隐藏真正制造反差的道具或行为
  reveal: 切到宽镜头或关键特写揭示反差
  hold: 停顿 0.3 到 0.6 秒
  continue: 角色一本正经继续行动
best_for:
  - size_mismatch
  - prop_scale_irony
  - visual_context_gap
prompt_fragment_cn: >
  采用先藏后露的反差揭晓。先用局部特写和严肃镜头建立角色气场，暂时隐藏真正的道具或行为；随后切到全身宽镜头揭示反差，并停顿半秒让观众看清。
```

### 4.2 一本正经 deadpan

```yaml
contrast_beat_template: deadpan_contrast
structure:
  setup: 画面或行为本身荒诞
  performance: 角色完全不觉得荒诞，表情认真
  reaction: 周围角色或观众代替反应
  payoff: 角色继续以认真态度完成小事
best_for:
  - size_mismatch
  - identity_behavior_gap
  - prop_scale_irony
prompt_fragment_cn: >
  反差行为以一本正经方式演绎。角色不自嘲、不解释，认真完成荒诞或不匹配的动作。笑点来自角色严肃态度和画面内容之间的落差。
```

### 4.3 类型片误导

```yaml
contrast_beat_template: genre_misdirection
structure:
  setup: 使用动作片、黑帮片、恐怖片或史诗片镜头建立预期
  build: 音乐、光影、构图持续强化重大事件感
  reveal: 实际行为是生活化或温柔的小事
  release: 用小声音、生活道具或尴尬停顿释放紧张
best_for:
  - visual_context_gap
  - identity_behavior_gap
  - personality_gap
prompt_fragment_cn: >
  使用类型片误导制造反差。镜头、光影和音乐先营造重大事件或危险任务的预期，随后揭示角色只是在做温柔、生活化或琐碎的小事。
```

### 4.4 群体反应衬托

```yaml
contrast_beat_template: crowd_reaction_support
structure:
  setup: 主角做出反差行为
  hold: 主角保持自然
  reaction_wave: 背景群众依次反应
  settle: 主角继续行动，群众还在震惊
best_for:
  - capability_gap
  - personality_gap
  - size_mismatch
prompt_fragment_cn: >
  主角自然完成反差行为后保持镇定，背景群众像波浪一样依次反应。主角越平静，群体反应越能衬托反差笑点。
```

---

## 5. Skill 输出字段建议

### 5.1 `scene-design-builder`

```yaml
contrast_comedy_design:
  enabled:
  core_contrast_types:
  contrast_density:
  character_contrast_profiles:
    - character_id:
      contrast_type:
      outer_expectation:
      actual_behavior_or_trait:
      tonal_boundary:
  forbidden_overuse:
  avoid_when:
```

### 5.2 `scene-script-adapter`

```yaml
contrast_opportunities:
  - beat_id:
    contrast_type:
    setup_expectation:
    payoff_reveal:
    emotional_function:
    comedic_function:
    use_template:
    avoid_repetition_note:
```

### 5.3 `scene-performance-director`

```yaml
contrast_performance:
  - beat_id:
    character_id:
    physical_behavior:
    facial_behavior:
    deadpan_or_self_aware:
    timing:
    supporting_reaction:
```

### 5.4 `scene-storyboard-director`

```yaml
contrast_storyboard:
  - shot_id:
    beat_id:
    contrast_type:
    setup_shot:
    reveal_shot:
    hold_duration:
    framing_note:
    vfx_support:
```

### 5.5 `scene-audio-director`

```yaml
contrast_audio:
  - shot_id:
    sound_contrast:
    silence_or_pause:
    prop_sound:
    music_misdirection:
```

### 5.6 `scene-video-prompt-builder`

```yaml
contrast_prompt:
  segment_id:
  contrast_type:
  setup:
  reveal:
  performance_note:
  framing_note:
  avoid_overuse_note:
```

---

## 6. 可复制 Prompt 片段

### 6.1 超级奶爸骑小自行车

```text
通过强烈的体型与道具比例反差制造喜剧：一个身形庞大、肩膀宽厚、气场像动作片硬汉的超级奶爸，认真骑在一辆明显过小的小自行车上。镜头先用低机位拍他的巨大身影和严肃表情，再切到全身侧面镜头揭示小自行车的比例反差。车架被压得轻微下沉，轮胎有一点弹性变形，小铃铛发出清脆的“叮”声。角色表情保持一本正经，不自知地制造笑点。不要加入过多特效，让体型、道具和气质反差成为画面核心。
```

### 6.2 黑帮气场接孩子

```text
用黑帮片式低机位、背光和缓慢推镜建立角色压迫感，让观众以为他要参加危险谈判。随后切到宽镜头，揭示他只是站在幼儿园门口，手里拿着粉色小书包和小水壶，认真等待孩子放学。反差来自危险气场和温柔奶爸行为之间的落差。
```

### 6.3 巨大机器人喝茶

```text
一个巨大、厚重、机械感强的机器人，小心翼翼用两根机械手指捏起一只迷你茶杯。镜头强调机器人庞大的手掌与茶杯之间的比例差。动作要极其轻柔，杯子轻轻发出瓷器碰撞声，制造笨拙但可爱的反差。
```

### 6.4 英雄登场买菜

```text
使用超级英雄登场式构图：低机位、逆光、披风摆动、慢动作脚步。停顿后揭示角色手里拎着一袋青菜和鸡蛋，认真比较菜价。画面保持史诗质感，笑点来自英雄镜头语言和日常买菜行为之间的反差。
```

### 6.5 看似弱小但很强

```text
一个看起来柔弱的小角色站在巨大门前，周围角色都认为他推不开。镜头先强调门的庞大和沉重，再让小角色轻轻一推，门像纸片一样打开。小角色表情平静，周围人群慢半拍震惊，形成能力反差笑点。
```

---

## 7. 与动画物理 / 伤害尺度的组合规则

```yaml
contrast_with_animation_stylization:
  use_animation_physics_as_support: true
  vfx_should_not_steal_contrast: true
  preferred_support_effects:
    - subtle_prop_squash
    - small_dust_puff
    - delayed_reaction
    - crowd_reaction_wave
    - gentle_wobble
  avoid:
    - too_many_symbols
    - excessive_impact_rings
    - unrelated_particles

contrast_with_injury_tone:
  allow_minor_cartoon_injury_when_it_serves_payoff: true
  examples:
    - 大块头被小玩具绊倒后头上起包
    - 反派被自己道具弹飞后鼻血一小道
    - 硬汉骑小车摔倒后灰头土脸
  avoid:
    - 用严重伤害制造反差
    - 嘲笑弱者真实疼痛
    - 让血腥成为笑点核心
```

---

## 8. 默认配置

```yaml
contrast_comedy:
  enabled: selective
  contrast_density: low_to_medium
  max_core_contrasts_per_project: 2
  max_hero_contrast_per_segment: 1
  allowed_contrast_types:
    - size_mismatch
    - prop_scale_irony
    - personality_gap
    - identity_behavior_gap
    - visual_context_gap
    - capability_gap
  default_templates:
    - hide_then_reveal
    - deadpan_contrast
    - genre_misdirection
  avoid_when:
    - serious_emotional_scene
    - repeated_same_gag
    - climax_tension_without_release
  must_serve:
    - character
    - story
    - emotional_turn
    - visual_payoff
```

---

## 9. 一句话原则

```text
反差喜剧不是随机搞怪；
它应该用预期落差强化角色、情绪和画面记忆点，
并且每个段落最多只使用一个主反差笑点。
```
