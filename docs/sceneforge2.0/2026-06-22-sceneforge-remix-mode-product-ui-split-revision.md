# SceneForge Remix Mode 资产处理与二创创作拆分修订 v1.1

> 日期：2026-06-22  
> 文档类型：产品 / UI / 架构修订说明  
> 适用文档：Remix Mode 产品设计、UI 前端设计、后端流程设计、后端模块设计

## 1. 修订背景

前一版文档已经确认 Remix Mode 分为“原片资产化”和“二创版本生成”两个阶段，但在 UI 表达上仍容易被理解为一个大工作台承载全部步骤。

这会导致用户心智负担过重：用户打开界面后不容易判断自己是在处理素材，还是在进行二创创作。

本次修订不推翻已有流程和数据设计，只调整产品信息架构与界面分层。

## 2. 核心修订结论

Remix Mode 应拆成两个主空间：

```text
Remix Asset Studio
负责：导入视频、真实镜头切片、关键帧提取、原片理解、人工标注、保存入库。

Remix Creation Studio
负责：从资产库选择 Source Asset、创建 Variant、改编策略、Remix Design、关键帧改图提示词、改后关键帧验收、Seedance 2.0 视频提示词。
```

也就是说：

```text
先把原片做成可复用资产。
再从资产库选择素材进行二创版本创作。
```

## 3. 产品信息架构修订

Remix Mode 不应该只有一个全流程工作台，而应该拆为：

```text
Remix Mode
├── Remix Asset Library
│   ├── 导入新原片
│   ├── Source Asset Processing Workspace
│   └── Source Asset Detail
│
└── Remix Creation Projects
    ├── 从资产库选择 Source Asset
    ├── 创建 Remix Variant
    ├── Remix Creation Workspace
    └── Seedance 2.0 Prompt Package
```

## 4. Remix Asset Library

资产库是 Remix Mode 的入口页。

它负责管理已经处理过或正在处理中的 Source Asset。

每个资产卡片建议显示：

- 封面图
- 资产名称
- 原视频时长
- segment 数量
- 关键帧数量
- 解析状态
- 最近使用时间
- 已派生 variant 数量

资产状态建议：

- 未处理
- 处理中
- 待确认
- 已入库
- 解析失败

资产库主要操作：

- 导入新原片
- 继续处理资产
- 查看资产详情
- 基于该资产创建二创项目

## 5. Source Asset Processing Workspace

资产处理工作台只处理原片，不做二创。

它的目标是把一个视频处理成可复用的 Remix Source Asset。

该工作台包含：

- 视频预览
- 真实镜头优先切片轨道
- segment table
- first / middle / last source keyframes
- source overview
- segment analysis
- 人工标注
- 保存入库

该工作台不应出现或弱化以下内容：

- Remix Variant
- Retention Matrix
- Remix Design
- 关键帧改图提示词
- 改后关键帧验收
- Seedance 2.0 视频提示词

## 6. Remix Creation Workspace

二创创作工作台基于已入库的 Source Asset 启动。

它的入口不是“导入视频”，而是：

```text
选择 Source Asset
→ 创建 Remix Variant
→ 进入 Remix Creation Workspace
```

该工作台包含：

- 当前 Source Asset 摘要
- 当前 Variant 配置
- referenceStrength
- retentionMatrix
- remix_strategy
- remix_design
- keyframe_edit_prompts
- edited_keyframes_review
- Seedance 2.0 video prompts
- publish bundle

它可以保留 segment cards、关键帧状态和右侧 inspector，但左侧流程应只显示二创阶段，不再把导入、切片、原片理解放进同一个当前流程里。

## 7. 左侧流程导航拆分

### 7.1 资产处理流程导航

```text
01 导入原片
02 真实镜头切片
03 关键帧提取
04 原片理解
05 人工标注
06 保存入库
```

### 7.2 二创创作流程导航

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

## 8. 对之前 UI 概念图的定位修正

之前生成的全功能界面不应作为 Remix Mode 总入口，也不应作为资产处理页。

它更接近：

```text
Remix Creation Workspace 的中后期界面。
```

也就是用户已经选择了一个 Source Asset，并正在处理某个 Remix Variant 的关键帧和 Seedance 2.0 提示词。

后续 UI 概念图应优先补三张：

1. Remix Asset Library 首页。
2. Source Asset Processing Workspace。
3. Remix Creation Workspace。

## 9. 后端边界修订

后端设计仍然保留已有 Stage，不需要大改。

但需要在领域对象上进一步明确：

```text
Source Asset 是资产库对象。
Remix Variant 是二创创作对象。
Creation Project 是一次二创工作流实例，可以引用一个 Source Asset 和一个 Variant。
```

推荐理解：

```text
Source Asset
可长期复用，可被多个 Creation Project 引用。

Remix Variant
描述基于 Source Asset 的一个二创版本设定和生成产物。

Creation Project
用户当前正在编辑的二创项目实例，负责进度、选择状态和 UI 上下文。
```

第一版可以不把 Creation Project 做成复杂独立实体，也可以先让 Variant 承担创作项目角色；但文档中必须明确 Source Asset 与 Variant 不应混在同一个 UI 心智里。

## 10. 需要同步修改的文档

### 产品设计文档

需要补充：

- Remix Mode 的主入口是 Asset Library。
- 原片资产处理和二创创作是两个工作区。
- Source Asset 入库后才能被二创流程选择。
- 同一个 Source Asset 可以派生多个 Remix Variant。

### UI / 前端交互设计文档

需要重点修改：

- 信息架构从两个工作区升级为三层：Asset Library、Asset Processing、Creation Workspace。
- 左侧 Stage Navigator 不能把所有阶段混在一个流程里。
- 资产处理页不展示二创创作能力。
- 二创创作页不承担导入、切片和原片解析。

### 后端 Stage / 流程设计文档

需要补充：

- Stage 可沿用，但 UI 上分成两个流程组。
- source asset stage 属于资产入库流程。
- variant stage 属于创作流程。

### 后端模块设计文档

需要补充：

- remix-source-asset-service 服务于资产库。
- remix-variant-service 服务于创作项目。
- remix-service 需要提供 Asset Library snapshot 和 Creation Workspace snapshot。

## 11. MVP 修订范围

MVP 应拆成两个可独立验收的闭环。

### MVP-A：资产入库闭环

```text
导入视频
→ 真实镜头切片
→ 关键帧提取
→ 原片理解
→ 保存入库
```

验收标准：用户可以在资产库看到一个状态为“已入库”的 Source Asset。

### MVP-B：二创创作闭环

```text
选择已入库 Source Asset
→ 创建 Variant
→ 改编策略
→ Remix Design
→ 关键帧改图提示词
→ 改后关键帧验收
→ Seedance 2.0 提示词
```

验收标准：用户可以基于已入库资产生成一个完整的 Seedance 2.0 提示词包。

## 12. 最终产品心智

修订后的 Remix Mode 不再是一个“大而全的单页工作台”。

它应该是：

```text
资产先入库，创作再引用。
```

也就是：

```text
Source Asset 是原料仓库。
Remix Variant 是创作版本。
Creation Workspace 是生产台。
```
