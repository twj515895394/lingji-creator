# SceneForge v5 执行期动画电影镜头模式库

> 位置：`assets/cinematic-language/animation-film-shot-patterns.md`
>
> 作用：供 `scene-storyboard-director` 在运行时按需读取的动画电影视觉叙事镜头模式库。
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
  - 角色揭示镜头模式
  - 情绪特写模式
  - 少对白视觉叙事模式
  - 情绪蒙太奇模式
  - 世界观尺度揭示模式
  - 微观世界低机位模式
  - 流动环境调度模式
  - 音乐/舞台情绪模式
  - 抽象心理空间模式
  - 科幻大画幅模式
runtime_readable: true
```

规则：

```text
只能使用抽象模式，不得写“模仿某部电影的镜头”。
每次选择 pattern 时必须说明 selected_shot_pattern.reason。
镜头模式服务剧情、情绪、角色关系、世界观或视觉信息，不得堆模板。
```

---

## 2. 角色揭示：`character_reveal`

```yaml
character_reveal:
  purpose: 让角色第一次或关键时刻以明确气质进入观众视野。
  best_for:
    - 角色首次登场
    - 角色身份揭示
    - 角色能力或气质转变
    - Hero Moment
  structure:
    - silhouette_or_partial_detail: 先给剪影、脚步、手部、背影或局部细节
    - expectation_build: 通过声音、光影或周围角色反应建立期待
    - full_reveal: 用全身、宽镜头或中近景展示角色整体
    - reaction_or_hold: 给观众或其他角色一个反应停顿
  shot_language:
    preferred_shot_scale:
      - wide
      - full
      - medium_close
    preferred_camera_angle:
      - low_angle
      - eye_level
    preferred_composition:
      - silhouette
      - centered
      - negative_space
    preferred_edit_rhythm:
      - slow_hold
      - reveal_cut
  avoid:
    - 直接平铺角色信息
    - 过多特效遮住角色轮廓
  storyboard_note_cn: 角色 reveal 应先建立预期，再揭示角色完整气质。
```

---

## 3. 情绪特写：`emotional_closeup`

```yaml
emotional_closeup:
  purpose: 让观众看见角色心理变化，而不只是听到台词。
  best_for:
    - 情绪转折
    - 误解解除
    - 犹豫
    - 心软
    - 惊讶后的理解
  structure:
    - setup_context: 先让观众知道角色为什么产生情绪
    - isolate_face: 用近景或中近景隔离角色
    - micro_expression: 强调眼神、嘴角、呼吸或手部小动作
    - release_or_cutaway: 用视线、道具或对方反应过渡
  shot_language:
    preferred_shot_scale:
      - medium_close
      - close_up
    preferred_camera_movement:
      - locked
      - gentle_push_in
    preferred_edit_rhythm:
      - slow_hold
  avoid:
    - 在没有情绪铺垫时突然特写
    - 每个情绪都用大特写
  storyboard_note_cn: 情绪特写必须有心理动机，不能只是为了好看。
```

---

## 4. 少对白视觉叙事：`silent_visual_storytelling`

```yaml
silent_visual_storytelling:
  purpose: 在少对白或无对白条件下，用动作、物体、声音和停顿讲故事。
  best_for:
    - 机器人
    - 小动物
    - 沉默角色
    - 情绪片段
    - 少台词短视频
  structure:
    - clear_visual_goal: 观众先知道角色想做什么
    - object_interaction: 角色与物体互动，物体承载信息
    - body_or_eye_reaction: 用身体或眼神表达理解、失落、惊喜
    - small_sound_or_silence: 用小声音或静默强化情绪
    - emotional_hold: 留出停顿让观众读懂
  shot_language:
    preferred_shot_scale:
      - medium
      - close_up
      - insert
    preferred_camera_movement:
      - locked
      - gentle_push_in
    preferred_edit_rhythm:
      - slow_hold
      - reaction_pause
  avoid:
    - 用旁白解释本可视觉化的信息
    - 镜头太快导致观众来不及读动作
  storyboard_note_cn: 少对白镜头必须让目标、动作、反应和情绪都可视化。
```

---

## 5. 情绪蒙太奇与物体记忆：`object_memory_montage`

```yaml
object_memory_montage:
  purpose: 用重复物体、空间变化和构图变化压缩时间与关系变化。
  best_for:
    - 回忆
    - 亲情
    - 成长
    - 失去与和解
    - 关系递进
  structure:
    - motif_introduction: 先建立一个物体、动作或空间作为记忆锚点
    - repetition_with_change: 重复出现但状态逐步变化
    - time_progression: 通过服装、光线、空间或物体磨损表现时间
    - emotional_turn: 在某次重复中发生情绪变化
    - quiet_resolution: 用静态或低动作镜头收尾
  shot_language:
    preferred_shot_scale:
      - insert
      - medium
      - wide
    preferred_composition:
      - centered
      - rule_of_thirds
      - negative_space
    preferred_edit_rhythm:
      - montage
      - match_cut
      - slow_hold
  avoid:
    - 蒙太奇只是堆画面，没有递进
    - 物体没有情绪含义
  storyboard_note_cn: 蒙太奇必须有重复锚点和情绪递进。
```

---

## 6. 世界观尺度揭示：`world_scale_reveal`

```yaml
world_scale_reveal:
  purpose: 让观众理解角色所在世界的尺度、规则和行动空间。
  best_for:
    - 城市初次出现
    - 奇观空间
    - 巨大建筑
    - 冒险地图
    - 多角色空间关系
  structure:
    - macro_establishing: 用大远景或高机位建立整体空间
    - scale_anchor: 放入角色、交通工具或熟悉物体作为比例锚点
    - function_detail: 用插入镜头或中景展示这个世界如何运作
    - movement_path: 说明角色将如何进入或穿过空间
  shot_language:
    preferred_shot_scale:
      - extreme_wide
      - wide
      - insert
    preferred_camera_movement:
      - crane
      - pull_out
      - tracking
    preferred_composition:
      - deep_staging
      - scale_contrast_depth
  avoid:
    - 只有大场面，没有角色行动方向
    - 世界设定信息太多导致观众失焦
  storyboard_note_cn: 世界观 reveal 要同时回答“这里有多大”和“角色要怎么行动”。
```

---

## 7. 微观世界低机位：`micro_world_low_angle`

```yaml
micro_world_low_angle:
  purpose: 把普通环境转化为巨大、复杂、有遮挡层次的微观世界。
  best_for:
    - 小动物
    - 昆虫视角
    - 玩具视角
    - 迷你角色
    - 厨房、草丛、玩具箱等微观化空间
  structure:
    - low_entry: 用贴地或低机位进入空间
    - foreground_occlusion: 用草叶、家具腿、道具边缘等形成前景遮挡
    - scale_anchor: 放入巨大日常物或角色作为尺度锚点
    - depth_path: 用前中后景说明移动路线
  shot_language:
    preferred_shot_scale:
      - wide
      - full
      - insert
    preferred_camera_angle:
      - low_angle
      - pov
    preferred_composition:
      - foreground_frame
      - deep_staging
      - scale_contrast_depth
    preferred_lens_feel:
      - macro_miniature
  avoid:
    - 只把镜头放低但没有尺度锚点
    - 前景遮挡过多导致动作看不清
  storyboard_note_cn: 微观视角要让日常物变成地形。
```

---

## 8. 流动环境调度：`fluid_environment_staging`

```yaml
fluid_environment_staging:
  purpose: 让水、风、雾、漂浮物或环境粒子参与镜头调度。
  best_for:
    - 水下
    - 雾气
    - 空中漂浮
    - 魔法空间
    - 柔和情绪场景
  structure:
    - environmental_motion_bed: 先建立环境持续运动
    - character_path: 角色运动方向与环境流向产生关系
    - foreground_pass: 前景漂浮物或环境元素擦过镜头
    - depth_gradient: 用能见度、颗粒或光线建立纵深
  shot_language:
    preferred_camera_movement:
      - drifting_tracking
      - gentle_push_in
      - pan
    preferred_composition:
      - layered_depth
      - foreground_frame
    preferred_edit_rhythm:
      - slow_hold
      - action_continuity
  avoid:
    - 环境运动遮住主动作
    - 背景粒子无叙事功能
  storyboard_note_cn: 流动环境应服务情绪和空间感，而不是随机特效。
```

---

## 9. 音乐/舞台情绪：`musical_emotional_stage`

```yaml
musical_emotional_stage:
  purpose: 让音乐、舞台、灯光和观众反应共同推动情绪。
  best_for:
    - 音乐表演
    - 节庆空间
    - 家庭情感
    - 群体情绪
    - 舞台化 reveal
  structure:
    - stage_isolation: 用灯光或构图隔离表演者
    - instrument_or_voice_insert: 插入乐器、手部或声音来源
    - audience_reaction: 用观众或家人反应确认情绪
    - rhythmic_camera: 镜头运动或剪辑与音乐节奏同步
    - emotional_resolution: 用近景或宽镜头收束情绪
  shot_language:
    preferred_composition:
      - centered
      - negative_space
      - deep_staging
    preferred_camera_movement:
      - push_in
      - crane
      - tracking
    preferred_edit_rhythm:
      - montage
      - slow_hold
  avoid:
    - 只有音乐，没有角色情绪变化
    - 观众反应喧宾夺主
  storyboard_note_cn: 音乐镜头要拍出情绪关系，不只是拍舞台。
```

---

## 10. 抽象心理空间交叉剪辑：`abstract_emotion_space_crosscut`

```yaml
abstract_emotion_space_crosscut:
  purpose: 把内心情绪、幻想空间或抽象心理反应与现实行动并行呈现。
  best_for:
    - 情绪拟人
    - 梦境
    - 记忆片段
    - 儿童想象
    - 内心冲突
  structure:
    - real_world_trigger: 现实中的触发事件
    - inner_response: 抽象空间中的情绪或想象反应
    - symbolic_visual_action: 用象征动作表达内心变化
    - real_world_behavior_change: 切回现实，角色行为发生改变
  shot_language:
    preferred_edit_rhythm:
      - match_cut
      - reveal_cut
      - montage
    preferred_composition:
      - symmetrical
      - negative_space
      - centered
  avoid:
    - 抽象空间规则不清楚
    - 现实与内心剪辑关系不明确
  storyboard_note_cn: 抽象空间必须和现实行为建立因果关系。
```

---

## 11. 科幻大画幅感：`cinematic_scifi_scale`

```yaml
cinematic_scifi_scale:
  purpose: 让动画科幻或大型机械镜头获得宏大、厚重、电影化规格。
  best_for:
    - 太空
    - 机甲
    - 飞行
    - 巨型机械
    - 任务启动
    - 史诗动作片段
  structure:
    - massive_object_establishing: 用大远景或留白建立巨大物体
    - technical_insert: 插入仪表、驾驶舱、机械细节
    - scale_hold: 保持镜头让观众感受体量
    - motion_commitment: 用慢推、跟拍或加速进入行动
  shot_language:
    preferred_shot_scale:
      - extreme_wide
      - wide
      - insert
    preferred_composition:
      - negative_space
      - centered
      - deep_staging
    preferred_lens_feel:
      - imax_scale
    preferred_camera_movement:
      - slow_push_in
      - tracking
      - crane
  avoid:
    - 大场面没有角色目标
    - 机械细节过多影响动作理解
  storyboard_note_cn: 科幻大画幅感要兼顾规模和角色任务。
```

---

## 12. 使用字段建议

分镜阶段选择本库 pattern 时，建议写入：

```yaml
selected_shot_pattern:
  pattern_id:
  source_asset: assets/cinematic-language/animation-film-shot-patterns.md
  reason:
  adaptation_note: 只使用抽象镜头结构，不复制具体电影镜头。
```

---

## 13. 一句话原则

```text
动画电影镜头模式不是电影模仿库；
它是把角色、情绪、世界观和视觉叙事转换成可拍镜头的模式库。
```
