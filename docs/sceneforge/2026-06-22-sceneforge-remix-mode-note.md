# SceneForge Remix Mode 补充说明

本文件是 Remix Mode 文档组的补充索引。

## 1. 必读顺序

后续产品和开发实现时，建议按以下顺序阅读：

1. `2026-06-22-sceneforge-remix-mode-product-ui-split-revision.md`
2. `2026-06-22-sceneforge-remix-mode-product-design.md`
3. `2026-06-22-sceneforge-remix-mode-ui-frontend-design.md`
4. `2026-06-22-sceneforge-remix-mode-backend-stage-flow-design.md`
5. `2026-06-22-sceneforge-remix-mode-backend-module-design.md`
6. `2026-06-22-sceneforge-remix-mode-backend-overview.md`

## 2. 当前最新修订

最新产品心智已经从“一个大工作台承载全部流程”修正为：

```text
资产先入库，创作再引用。
```

也就是说，Remix Mode 应拆成两个主空间：

```text
Remix Asset Studio
负责导入视频、真实镜头切片、关键帧提取、原片理解、人工标注、保存入库。

Remix Creation Studio
负责从资产库选择 Source Asset、创建 Variant、改编策略、Remix Design、关键帧改图提示词、改后关键帧验收、Seedance 2.0 视频提示词。
```

## 3. 核心对象

Remix Mode 的核心对象是：

```text
Source Asset
原片资产，可入库，可复用，可被多个二创版本引用。

Source Segment
Source Asset 内部的真实镜头优先片段，是分析、关键帧和生成提示词的基础单元。

Remix Variant
基于某个 Source Asset 派生出的二创版本，包含策略、设定、改图提示词、改后关键帧和视频提示词。
```

## 4. 旧 UI 概念图定位

之前生成的全功能工作台概念图不应作为 Remix Mode 总入口，也不应作为资产处理页。

它更适合定位为：

```text
Remix Creation Workspace 的中后期界面。
```

后续 UI 概念图应优先补齐：

1. Remix Asset Library 首页。
2. Source Asset Processing Workspace。
3. Remix Creation Workspace。
