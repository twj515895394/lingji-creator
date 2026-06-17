# SceneForge v5 执行期镜头语言基础库

> 位置：`assets/cinematic-language/shot-language-library.md`
>
> 作用：供 `scene-storyboard-director` 在运行时按需读取的基础镜头语言枚举与使用规则。
>
> 本库只提供可迁移的镜头语言原则，不引用、不复刻任何具体电影镜头。

---

## 1. 使用原则

```yaml
asset_type: executable_reference
usable_by:
  - scene-storyboard-director
  - scene-video-prompt-builder
purpose:
  - 基础景别枚举
  - 基础机位枚举
  - 基础构图枚举
  - 镜头运动枚举
  - 剪辑节奏枚举
  - 镜头动机提示
runtime_readable: true
```

使用规则：

```text
镜头语言必须服务叙事、情绪、动作、空间、喜剧或世界观信息。
不要为了“专业感”随机堆景别、机位和运动。
每个关键镜头都应写清 visual_motivation。
```

---

## 2. 景别库：`shot_scale_library`

```yaml
shot_scale_library:
  extreme_wide:
    label: 大远景 / 极远景
    use_for:
      - 世界观建立
      - 宏大空间
      - 孤独感
      - 动作地理
      - 角色与环境关系
    avoid_when:
      - 需要微表情
      - 需要道具细节
    storyboard_note_cn: 用极大空间压小角色，或先建立动作发生的地理关系。

  wide:
    label: 全景 / 远景
    use_for:
      - 多角色关系
      - 身体动作
      - 空间调度
      - 体型反差同框
      - 道具与角色比例关系
    avoid_when:
      - 情绪需要非常细腻
    storyboard_note_cn: 适合让观众同时看清角色、道具和空间关系。

  full:
    label: 全身景
    use_for:
      - 身体喜剧
      - 动作前摇
      - 角色姿态
      - 反差道具使用
    avoid_when:
      - 环境信息比角色动作更重要
    storyboard_note_cn: 适合展示完整身体线条和动作节奏。

  medium:
    label: 中景
    use_for:
      - 对话
      - 角色关系
      - 手部动作与表情平衡
      - 轻喜剧反应
    avoid_when:
      - 需要大空间建立
      - 需要极细微表情
    storyboard_note_cn: 适合大多数角色互动场景。

  medium_close:
    label: 中近景
    use_for:
      - 情绪递进
      - 对话压力
      - 眼神与上半身动作
      - 反应停顿
    avoid_when:
      - 需要完整身体动作
    storyboard_note_cn: 适合让观众看清角色心理变化，又不完全切断身体动作。

  close_up:
    label: 近景 / 特写
    use_for:
      - 微表情
      - 情绪反应
      - 关键理解瞬间
      - 眼神变化
      - 喜剧反应延迟
    avoid_when:
      - 空间关系尚未建立
    storyboard_note_cn: 用于情绪核心或喜剧反应点，不要滥用。

  extreme_close_up:
    label: 大特写
    use_for:
      - 眼睛
      - 手指
      - 按钮
      - 关键线索
      - 高压悬念
    avoid_when:
      - 信息不值得如此强调
    storyboard_note_cn: 只用于极关键细节。

  insert:
    label: 插入镜头
    use_for:
      - 道具状态
      - 手部动作
      - 线索
      - 小声音来源
      - 反差道具揭示
    avoid_when:
      - 插入镜头打断主情绪
    storyboard_note_cn: 插入镜头必须服务信息、笑点或连续性。
```

---

## 3. 机位库：`camera_angle_library`

```yaml
camera_angle_library:
  eye_level:
    label: 平视
    use_for:
      - 自然观察
      - 对话
      - 关系平衡
      - 角色亲近感
    storyboard_note_cn: 适合让观众自然进入角色关系。

  low_angle:
    label: 低机位
    use_for:
      - 强角色
      - 英雄感
      - 体型压迫
      - 反差 setup
      - 大道具或巨大环境
    avoid_when:
      - 不希望角色显得强势
    storyboard_note_cn: 可先建立压迫感，再用于反差释放。

  high_angle:
    label: 高机位
    use_for:
      - 弱势角色
      - 迷你角色
      - 俯瞰空间关系
      - 被环境压迫
    avoid_when:
      - 需要强化角色力量
    storyboard_note_cn: 可强调小角色处境或复杂空间。

  overhead:
    label: 顶视
    use_for:
      - 路径规划
      - 群体调度
      - 追逐路线
      - 阵营关系
    avoid_when:
      - 情绪表演是核心
    storyboard_note_cn: 适合说明动作地理。

  dutch:
    label: 倾斜机位
    use_for:
      - 失衡
      - 混乱
      - 错误感
      - 荒诞升级
    avoid_when:
      - 画面需要稳定和温暖
    storyboard_note_cn: 谨慎使用，避免变成无意义炫技。

  over_shoulder:
    label: 过肩
    use_for:
      - 对话压力
      - 视线关系
      - 权力关系
      - 搭档关系变化
    storyboard_note_cn: 适合表现角色之间的距离和对峙。

  pov:
    label: 主观视角
    use_for:
      - 危险来源
      - 尺度差
      - 角色体验
      - 线索发现
    storyboard_note_cn: 让观众暂时进入角色感知。
```

---

## 4. 构图库：`composition_library`

```yaml
composition_library:
  centered:
    label: 中心构图
    use_for:
      - 英雄时刻
      - 喜剧停顿
      - 明确视觉焦点
      - 角色 reveal
    storyboard_note_cn: 中心构图适合让笑点或英雄姿态一眼可见。

  rule_of_thirds:
    label: 三分构图
    use_for:
      - 自然对话
      - 角色与空间平衡
      - 情绪观察
    storyboard_note_cn: 通用、稳定、自然。

  symmetrical:
    label: 对称构图
    use_for:
      - 仪式感
      - 压迫秩序
      - 喜剧严肃化
      - 类型片误导
    storyboard_note_cn: 可用严肃构图拍荒诞内容，制造反差。

  asymmetrical:
    label: 非对称构图
    use_for:
      - 不安
      - 权力不平衡
      - 关系错位
      - 动作动势
    storyboard_note_cn: 用于表现不稳定或不对等关系。

  negative_space:
    label: 留白构图
    use_for:
      - 孤独
      - 等待
      - 尴尬
      - 世界压迫
      - 情绪空缺
    storyboard_note_cn: 适合情感停顿，不要被随机背景填满。

  foreground_frame:
    label: 前景遮挡 / 前景框架
    use_for:
      - 偷看
      - 悬念
      - 微观世界
      - 复杂空间层次
    storyboard_note_cn: 前景可增加世界真实感和视角感。

  silhouette:
    label: 剪影构图
    use_for:
      - 英雄 reveal
      - 反派气场
      - 情绪孤立
      - 形状语言强调
    storyboard_note_cn: 适合角色首次登场或气质建立。

  deep_staging:
    label: 纵深调度
    use_for:
      - 多角色关系
      - 追逐
      - 城市空间
      - 前后景信息同时存在
    storyboard_note_cn: 用前中后景组织信息，避免所有角色挤在一条线上。

  scale_contrast_depth:
    label: 尺度反差纵深
    use_for:
      - 大小角色同框
      - 大身体小道具
      - 微观世界
      - 巨大环境压迫
    storyboard_note_cn: 让比例差在同一画面内成立。
```

---

## 5. 镜头运动库：`movement_library`

```yaml
movement_library:
  locked:
    label: 固定镜头
    use_for:
      - 喜剧停顿
      - 尴尬
      - 观察式幽默
      - 情绪安静
      - 反差 reveal 后的 hold
    storyboard_note_cn: 固定镜头能让观众看清动作和反应。

  pan:
    label: 摇镜
    use_for:
      - 横向揭示
      - 跟随视线
      - 展示空间
    storyboard_note_cn: 适合自然揭示信息。

  tilt:
    label: 俯仰摇镜
    use_for:
      - 高大物体 reveal
      - 角色体型揭示
      - 从道具到角色的关系建立
    storyboard_note_cn: 可用于从小道具摇到巨大角色，强化反差。

  push_in:
    label: 推镜
    use_for:
      - 情绪聚焦
      - 意识到问题
      - 揭示前压迫
      - 关键决定
    storyboard_note_cn: 推镜要有心理或叙事动机。

  pull_out:
    label: 拉镜
    use_for:
      - 揭示环境
      - 暴露尴尬处境
      - 角色被世界包围
    storyboard_note_cn: 常用于从主观情绪拉回现实处境。

  tracking:
    label: 跟拍
    use_for:
      - 追逐
      - 行动连续性
      - 角色穿过空间
    storyboard_note_cn: 跟拍要保持方向清楚。

  orbit:
    label: 环绕
    use_for:
      - 角色状态变化
      - 高能时刻
      - 奇观展示
    avoid_when:
      - 简单对话
    storyboard_note_cn: 不要为了炫技滥用。

  crane:
    label: 升降 / 摇臂感
    use_for:
      - 大空间 reveal
      - 冒险感
      - 结尾释放
    storyboard_note_cn: 用于从角色扩展到世界。

  whip_pan:
    label: 快速甩镜
    use_for:
      - 快速反应
      - 误会升级
      - 动作喜剧
      - 突发信息
    avoid_when:
      - 情绪需要安静
    storyboard_note_cn: 适合喜剧节奏，但要避免让观众迷路。
```

---

## 6. 剪辑节奏库：`edit_rhythm_library`

```yaml
edit_rhythm_library:
  slow_hold:
    label: 慢停顿
    use_for:
      - 情绪停顿
      - 失落
      - 温柔
      - 孤独
    storyboard_note_cn: 给观众时间理解情绪。

  reaction_pause:
    label: 反应停顿
    use_for:
      - 喜剧反应
      - 尴尬
      - 反差 reveal
      - 群体慢半拍
    storyboard_note_cn: 喜剧经常需要停顿，而不是一直快切。

  reveal_cut:
    label: 揭示切
    use_for:
      - 道具揭示
      - 身份反差
      - 视觉反转
      - 线索出现
    storyboard_note_cn: 切点应该落在观众预期被打破的瞬间。

  action_continuity:
    label: 动作连续剪辑
    use_for:
      - 追逐
      - 战斗
      - 救援
      - 空间连贯动作
    storyboard_note_cn: 保持方向、动作余势和因果关系。

  quick_cut:
    label: 快切
    use_for:
      - 混乱升级
      - 多点反应
      - 动作加速
    avoid_when:
      - 观众尚未理解空间
    storyboard_note_cn: 快切前必须先建立空间。

  match_cut:
    label: 匹配剪辑
    use_for:
      - 时间跳跃
      - 动作延续
      - 视觉类比
      - 喜剧对照
    storyboard_note_cn: 适合把两个动作或物体状态联系起来。

  montage:
    label: 蒙太奇
    use_for:
      - 时间压缩
      - 关系变化
      - 训练
      - 情绪推进
    storyboard_note_cn: 蒙太奇要有清楚的递进逻辑。
```

---

## 7. 输出字段建议

分镜阶段使用本库时，建议写入：

```yaml
cinematic_language_plan:
  - unit_id:
    shot_id:
    shot_scale:
    camera_angle:
    composition:
    lens_feel:
    camera_movement:
    staging_depth:
    edit_rhythm:
    visual_motivation:
```

其中 `visual_motivation` 必填。

示例：

```yaml
visual_motivation: 观众需要同时看到大块头角色、小自行车和周围空间，体型与道具反差必须在同一画面内成立。
```

---

## 8. 一句话原则

```text
基础镜头语言不是装饰参数；
它必须解释“观众应该看什么、为什么这样看、这个镜头服务什么叙事或情绪功能”。
```
