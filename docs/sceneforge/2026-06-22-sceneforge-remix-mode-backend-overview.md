# SceneForge Remix Mode 后端设计总览 v1.0

本文档说明 Remix Mode 的后端实现方向。

## 1. 核心目标

Remix Mode 后端应扩展现有 SceneForge 架构，新增一条 `remix_reference` pipeline。该 pipeline 复用现有项目文件、任务进度、产物管理和视频导入能力。

## 2. 阶段链路

Remix Mode 后端阶段包括：导入原片、切分片段、提取关键帧、理解原片、生成改编策略、生成二创设定、生成改图提示词、登记改后关键帧、生成 Seedance 2.0 视频提示词、输出发布清单。

## 3. 核心对象

后端需要维护三类对象：Source Asset、Source Segment、Remix Variant。

Source Asset 表示可复用的原片资产。Source Segment 表示从原片中切出的片段。Remix Variant 表示基于同一个原片资产派生出的某个二创版本。

## 4. 模块建议

建议在 `electron/sceneforge/remix/` 下实现 Remix 相关服务。核心服务包括原片资产服务、切片服务、关键帧服务、原片理解服务、Variant 服务、改编策略服务、二创设定服务、改图提示词服务、改后关键帧服务、Seedance 2.0 提示词服务和校验器。

## 5. MVP

MVP 需要跑通从原片导入到 Seedance 2.0 提示词输出的完整链路。第一版不直接调用第三方生成服务，也不做多平台提示词适配。
