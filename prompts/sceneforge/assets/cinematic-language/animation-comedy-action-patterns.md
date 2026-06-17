# SceneForge v5 执行期动画动作喜剧镜头模式库

> 位置：`assets/cinematic-language/animation-comedy-action-patterns.md`
>
> 作用：供 `scene-storyboard-director` 在运行时按需读取的动作喜剧、反差喜剧、多尺度世界和类型片调度镜头模式库。
>
> 本库按镜头功能组织，不按电影名组织；只提炼可迁移的动画电影分镜原则。

---

## 1. 使用原则

```yaml
asset_type: executable_reference
usable_by:
  - scene-storyboard-director
  - scene-video-prompt-builder
purpose:
  - 动作喜剧镜头模式
  - 反差喜剧镜头模式
  - 家庭动作镜头模式
  - 多尺度世界调度模式
  - 战斗/追逐可读性规则
  - 类型片调度抽象模式
runtime_readable: true
```

规则：

```text
动作喜剧镜头必须先保证空间可读，再做速度和笑点。
反差喜剧镜头必须让观众看清 setup / reveal / hold。
轻伤卡通化可以服务笑点，但不得写实痛苦化。
不要把镜头模式变成随机梗堆叠。
```

---

## 2. 反派可爱化揭示：`villain_softening_reveal`

```yaml
villain_softening_reveal:
  purpose: 把强气场、反派感或压迫感角色转化为可爱、温柔或家庭化角色。
  best_for:
    - personality_gap
    - identity_behavior_gap
    - prop_scale_irony
    - character_softening
    - family_comedy
  structure:
    - intimidation_setup: 用低机位、阴影、强剪影或慢推镜建立压迫感
    - concealment: 暂时隐藏生活化道具、家庭行为或儿童化动作
    - reveal: 切到宽镜头、全身镜头或道具特写揭示温柔/可爱/家庭化行为
    - reaction_hold: 停顿 0.3-0.6 秒让观众吃到反差
    - deadpan_continue: 角色一本正经继续行动
  shot_language:
    preferred_shot_scale:
      - wide
      - full
      - insert
    preferred_camera_angle:
      - low_angle
      - eye_level
    preferred_composition:
      - silhouette
      - centered
      - scale_contrast_depth
    preferred_edit_rhythm:
      - reveal_cut
      - reaction_pause
  avoid:
    - 把角色拍成纯卖蠢
    - 在严肃情绪段滥用反差
    - 用过量 VFX 遮住反差本身
  storyboard_note_cn: 先建立压迫感，再通过家庭行为或可爱道具释放反差。
```

---

## 3. 小道具反差插入：`tiny_prop_contrast_insert`

```yaml
tiny_prop_contrast_insert:
  purpose: 通过道具尺寸、质感、颜色或声音强化角色反差。
  best_for:
    - 大块头骑小车
    - 反派拿儿童书包
    - 硬汉使用可爱小饭盒
    - 巨大机器人拿迷你茶杯
    - 身份道具反差
  structure:
    - identity_setup: 先建立角色体型、身份或气场
    - prop_insert: 给小道具、儿童道具、可爱道具一个清楚插入镜头
    - scale_relation: 用宽镜头或全身镜头让角色和道具同框
    - deadpan_or_reaction: 角色无自觉或周围角色慢半拍反应
    - audio_hook: 小铃铛、塑料 squeak、轻微 boing 等声音强化反差
  shot_language:
    preferred_shot_scale:
      - insert
      - full
      - wide
    preferred_composition:
      - scale_contrast_depth
      - centered
    preferred_camera_movement:
      - locked
      - tilt
    preferred_edit_rhythm:
      - reveal_cut
      - reaction_pause
  avoid:
    - 插入道具但不建立比例关系
    - 道具与剧情或人物无关
  storyboard_note_cn: 道具反差必须让观众同时理解角色身份和道具错位。
```

---

## 4. 少对白身体喜剧：`silent_body_comedy`

```yaml
silent_body_comedy:
  purpose: 让少台词角色通过身体、节奏、道具误用和反应完成笑点。
  best_for:
    - 小角色群体
    - 动物角色
    - 机器人角色
    - 默片式笑点
    - 道具误用
  structure:
    - clear_goal: 观众先知道角色想做什么
    - first_attempt: 第一次尝试失败
    - escalation: 动作逐步升级
    - reaction_hold: 停顿，角色或同伴反应
    - payoff: 道具、身体或环境给出最终笑点
    - recovery: 角色恢复并进入下一动作
  shot_language:
    preferred_shot_scale:
      - full
      - medium
      - insert
    preferred_camera_movement:
      - locked
      - pan
      - tracking
    preferred_edit_rhythm:
      - reaction_pause
      - quick_cut
      - reveal_cut
  avoid:
    - 镜头太碎导致动作看不清
    - 过量特效遮住身体表演
    - 没有目标就直接搞怪
  storyboard_note_cn: 身体喜剧必须让目标、失败、升级和 payoff 都可见。
```

---

## 5. 动作喜剧追逐：`action_comedy_chase`

```yaml
action_comedy_chase:
  purpose: 让追逐既有速度又保持喜剧可读性。
  best_for:
    - chase
    - escape
    - slapstick_action
    - family_action_comedy
    - prop_mishap
  structure:
    - establish_space: 先建立追逐方向、障碍物和目标
    - acceleration: 用跟拍、平移或快速切加速
    - obstacle_or_prop_mishap: 插入障碍物或道具误用
    - impact_hold: 冲击或险些失误后短暂停顿
    - recovery_or_escalation: 角色恢复并进入下一个动作
  shot_language:
    preferred_shot_scale:
      - wide
      - full
      - medium
    preferred_camera_movement:
      - tracking
      - pan
      - whip_pan
    preferred_edit_rhythm:
      - action_continuity
      - quick_cut
      - reaction_pause
  avoid:
    - 空间方向不清楚
    - 快切前没有建立场地
    - 真实危险后果
  storyboard_note_cn: 追逐镜头先保证方向和空间，再加入速度和笑点。
```

---

## 6. 能力驱动镜头：`power_specific_camera`

```yaml
power_specific_camera:
  purpose: 根据角色能力选择镜头语言，而不是所有角色都用同一种镜头。
  best_for:
    - superhero_action
    - team_action
    - character_power_showcase
    - ability_reveal
  ability_camera_map:
    speed_character:
      shot_language:
        camera_movement:
          - tracking
          - whip_pan
        edit_rhythm:
          - quick_cut
          - action_continuity
      note: 速度角色需要方向清楚，不能只靠模糊。
    strength_character:
      shot_language:
        camera_angle:
          - low_angle
        edit_rhythm:
          - anticipation_then_impact
          - impact_hold
      note: 力量角色要有前摇和冲击停顿。
    elastic_character:
      shot_language:
        composition:
          - arc_composition
          - wide_body_readability
      note: 弹性角色要让身体弧线看清。
    stealth_character:
      shot_language:
        composition:
          - negative_space
          - silhouette
        edit_rhythm:
          - hide_then_reveal
      note: 隐匿角色要用遮挡、留白和 reveal。
  avoid:
    - 所有角色都用同一种镜头语言
    - 只展示能力效果，不展示角色意图
  storyboard_note_cn: 能力决定镜头，而不是镜头硬套能力。
```

---

## 7. 清晰动作地理：`clear_action_geography`

```yaml
clear_action_geography:
  purpose: 保证战斗、追逐、救援和群体动作的空间可读。
  best_for:
    - fight
    - chase
    - rescue
    - team_action
    - multi_character_conflict
  structure:
    - geography_establishing: 建立空间轴线、危险来源、角色阵营
    - action_lane: 说明角色移动路径
    - impact_zone: 确定冲突发生区
    - reaction_zone: 确定旁观者、保护对象或反应角色位置
    - continuity_bridge: 用视线、动作余势或声音衔接下一个镜头
  shot_language:
    preferred_shot_scale:
      - wide
      - overhead
      - full
    preferred_camera_angle:
      - eye_level
      - overhead
      - high_angle
    preferred_composition:
      - deep_staging
      - foreground_midground_background
    preferred_edit_rhythm:
      - action_continuity
  avoid:
    - 没建立空间就快速切
    - 角色方位漂移
    - 动作因果关系不清
  storyboard_note_cn: 动作戏先让观众知道谁在哪、往哪动、危险来自哪里。
```

---

## 8. 家庭动作交叉剪辑：`family_action_crosscut`

```yaml
family_action_crosscut:
  purpose: 让动作场面同时推动家庭关系或团队关系。
  best_for:
    - family_team_action
    - rescue_scene
    - comedy_under_pressure
    - parent_child_action
    - reluctant_teamwork
  structure:
    - action_problem: 外部动作压力出现
    - family_reaction: 家庭成员之间产生担心、争执、尴尬或默契
    - role_response: 每个人用自己的能力、性格或身份回应
    - emotional_payoff: 动作解决同时推进关系
  shot_language:
    preferred_edit_rhythm:
      - action_continuity
      - reaction_pause
      - crosscut
    preferred_shot_scale:
      - wide
      - medium
      - close_up
  avoid:
    - 只有动作没有关系变化
    - 家庭反应打断动作方向
  storyboard_note_cn: 家庭动作戏的目标不是更乱，而是让动作暴露关系。
```

---

## 9. 英雄姿态与反差释放：`superhero_pose_then_release`

```yaml
superhero_pose_then_release:
  purpose: 先建立英雄感或强气场，再用家庭/喜剧反应释放严肃感。
  best_for:
    - hero_moment
    - comedic_release
    - identity_behavior_gap
    - family_comedy
  structure:
    - heroic_setup: 低机位、背光、宽构图或剪影建立英雄姿态
    - pose_hold: 保留短暂停顿
    - contrast_release: 切入尴尬、家庭行为、小道具、儿童声音或台词气口
    - continue: 回到动作或情感推进
  shot_language:
    preferred_camera_angle:
      - low_angle
    preferred_composition:
      - silhouette
      - centered
      - symmetrical
    preferred_edit_rhythm:
      - slow_hold
      - reveal_cut
      - reaction_pause
  avoid:
    - 让角色失去尊严
    - 每个 hero moment 都用反差打断
  storyboard_note_cn: 英雄姿态可以被喜剧释放，但不能毁掉角色核心魅力。
```

---

## 10. 多尺度世界揭示：`multi_scale_world_reveal`

```yaml
multi_scale_world_reveal:
  purpose: 让观众理解大世界中的多种角色尺度和空间规则。
  best_for:
    - animal_scale_world
    - toy_scale_world
    - miniature_world
    - multi_species_city
    - giant_and_tiny_character
  structure:
    - macro_establishing: 建立大空间和区域功能
    - scale_anchor: 放入角色或道具作为比例锚点
    - micro_detail: 用插入镜头展示小尺度生活细节
    - movement_path: 说明角色如何穿过这个世界
    - interaction_rule: 展示不同尺度角色如何互动
  shot_language:
    preferred_shot_scale:
      - extreme_wide
      - wide
      - insert
    preferred_composition:
      - scale_contrast_depth
      - deep_staging
      - foreground_frame
    preferred_camera_angle:
      - high_angle
      - low_angle
      - pov
  avoid:
    - 只有奇观，没有角色路径
    - 大小比例不在同一画面或连续镜头中成立
  storyboard_note_cn: 多尺度世界要同时交代宏观空间、小尺度细节和行动路径。
```

---

## 11. 搭档空间对话：`buddy_spatial_dialogue`

```yaml
buddy_spatial_dialogue:
  purpose: 用站位、高低差、视线方向和构图变化表达搭档关系。
  best_for:
    - buddy_comedy
    - investigation_scene
    - mistrust_to_trust
    - unequal_partnership
    - size_mismatch_pair
  structure:
    - initial_distance: 两人保持距离、错位或高度差
    - tension_blocking: 对话中通过转身、遮挡、错位表达冲突
    - reaction_cut: 用反应镜头显示理解或误解
    - alignment: 情绪和解时站位、视线或运动方向逐渐一致
  shot_language:
    preferred_shot_scale:
      - medium
      - wide
      - over_shoulder
    preferred_composition:
      - asymmetrical
      - foreground_frame
      - scale_contrast_depth
    preferred_edit_rhythm:
      - reaction_pause
      - shot_reverse_shot
  avoid:
    - 两人关系变化但站位完全不变
    - 只靠台词说明关系
  storyboard_note_cn: 搭档关系要让观众从站位和视线中看出来。
```

---

## 12. 城市区域转场：`district_transition`

```yaml
district_transition:
  purpose: 通过环境、色彩、气候、交通和声音建立区域切换。
  best_for:
    - worldbuilding
    - travel_sequence
    - chase_between_districts
    - city_adventure
    - environment_contrast
  structure:
    - exit_marker: 离开上一区域的视觉或声音标记
    - transition_motion: 交通工具、推拉镜、横移或环境擦镜
    - new_color_temperature: 用色彩、气候或材质说明新区域
    - first_rule_action: 新区域里发生一个能体现空间规则的动作
  shot_language:
    preferred_shot_scale:
      - wide
      - extreme_wide
      - insert
    preferred_camera_movement:
      - tracking
      - pan
      - crane
    preferred_edit_rhythm:
      - match_cut
      - montage
      - action_continuity
  avoid:
    - 只换背景，不交代新区域规则
    - 转场太快导致空间断裂
  storyboard_note_cn: 区域转场要让环境规则、色彩和行动方式一起变化。
```

---

## 13. 线索视觉链：`investigation_visual_chain`

```yaml
investigation_visual_chain:
  purpose: 让侦探、调查、寻找或计划类叙事清楚推进。
  best_for:
    - mystery
    - investigation
    - planning
    - clue_following
    - buddy_detective_comedy
  structure:
    - clue_insert: 线索特写
    - character_reaction: 角色理解、误解或产生新问题
    - spatial_reorientation: 镜头说明下一步目标在哪里
    - decision_cut: 切到行动方向
  shot_language:
    preferred_shot_scale:
      - insert
      - close_up
      - medium
      - wide
    preferred_camera_movement:
      - push_in
      - pan
      - tracking
    preferred_edit_rhythm:
      - reveal_cut
      - match_cut
      - action_continuity
  avoid:
    - 线索没有视觉证据
    - 角色突然知道答案但镜头没有说明原因
  storyboard_note_cn: 调查类镜头要让观众看见线索、反应和行动方向。
```

---

## 14. 轻伤喜剧后果镜头：`cartoon_injury_result_hold`

```yaml
cartoon_injury_result_hold:
  purpose: 用动画动作喜剧尺度展示冲击后的轻中度卡通结果。
  best_for:
    - slapstick_impact
    - prop_mishap
    - chase_crash
    - fight_comedy_result
  allowed_visuals:
    - dust_face
    - bump_on_head
    - small_scratch
    - nosebleed_gag
    - soot_face
    - cartoon_stars
  structure:
    - impact: 动作冲击或道具事故
    - dust_or_vfx_clear: 尘雾散开，让结果可见
    - result_hold: 停顿展示头包、灰头土脸或眼冒金星
    - recovery: 角色恢复可表演状态
  shot_language:
    preferred_shot_scale:
      - full
      - medium
      - close_up
    preferred_edit_rhythm:
      - reaction_pause
      - slow_hold
  avoid:
    - 大量流血
    - 写实伤口
    - 骨折特写
    - 持续痛苦
    - 身体恐怖
  storyboard_note_cn: 轻伤喜剧后果要短暂、可恢复、非写实。
```

---

## 15. 使用字段建议

分镜阶段选择本库 pattern 时，建议写入：

```yaml
selected_shot_pattern:
  pattern_id:
  source_asset: assets/cinematic-language/animation-comedy-action-patterns.md
  reason:
  adaptation_note: 只使用抽象镜头结构，不复制具体电影镜头。
```

示例：

```yaml
selected_shot_pattern:
  pattern_id: tiny_prop_contrast_insert
  source_asset: assets/cinematic-language/animation-comedy-action-patterns.md
  reason: 当前镜头需要让观众同时看见巨大角色和过小道具，反差必须在同一画面内成立。
  adaptation_note: 只使用“身份建立—道具插入—比例同框—停顿”的抽象结构。
```

---

## 16. 一句话原则

```text
动作喜剧镜头不是越快越好；
先让观众看清空间、目标、冲击和反应，再用停顿和反差制造笑点。
```
