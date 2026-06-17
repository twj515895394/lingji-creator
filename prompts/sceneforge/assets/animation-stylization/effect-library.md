# SceneForge v4 执行期动画风格化资产库

> 位置：`assets/animation-stylization/effect-library.md`
>
> 作用：供后续 SceneForge v4 流程执行读取的动画风格化特效资产库。
>
> 与 `docs/` 的关系：`docs/` 只作为人类设计说明；如果某些规则需要被 Skill / Agent 在流程执行中读取，应迁移或同步到 `assets/`、`.agents/skills/**/references/` 或 `PROJECT_BOARD.md`，不要让运行时读取 `docs/`。

---

## 1. 使用原则

### 1.1 资产库定位

本库不是叙事设计文档，而是执行期可读取的“效果枚举 + 场景触发 + 安全尺度 + Prompt 片段”资产库。

Skill / Agent 可以在以下阶段使用：

```yaml
usable_by:
  - scene-design-builder
  - scene-script-adapter
  - scene-performance-director
  - scene-storyboard-director
  - scene-audio-director
  - scene-video-prompt-builder
```

建议使用方式：

```yaml
use_policy:
  read_scope: assets/animation-stylization/effect-library.md
  purpose:
    - 选择动画物理效果
    - 选择 VFX 画面语言
    - 选择情绪符号
    - 选择场景触发模板
    - 校准受伤和暴力尺度
    - 生成最终视频 prompt 的正向与负向约束
  do_not_use_for:
    - 覆盖用户已经确认的剧情方向
    - 自动跳过确认闸门
    - 为每个镜头机械堆叠特效
```

### 1.2 总体风格目标

```text
动画电影级夸张物理 + 家庭向动作喜剧尺度 + 清晰安全边界 + 可恢复角色完整性。
```

不是完全无伤，也不是写实暴力。

允许：

- 灰头土脸
- 鼻血喷一下或鼻血一小道
- 头上起包
- 小擦伤
- 贴创可贴
- 衣服破一点、烧焦一点
- 眼冒金星
- 角色被撞飞、压扁、弹回
- 非写实枪炮、爆炸、追逐、打斗
- 怪物或机器人被打散、冒烟、掉零件

禁止或强烈避免：

- 大量流血、喷涌式出血、血泊
- 刀枪砍刺造成的清晰伤口过程
- 写实中弹、穿刺、断肢、内脏、骨折特写
- 痛苦呻吟、濒死、虐打、折磨式镜头
- 长时间聚焦伤口、疼痛或事故后果
- 真实可模仿的危险动作教程化表现
- 身体恐怖式变形

---

## 2. 安全尺度：`injury_tone_policy`

### 2.1 核心修订

旧版安全边界如果写成：

```yaml
avoid_visible_injury: true
avoid_blood: true
```

会过于保守，不适合动画电影级动作喜剧。

建议改为：

```yaml
injury_tone_policy:
  allow_minor_cartoon_injury: true
  allow_small_blood: selective
  allow_nosebleed_gag: true
  allow_bumps_bruises_dust: true
  avoid_graphic_injury_detail: true
  avoid_large_blood_loss: true
  avoid_gore_or_body_horror: true
  avoid_realistic_weapon_wound: true
  avoid_prolonged_pain_focus: true
  restore_character_integrity_after_gag: true
```

### 2.2 伤害尺度分级

```yaml
injury_scale:
  none:
    description: 完全无可见伤害，只用尘雾、星星、表情、道具反应表达冲击。
    examples:
      - 尘雾 puff
      - 眼冒金星
      - 衣角抖动
      - 道具弹跳
    default_for:
      - 温暖叙事
      - 儿童向片段
      - 情绪戏

  minor_cartoon:
    description: 轻微卡通伤害，可见但不真实、不吓人、不持续。
    examples:
      - 头上起包
      - 灰头土脸
      - 小擦伤
      - 贴创可贴
      - 鼻血一小道
      - 喷鼻血笑点
      - 衣服破洞或烧焦边
      - 眼镜歪掉、牙齿夸张一闪但不掉牙写实
    default_for:
      - expressive
      - comedic_push
      - 动作喜剧
      - 爽点惩罚

  moderate_stylized:
    description: 中度风格化伤害，只能短暂、非写实、非血腥地出现，用于动作强度或剧情代价。
    examples:
      - 多处灰尘和小擦伤
      - 鼻血 + 头包 + 眼冒金星
      - 角色被炸成黑脸爆炸头但立刻能说话
      - 机器人掉零件冒烟
      - 怪物被打飞后留下夸张伤痕符号
    allowed_when:
      - 需要明确表现冲突代价
      - 角色是反派或可承受夸张惩罚的喜剧角色
      - 世界观已经建立为动作喜剧
    constraints:
      - 不出现真实伤口细节
      - 不出现大量血液
      - 不持续聚焦疼痛
      - 角色在镜头结束或下一镜头恢复可表演状态

  forbidden_graphic:
    description: 禁用级别，不能进入家庭向动画电影尺度。
    examples:
      - 大量出血
      - 血泊
      - 刀砍枪击造成清晰开放性伤口
      - 中弹入肉特写
      - 骨折变形特写
      - 断肢、内脏、身体恐怖
      - 痛苦惨叫和濒死挣扎
      - 折磨、虐待、处刑感镜头
```

### 2.3 旧字段到新字段映射

```yaml
safety_boundary_legacy_mapping:
  avoid_blood:
    replace_with: avoid_large_blood_loss
    note: 不再禁止所有血迹；允许小范围鼻血、小擦伤血点、喜剧化喷鼻血。
  avoid_visible_injury:
    replace_with: avoid_graphic_injury_detail
    note: 不再禁止所有可见伤害；允许卡通头包、擦伤、灰头土脸、贴创可贴。
  avoid_realistic_pain_focus:
    keep: true
    note: 仍然禁止长时间聚焦真实痛苦。
  avoid_body_horror:
    keep: true
    note: 仍然禁止身体恐怖式变形。
  restore_character_integrity_after_gag:
    keep: true
    note: 卡通变形后必须恢复角色完整性。
```

### 2.4 推荐执行默认值

```yaml
animation_stylization:
  injury_tone_policy:
    visible_injury_level: minor_cartoon
    allow_nosebleed_gag: true
    allow_bumps_bruises_dust: true
    allow_small_scratches: true
    allow_small_blood: selective
    allow_soot_face: true
    allow_torn_clothes: selective
    forbid_large_blood_loss: true
    forbid_graphic_wounds: true
    forbid_gore: true
    forbid_realistic_weapon_wound: true
    forbid_prolonged_pain_focus: true
    restore_character_integrity_after_gag: true
```

---

## 3. 动画物理效果库：`physical_exaggeration`

```yaml
physical_exaggeration:
  body_deformation:
    squash_stretch: 压扁与拉伸
    elastic_rebound: 橡皮感回弹
    impact_flattening: 撞击瞬间压扁
    paper_flatten: 纸片化变薄
    accordion_compress: 手风琴式压缩
    noodle_body: 面条化身体
    rubber_limb_stretch: 四肢橡皮拉长
    corkscrew_twist: 螺旋扭转
    balloon_inflate: 气球式短暂膨胀
    pinched_tiny_body: 被气场压缩成小团
    giant_head_take: 头部瞬间放大
    eye_pop_take: 眼睛夸张弹出
    jaw_drop_stretch: 下巴夸张下落
    shoulder_sag_melt: 肩膀融化式下垂
    spine_wave: 身体波浪式传导冲击

  motion_dynamics:
    anticipation_squeeze: 动作前压缩蓄力
    launch_stretch: 起跳或冲出时身体拉长
    overshoot_settle: 过冲后回落
    stagger_recoil: 踉跄回震
    delayed_reaction: 慢半拍反应
    chain_reaction_recoil: 冲击从身体一端传到另一端
    smear_motion: 高速拖影
    multiple_pose_smear: 多姿态残影
    snap_to_pose: 一帧切到夸张姿势
    hang_time: 半空停顿
    gravity_delay: 重力延迟
    skid_stop: 脚底打滑刹停
    windup_spin: 原地旋转蓄力
    ricochet_bounce: 多表面弹射
    boomerang_return: 回力镖式返回
    magnet_pull: 磁吸式拉走
    suction_stretch: 吸力拉成长条
    spring_pop: 弹簧弹起

  expression_pose:
    freeze_take: 惊吓定格
    double_take: 二次回头反应
    slow_blink_realization: 慢眨眼后意识到问题
    embarrassed_shrink: 尴尬缩小
    proud_chest_puff: 得意挺胸
    angry_puff_up: 愤怒膨胀
    panic_scramble: 原地打滑小碎步
    guilty_micro_tremble: 心虚微颤
    fake_confidence_crack: 假镇定破裂
    heroic_pose_overdo: 英雄姿势过度导致失衡
    defeated_puddle_pose: 失败后瘫成一滩但不恐怖
```

---

## 4. 喜剧冲击库：`impact_gag_design`

```yaml
impact_gag_design:
  surface_impact:
    wall_splat: 贴墙变扁
    door_splat: 贴门板，门板反弹
    glass_squish_no_break: 玻璃像橡胶变形但不碎裂伤人
    floor_pancake: 地面煎饼式压扁
    ceiling_bonk: 弹到天花板留下凹印
    corner_fold: 撞墙角后纸张折角
    poster_peel_slide: 像海报一样剥落滑下
    stamp_mark_impact: 留下卡通轮廓印
    soft_crater_bounce: 地面软凹坑弹回

  launch_container:
    barrel_pop_in: 弹进木桶或垃圾桶
    box_fold_in: 撞进纸箱，纸箱折叠
    basket_swallow: 被篮筐或布袋套住
    laundry_wrap: 被布料或窗帘卷住
    umbrella_flip: 被伞弹开或包住
    spring_trap_pop: 被弹簧道具弹起
    vending_slot_squeeze: 被挤进缝隙后纸片滑出
    cushion_sink_rebound: 掉进软垫深陷后弹出
    toy_box_jumble: 掉进玩具箱，道具慢半拍飞出

  spin_chaos:
    tornado_spin: 小龙卷
    wheel_roll: 蜷成轮子滚动
    dizzy_orbit: 星星、小鸟、道具绕头转
    spiral_launch: 螺旋飞出画面
    pinball_hit: 弹珠式连弹
    boomerang_curve: 弯回原地
    group_domino: 群体多米诺倒下
    chair_spin_out: 椅子旋转甩出但安全落地
    tablecloth_pull_chaos: 桌布拉走，道具悬停半拍再掉

  safety_translation:
    weapon_to_prop_sweep: 武器接触改写成道具扫过或冲击风
    punch_to_air_burst: 击打改写为空气冲击波
    fall_to_bounce: 坠落改写成软垫反弹
    crash_to_splat: 撞击改写成贴墙纸片化
    chase_to_skid: 追打改写成打滑和道具阻挡
    explosion_to_soot_puff: 爆炸改写成烟尘、黑脸、爆炸头、小擦伤
    crush_to_accordion: 挤压改写成手风琴式变形
    cut_to_ribbon_gag: 切割风险改写成纸带、布带、装饰带飞散
    fire_to_soot_face: 火焰危险改写成烟熏黑脸和夸张眨眼
    bullet_to_spark_ricochet: 子弹危险改写成远离身体的火花跳弹或道具被击飞
```

---

## 5. VFX 画面语言库：`vfx_language`

```yaml
vfx_language:
  impact_speed:
    impact_rings: 冲击环
    shockwave_ripple: 空气波纹
    speed_lines: 速度线
    motion_arcs: 动势弧线
    radial_burst: 放射线爆点
    contact_flash: 接触瞬间短闪
    squash_shadow: 变形投影
    stretch_blur: 拉伸模糊
    afterimage_trail: 姿态残影
    compression_wave: 空气压缩波
    ground_ripple: 地面软波纹
    camera_bump: 镜头轻微震动

  particles:
    dust_puffs: 圆润尘雾团
    smoke_trails: 烟尘尾迹
    soft_debris: 轻量非尖锐碎屑
    paper_bits: 纸屑
    leaves_swirl: 树叶旋转
    flour_cloud: 面粉云
    soap_bubbles: 肥皂泡
    sparkle_pop: 小闪光
    confetti_burst: 彩纸爆开
    snow_puff: 雪粉团
    sand_splash: 沙尘飞溅
    water_splat: 水花拍扁形状
    soot_cloud: 黑烟云
    tiny_blood_spurt_gag: 喷鼻血式小型喜剧血点，仅限鼻血笑点

  symbolic:
    cartoon_stars: 眩晕星星
    tiny_birds: 头顶小鸟绕圈
    question_marks: 困惑问号
    exclamation_pop: 惊叹号弹出
    sweat_drop: 尴尬汗滴
    anger_marks: 愤怒符号
    heart_pop: 心动
    broken_heart_icon: 失落
    tiny_storm_cloud: 小乌云
    lightbulb_idea: 灵光一闪
    money_eye_flash: 贪心得意
    warning_triangle: 风格化危险预感
    silence_crow: 冷场乌鸦
    bump_pulse: 头包冒起时的脉冲线
    bandage_pop: 创可贴弹出式符号

  background_accent:
    freeze_frame_accent: 定格强调
    flash_accent: 喜剧闪白
    background_squeeze: 背景挤压
    background_zoom_tunnel: 背景隧道式拉远
    emotional_gradient_shift: 情绪渐变背景
    spotlight_isolation: 聚光灯式孤立
    vignette_pressure: 四周压暗
    stage_curtain_snap: 舞台幕布转场
    comic_panel_split: 漫画分格
    speed_tunnel: 高速通道背景
    silent_empty_background: 尴尬空白背景
    dramatic_shadow_drop: 阴影夸张落下
```

---

## 6. 情绪特效库：`emotional_vfx`

```yaml
emotional_vfx:
  anger:
    anger_steam: 冒蒸汽
    red_pressure_aura: 红色压迫气场
    eye_flame_glint: 眼神火光
    body_puff_up: 身体膨胀
    ground_crack_symbolic: 符号化地裂
    kettle_whistle_build: 水壶式升压
    eyebrows_shadow: 眉眼阴影压低

  shock:
    shock_freeze: 全身定格
    eye_pop_take: 眼睛夸张放大
    soul_pop_out: 灵魂小影子弹出又回去，仅 wild_cartoon
    blue_face_drain: 脸色变蓝
    background_drop: 背景瞬间下坠
    heartbeat_pulse: 胸口或画面脉冲
    tiny_alarm_icons: 小警报符号

  awkward:
    awkward_freeze: 画面定住
    cold_wind_sweep: 冷风横扫
    sweat_drop: 汗滴
    shrinking_spotlight: 聚光灯缩小
    silent_crow_pass: 冷场乌鸦飞过
    background_empty_white: 背景抽空变白
    delayed_prop_drop: 小物件慢半拍掉落

  pride:
    sparkle_backdrop: 背景闪光
    chin_up_glint: 下巴亮光
    chest_puff: 胸口鼓起
    tiny_fanfare_flags: 小旗帜或小号符号
    golden_rim_light: 金色边缘光
    smug_bubble: 得意泡泡膨胀，反转时破掉

  defeat:
    tiny_storm_cloud: 小乌云
    shoulder_melt: 肩膀融化下垂
    color_desaturate: 局部失去饱和度
    rain_on_head: 小范围下雨
    cracked_confidence_mask: 自信面具裂开
    puddle_slump: 瘫成一滩但非恐怖

  guilt_stealth:
    micro_tremble_lines: 微颤线
    darting_eye_trails: 眼神乱瞟轨迹
    nervous_sweat: 小汗珠
    shadow_sneak: 影子先行动
    zipper_mouth: 嘴巴拉链闭住，避免恐怖化
    tiptoe_music_notes: 脚步音符
```

---

## 7. 环境与道具反应库：`environment_reactivity`

```yaml
environment_reactivity:
  architecture:
    wall_deformation: 墙面弹性凹陷
    floor_ripple: 地面软波动
    ceiling_dust_fall: 天花板灰尘慢半拍落下
    door_flex_rebound: 门板弹回
    window_wobble: 窗户果冻式晃动
    signboard_swing: 招牌摆动
    lamp_sway: 灯具摇晃
    curtain_wave: 窗帘或布棚波浪传导
    stair_domino_echo: 楼梯小物件逐级震动

  props:
    prop_bounce: 小道具弹跳
    delayed_object_fall: 小物件慢半拍掉落
    stack_wobble: 堆叠物摇晃
    cup_spin: 杯子原地旋转
    spoon_flip: 勺子弹起翻转
    hat_pop: 帽子飞起又落回头上
    glasses_slide: 眼镜滑到鼻尖
    paper_fly: 纸张被冲击风卷起
    fruit_bounce: 水果弹跳
    toy_squeak: 玩具吱声
    bandage_fly_in: 创可贴飞入贴上
    ice_pack_pop: 冰袋弹出敷头包

  crowd:
    crowd_reaction_wave: 群众反应波
    synchronized_gasp: 集体吸气
    delayed_applause_misfire: 误会式鼓掌后尴尬停住
    group_lean: 所有人同向倾斜
    domino_fall_safe: 安全多米诺倒下
    freeze_except_one: 全场定格，只剩一个角色反应
    background_whisper_bubbles: 窃窃私语气泡
    crowd_parting_sea: 人群像海浪分开

  materials:
    cloth_flap: 布料抖动
    rubber_wall: 橡胶墙
    jelly_table: 果冻桌面
    foam_floor: 泡沫地面
    paper_world_fold: 纸片世界折叠
    toy_plastic_bounce: 玩具塑料弹跳
    water_blob_splash: 水团飞溅
    flour_soft_cloud: 面粉云
    snow_cushion: 雪地软垫
```

---

## 8. 声音钩子库：`stylized_action_audio`

```yaml
stylized_action_audio:
  impact:
    soft_bonk: 柔软咚声
    rubber_thump: 橡皮低频碰撞
    pillow_whump: 枕头式闷响
    toy_pop: 玩具弹出声
    comedic_boing: 弹簧 boing
    paper_splat: 纸片贴墙啪声
    puff_burst: 烟尘 puff 声
    bump_pop: 头包冒起 pop 声
    nosebleed_squirt_gag: 喷鼻血喜剧小声效，不能写实恶心

  motion:
    zipper_whoosh: 高速拉链式掠过
    wind_sweep: 风扫过
    spin_whirr: 旋转嗡声
    skid_squeak: 脚底打滑吱声
    stretch_squeal: 橡皮拉伸声
    wobble_wub: 果冻晃动声

  emotion:
    tiny_whistle: 尴尬小口哨
    silence_drop: 突然静音
    blink_tick: 慢眨眼 tick
    kettle_pressure: 愤怒升压声
    tiny_alarm: 惊吓小警报
    sparkle_chime: 得意闪光音

  recovery:
    rebound_boing: 回弹声
    paper_slide: 纸片滑落摩擦声
    dust_settle: 灰尘落下细声
    prop_clatter_soft: 道具轻柔散落
    bandage_snap: 创可贴贴上轻弹声

forbidden_audio:
  - bone_crack
  - wet_gore_impact
  - realistic_pain_scream
  - gore_squish
  - weapon_stab_sound
  - injury_detail_sound
  - realistic_gunshot_into_body
```

---

## 9. 场景触发模板：`stylized_scene_triggers`

### 9.1 追逐

```yaml
scene_trigger: chase
recommended_level: expressive_to_comedic_push
recommended_injury_level: none_to_minor_cartoon
recommended_effects:
  physical:
    - skid_stop
    - smear_motion
    - panic_scramble
    - launch_stretch
    - ricochet_bounce
  vfx:
    - speed_lines
    - dust_puffs
    - motion_arcs
    - afterimage_trail
  environment:
    - crowd_parting_sea
    - signboard_swing
    - paper_fly
  audio:
    - zipper_whoosh
    - skid_squeak
    - comedic_boing
allowed_injury:
  - 灰头土脸
  - 小擦伤
  - 头上小包
avoid:
  - 真实车祸细节
  - 真实摔伤过程
  - 持续痛苦表演
prompt_fragment_cn: >
  追逐动作采用动画电影式夸张节奏，角色脚底打滑、身体拉长冲出，身后留下柔和速度线和尘雾。允许灰头土脸、小擦伤或头上小包，但不表现真实事故伤害。
```

### 9.2 滑倒 / 摔倒

```yaml
scene_trigger: slip_and_fall
recommended_level: grounded_to_comedic_push
recommended_injury_level: none_to_minor_cartoon
recommended_effects:
  physical:
    - hang_time
    - gravity_delay
    - floor_pancake
    - elastic_rebound
    - delayed_reaction
  vfx:
    - motion_arcs
    - dust_puffs
    - soft_impact_ring
  environment:
    - floor_ripple
    - prop_bounce
    - delayed_object_fall
  audio:
    - skid_squeak
    - pillow_whump
    - rebound_boing
allowed_injury:
  - 头包
  - 灰尘
  - 小擦伤
  - 眼冒金星
avoid:
  - 头部真实重击
  - 骨折暗示
  - 痛苦呻吟特写
prompt_fragment_cn: >
  角色滑倒时在半空停顿一拍，落地瞬间地面像软垫下陷，扬起圆润尘雾。角色短暂压扁后弹回坐姿，可以头上鼓起一个卡通包、眼冒金星，但不表现真实重伤。
```

### 9.3 撞墙 / 撞门

```yaml
scene_trigger: wall_or_door_impact
recommended_level: expressive_to_comedic_push
recommended_injury_level: minor_cartoon
recommended_effects:
  physical:
    - impact_flattening
    - paper_flatten
    - poster_peel_slide
    - elastic_rebound
  vfx:
    - impact_rings
    - stamp_mark_impact
    - dust_puffs
    - bump_pulse
  environment:
    - wall_deformation
    - door_flex_rebound
    - signboard_swing
  audio:
    - paper_splat
    - rubber_thump
    - paper_slide
allowed_injury:
  - 灰头土脸
  - 头上起包
  - 鼻血一小道
  - 眼冒金星
avoid:
  - 大量出血
  - 清晰伤口
  - 真实痛苦特写
prompt_fragment_cn: >
  角色撞到墙面时以卡通物理表现，身体变成扁平剪影贴在墙上。墙面出现轮廓印、柔和冲击环和尘雾。角色滑落后可以灰头土脸、头上起包、鼻子流一小道鼻血，但不出现大量流血或真实伤口。
```

### 9.4 打斗 / 爽点惩罚

```yaml
scene_trigger: stylized_fight_or_payoff_punishment
recommended_level: expressive_to_comedic_push
recommended_injury_level: minor_cartoon_to_moderate_stylized
recommended_effects:
  physical:
    - punch_to_air_burst
    - wall_splat
    - elastic_rebound
    - stagger_recoil
    - cartoon_stars
  vfx:
    - impact_rings
    - contact_flash
    - dust_puffs
    - radial_burst
  emotional_vfx:
    - fake_confidence_crack
    - exclamation_pop
    - smug_bubble
  audio:
    - soft_bonk
    - rubber_thump
    - silence_drop
allowed_injury:
  - 鼻血喷一下作为笑点
  - 头包
  - 小擦伤
  - 衣服破损
  - 灰头土脸
avoid:
  - 刀枪造成开放性伤口
  - 血泊
  - 虐打或处刑感
  - 连续真实痛苦
prompt_fragment_cn: >
  打斗以动画电影级动作喜剧呈现，冲击通过空气波、压扁拉伸、尘雾和夸张表情完成。允许角色被打得灰头土脸、头上鼓包、短暂喷鼻血作为笑点，但不表现刀枪伤口、大量流血或真实痛苦。
```

### 9.5 枪炮 / 科幻对攻

```yaml
scene_trigger: stylized_gun_or_cannon_action
recommended_level: expressive_to_comedic_push
recommended_injury_level: none_to_minor_cartoon
recommended_effects:
  physical:
    - dodge_stretch
    - ricochet_bounce
    - impact_flattening
    - soot_face
  vfx:
    - spark_particles
    - shockwave_ripple
    - smoke_trails
    - contact_flash
    - dust_puffs
  environment:
    - prop_bounce
    - signboard_swing
    - soft_debris
  audio:
    - toy_pop
    - rubber_thump
    - puff_burst
allowed_injury:
  - 黑脸爆炸头
  - 衣服烧焦边
  - 小擦伤
  - 道具被打飞
avoid:
  - 子弹入体
  - 枪伤血洞
  - 大量流血
  - 真实枪击痛苦
prompt_fragment_cn: >
  枪炮对攻以非写实动画动作表现，重点是火花跳弹、烟尘、冲击波、道具被打飞和角色夸张躲闪。可以出现黑脸爆炸头、衣服烧焦边或小擦伤，但不表现子弹入体、枪伤血洞或大量流血。
```

### 9.6 厨房 / 餐馆事故

```yaml
scene_trigger: kitchen_or_restaurant_mishap
recommended_level: expressive_to_comedic_push
recommended_injury_level: none_to_minor_cartoon
recommended_effects:
  physical:
    - skid_stop
    - floor_pancake
    - rubber_limb_stretch
    - hang_time
  vfx:
    - flour_cloud
    - water_splat
    - sparkle_pop
    - soot_cloud
  environment:
    - spoon_flip
    - cup_spin
    - fruit_bounce
    - stack_wobble
  audio:
    - soft_bonk
    - prop_clatter_soft
    - puff_burst
allowed_injury:
  - 面粉糊脸
  - 锅底灰黑脸
  - 小擦伤
  - 头包
avoid:
  - 烫伤细节
  - 刀具切割身体
  - 真实厨房危险事故
prompt_fragment_cn: >
  厨房混乱以软性喜剧方式呈现，面粉爆成圆润白云，水果像弹力球一样跳起，盘子在空中旋转但不碎裂伤人。角色可以面粉糊脸、锅底灰黑脸、头上起包，但不出现烫伤或切伤细节。
```

### 9.7 尴尬 / 社死

```yaml
scene_trigger: awkward_public_moment
recommended_level: grounded_to_expressive
recommended_injury_level: none
recommended_effects:
  physical:
    - embarrassed_shrink
    - slow_blink_realization
    - shoulder_sag_melt
  emotional_vfx:
    - awkward_freeze
    - cold_wind_sweep
    - sweat_drop
    - silent_empty_background
  environment:
    - freeze_except_one
    - delayed_object_fall
  audio:
    - silence_drop
    - tiny_whistle
    - blink_tick
prompt_fragment_cn: >
  尴尬发生后画面突然安静，角色缩小一圈，头侧出现一滴汗。背景被抽成空白，一个小道具慢半拍掉落，制造冷场笑点。
```

### 9.8 误会升级

```yaml
scene_trigger: misunderstanding_escalation
recommended_level: expressive_to_comedic_push
recommended_injury_level: none
recommended_effects:
  physical:
    - double_take
    - delayed_reaction
    - group_lean
    - panic_scramble
  emotional_vfx:
    - question_marks
    - exclamation_pop
    - background_squeeze
  environment:
    - crowd_reaction_wave
    - synchronized_gasp
    - background_whisper_bubbles
  audio:
    - tiny_alarm
    - silence_drop
    - comedic_boing
prompt_fragment_cn: >
  误会被点燃后，角色先慢半拍转头，随后表情同时炸开。背景群众按从近到远形成反应波，问号和惊叹号短暂弹出，节奏逐层加速。
```

---

## 10. Prompt 片段库

### 10.1 通用正向片段

```text
本段采用动画电影级夸张物理表现。动作不是现实伤害复刻，而是通过压扁、拉伸、回弹、定格、尘雾、冲击环、道具反应和轻度卡通伤害来表达冲击。允许灰头土脸、头上起包、小擦伤、喷鼻血笑点或小范围鼻血，但必须保持喜剧化、非写实、可恢复。
```

### 10.2 通用负向片段

```text
不要大量流血、血泊、开放性伤口、写实刀枪伤、骨折特写、断肢、内脏、身体恐怖、持续痛苦、虐打或处刑感。不要表现真实武器刺入身体或子弹入体。所有伤害都应是家庭向动画动作喜剧尺度，角色在动作结束后保持完整可表演状态。
```

### 10.3 撞墙后轻伤片段

```text
角色被冲击带飞贴到墙上，身体变成扁平剪影，墙面留下卡通轮廓印。停顿半秒后他像海报一样滑落，落地时弹回原形，灰头土脸，头上鼓起一个包，鼻子流出一小道鼻血，头顶星星转圈。画面保持喜剧化，不出现血泊、伤口或真实痛苦。
```

### 10.4 打斗喷鼻血片段

```text
冲击发生时使用空气波和卡通闪白替代真实击打细节。角色表情夸张变形，鼻血像小喷泉一样短促喷出形成笑点，随后他眼冒金星、头上起包、坐在地上发懵。不要表现真实伤口、大量出血或持续痛苦。
```

### 10.5 枪炮对攻片段

```text
枪炮或能量弹只表现为风格化火花、烟尘、跳弹和道具被击飞。角色通过夸张躲闪、贴地滑行、橡皮回弹避开攻击。可以出现黑脸爆炸头、衣服烧焦边和小擦伤，但不要子弹入体、枪伤血洞或大量流血。
```

---

## 11. 推荐默认配置

```yaml
animation_stylization:
  level: expressive
  preset: animated_feature_expressive
  effect_density: medium
  density_rule: hero_moment_and_high_risk_translation_only
  injury_tone_policy:
    visible_injury_level: minor_cartoon
    allow_minor_cartoon_injury: true
    allow_small_blood: selective
    allow_nosebleed_gag: true
    allow_bumps_bruises_dust: true
    allow_soot_face: true
    allow_torn_clothes: selective
    forbid_large_blood_loss: true
    forbid_graphic_wounds: true
    forbid_gore: true
    forbid_realistic_weapon_wound: true
    forbid_realistic_bullet_wound: true
    forbid_prolonged_pain_focus: true
    restore_character_integrity_after_gag: true
```

---

## 12. 落地建议

后续如果正式改造 v4：

1. `PROJECT_BOARD.md` 初始化模板应保存 `animation_stylization` 和 `injury_tone_policy`。
2. `scene-design-builder` 负责选择项目默认尺度。
3. `scene-script-adapter` 负责识别哪些 beat 需要从真实暴力转译成动画动作喜剧。
4. `scene-performance-director` 负责设计具体表演变形和轻伤状态。
5. `scene-storyboard-director` 负责镜头化冲击、VFX 和轻伤可见度。
6. `scene-audio-director` 负责避免真实骨裂、湿黏伤害声，改用 boing、bonk、puff 等声音。
7. `scene-video-prompt-builder` 负责把正向效果和负向边界写进最终 Segment Prompt。

核心原则：

```text
允许动画电影动作喜剧里的轻中度卡通受伤；
禁止真实、血腥、残酷、持续痛苦和身体恐怖。
```
