# SceneForge Remix Mode 开发实施计划 v1.0

> 日期：2026-06-22  
> 所属模块：SceneForge 2.0 / Remix Mode  
> 文档类型：开发实施计划 / 前后端协作计划 / 里程碑拆解  
> 目标分支：`codex/sceneforge-studio-core`

## 1. 文档目的

本文档用于指导 SceneForge Remix Mode 的正式开发落地。

此前已经完成了 Remix Mode 的产品设计、UI/前端交互设计、后端流程设计、后端模块设计、资产处理与二创创作拆分修订，以及两张 UI 概念图。本文档在这些设计基础上，进一步制定可执行的开发计划。

本计划的核心目标不是重新设计产品，而是把已有设计转化为可分阶段实施、可验收、可并行协作的开发路线。

## 2. 最高优先级原则

以下原则优先级高于具体功能实现。如果后续开发中具体实现方案与这些原则冲突，应优先遵守本节原则。

### 2.1 必须沿用现有项目框架和代码规范

Remix Mode 必须建立在现有 `lingji-creator` 项目的技术栈、目录结构、Electron 架构、前端框架、状态管理方式、IPC 约定、PipelineService、Artifact Store、项目文件管理方式之上。

禁止为了 Remix Mode 另起一套风格完全不同的架构。

必须优先复用：

```text
现有 Electron 主进程 / Renderer / Preload 分层
现有 SceneForge service / stage / artifact / validator 设计
现有 PipelineService 任务机制
现有 video-import 能力
现有项目文件持久化机制
现有 UI 组件风格、布局风格、状态表现方式
现有 TypeScript 类型组织和代码规范
```

### 2.2 SceneForge 新功能必须相对独立

Remix Mode 属于 SceneForge 2.0 新能力，应尽量保持模块独立。

推荐目录心智：

```text
electron/sceneforge/remix/
src/sceneforge/remix/
docs/sceneforge2.0/
```

避免把 Remix Mode 逻辑散落到原始 Lingji-Cut 功能中。

### 2.3 不污染原始 Lingji-Cut 功能

Remix Mode 的开发不能破坏、污染或强耦合原始 Lingji-Cut 功能。

需要避免：

```text
把 Remix 专属字段塞进 Lingji-Cut 原始视频编辑主流程
修改原始视频剪辑流程的默认行为
让 Lingji-Cut 原有项目必须理解 Remix 专属状态
让 Remix 的 UI 状态污染原有页面状态
让 Remix 的 Pipeline task 影响原始 task 行为
```

允许的复用方式是：

```text
通过明确 service/API 复用已有能力
通过独立 pipelineId 区分 SceneForge Remix 项目
通过独立目录保存 Remix 产物
通过 adapter 或 wrapper 调用 video-import 等已有服务
```

### 2.4 契约先行，避免前后端各自实现

前后端可以并行开发，但前提是先冻结契约。

必须先确定：

```text
路由结构
Snapshot 数据结构
IPC / Service API
核心领域类型
Stage 状态枚举
Artifact / Manifest 路径约定
错误对象结构
```

契约未确认前，不建议直接进入大量 UI 或后端业务开发。

### 2.5 按真实使用流程做垂直闭环

功能补全顺序必须贴近用户真实流程：

```text
资产入库
→ 二创创作
→ 改后关键帧验收
→ Seedance 2.0 Prompt 输出
```

不建议先做大量横向基础能力但无法形成用户可用闭环。

## 3. 相关设计文档索引

开发过程中应优先参考以下文档，避免实现跑偏。

### 3.1 产品与流程相关

```text
SceneForge Remix Mode 产品设计文档
SceneForge Remix Mode 资产处理与二创创作拆分修订
```

重点结论：

```text
Remix Mode 不是一个大而全的单页工作台。
Remix Mode 应采用“资产先入库，创作再引用”的产品心智。
```

### 3.2 UI / 前端相关

```text
SceneForge Remix Mode UI 与前端交互设计 v1.1
两张 UI 概念图：
- Source Asset Processing Workspace
- Remix Creation Workspace
```

重点结论：

```text
UI 拆成三个主界面：
1. Remix Asset Library
2. Source Asset Processing Workspace
3. Remix Creation Workspace
```

### 3.3 后端与模块相关

```text
SceneForge Remix Mode 后端 Stage 与流程设计
SceneForge Remix Mode 后端功能模块设计
SceneForge Remix Mode 后端边界修订 v1.1
```

重点结论：

```text
Source Asset 是资产库对象。
Remix Variant 是二创版本对象。
Creation Workspace 是当前创作上下文。
```

## 4. 推荐开发策略

最终推荐采用：

```text
契约先行 + UI 骨架先行 + 后端按流程补齐 + 垂直闭环交付
```

这不是纯前端先行，也不是前后端无约束并行。

推荐节奏是：

```text
先冻结契约
→ 前端按契约做 UI 骨架和 mock 数据
→ 后端按契约实现真实 service
→ 按资产入库、二创创作、关键帧验收、Seedance 输出逐个闭环接入
```

## 5. 总体里程碑

Remix Mode 建议拆为 6 个开发阶段。

```text
Phase 0：契约冻结与工程边界确认
Phase 1：前端 UI 骨架与 Mock 数据
Phase 2：资产入库闭环
Phase 3：二创创作闭环
Phase 4：改后关键帧验收闭环
Phase 5：Seedance 2.0 Prompt 输出闭环
```

每个阶段都要有明确验收标准。

## 6. Phase 0：契约冻结与工程边界确认

### 6.1 阶段目标

建立前后端共同遵守的开发契约，并明确 Remix Mode 与原始 Lingji-Cut 功能之间的边界。

### 6.2 必须完成的契约

#### 6.2.1 路由契约

建议前端心智路由：

```text
/remix/assets
资产库首页

/remix/assets/:sourceAssetId/process
资产处理工作台

/remix/assets/:sourceAssetId
资产详情页

/remix/projects/:variantId
二创创作工作台
```

实际实现可根据现有项目路由系统调整，但必须保留这三类页面心智：

```text
Asset Library
Asset Processing Workspace
Creation Workspace
```

#### 6.2.2 Snapshot 契约

建议拆成三个 Snapshot：

```text
RemixAssetLibrarySnapshot
RemixAssetProcessingSnapshot
RemixCreationWorkspaceSnapshot
```

不要使用一个巨大 RemixWorkspaceSnapshot 承载所有状态。

#### 6.2.3 API 契约

需要先定义前端调用后端的 Remix API。

资产库与资产处理 API：

```text
listSourceAssets
getSourceAsset
createSourceAssetFromImport
runSourceSegmentation
runSourceKeyframes
runSourceUnderstanding
publishSourceAssetToLibrary
```

二创创作 API：

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

#### 6.2.4 状态枚举契约

Source Asset 状态：

```text
draft
processing
ready_for_review
published_to_library
failed
```

Stage 状态：

```text
not_started
running
needs_input
ready_for_review
approved
failed
```

Edited Keyframe 状态：

```text
pending
generated
needs_revision
approved
rejected
```

#### 6.2.5 核心领域对象契约

必须先定义并冻结：

```text
Source Asset
Source Segment
Source Keyframe
Remix Variant
Retention Matrix
Keyframe Edit Prompt
Edited Keyframe
Seedance Prompt
```

#### 6.2.6 文件路径契约

建议遵守：

```text
Source Asset 产物写入 Source Asset 目录。
Remix Variant 产物写入 Variant 目录。
二创流程只能读取 Source Asset，不覆盖 Source Asset。
```

### 6.3 Phase 0 验收标准

Phase 0 完成后，应具备：

```text
1. 前后端认可的 API / Snapshot / 类型契约。
2. 明确 Remix Mode 不污染原始 Lingji-Cut 的边界。
3. 明确哪些现有模块复用、哪些模块新增。
4. UI 可以基于 mock 数据开发。
5. 后端可以基于契约实现 service。
```

## 7. Phase 1：前端 UI 骨架与 Mock 数据

### 7.1 阶段目标

在不依赖真实后端的情况下，先跑通 Remix Mode 的产品心智和主界面结构。

### 7.2 前端实现范围

需要完成三个主界面骨架：

```text
Remix Asset Library
Source Asset Processing Workspace
Remix Creation Workspace
```

### 7.3 Asset Library UI

需要包含：

```text
资产卡片网格
状态筛选
标签筛选
导入新原片入口
继续处理入口
创建二创 Variant 入口
资产详情侧栏
```

### 7.4 Asset Processing UI

左侧流程：

```text
01 导入原片
02 真实镜头切片
03 关键帧提取
04 原片理解
05 人工标注
06 保存入库
```

主要模块：

```text
Source Asset 视频预览
真实镜头优先切片轨道
Segment Table
Source Keyframes
Source Overview
Segment Analysis
人工标注
保存为 Remix 资产按钮
```

### 7.5 Creation Workspace UI

左侧流程：

```text
01 选择资产
02 创建 Variant
03 改编策略
04 Remix Design
05 关键帧改图提示词
06 改后关键帧验收
07 Seedance 2.0 视频提示词
08 发布清单
```

主要模块：

```text
Source Asset 摘要
Current Variant
Retention Matrix 概览
Segment Adaptation
Remix Design
Keyframe Edit Prompt 列表
Edited Keyframes 验收
Seedance 2.0 Prompt Preview
Inspector
```

### 7.6 Mock 数据要求

Mock 数据必须按 Phase 0 契约构造，不允许随意写死字段。

需要至少准备：

```text
3 个 Source Asset
1 个 processing 状态资产
1 个 published_to_library 状态资产
1 个 failed 状态资产
1 个 Remix Variant
若干 Source Segment
若干 Source Keyframe
若干 Edited Keyframe
1 份 Seedance Prompt Preview
```

### 7.7 Phase 1 验收标准

```text
用户能从 Asset Library 进入资产处理工作台。
用户能从已入库资产创建二创工作台。
两个工作台的左侧流程导航是分离的。
Creation Workspace 不显示导入、切片、原片理解等资产处理步骤。
Asset Processing Workspace 不显示 Variant、Retention Matrix、Seedance Prompt 等创作步骤。
```

## 8. Phase 2：资产入库闭环

### 8.1 阶段目标

把第一个真实功能闭环跑通：

```text
导入视频
→ 创建 Source Asset
→ 真实镜头切片
→ 关键帧提取
→ 原片理解
→ 保存入库
→ 资产库展示已入库资产
```

### 8.2 后端实现重点

需要实现或封装：

```text
remix_reference pipelineId
remix-source-asset-service
remix-segmentation-service
remix-keyframe-service
remix-understanding-service
Source Asset manifest
Segment manifest
Keyframe manifest
Asset Library snapshot
```

### 8.3 复用现有能力

必须优先复用现有 video-import 能力。

Remix 只做：

```text
封装导入结果
登记为 Source Asset
写入 Remix 专属 manifest
挂接到 Remix Asset Library
```

### 8.4 前端接入重点

前端从 mock 数据切换到真实数据。

需要接入：

```text
listSourceAssets
getSourceAsset
createSourceAssetFromImport
runSourceSegmentation
runSourceKeyframes
runSourceUnderstanding
publishSourceAssetToLibrary
```

### 8.5 Phase 2 验收标准

```text
可以导入一个本地视频。
可以生成 Source Asset。
可以切出 source_clip.mp4。
可以提取 first / last / middle 关键帧。
可以生成 source_overview 和 segment_analysis。
可以保存入库。
Asset Library 中能看到状态为 published_to_library 的资产。
```

## 9. Phase 3：二创创作闭环

### 9.1 阶段目标

基于已入库 Source Asset 创建 Remix Variant，并生成策略、设定和改图提示词。

闭环：

```text
选择已入库 Source Asset
→ 创建 Variant
→ 配置 referenceStrength / retentionMatrix
→ 生成 remix_strategy
→ 生成 remix_design
→ 生成 keyframe_edit_prompts
```

### 9.2 后端实现重点

需要实现：

```text
remix-variant-service
remix-strategy-service
remix-design-service
remix-keyframe-prompt-service
RemixCreationWorkspaceSnapshot
```

### 9.3 前端接入重点

需要接入：

```text
createVariantFromSourceAsset
getCreationWorkspace
updateVariantConfig
runRemixStrategy
runRemixDesign
runKeyframeEditPrompts
```

### 9.4 关键规则

```text
Variant 只能引用已入库 Source Asset。
Variant 不能覆盖 Source Asset 的原始切片、关键帧和分析结果。
所有改编策略、设定、提示词产物写入 Variant 目录。
```

### 9.5 Phase 3 验收标准

```text
用户能从资产库选择一个已入库 Source Asset 创建 Variant。
用户能配置 referenceStrength 和 retentionMatrix。
系统能生成 remix_strategy。
系统能生成 remix_design。
系统能生成每个关键帧的改图提示词。
Creation Workspace 能展示这些产物。
```

## 10. Phase 4：改后关键帧验收闭环

### 10.1 阶段目标

让用户把外部图像工具生成的改后关键帧登记回系统，并完成验收。

闭环：

```text
复制改图提示词
→ 外部生成图片
→ 上传 / 登记 edited keyframe
→ 绑定 source frame 和 prompt
→ 设置状态
→ 校验是否可进入 Seedance Prompt
```

### 10.2 后端实现重点

需要实现：

```text
remix-edited-keyframe-service
Edited Keyframe manifest
Edited Keyframe 状态流转
视频提示词前置校验
```

### 10.3 前端接入重点

需要接入：

```text
registerEditedKeyframe
updateEditedKeyframeStatus
getCreationWorkspace
```

### 10.4 状态规则

状态固定：

```text
pending
generated
needs_revision
approved
rejected
```

只有 approved 的必需关键帧可以进入 Seedance 2.0 Prompt 阶段。

### 10.5 Phase 4 验收标准

```text
用户能上传或登记 edited keyframe。
每张 edited keyframe 能绑定 sourceFramePath 和 promptPath。
用户能设置 approved / needs_revision / rejected。
系统能显示每个 segment 的关键帧完成度。
未 approved 的必需关键帧会阻止生成 Seedance Prompt。
```

## 11. Phase 5：Seedance 2.0 Prompt 输出闭环

### 11.1 阶段目标

生成最终面向 Seedance 2.0 的可复制视频提示词包。

闭环：

```text
读取 approved edited keyframes
→ 读取 Source Segment 和 source_clip
→ 读取 remix_strategy / remix_design / audio_plan
→ 生成 Seedance 2.0 Prompt
→ 支持复制和导出 Prompt 包
```

### 11.2 后端实现重点

需要实现：

```text
remix-seedance-prompt-service
Audio Plan 生成
global_seedance_rules
segment_seedance_prompts
prompt bundle export
```

### 11.3 前端接入重点

需要接入：

```text
runSeedancePrompts
exportPromptBundle
getCreationWorkspace
```

### 11.4 Prompt 结构

用户侧可复制提示词建议保持：

```text
生成任务
输入素材
画面与角色
动作与表演
镜头与构图
对白与语音
音效与环境声
音画同步要求
负面约束
```

内部结构化字段应保留：

```text
visual
motion
camera
performance
dialogue
voice
soundEffects
ambientAudio
negative
```

### 11.5 Phase 5 验收标准

```text
系统能为每个 ready segment 生成 Seedance 2.0 Prompt。
Prompt 包含画面、动作、镜头、表演、对白、语音、音效、环境声。
用户能复制单段 Prompt。
用户能导出完整 Prompt 包。
keyframes_plus_source_clip 模式能正确引用 source_clip。
keyframes_only 模式能正确引用 edited keyframes。
```

## 12. 前后端协作模式

### 12.1 推荐协作方式

采用：

```text
契约先行，并行开发，垂直接入。
```

具体方式：

```text
1. Phase 0 冻结契约。
2. 前端先基于契约实现 UI 骨架和 mock 数据。
3. 后端并行实现同一契约下的 service。
4. 每完成一个闭环，就把 mock 数据替换成真实数据。
5. 每个闭环都做前后端联调和验收。
```

### 12.2 不推荐方式

不推荐先把全部前端 UI 做完再补后端。

原因：

```text
容易形成静态壳子。
后端接入时大量返工。
状态模型可能和真实数据不一致。
```

也不推荐没有契约的前后端自由并行。

原因：

```text
Snapshot shape 容易不一致。
字段语义容易不一致。
Stage 状态容易不一致。
Artifact 路径容易不一致。
```

## 13. 代码隔离策略

### 13.1 前端隔离

推荐新增：

```text
src/sceneforge/remix/
```

内部组织：

```text
components/
pages/
hooks/
types/
services/
mock/
```

不要把 Remix 专属组件散落到原始 Lingji-Cut 页面目录里。

允许复用现有通用 UI 组件，但 Remix 页面逻辑应保留在 Remix 目录下。

### 13.2 后端隔离

推荐新增：

```text
electron/sceneforge/remix/
```

内部组织：

```text
remix-service.ts
remix-types.ts
remix-source-asset-service.ts
remix-segmentation-service.ts
remix-keyframe-service.ts
remix-understanding-service.ts
remix-variant-service.ts
remix-strategy-service.ts
remix-design-service.ts
remix-keyframe-prompt-service.ts
remix-edited-keyframe-service.ts
remix-seedance-prompt-service.ts
remix-validators.ts
remix-artifact-paths.ts
```

### 13.3 Preload / IPC 隔离

建议使用独立 namespace：

```text
sceneForgeRemix
```

不要把 Remix API 直接混入原始 Lingji-Cut 的视频编辑 API。

### 13.4 项目文件隔离

推荐路径：

```text
sceneforge/remix/source_assets/
sceneforge/remix/remix_variants/
```

不要把 Remix 产物写入原始 Lingji-Cut 的普通 imports、timeline、export 等目录，除非通过明确引用关系。

## 14. 测试策略

### 14.1 单元测试

重点覆盖：

```text
Retention Matrix 校验
Source Asset 状态流转
Edited Keyframe 状态流转
Segment keyframe required 规则
generationMode 合并规则
Artifact path 生成规则
```

### 14.2 集成测试

重点覆盖：

```text
创建 Source Asset
切片生成 Segment
抽帧生成 Keyframes
创建 Variant
生成 keyframe edit prompts
登记 edited keyframes
生成 Seedance prompts
```

### 14.3 UI 测试

重点覆盖：

```text
Asset Library 能展示不同状态资产
Asset Processing Workspace 不展示二创阶段
Creation Workspace 不展示导入/切片阶段
未入库资产不能创建 Variant
未 approved 关键帧不能生成 Seedance Prompt
```

### 14.4 回归测试

重点确认：

```text
原始 Lingji-Cut 项目创建不受影响。
原始视频导入功能不受影响。
原始时间线编辑不受影响。
原始导出功能不受影响。
非 Remix 项目不会出现 Remix 专属 UI 状态。
```

## 15. 验收总标准

Remix Mode MVP 完成时，应满足：

```text
1. 使用现有项目技术框架和代码规范。
2. SceneForge Remix 功能相对独立。
3. 原始 Lingji-Cut 功能不被污染。
4. 用户能完成资产入库闭环。
5. 用户能完成二创创作闭环。
6. 用户能登记和审核改后关键帧。
7. 用户能生成 Seedance 2.0 Prompt 包。
8. 同一个 Source Asset 能创建多个 Variant。
9. 不同 Variant 不会互相覆盖产物。
10. 前端 UI 与后端数据契约一致。
```

## 16. 推荐开发顺序总结

最终开发顺序建议：

```text
Phase 0：契约冻结与边界确认
Phase 1：前端 UI 骨架与 Mock 数据
Phase 2：资产入库闭环
Phase 3：二创创作闭环
Phase 4：改后关键帧验收闭环
Phase 5：Seedance 2.0 Prompt 输出闭环
```

每个 Phase 内部都遵循：

```text
类型 / 契约
→ UI mock
→ 后端 service
→ 前后端接入
→ 校验
→ 验收
```

## 17. 一句话执行原则

```text
在不污染 Lingji-Cut 原始能力的前提下，沿用现有框架与规范，先冻结契约，再按“资产入库 → 二创创作 → 改后验收 → Seedance 输出”的用户流程做垂直闭环开发。
```
