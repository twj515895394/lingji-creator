# SceneForge ACP Studio Alignment — 详细设计

> 日期：2026-06-18  
> 状态：已定稿  
> PRD：`.scratch/sceneforge-acp-studio-alignment/PRD.md`

## 1. 目标

让 ACP 在 SceneForge 中的“能力表、runner factory、Studio 文案、验收口径”重新对齐，避免当前“代码里有 runner、UI 里能选，但真实分发或用户理解不一致”的半成品状态。

## 2. 范围

- ACP factory / service / runner 分发对齐
- Studio 中 ACP 可见性和文案
- mock 与人工验收规则

## 3. 边界

- 首版只做单轮草案生成，不做多轮对话。
- 不把 ACP 升级成默认路径。
- 不在本包引入 publish 或全链自动运行。
