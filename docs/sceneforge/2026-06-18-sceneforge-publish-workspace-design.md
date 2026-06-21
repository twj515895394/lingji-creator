# SceneForge Publish Workspace — 详细设计

> 日期：2026-06-18  
> 状态：已定稿  
> PRD：`.scratch/sceneforge-publish-workspace/PRD.md`

## 1. 目标

把 `publish` 从当前“只有占位语义”的阶段，提升为一个明确的后续产品包：知道它输入什么、输出什么、与 export 的边界是什么，但不在本轮把它扩展成自动发布系统。

## 2. 范围

- publish 阶段工作区定义
- publish Stage Pack / output contract 边界
- 与 export、Prompt Pack 导出、平台发布的边界

## 3. 非目标

- 第三方平台 API 集成
- 自动上传
- 一键分发

## 4. 设计原则

- publish 是“发布就绪内容整理与检查”阶段，不是“自动发出去”阶段。
- 与 export 边界清晰：export 负责导出 Prompt Pack；publish 负责发布准备资产与检查。
- 首版可以是工作区 + 结构化产物，不必落地为复杂自动化。
