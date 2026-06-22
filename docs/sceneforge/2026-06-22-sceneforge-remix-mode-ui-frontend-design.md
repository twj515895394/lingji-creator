# SceneForge Remix Mode UI 与前端交互设计文档 v1.0

> 日期：2026-06-22  
> 所属模块：SceneForge / Remix Mode  
> 文档类型：UI / 前端交互详细设计  
> 依赖文档：`2026-06-22-sceneforge-remix-mode-product-design.md`

## 1. 设计目标

Remix Mode 前端不是普通剪辑器界面，也不是一个单页 prompt 表单。它需要围绕“原片资产化”和“二创版本生成”两个阶段组织交互，让用户清楚知道当前在处理原片，还是在处理某个 remix variant。

前端设计目标：

```text
1. 让用户以 source asset 为中心管理原片资产。
2. 让用户以 remix variant 为中心管理不同二创版本。
3. 让 segment 成为贯穿分析、改图、视频提示词的统一单元。
4. 让首帧 / 中间帧 / 尾帧的状态可视化。
5. 让 Seedance 2.0 提示词按 segment 顺序可复制、可检查、可重跑。
6. 避免把用户拖进复杂剪辑时间线，优先做“资产工作台 + 分段生成台”。
```

## 2. 信息架构

Remix Mode 的一级页面建议挂在 SceneForge 内部，作为新的 pipeline 类型。

```text
SceneForge
  Original / Reference Flow
  Remix Mode
```

进入 Remix Mode 后，页面分为两个工作区：

```text
Source Asset Workspace
Remix Variant Workspace
```

Source Asset Workspace 负责原片导入、切片、关键帧、分析。

Remix Variant Workspace 负责二创策略、设定、改图提示词、改后关键帧、Seedance 2.0 提示词。

## 3. 页面总布局

建议使用三栏结构：

```text
左侧：Stage Navigator / Asset Tree
中间：Main Workspace
右侧：Inspector / Context / Actions
```

### 3.1 左侧 Stage Navigator

左侧展示 Remix Mode 的阶段与状态。

```text
原片资产化
  1. 导入原片
  2. 真实镜头切片
  3. 关键帧提取
  4. 原片理解

二创版本
  5. 创建 Variant
  6. 改编策略
  7. Remix Design
  8. 关键帧改图提示词
  9. 改后关键帧验收
  10. Seedance 2.0 提示词
  11. 发布清单
```

每个阶段显示状态：

```text
not_started
running
needs_input
ready_for_review
approved
failed
```

### 3.2 中间 Main Workspace

中间区域随当前 stage 切换，展示当前主要操作，例如导入视频、查看 segment、编辑 retentionMatrix、查看提示词。

### 3.3 右侧 Inspector

右侧展示当前选中对象的详细信息。可选对象包括：

```text
source asset
segment
keyframe
variant
prompt
edited keyframe
```

Inspector 内提供复制、打开文件、重新生成、审核通过、标记需要修改等操作。

## 4. Source Asset Workspace

### 4.1 导入原片页

页面目标：让用户创建或选择一个 source asset。

主要区域：

```text
导入方式卡片
原片预览
导入结果摘要
转录状态
下一步按钮
```

导入方式：

```text
本地视频
已有项目导入视频
外部来源，后续增强
```

导入完成后展示：

```text
视频文件名
时长
分辨率
帧率
音频状态
转录状态
source asset id
```

交互规则：

- 导入中显示进度。
- 导入失败展示错误原因和重试按钮。
- 转录可作为可选步骤，但有 transcript 时后续分析质量更高。
- 导入成功后自动进入 remix_segmentation。

### 4.2 Segmentation 切片页

页面目标：展示系统识别出的真实镜头优先 segment，并允许用户人工调整。

核心布局：

```text
上方：视频预览播放器
中间：segment timeline
下方：segment table
右侧：segment inspector
```

Segment Timeline 不做复杂剪辑器，只展示分段块：

```text
| segment_001 | segment_002 | segment_003 | long_segment_004 |
```

每个 segment 块显示：

```text
segment id
时长
boundary type
是否 long_segment
是否需要 middle frame
分析状态
```

Segment Table 字段：

```text
Segment ID
Start
End
Duration
Boundary Type
Split Reason
Dialogue Completeness
Action Completeness
Long Segment
Status
```

用户操作：

```text
预览 segment
打开 source_clip.mp4
合并相邻 segment
拆分当前 segment
标记为 long_segment
重新切片
确认切片结果
```

人工拆分时，必须提示用户：

```text
优先选择台词停顿、动作闭合、嘴巴闭合或情绪节拍结束处。
```

### 4.3 Keyframes 关键帧页

页面目标：查看每个 segment 的 source keyframes。

展示方式：

```text
Segment Card Grid
```

每个卡片显示：

```text
segment id
source clip preview
first frame
middle frame, when duration > 8s
last frame
frame extraction status
```

规则提示：

```text
所有片段必须有 first / last。
片段时长 > 8 秒必须有 middle。
>8 秒的 middle 会进入后续改图批处理。
```

用户操作：

```text
重新提取某一帧
手动替换某一帧
打开原始帧文件
确认关键帧
```

### 4.4 Understanding 原片理解页

页面目标：让用户查看和确认系统对原片与 segment 的理解。

页面分两层：

```text
Source Overview
Segment Analyses
```

Source Overview 区域展示：

```text
剧情结构
人物关系
冲突机制
台词风格
表演风格
镜头风格
梗点机制
可二创方向
```

Segment Analyses 区域使用 segment 列表 + 详情。

每个 segment 展示：

```text
片段功能
台词含义
对白节奏
动作表演
表情状态
镜头构图
关键帧分析
可替换元素
必须保留元素
二创 hook
```

交互规则：

- Markdown 结果可以直接编辑。
- JSON 不直接暴露给普通用户，但可在开发模式查看。
- 用户可以标记分析不准确并重跑当前 segment。
- 用户确认后才能进入 remix variant 创建。

## 5. Remix Variant Workspace

### 5.1 Variant Manager

页面目标：管理同一个 source asset 下的多个 remix variant。

展示方式：Variant Card 列表。

每个卡片显示：

```text
variant name
variant concept
referenceStrength
progress
last updated
approved edited keyframes count
video prompts ready count
```

操作：

```text
新建 variant
复制 variant
重命名 variant
删除 variant
进入 variant
```

### 5.2 Variant 创建弹窗

字段：

```text
Variant Name
Variant Concept
Reference Strength: light / medium / strong
Retention Matrix
角色替换方向
场景替换方向
视觉风格方向
声音风格方向
梗点方向
```

Retention Matrix 交互建议使用 9 行配置表。

每行结构：

```text
维度名称 | 当前选项 | 说明 | 推荐值
```

例如：

```text
Dialogue Rhythm | keep | 保留原片台词停顿和包袱节奏 | 推荐 keep
Visual Style | new_style | 替换为新视觉风格 | 推荐 new_style
```

### 5.3 Remix Strategy 页

页面目标：展示全局改编策略与逐片段改编策略。

布局：

```text
上方：Global Strategy
下方：Segment Adaptation Table
右侧：Selected Segment Adaptation Inspector
```

Global Strategy 包含：

```text
整体二创概念
角色映射
场景映射
台词策略
表演策略
镜头策略
声音策略
梗点策略
风险说明
```

Segment Adaptation Table 字段：

```text
Segment ID
Original Function
Adaptation Goal
Keep
Change
Risk
Status
```

操作：

```text
编辑全局策略
编辑单段策略
重跑策略生成
确认进入 Design
```

### 5.4 Remix Design 页

页面目标：管理稳定设定资产。

页面分为：

```text
Global Design
Segment Overrides
```

Global Design Tab：

```text
角色设定
场景设定
风格设定
表演规则
连续性规则
声音角色摘要
```

Segment Overrides Tab：

```text
segment id
override type
override content
是否启用
```

交互规则：

- 全局设定默认作用于全部 segment。
- segment override 仅覆盖当前片段。
- override 需要明确覆盖原因，例如“情绪爆发段，表演强度提高”。

### 5.5 Keyframe Edit Prompts 页

页面目标：按 segment 和 frame role 展示改图提示词。

采用双层显示：

```text
Global Keyframe Edit Rules
Segment Frame Prompts
```

Global Rules 展示：

```text
角色一致性
服装一致性
场景一致性
风格一致性
构图保留规则
禁止项
```

Segment Frame Prompts 使用表格：

```text
Segment ID
Frame Role
Source Frame
Prompt Summary
Prompt Status
Copy
Regenerate
```

点击某一行后，右侧 Inspector 展示完整 prompt：

```text
输入图
改图目标
保留元素
替换元素
角色一致性约束
风格约束
负面约束
可复制 Prompt
```

用户操作：

```text
复制单帧 prompt
复制当前 segment 全部 prompt
导出全部 prompt
重跑单帧 prompt
标记 prompt 需修改
```

### 5.6 Edited Keyframes 验收页

页面目标：登记用户在外部图像生成工具中得到的改后关键帧，并完成验收。

每个 segment 展示一组 frame slots：

```text
first edited frame
middle edited frame, when required
last edited frame
```

每个 slot 状态：

```text
pending
generated
needs_revision
approved
rejected
```

用户操作：

```text
上传 / 选择图片
关联 prompt
预览 source frame 与 edited frame 对比
标记 approved
标记 needs_revision
删除并重新上传
```

质量检查项：

```text
角色一致性
风格一致性
姿势保留
构图保留
场景符合度
是否可进入视频生成
```

页面需要有“视频提示词可生成条件”提示：

```text
segment_001: ready
segment_002: missing middle edited frame
segment_003: last frame not approved
```

### 5.7 Seedance 2.0 Video Prompts 页

页面目标：生成和展示最终可复制的视频提示词。

页面结构：

```text
Global Seedance Rules
Generation Mode Config
Segment Prompt List
Prompt Inspector
```

Generation Mode Config：

```text
Variant Default Mode:
  keyframes_only
  keyframes_plus_source_clip

Segment Overrides:
  segment_001: keyframes_only
  segment_002: keyframes_plus_source_clip
```

Segment Prompt List 字段：

```text
Segment ID
Duration
Mode
Input Frames
Source Clip Required
Audio Plan Status
Prompt Status
Copy
```

Prompt Inspector 展示：

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

用户操作：

```text
复制单段 Seedance prompt
复制全部 Seedance prompts
重新生成当前 segment prompt
切换 generation mode
查看输入资产
查看 audio plan
```

## 6. Audio Plan UI

Audio Plan 不建议做成独立主导航，第一版放在 Seedance 2.0 Video Prompts 内部作为一个高级展开区域。

展示层级：

```text
Global Audio Rules
Voice Profiles
Segment Audio Plan
```

### 6.1 Voice Profiles UI

用角色声音卡片展示：

```text
角色名
声音类型
语速
语气
情绪范围
口音
禁止项
```

### 6.2 Dialogue Lines UI

使用时间轴表格：

```text
Line ID
Start
End
Speaker
Text
Delivery
Emotion
Mouth Sync Priority
Sync Action
```

强调说明：

```text
节奏保持一致不等于每句字数完全一致。
```

### 6.3 Sound Effects UI

使用事件表格：

```text
SFX ID
Start
End
Type
Description
Sync Action
Intensity
Sync Priority
```

### 6.4 Ambient Audio UI

分为全局与当前 segment：

```text
Global Ambient Audio
Segment Ambient Audio
Ducking Rules
```

不单独设计 audioVideoSyncPoints UI。

## 7. 前端状态模型

推荐前端 store 拆分：

```ts
type RemixUiState = {
  selectedSourceAssetId?: string;
  selectedVariantId?: string;
  selectedStageId?: RemixStageId;
  selectedSegmentId?: string;
  selectedFrameRole?: 'first' | 'middle' | 'last';
  inspectorMode?: 'source' | 'segment' | 'keyframe' | 'variant' | 'prompt';
};
```

Remix Stage：

```ts
type RemixStageId =
  | 'remix_source_import'
  | 'remix_segmentation'
  | 'remix_keyframes'
  | 'remix_understanding'
  | 'remix_strategy'
  | 'remix_design'
  | 'remix_keyframe_edit_prompts'
  | 'edited_keyframes_review'
  | 'remix_video_prompts'
  | 'remix_publish';
```

## 8. 前端组件建议

建议组件目录：

```text
src/sceneforge/remix/
  components/
    RemixStageNavigator.tsx
    RemixSourceAssetPanel.tsx
    RemixSegmentTimeline.tsx
    RemixSegmentTable.tsx
    RemixKeyframeGrid.tsx
    RemixVariantManager.tsx
    RemixRetentionMatrixEditor.tsx
    RemixStrategyEditor.tsx
    RemixDesignEditor.tsx
    RemixKeyframePromptTable.tsx
    RemixEditedKeyframeReviewGrid.tsx
    RemixSeedancePromptList.tsx
    RemixAudioPlanPanel.tsx
    RemixInspector.tsx
  pages/
    RemixWorkspacePage.tsx
  hooks/
    useRemixProject.ts
    useRemixSegments.ts
    useRemixVariants.ts
    useRemixStageActions.ts
  types/
    remix-ui.ts
```

## 9. 前端 API 交互

前端不直接读写项目目录，所有操作通过 preload / Electron API。

建议 API：

```ts
sceneForgeRemix.getProject(projectId)
sceneForgeRemix.importSource(input)
sceneForgeRemix.runSegmentation(sourceAssetId)
sceneForgeRemix.extractKeyframes(sourceAssetId)
sceneForgeRemix.runUnderstanding(sourceAssetId)
sceneForgeRemix.createVariant(sourceAssetId, input)
sceneForgeRemix.runStrategy(variantId)
sceneForgeRemix.runDesign(variantId)
sceneForgeRemix.runKeyframePrompts(variantId)
sceneForgeRemix.registerEditedKeyframe(input)
sceneForgeRemix.updateEditedKeyframeStatus(input)
sceneForgeRemix.runSeedancePrompts(variantId)
sceneForgeRemix.readArtifact(artifactId)
sceneForgeRemix.openAsset(path)
```

## 10. 校验与提示

前端需要在关键阶段提示阻塞条件。

### 10.1 进入 understanding 前

必须满足：

```text
source asset 导入完成
segmentation 已确认
每个 segment 有 source_clip.mp4
关键帧提取完成
```

### 10.2 进入 keyframe edit prompts 前

必须满足：

```text
variant 已创建
remix_strategy 已确认
remix_design 已确认
segment_analysis 可用
```

### 10.3 进入 video prompts 前

必须满足：

```text
需要的 edited keyframes 全部 approved
每个 segment 有 generation mode
audio plan 已生成或确认
```

## 11. 空状态与错误状态

空状态文案应直指下一步。

示例：

```text
暂无 Source Asset：请先导入一个原片段。
暂无 Segment：请先运行真实镜头切片。
暂无 Variant：请基于当前原片创建一个二创版本。
暂无 Edited Keyframes：请复制改图提示词，在外部图像工具生成后上传。
暂无 Seedance Prompt：请先确认所有必需关键帧已审核通过。
```

错误状态需要提供：

```text
错误原因
影响范围
可重试操作
可人工修复方式
```

## 12. MVP UI 范围

MVP 前端必须完成：

```text
1. Remix Mode 入口
2. Source Asset 导入状态页
3. Segment Timeline + Table
4. Keyframe Grid
5. Source Overview / Segment Analysis 查看页
6. Variant 创建与 Retention Matrix 编辑
7. Remix Strategy 查看与编辑
8. Remix Design 查看与编辑
9. Keyframe Edit Prompt 列表与复制
10. Edited Keyframes 上传 / 登记 / 审核
11. Seedance 2.0 Prompt 列表与复制
```

MVP 可以暂缓：

```text
1. 精细时间线拖拽剪辑
2. 多人协同审核
3. 自动提交第三方生成任务
4. 生成结果回填播放器
5. 高级 prompt diff 对比
```

## 13. 前端验收标准

第一版前端完成后，用户应该能按顺序完成：

```text
导入一个原视频；
看到真实镜头优先的 segment；
查看每段 first / middle / last 关键帧；
查看原片全局分析和片段分析；
创建一个 remix variant；
配置 referenceStrength 和 retentionMatrix；
查看并编辑 remix strategy；
查看并编辑 remix design；
复制关键帧改图提示词；
上传或登记改后关键帧；
审核通过必要关键帧；
生成并复制 Seedance 2.0 分段视频提示词。
```
