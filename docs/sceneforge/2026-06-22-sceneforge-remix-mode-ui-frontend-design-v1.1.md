# SceneForge Remix Mode UI 与前端交互设计 v1.1

> 日期：2026-06-22  
> 文档类型：UI / 前端交互修订版  
> 核心修订：资产处理与二创创作拆分  
> 依赖文档：`2026-06-22-sceneforge-remix-mode-product-ui-split-revision.md`

## 1. 修订目标

v1.0 UI 文档已经覆盖 Remix Mode 的完整能力，但界面容易被理解为一个大工作台承载所有流程。v1.1 修订后，Remix Mode 的界面心智调整为：

```text
资产先入库，创作再引用。
```

因此 UI 不再把导入、切片、解析、改编、改图、视频提示词全部压在一个主界面里，而是拆成三个主界面：

```text
Remix Asset Library
Source Asset Processing Workspace
Remix Creation Workspace
```

## 2. 总体信息架构

```text
SceneForge
  Remix Mode
    Remix Asset Library
      导入新原片
      继续处理资产
      查看资产详情
      基于资产创建二创项目

    Source Asset Processing Workspace
      导入原片
      真实镜头切片
      关键帧提取
      原片理解
      人工标注
      保存入库

    Remix Creation Workspace
      选择资产
      创建 Variant
      改编策略
      Remix Design
      关键帧改图提示词
      改后关键帧验收
      Seedance 2.0 视频提示词
      发布清单
```

## 3. Remix Asset Library 首页

Asset Library 是 Remix Mode 的默认入口。

页面目标：帮助用户管理已处理和正在处理的原片资产，并从资产库发起二创。

### 3.1 页面布局

建议三栏：

```text
左侧：分类 / 标签 / 状态筛选
中间：Source Asset 卡片网格
右侧：选中资产详情 / 快捷操作
```

### 3.2 左侧筛选

建议筛选项：

```text
全部资产
处理中
待确认
已入库
解析失败
最近使用
有二创版本
```

也可以支持标签：

```text
影视名场面
短视频爆梗
人物对话
动作冲突
喜剧反转
自定义标签
```

### 3.3 资产卡片

每个 Source Asset 卡片展示：

```text
封面图
资产名称
原视频时长
segment 数量
关键帧数量
解析状态
已创建 Variant 数量
最近更新时间
```

状态建议：

```text
未处理
处理中
待确认
已入库
解析失败
```

### 3.4 资产操作

主要操作：

```text
导入新原片
继续处理
查看资产详情
创建二创 Variant
复制资产
删除资产
```

当资产未完成处理时，`创建二创 Variant` 应禁用，并提示先完成资产入库。

## 4. Source Asset Processing Workspace

该工作台只处理原片资产，不做二创创作。

### 4.1 左侧流程导航

```text
01 导入原片
02 真实镜头切片
03 关键帧提取
04 原片理解
05 人工标注
06 保存入库
```

这条流程只服务 Source Asset。

不显示以下二创阶段：

```text
创建 Variant
改编策略
Remix Design
关键帧改图提示词
Seedance 2.0 视频提示词
```

### 4.2 主界面内容

资产处理工作台主要模块：

```text
原视频预览
真实镜头优先切片轨道
segment table
source keyframes
source overview
segment analysis
人工标注面板
保存入库按钮
```

### 4.3 Segment 切片页

展示重点：

```text
真实镜头边界
短镜头合并
长镜头安全切分
long_segment 标记
每段 source_clip.mp4 状态
```

用户操作：

```text
预览片段
合并相邻片段
拆分长片段
标记 long_segment
确认切片
```

### 4.4 Keyframe 页

展示 source keyframes：

```text
first_frame
last_frame
middle_frame, only when duration > 8s
```

这里展示的是原片关键帧，不展示改后关键帧。

### 4.5 原片理解与标注页

展示：

```text
source_overview
segment_analysis
关键帧级分析
可替换元素
必须保留元素
人工标签
备注
```

用户确认后才能保存入库。

### 4.6 保存入库

保存入库按钮的含义是：

```text
当前 Source Asset 已完成切片、抽帧、解析和标注，可以被二创项目引用。
```

入库后返回 Asset Library，并在资产卡片上显示 `已入库`。

## 5. Remix Creation Workspace

该工作台只处理二创创作，不承担原片导入和原片解析。

### 5.1 进入方式

入口来自 Asset Library：

```text
选择一个已入库 Source Asset
→ 创建 Remix Variant
→ 进入 Remix Creation Workspace
```

### 5.2 左侧流程导航

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

这里不再展示导入、切片、关键帧提取、原片理解等资产处理步骤。

### 5.3 顶部摘要区

顶部展示：

```text
当前 Source Asset
当前 Remix Variant
referenceStrength
retentionMatrix 摘要
defaultGenerationMode
已完成关键帧状态
Seedance 2.0 Ready 状态
```

### 5.4 改编策略页

展示：

```text
global remix strategy
segment adaptations
keep / change / risk notes
```

### 5.5 Remix Design 页

展示：

```text
global design
characters
scene
visual style
performance rules
continuity rules
segment overrides
```

### 5.6 关键帧改图提示词页

展示：

```text
global keyframe edit rules
segment frame prompts
source frame preview
copy prompt
```

这里仍然可以查看 source frame，但不修改 source asset。

### 5.7 改后关键帧验收页

展示：

```text
first edited frame
middle edited frame, when required
last edited frame
status
quality checks
```

状态：

```text
pending
generated
needs_revision
approved
rejected
```

只有 approved 的改后关键帧可以进入视频提示词阶段。

### 5.8 Seedance 2.0 视频提示词页

展示：

```text
global Seedance rules
segment Seedance prompt list
audio plan
copyable prompt
```

提示词结构：

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

## 6. 旧全功能界面的定位

之前生成的全功能界面不作为 Remix Mode 首页，也不作为 Source Asset Processing Workspace。

它应被定位为：

```text
Remix Creation Workspace 的中后期状态。
```

更准确地说，它展示的是用户已经选择 Source Asset、创建 Variant，并进入改后关键帧验收或 Seedance prompt 预览阶段的界面。

## 7. 前端路由建议

建议路由心智：

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

实际实现可以根据现有 Electron Router 调整，但产品心智必须保持分离。

## 8. 前端状态拆分

建议拆成两个 snapshot：

```text
Asset Library Snapshot
用于资产库和资产处理工作台。

Creation Workspace Snapshot
用于二创创作工作台。
```

不要让一个超大的 RemixWorkspaceSnapshot 承载全部状态，避免 UI 复杂化。

## 9. MVP UI 修订

MVP-A：资产入库闭环。

```text
Asset Library
→ 导入原片
→ 切片
→ 抽帧
→ 原片理解
→ 保存入库
```

MVP-B：二创创作闭环。

```text
选择已入库资产
→ 创建 Variant
→ 改编策略
→ Remix Design
→ 改图提示词
→ 改后关键帧验收
→ Seedance 2.0 提示词
```

两条闭环可以分阶段实现，但 UI 心智必须从一开始拆开。

## 10. 设计验收标准

用户在资产库中应能明确看到哪些素材已经可用于二创。

用户在资产处理工作台中不应看到复杂的 Remix Variant 创作配置。

用户在二创创作工作台中不应被要求重新导入、切片和解析原片。

同一个 Source Asset 应能创建多个 Remix Variant。

用户应能从资产库直接进入某个已有二创版本继续创作。
