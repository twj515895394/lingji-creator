# Replaceable Slot Library / 通用结构槽位库

本库用于 v6.1 `adaptation_recommendations.replaceable_slots`。

它的目标不是提供固定题材模板，而是帮助 SceneForge 从任意源案例中抽象出“可替换但功能不变”的结构槽位。

重要原则：

1. 槽位不是表面元素，而是叙事功能。
2. 替换时必须保留槽位功能，不必保留原始题材、身份、道具或场景。
3. 本库是开放参考资产，不是封闭枚举。
4. 若没有合适参考，使用 `selection_mode: custom_generated`。
5. 所有改写方案必须先生成候选方案，等待用户选择确认后，才允许进入正式剧本/分镜/提示词执行。

## 使用格式

```yaml
replaceable_slots:
  - slot_id:
    original_surface:
    narrative_function:
    replacement_guidance:
    candidate_replacements:
      - value:
        target_genre:
        generation_risk: low | medium | high
        notes:
    preserve_rule:
    avoid_rule:
```

---

## 1. protagonist_surface_identity

主角表层身份。不是“职业”，而是观众和其他角色最初如何误读主角。

### narrative_function

建立误判、压制、低估、偏见或身份落差。

### replacement_guidance

替换时要保留“被误读”的功能，而不是照搬原身份。

### candidate_replacements

```yaml
- value: poor_stranger
  target_genre: social_comedy
  generation_risk: low
  notes: 适合阶层误判、消费场景、公共羞辱。

- value: intern_or_junior_worker
  target_genre: workplace
  generation_risk: low
  notes: 适合职场、创业、公司权力结构。

- value: outer_disciple_or_servant
  target_genre: xianxia
  generation_risk: medium
  notes: 适合修仙宗门身份反转。

- value: low_tier_robot_or_android
  target_genre: sci_fi
  generation_risk: medium
  notes: 适合 AI、赛博朋克、未来阶级。

- value: ordinary_student
  target_genre: school
  generation_risk: low
  notes: 适合校园竞赛、隐藏能力。

- value: failed_creator_or_small_streamer
  target_genre: platform_culture
  generation_risk: low
  notes: 适合短视频、直播、电商题材。

- value: harmless_animal_or_small_creature
  target_genre: family_animation
  generation_risk: low
  notes: 适合儿童动画、动物寓言。
```

### preserve_rule

保留“外界低估主角”的功能。

### avoid_rule

避免把低估写成针对现实群体的羞辱或刻板歧视。

---

## 2. protagonist_hidden_truth

主角隐藏真相。可以是身份、能力、关系、权限、财富、使命、道德品质或关键信息。

### narrative_function

为反转提供因果依据，让高潮不是凭空发生。

### candidate_replacements

```yaml
- value: hidden_owner_or_shareholder
  target_genre: workplace_business
  generation_risk: low
  notes: 适合公司、投资、商业短剧。

- value: secret_master_or_champion
  target_genre: sports_competence
  generation_risk: low
  notes: 适合技能展示、比赛、职业反转。

- value: royal_heir_or_emissary
  target_genre: fantasy_historical
  generation_risk: medium
  notes: 适合古代、奇幻、王国题材。

- value: immortal_reincarnation_or_sect_founder
  target_genre: xianxia
  generation_risk: medium
  notes: 适合修仙爽点，但需控制设定复杂度。

- value: root_access_holder
  target_genre: ai_cyberpunk
  generation_risk: medium
  notes: 适合 AI 系统、平台权限、赛博世界。

- value: undercover_helper_or_tester
  target_genre: social_test
  generation_risk: low
  notes: 适合暖心、服务行业、善意测试。

- value: misunderstood_protector
  target_genre: family_drama
  generation_risk: low
  notes: 适合情绪反转，不强调打脸。
```

### preserve_rule

隐藏真相必须能解释前文异常行为。

### avoid_rule

不要只靠台词宣布真相，应设计可视化证明或行动证明。

---

## 3. pressure_source

压力来源。可以是人物、机构、规则、时间、环境或系统。

### narrative_function

给主角制造阻碍，使后续反转有价值。

### candidate_replacements

```yaml
- value: gatekeeper
  target_genre: universal
  generation_risk: low
  notes: 门卫、前台、店员、审核员、接待员等。

- value: middle_manager_or_supervisor
  target_genre: workplace
  generation_risk: low
  notes: 适合层级压力。

- value: elder_judge_or_examiner
  target_genre: xianxia_fantasy_school
  generation_risk: medium
  notes: 适合试炼、评审、宗门大会。

- value: algorithmic_system
  target_genre: ai_platform
  generation_risk: medium
  notes: 可以用红灯、警报、UI 图标表达，少用文字。

- value: crowd_or_public_audience
  target_genre: short_video_spectacle
  generation_risk: high
  notes: 群体反应强，但多角色生成风险高。

- value: ticking_deadline
  target_genre: thriller_comedy
  generation_risk: low
  notes: 时钟、进度条、关门倒计时。
```

### preserve_rule

压力来源必须和目标场域规则相关。

### avoid_rule

不要堆多个无关压力源，避免冲突失焦。

---

## 4. social_arena

社会竞技场。故事发生的规则系统，不只是背景地点。

### narrative_function

定义谁有权、谁被排斥、什么东西有价值、什么行为会被误判。

### candidate_replacements

```yaml
- value: luxury_service_space
  target_genre: social_satire
  generation_risk: low
  notes: 餐厅、酒店、会所、奢侈品店。

- value: corporate_meeting_room
  target_genre: workplace_business
  generation_risk: low
  notes: 职场短剧、投资谈判、董事会。

- value: sect_hall_or_trial_ground
  target_genre: xianxia
  generation_risk: medium
  notes: 强视觉，但需控制服装与多人调度。

- value: school_competition_stage
  target_genre: youth_family
  generation_risk: low
  notes: 适合技能、成绩、被认可。

- value: live_stream_room
  target_genre: platform_culture
  generation_risk: medium
  notes: 适合弹幕、榜单、在线围观，但文字需谨慎。

- value: space_station_checkpoint
  target_genre: sci_fi
  generation_risk: medium
  notes: 适合通行权限、扫描、身份验证。

- value: village_square_or_small_town
  target_genre: family_animation
  generation_risk: low
  notes: 适合动物、儿童、寓言。
```

### preserve_rule

场域必须提供清晰的权力规则。

### avoid_rule

不要只换背景皮肤却不改变场域规则。

---

## 5. power_symbol_or_evidence

权力象征物 / 证据。能够重新定义关系的可视化证明。

### narrative_function

触发高潮，改变他人对主角的认知和态度。

### candidate_replacements

```yaml
- value: black_card_or_gold_card
  target_genre: modern_comedy
  generation_risk: low
  notes: 视觉稳定，适合替代文字密集证据。

- value: signed_contract_or_share_certificate
  target_genre: business
  generation_risk: medium
  notes: 文字风险较高，建议后期叠字或只拍盖章/签名。

- value: royal_decree_or_emblem
  target_genre: historical_fantasy
  generation_risk: medium
  notes: 用图腾、印章、金光表达，少依赖可读文字。

- value: jade_token_or_immortal_seal
  target_genre: xianxia
  generation_risk: low
  notes: 适合 AI 生成，视觉符号强。

- value: glowing_access_chip
  target_genre: sci_fi_ai
  generation_risk: low
  notes: 适合扫描、认证、开门。

- value: championship_ring_or_medal
  target_genre: sports
  generation_risk: low
  notes: 适合能力证明。

- value: old_photo_or_keepsake
  target_genre: emotional_drama
  generation_risk: low
  notes: 适合亲情、关系真相。

- value: system_root_key
  target_genre: ai_cyberpunk
  generation_risk: medium
  notes: 用 UI 灯效和门禁反应替代长文字。
```

### preserve_rule

它必须具备“立刻改变权力关系”的功能。

### avoid_rule

避免高度依赖精确文字、真实品牌、现实机构标志。

---

## 6. reveal_mechanism

揭示机制。真相如何被看见、验证或承认。

### narrative_function

把隐藏信息转化为可见事件。

### candidate_replacements

```yaml
- value: unfold_or_open
  target_genre: universal
  generation_risk: medium
  notes: 纸张、盒子、卷轴，手部风险较高。

- value: scan_and_confirm
  target_genre: sci_fi_modern
  generation_risk: low
  notes: 门禁、仪器、灯光确认，生成稳定。

- value: seal_activation
  target_genre: fantasy_xianxia
  generation_risk: low
  notes: 发光、符文、环境响应。

- value: public_announcement
  target_genre: workplace_school
  generation_risk: medium
  notes: 可用广播、屏幕色块，不建议密集文字。

- value: physical_demonstration
  target_genre: competence_reveal
  generation_risk: medium
  notes: 主角直接展示能力。

- value: authority_recognition
  target_genre: status_reversal
  generation_risk: low
  notes: 更高权力者认出主角。

- value: environment_reacts
  target_genre: animation_film
  generation_risk: low
  notes: 门自动打开、灯光点亮、众人静止。
```

### preserve_rule

揭示动作要有仪式感和明确转折。

### avoid_rule

不要只靠角色解释一大段背景。

---

## 7. reaction_chain

反应链。真相揭示后，认知变化如何在人群或权力链中传播。

### narrative_function

放大高潮，让观众看到“别人被震住”。

### candidate_replacements

```yaml
- value: single_gatekeeper_shock
  target_genre: low_budget_short
  generation_risk: low
  notes: 最稳定，适合 15-30 秒。

- value: gatekeeper_to_manager
  target_genre: service_comedy
  generation_risk: low
  notes: 两级反应，适合 30-60 秒。

- value: team_or_panel_reaction
  target_genre: workplace_competition
  generation_risk: medium
  notes: 适合评委、投资人、老师。

- value: crowd_wave_reaction
  target_genre: viral_spectacle
  generation_risk: high
  notes: 传播性强，但多角色一致性风险高。

- value: system_wide_reaction
  target_genre: sci_fi_ai
  generation_risk: medium
  notes: 灯光、警报、屏幕、机械臂同步响应。

- value: environment_and_character_double_reaction
  target_genre: animation_film
  generation_risk: medium
  notes: 人物震惊 + 空间变化，适合动画电影感。
```

### preserve_rule

反应必须逐级升级，而不是所有人同时随机惊讶。

### avoid_rule

多人反应不要过多，否则视频生成会失控。

---

## 8. emotional_payoff

情绪回报。观众最终获得的情绪满足。

### narrative_function

决定这个改写是爽、暖、痛、讽刺、搞笑还是治愈。

### candidate_replacements

```yaml
- value: vindication
  target_genre: universal
  generation_risk: low
  notes: 被证明、被认可。

- value: revenge_without_violence
  target_genre: social_satire
  generation_risk: low
  notes: 打脸但不伤害，适合平台安全。

- value: belonging
  target_genre: family_animation
  generation_risk: low
  notes: 被接纳、找到归属。

- value: awe_and_worship
  target_genre: fantasy_epic
  generation_risk: medium
  notes: 适合神话、修仙、王国。

- value: comic_absurdity
  target_genre: comedy
  generation_risk: low
  notes: 通过过度反应制造荒诞。

- value: quiet_emotional_recognition
  target_genre: drama
  generation_risk: low
  notes: 更克制，适合 YouTube/短片。

- value: moral_reversal
  target_genre: fable
  generation_risk: low
  notes: 适合寓言和儿童向。
```

### preserve_rule

情绪回报必须和前期受压/误判形成闭环。

### avoid_rule

不要在同一短片里同时追求太多回报。

---

## 9. final_visual_payoff

最终视觉回报。结尾用一个画面总结反转后的新秩序。

### narrative_function

提供记忆点、封面候选、传播截图、结尾爽感。

### candidate_replacements

```yaml
- value: respectful_bow_or_salute
  target_genre: status_reversal
  generation_risk: low
  notes: 稳定、清晰、短视频友好。

- value: door_opens_to_bright_world
  target_genre: cinematic_animation
  generation_risk: low
  notes: 象征进入新阶段。

- value: crowd_stands_up
  target_genre: competition_workplace
  generation_risk: medium
  notes: 群体认可，但人数需控制。

- value: arena_lights_turn_on
  target_genre: stage_sci_fi
  generation_risk: low
  notes: 适合 AI 生成，环境响应强。

- value: seal_glows_and_world_kneels
  target_genre: fantasy_xianxia
  generation_risk: high
  notes: 视觉强，但群体和特效复杂。

- value: small_character_walks_tall
  target_genre: family_animation
  generation_risk: low
  notes: 儿童动画友好。

- value: villain_or_gatekeeper_overcorrects
  target_genre: comedy
  generation_risk: low
  notes: 夸张谄媚、过度服务、反差喜剧。
```

### preserve_rule

结尾画面必须让观众一眼看懂权力关系已经改变。

### avoid_rule

不要用口头总结代替结尾视觉 payoff。

---

## 10. meme_line_or_signature_action

可传播金句或标志动作。不是所有案例必须有，但短视频强烈建议设计。

### narrative_function

制造评论区复读、二创、标题、封面文案。

### candidate_replacements

```yaml
- value: understated_flex_line
  target_genre: status_reversal_comedy
  generation_risk: low
  notes: 克制装逼句，比大喊更有效。

- value: polite_refusal_line
  target_genre: social_comedy
  generation_risk: low
  notes: 礼貌回应对方傲慢。

- value: accidental_truth_line
  target_genre: comedy
  generation_risk: low
  notes: 主角像说小事一样说出惊人事实。

- value: repeated_catchphrase
  target_genre: viral_short
  generation_risk: low
  notes: 可复读，但不要过多。

- value: silent_signature_gesture
  target_genre: animation_film
  generation_risk: low
  notes: 比文字更稳，适合跨语言传播。
```

### preserve_rule

金句要服务情绪回报，不要为了梗而破坏人物。

### avoid_rule

避免直接复制源片台词或真实名人语录。
