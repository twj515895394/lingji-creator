# SceneForge Remix Mode 产品设计文档 v1.0

> 日期：2026-06-22  
> 所属模块：SceneForge / Remix Mode  
> 文档类型：产品设计  
> 目标分支：`codex/sceneforge-studio-core`

## 1. 背景与定位

SceneForge 当前主流程更偏向“从创意到故事板，再到视频提示词”的原创式内容生产。Remix Mode 的目标不是替代现有原创流程，而是补齐另一类高频创作场景：基于经典片段、影视名场面、短视频爆梗、B 站二创素材进行 AI 视频再创作。

Remix Mode 面向的用户不是传统剪辑师，而是 AI 二创作者。用户通常已经有一个可参考的原片段，希望把其中的剧情关系、台词节奏、动作表演、镜头构图或梗点机制迁移到新的角色、场景、风格和声音设计中，再通过 AI 图像编辑与 AI 视频生成完成新版片段。

因此，Remix Mode 的核心定位是：

```text
原片参考驱动的 AI 二创工作流。
```

它不是传统视频剪辑器，也不是单纯的 prompt 工具，而是将原片拆解成可复用的创作资产，再围绕这些资产生成二创版本。

## 2. 产品目标

Remix Mode 的产品目标分为三层。

第一层是原片资产化。系统需要把用户导入的原视频拆解为稳定的 source asset，包括原视频、转录文本、真实镜头片段、首尾关键帧、必要时的中间帧、片段分析、全局原片分析。

第二层是二创版本生成。用户可以基于同一个 source asset 创建多个 remix variant。每个 variant 拥有自己的参考强度、保留矩阵、改编策略、角色设定、风格设定、关键帧改图提示词、改后关键帧、Seedance 2.0 视频生成提示词。

第三层是可复制、可批量、可复用。用户最终拿到的不是散乱的文字，而是围绕 segment 顺序组织好的关键帧改图提示词和 Seedance 2.0 视频生成提示词，可用于批量生成二创视频片段。

## 3. 非目标

第一版不做多平台视频提示词适配。目标平台统一为 Seedance 2.0。

第一版不做传统剪辑器能力，例如复杂时间线、多轨剪辑、关键帧动画编辑、转场编辑、字幕精排。

第一版不直接对接第三方视频生成 API，不负责自动提交任务到 Seedance 2.0，只负责生成高质量、结构化、可复制的提示词与资产包。

第一版不做 Video-to-Video 的模型适配层，但支持在提示词层描述“改后关键帧 + 原始 source_clip.mp4”作为生成/编辑参考。

第一版不做复杂的多平台 provider adapter，不输出 Kling / 即梦 / Runway / Pika / Veo 等多个版本。

## 4. 核心用户场景

### 4.1 经典片段二创

用户导入一个经典影视片段，例如强冲突对话、反转桥段、名场面。系统将其切成真实镜头优先的 segment，分析每段台词、动作、表情、镜头和梗点。用户创建一个新的 remix variant，例如“动物拟人版”“20 世纪外国电影棚拍版”“赛博水果摊版”，系统生成对应的关键帧改图提示词和 Seedance 2.0 视频提示词。

### 4.2 短视频爆梗复用

用户导入一个热门短视频梗，保留原片的包袱结构和台词节奏，但替换人物、场景、视觉风格和台词表达。系统帮助用户把原片节奏结构转成可复用的二创模版。

### 4.3 同一原片多版本二创

用户对同一个 source asset 多次创建 remix variant。例如同一段“买瓜”片段可以派生为动物版、三国版、科幻版、职场版、动漫版。各 variant 独立存放，互不覆盖。

## 5. 核心概念

### 5.1 Source Asset

Source Asset 是原片资产化后的总对象。它代表一段可被反复二创的原始素材。

Source Asset 包含：

```text
source video
source metadata
transcript / srt
source overview
source segments
segment analyses
source keyframes
```

### 5.2 Source Segment

Source Segment 是 Remix Mode 的基础生成单元。它不简单等同于固定 5 / 10 / 15 秒片段，而是以真实镜头边界为优先。

切分原则：

```text
真实镜头边界优先
长镜头才做安全二次切分
短镜头可按场景 / 台词 / 动作节奏合并
找不到安全切点时允许 long_segment
```

Source Segment 必须实际切出 `source_clip.mp4`，不能只保存时间码。

### 5.3 Remix Variant

Remix Variant 是基于 source asset 派生出的某一个二创版本。

一个 source asset 可以有多个 remix variant。

每个 variant 独立保存：

```text
variant manifest
reference strength
retention matrix
remix strategy
remix design
keyframe edit prompts
edited keyframes
Seedance 2.0 video prompts
audio plan
```

### 5.4 Reference Strength

Reference Strength 表示该 variant 对原片的参考强度。第一版只做三档：

```text
light
medium
strong
```

light 表示只参考原片结构和梗点，人物、场景、台词、风格可大幅重写。

medium 表示保留剧情结构、人物关系、台词节奏和主要冲突，替换角色、场景、风格和具体表达。

strong 表示强参考原片动作节奏、表演关系、镜头构图和情绪推进，但替换人物外观、服装、场景和视觉风格。

### 5.5 Retention Matrix

Retention Matrix 表示该 variant 对原片不同维度的保留方式。第一版固定 9 个维度，不开放自定义维度。

```json
{
  "plotStructure": ["keep", "soft_keep", "rewrite"],
  "characterRelationship": ["keep", "replace_identity", "rebuild"],
  "dialogueMeaning": ["keep", "rewrite", "new_dialogue"],
  "dialogueRhythm": ["keep", "adjust", "redo"],
  "performanceAction": ["keep", "exaggerate", "redo"],
  "cameraComposition": ["keep", "soft_keep", "redo"],
  "sceneEnvironment": ["keep", "replace", "abstract"],
  "visualStyle": ["original", "new_style", "hybrid"],
  "memeMechanism": ["keep", "enhance", "replace_hot_meme"]
}
```

Retention Matrix 驱动后续所有阶段，包括策略、设计、关键帧改图提示词、声音设计和 Seedance 2.0 视频提示词。

## 6. 完整产品流程

Remix Mode 分为两个大阶段：原片资产化和二创版本生成。

```text
A. 原片资产化
remix_source_import
→ remix_segmentation
→ remix_keyframes
→ remix_understanding

B. 二创版本生成
remix_variant_create
→ remix_strategy
→ remix_design
→ remix_keyframe_edit_prompts
→ edited_keyframes_review
→ remix_video_prompts
→ remix_publish
```

## 7. Stage 设计

### 7.1 remix_source_import

目标：复用现有 video-import 能力，将用户导入的视频注册为 remix source asset。

输入：本地视频、已有导入视频、外部视频来源。

输出：source video、metadata、transcript、srt、source manifest。

关键规则：不重写导入模块，Remix 只做封装、登记、资产化入口。

### 7.2 remix_segmentation

目标：将原视频切成可用于二创的 source segment。

切分优先级：

```text
1. 真实镜头边界
2. 台词完整性
3. 动作闭合点
4. 情绪节拍完成点
5. AI 视频时长友好区间
```

规则：

- 默认以真实镜头为 segment。
- 过短镜头可与前后镜头合并。
- 超过 15 秒的长镜头优先寻找安全切点。
- 找不到安全切点时保留为 `long_segment`。
- 每个 segment 必须实际切出 `source_clip.mp4`。

Segment 类型：

```ts
type RemixSegmentBoundaryType =
  | 'source_shot'
  | 'merged_short_shots'
  | 'split_long_shot'
  | 'long_segment';
```

### 7.3 remix_keyframes

目标：为每个 segment 提取后续分析与改图需要的关键帧。

规则：

```text
所有 segment 必须提取 first_frame.png 和 last_frame.png。
当 segment 时长 > 8 秒时，必须额外提取 middle_frame.png。
大于 8 秒的 middle_frame 必须进入后续改图批处理。
```

### 7.4 remix_understanding

目标：理解原片和每个 segment 的剧情、人物、台词、表演、镜头、梗点。

输出采用 Markdown + JSON 双产物。

全局产物：

```text
source_overview.md
source_overview.json
```

分段产物：

```text
segment_analysis.md
segment_analysis.json
```

segment_analysis 必须包含关键帧级分析：

```text
first keyframe analysis
middle keyframe analysis, when enabled
last keyframe analysis
motion bridge
```

### 7.5 remix_variant_create

目标：基于 source asset 创建一个二创版本。

用户需要配置：

```text
variant name
variant concept
referenceStrength
retentionMatrix
目标风格 / 角色替换 / 场景替换 / 梗点方向
```

### 7.6 remix_strategy

目标：把用户的二创方向和原片分析结合，生成可执行的改编策略。

输出：

```text
remix_strategy.md
remix_strategy.json
segment_adaptations/segment_001_adaptation.md
segment_adaptations/segment_001_adaptation.json
```

策略必须包含全局策略和逐片段策略。

### 7.7 remix_design

目标：把策略沉淀为稳定设定资产，保证后续批量改图和视频生成的一致性。

输出：

```text
global_design.md
global_design.json
segment_design_overrides/
```

Design 包含：

```text
角色设定
场景设定
风格设定
表演规则
连续性规则
声音角色规则摘要
```

支持“全局设定 + 逐片段 override”。

### 7.8 remix_keyframe_edit_prompts

目标：生成用于 AI 图像编辑的关键帧改图提示词。

采用双层结构：

```text
global_keyframe_edit_rules
segment-level frame edit prompts
```

每个 segment 根据 first / middle / last 关键帧生成对应改图提示词。middle 仅在时长 > 8 秒时出现。

### 7.9 edited_keyframes_review

目标：登记和验收用户实际生成的改后关键帧。

状态：

```text
pending
generated
needs_revision
approved
rejected
```

只有 approved 的 edited keyframes 才能进入后续 Seedance 2.0 视频提示词生成阶段。

### 7.10 remix_video_prompts

目标：生成面向 Seedance 2.0 的视频生成提示词。

第一版只面向 Seedance 2.0，不做多平台适配。

支持两种生成模式：

```text
keyframes_only
keyframes_plus_source_clip
```

模式支持 variant 默认值，也支持 segment 单独覆盖。

输出采用双层结构：

```text
global_seedance_rules
segment_seedance_prompts
```

内部保留结构化字段，用户侧只输出 Seedance 2.0 可复制提示词。

### 7.11 remix_publish

目标：汇总所有可复制提示词、资产路径、生成顺序和人工操作说明。

第一版可以不做真正导出视频，只输出生成清单和提示词包。

## 8. 关键帧改图产品规则

原片关键帧和改后关键帧必须分开落库。

原片关键帧位于 source asset 下：

```text
source_segments/segment_003/first_frame.png
source_segments/segment_003/middle_frame.png
source_segments/segment_003/last_frame.png
```

改后关键帧位于 variant 下：

```text
remix_variants/variant_001/edited_keyframes/segment_003/first_frame_edited.png
remix_variants/variant_001/edited_keyframes/segment_003/middle_frame_edited.png
remix_variants/variant_001/edited_keyframes/segment_003/last_frame_edited.png
```

这样同一个原片段可以派生多个二创版本，且互不覆盖。

## 9. Seedance 2.0 视频提示词产品规则

第一版最终输出只服务 Seedance 2.0。

内部结构化字段：

```json
{
  "targetPlatform": "seedance_2_0",
  "structuredFields": {
    "visual": "",
    "motion": "",
    "camera": "",
    "performance": "",
    "dialogue": "",
    "voice": "",
    "soundEffects": "",
    "ambientAudio": "",
    "negative": ""
  },
  "copyablePrompt": ""
}
```

用户侧看到的是可直接复制的提示词，建议结构：

```text
【生成任务】
【输入素材】
【画面与角色】
【动作与表演】
【镜头与构图】
【对白与语音】
【音效与环境声】
【音画同步要求】
【负面约束】
```

## 10. Audio Plan 产品规则

Seedance 2.0 提示词必须包含声音设计，不把声音作为附属描述。

Audio Plan 采用双层结构：

```text
global_audio_rules
segment_audio_plan
```

### 10.1 Voice Profiles

为每个角色建立声音档案，供所有 segment 复用。

```json
{
  "characterId": "character_a",
  "characterName": "动物版刘华强",
  "voiceType": "低沉、有压迫感的成年男性声音",
  "speakingSpeed": "偏慢",
  "tone": "冷静、压迫、带威胁感",
  "emotionRange": "克制到突然爆发",
  "accent": "普通话，略带市井感"
}
```

### 10.2 Dialogue Lines

对白使用逐句时间轴结构。

节奏保持一致不等于字数完全一致。需要保持：

```text
台词起止节奏
角色轮次关系
停顿位置
情绪转折点
包袱点
压迫 / 反击 / 尴尬 / 爆发的节拍
```

不强制保持：

```text
每句完全相同字数
完全相同句式
完全相同口语词
```

### 10.3 Sound Effects

音效使用逐事件时间轴结构。

每个音效绑定时间、动作、强度和同步优先级。

### 10.4 Ambient Audio

环境声采用全局环境声 + 分片段环境声层。

环境声需要参与节奏，例如对白时压低、关键质问后短暂停顿、冲突爆发时人群反应增强。

### 10.5 音画同步

不单独设计 `audioVideoSyncPoints`。

音画同步信息跟随已有时间轴字段，嵌入 dialogueLines、soundEffects、performance timeline 等字段中。Seedance 提示词阶段自动汇总同步要求。

## 11. MVP 范围

第一版 MVP 包含：

```text
1. 创建 remix_reference pipeline
2. 复用 video-import 导入原视频
3. 真实镜头优先切片，输出 source_clip.mp4
4. 每段提取 first / last，>8 秒提取 middle
5. 生成 source_overview 与 segment_analysis
6. 创建 remix_variant
7. 配置 referenceStrength 与 retentionMatrix
8. 生成 remix_strategy 与 remix_design
9. 生成关键帧改图提示词
10. 登记 edited_keyframes 审核状态
11. 生成 Seedance 2.0 视频提示词
12. 输出提示词包与资产清单
```

MVP 不包含：

```text
1. 自动调用 Seedance 2.0 API
2. 多平台 provider prompt
3. 复杂剪辑时间线
4. 自动合成最终视频
5. 高级声音克隆
6. 自动字幕精排
```

## 12. 成功标准

Remix Mode 第一版成功标准：

```text
用户可以导入一个原片段；
系统可以切出真实镜头优先的 segment；
系统可以提取关键帧并完成分析；
用户可以创建一个 remix variant；
系统可以生成稳定的关键帧改图提示词；
用户可以上传或登记改后关键帧；
系统可以生成按 segment 顺序排列的 Seedance 2.0 视频提示词；
提示词包含画面、动作、镜头、表演、对白、声音、音效和环境声；
同一个 source asset 可以派生多个 variant 且互不覆盖。
```

## 13. 后续增强方向

后续可以考虑：

```text
1. 自动检测安全切点，包括嘴巴闭合、动作停顿、台词间隔。
2. 支持对接视频生成 API。
3. 支持生成结果回填，形成 generated_segments。
4. 支持最终片段顺序装配。
5. 支持更多二创模板，例如动物拟人、年代电影、职场讽刺、国漫风格。
6. 支持片段级 prompt 重跑和版本对比。
7. 支持团队协作审核和资产复用库。
```
