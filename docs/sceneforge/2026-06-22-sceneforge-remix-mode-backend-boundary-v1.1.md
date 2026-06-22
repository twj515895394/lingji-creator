# SceneForge Remix Mode 后端边界修订 v1.1

> 日期：2026-06-22  
> 文档类型：后端边界修订  
> 核心修订：Source Asset 与 Remix Creation 解耦

## 1. 修订目标

v1.0 后端文档已经定义了完整 Stage 链路和模块设计。v1.1 不推翻原有流程，只补充一个关键边界：

```text
Source Asset 是资产库对象。
Remix Variant 是二创版本对象。
Creation Workspace 是当前创作上下文。
```

后端设计不能把资产处理和二创创作揉成一个大状态对象。

## 2. 对象边界

### 2.1 Source Asset

Source Asset 代表已经处理过的原片资产。

它属于资产库，主要由以下阶段生成：

```text
remix_source_import
remix_segmentation
remix_keyframes
remix_understanding
```

Source Asset 生命周期：

```text
draft
processing
ready_for_review
published_to_library
failed
```

Source Asset 可被多个 Remix Variant 引用。

### 2.2 Remix Variant

Remix Variant 代表基于某个 Source Asset 的二创版本。

它属于二创创作流程，主要由以下阶段生成：

```text
remix_strategy
remix_design
remix_keyframe_edit_prompts
edited_keyframes_review
remix_video_prompts
remix_publish
```

Variant 不应该修改 Source Asset 的原始切片、关键帧和分析结果。

### 2.3 Creation Workspace

Creation Workspace 是用户当前正在编辑的二创项目上下文。

第一版可以不把 Creation Workspace 做成独立持久化实体，也可以由 Variant 承担。但后端 API 和前端状态需要保持这个心智：

```text
资产库状态和创作状态分开返回。
```

## 3. Snapshot 拆分建议

后端不建议只返回一个巨大的 RemixProjectSnapshot。

建议拆成：

```text
RemixAssetLibrarySnapshot
RemixAssetProcessingSnapshot
RemixCreationWorkspaceSnapshot
```

### 3.1 RemixAssetLibrarySnapshot

用于资产库首页。

包含：

```text
source asset 列表
每个 source asset 的状态
segment 数量
关键帧数量
解析状态
已派生 variant 数量
最近更新时间
```

### 3.2 RemixAssetProcessingSnapshot

用于资产处理工作台。

包含：

```text
source asset 详情
source video metadata
segments
source keyframes
source overview
segment analysis
processing stage states
```

不包含完整的 remix strategy、remix design、edited keyframes 和 Seedance prompts。

### 3.3 RemixCreationWorkspaceSnapshot

用于二创创作工作台。

包含：

```text
引用的 source asset 摘要
selected variant
retentionMatrix
remix strategy
remix design
keyframe edit prompts
edited keyframe statuses
Seedance 2.0 prompts
creation stage states
```

只读取 Source Asset 的摘要和被引用的 segment / keyframe 指针，不修改 Source Asset 本体。

## 4. API 边界建议

### 4.1 资产库 API

```text
listSourceAssets
getSourceAsset
createSourceAssetFromImport
runSourceSegmentation
runSourceKeyframes
runSourceUnderstanding
publishSourceAssetToLibrary
```

### 4.2 创作工作台 API

```text
createVariantFromSourceAsset
getCreationWorkspace
updateVariantConfig
runRemixStrategy
runRemixDesign
runKeyframeEditPrompts
registerEditedKeyframe
updateEditedKeyframeStatus
runSeedancePrompts
exportPromptBundle
```

## 5. Stage 与 UI 分组关系

后端 Stage 可以继续沿用 v1.0 的完整链路，但 UI 上必须分组展示。

资产处理组：

```text
remix_source_import
remix_segmentation
remix_keyframes
remix_understanding
```

二创创作组：

```text
remix_strategy
remix_design
remix_keyframe_edit_prompts
edited_keyframes_review
remix_video_prompts
remix_publish
```

`remix_variant_create` 可以作为创作组的入口动作，而不一定是长任务 stage。

## 6. Artifact 读写边界

Source Asset 目录下的文件由资产处理阶段写入。

Remix Variant 目录下的文件由二创创作阶段写入。

二创阶段可以读取 Source Asset 的：

```text
source overview
segment analysis
source keyframe paths
source clip paths
```

但不应该覆盖 Source Asset 的：

```text
segment manifest
source keyframes
source analysis
source overview
```

改后关键帧、改图提示词和 Seedance prompt 必须写入 Variant 目录。

## 7. MVP 开发影响

v1.1 不增加复杂能力，只调整实现顺序和边界。

推荐先完成资产入库闭环：

```text
Source Asset 导入
→ 切片
→ 抽帧
→ 解析
→ 入库
```

再完成二创创作闭环：

```text
选择已入库 Source Asset
→ 创建 Variant
→ 生成策略和设定
→ 生成改图提示词
→ 登记改后关键帧
→ 生成 Seedance 2.0 提示词
```

## 8. 验收标准补充

资产处理验收：

```text
用户能在 Asset Library 看到已入库 Source Asset。
Source Asset 有 segment、keyframe 和 analysis。
```

二创创作验收：

```text
用户能从 Asset Library 选择一个 Source Asset 创建 Variant。
Variant 的产物全部写在 Variant 目录。
用户能生成 Seedance 2.0 提示词包。
```

核心边界验收：

```text
二创流程不会要求用户重新导入、重新切片、重新解析原片。
同一个 Source Asset 可以创建多个 Variant。
不同 Variant 不会互相覆盖关键帧和提示词产物。
```
