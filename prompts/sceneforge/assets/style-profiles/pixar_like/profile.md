# `pixar_like` 风格总览（Profile）

```yaml
style_profile:
  director_style_id: pixar_like
  director_style_version: v1
  style_family: 3d_animation
  summary: >
    以角色魅力、情绪曲线、温暖灯光、表演驱动幽默和家庭向动画电影感为核心的
    3D 动画电影化风格。
  suitable_topics:
    - 家庭向喜剧
    - 情绪反差桥段
    - 角色成长故事
    - 经典名场面温暖改编
  recommended_performance_styles:
    - cinematic_comedy
    - poetic_lyrical
  required_profile_files:
    - style_profiles/pixar_like/visual_language.md
    - style_profiles/pixar_like/performance_language.md
    - style_profiles/pixar_like/camera_language.md
    - style_profiles/pixar_like/rhythm_language.md
    - style_profiles/pixar_like/lighting_language.md
    - style_profiles/pixar_like/negative_constraints.md
  fallback_policy:
    can_be_default_for_phase1_3d: true
    note: 未显式选择风格包时，仅允许作为第一轮 3D 风格的显式回退项使用。
```

## 使用原则

- 它是 SceneForge 第一套完整参考实现，不是全系统默认真理。
- 对外提示词与发布文案不直接使用品牌名。
- 风格包负责“怎么拍、怎么演、怎么长”，不负责改写主链结构。

## 代表作品（Representative Works）

- 《玩具总动员》系列
- 《头脑特工队》
- 《寻梦环游记》

说明：

- 这些作品只用于帮助理解“温暖角色驱动 3D（Warm Character-Driven 3D）”的导演语言。
- 运行时应提炼共同的风格特征，不直接把具体作品当成复刻目标。
