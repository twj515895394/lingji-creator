# SceneForge Studio UI 设计

> 日期：2026-06-16  
> 状态：设计草案  
> 目标：定义 SceneForge Studio 第一版工作台形态，保持 Lingji Cut 原生专业工具风格。

## 1. UI 原则

- 复用 Lingji Cut macOS 深色专业创作工具风格。
- 不做独立 Web Console 视觉体系。
- 不做营销式大卡片首页。
- 不使用大面积渐变、AI 玩具感发光、满屏 emoji。
- 信息密度高、分区清晰、状态明确。
- 核心产物一级展示，支撑产物可查可追溯。

## 2. 总布局

```text
┌──────────────────────────────────────────────────────────────┐
│ Window Titlebar / Toolbar                                    │
├──────────────────────────────────────────────────────────────┤
│ Workspace Tabs / Secondary Nav                               │
├────────────────┬──────────────────────────────┬──────────────┤
│ Pipeline Flow  │ Current Stage Workspace       │ Artifact     │
│ Artifact Tree  │ Editor / Preview / Review     │ Inspector    │
├────────────────┴──────────────────────────────┴──────────────┤
│ Bottom Task Progress / Agent Run Log / Validator Summary     │
└──────────────────────────────────────────────────────────────┘
```

## 3. 页面入口

### 3.1 新建项目

欢迎页新增项目类型：

```text
New Project
- Lingji Video Project
- SceneForge Prompt Pack Project
```

SceneForge Project Setup 字段：

```text
Project Name
Project Slug
Input Type
  - 文字创意
  - 视频解析文本
  - 已有剧本
  - 参考片段说明
Target Style
  - 3D 动画电影
  - 动画喜剧
  - 写实动画
  - 自定义
Pipeline
  - Reference Remake
  - Original Scene
  - Prompt Pack Only
```

第一版只需创建项目并进入 Studio，不要求立即运行 Agent。

### 3.2 Workspace Tab

打开 SceneForge 项目后，主工作区进入 `SceneForge Studio`。普通 Lingji Video Project 不显示 SceneForge 工作台。

## 4. 左侧 Pipeline Flow

左侧展示阶段和产物数量：

```text
✓ Design Prompts       Core     5 files
○ Storyboard Prompts   Core     waiting
○ Video Prompt Packs   Core     waiting

Support
  Performance Direction  1 file
  Audio Design           1 file
  Script                 1 file
```

阶段状态：

```text
ready
running
draft
failed
validated
review
approved
completed
```

核心阶段点击行为：

- 点击阶段行：打开该阶段主要工作区。
- 点击展开箭头：展示阶段产物列表。
- 点击产物：打开右侧 Artifact Inspector。

## 5. 中间 Current Stage Workspace

中间区按阶段类型切换。

### 5.1 Design Workspace

用于展示和编辑：

- `design_prompts.md`
- `character_prompts.md`
- `scene_prompts.md`
- `prop_prompts.md`
- `master_reference_prompt.md`

第一版 UI：

```text
Tabs: Overview | Characters | Scenes | Props | Master Reference | Review
Actions: Run / Submit Draft / Validate / Request Revision / Approve
```

### 5.2 Storyboard Workspace

用于展示：

- `storyboard_prompt_pack.md`
- `control_board_prompts.md`
- `style_board_prompts.md`
- `master_board_prompt.md`
- shot continuity / beat breakdown 支撑信息。

第一版 UI：

```text
Tabs: Pack | Control Board | Style Board | Master Board | Continuity | Review
```

### 5.3 Video Prompt Workspace

用于展示：

- `video_prompt_pack.md`
- `video_prompt_pack_cn.md`
- optional `video_prompt_pack_en.md`
- segment trace 和 model adaptation notes。

第一版 UI：

```text
Tabs: Prompt Pack | Segments | Audio Execution | Model Notes | Review
```

Segments 先用 Markdown + heading navigation，不做复杂表格编辑器。

### 5.4 Support Workspace

Performance / Audio / Script / Publish 第一版以 Markdown preview + structure view 为主。

不优先做：

- 富文本编辑器。
- 可视化 storyboard grid。
- 声音时间线。
- 表格化逐字段编辑。

## 6. 右侧 Artifact Inspector

右侧展示任意产物：

```text
Artifact Inspector
Title: 故事板 Prompt Pack
Stage: Storyboard
Kind: Final
Role: Core Generation Asset
Used by: Video Prompts, Export
Validation: Passed
```

Tabs：

```text
Preview
Structure
Copy
Trace
Raw
```

后续增强：

```text
Diff
History
Comments
```

### 6.1 Preview

Markdown 渲染。第一版只需保证标题、列表、代码块、表格可读。

### 6.2 Structure

从 Markdown 标题和 manifest 元数据解析结构：

```text
1. Pack Overview
2. Character / Scene Continuity
3. Segment Prompts
4. Negative Constraints
5. Audio Execution
```

### 6.3 Trace

显示上下游：

```text
Upstream:
- design_prompts.md
- performance_direction.md
- audio_design.md

Downstream:
- final_prompt_pack.md
```

### 6.4 Raw

显示原始 Markdown / JSON，便于复制和排查。

### 6.5 Copy

核心三阶段 final artifact 使用专用复制视图。Copy 视图不让用户在长 Markdown 里手动框选，而是直接展示程序解析出的 copy blocks：

```text
Copy
[Copy Full]

Sections
Character Prompts        [Copy]
Scene Prompts            [Copy]
Prop Prompts             [Copy]
Master Reference         [Copy]
```

Video Prompt Packs 要额外支持按 segment 复制：

```text
Video Prompt Pack
[Copy Full] [Copy CN Pack]

Segment 01  Opening reveal      [Copy Prompt]
Segment 02  Character reaction  [Copy Prompt]
Segment 03  Camera transition   [Copy Prompt]
```

复制成功反馈：

```text
Copied
```

反馈显示在按钮附近或全局轻提示中，持续时间短，不改变当前选中 artifact，不弹阻塞式对话框。复制失败时显示明确失败原因。

## 7. Approval Gate

审批不是固定写死的 UI 分支，而是读取当前项目的 approval policy。核心阶段默认 required；支撑阶段默认 optional 或 auto_if_valid。用户可在项目设置或阶段 Inspector 中覆盖单个阶段策略。

核心阶段通过校验后，中间区显示：

```text
Review Required

本阶段已生成核心产物：
- 角色设定图 Prompt
- 场景设定图 Prompt
- 道具设定图 Prompt
- 总参考图 Prompt

[Approve & Continue]
[Request Revision]
[Edit Manually]
[Regenerate]
```

阶段策略控件第一版可放在右侧 Inspector：

```text
Approval Policy
[Required] [Optional] [Auto if valid] [Skip]

Current source: Project override
Default: Required
```

当用户把核心阶段改为 `auto_if_valid` 或 `skip` 时，UI 必须显示确认弹窗；当 Validator failed 时，无论策略如何都不能自动推进。

Validator failed 时显示：

```text
Validation Failed

Missing:
- master_reference_prompt.md
- visual continuity seed

[Open Error]
[Ask Agent to Fix]
[Edit Manually]
```

## 8. All Artifacts

右上角入口：

```text
All Artifacts
```

抽屉内容：

```text
Filters:
[Core] [Support] [Review] [Final only] [Needs Review]

Groups:
Design Prompts
Storyboard Prompts
Video Prompt Packs
Performance Direction
Audio Design
Publish Copy
System / Validation
```

这个抽屉解决跨阶段查找问题。

## 9. 底部状态区

复用 Lingji Cut 统一任务进度心智：

```text
Generating Storyboard Prompts...
Step 3 / 4: Running validator
Elapsed: 01:32
[Cancel]
```

完成：

```text
Storyboard Prompts generated.
Validation: Passed
Approval: Required
[Review Now]
```

失败：

```text
Validation failed: Missing Master Board Prompt
[Open Error]
[Ask Agent to Fix]
```

## 10. 第一版交互闭环

Design：

```text
Open Design
-> Submit Draft
-> Artifact Inspector previews output
-> Validate
-> Review Required
-> Approve & Continue
```

Storyboard：

```text
Open Storyboard
-> Stage Context uses approved Design
-> Submit Draft
-> Validate
-> Approve
```

Video Prompts：

```text
Open Video Prompts
-> Stage Context uses approved Design + Storyboard + support artifacts
-> Submit Draft
-> Validate
-> Approve
-> Export
```

## 11. 核心产物点击查看

核心产物必须是一级可达：

- 点击左侧核心阶段行：中间区打开该阶段最终产物概览。
- 点击阶段展开后的具体产物：右侧 Inspector 打开该产物。
- 点击中间区 copy block：右侧 Inspector 同步定位到对应块。

Design Overview：

```text
Design Prompts
Ready for image generation

Character Prompts      4 items    [Copy]
Scene Prompts          6 items    [Copy]
Prop Prompts           3 items    [Copy]
Master Reference       1 prompt   [Copy]
```

Storyboard Overview：

```text
Storyboard Prompts
Ready for shot planning

Control Board          [Copy]
Style Board            [Copy]
Master Board           [Copy]
Segment Prompts 12     [Open]
```

Video Prompts Overview：

```text
Video Prompt Packs
Ready for external video models

CN Prompt Pack         [Copy]
EN Prompt Pack         [Copy]
Segments 12            [Open]
Full Pack              [Copy]
```

## 12. 可访问与可维护约束

- 按钮文本短，不使用长句解释功能。
- 状态色只表达状态，不作为品牌色。
- 核心操作必须有 disabled reason。
- Artifact 列表项要有稳定高度，避免动态内容导致跳动。
- 长 Markdown 预览要有内部滚动，不撑破布局。
- 复制按钮必须有成功/失败反馈，复制动作不应重置当前滚动位置。
