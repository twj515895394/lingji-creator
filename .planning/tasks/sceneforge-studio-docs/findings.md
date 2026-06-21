# SceneForge Studio Docs Findings

## Lingji Cut Current Baseline

- Lingji Cut 是本地优先 Electron 桌面创作工具，主工程文件为 `project.json`。
- Renderer 不直接使用 Node API；文件系统、任务、MCP、导出等能力经 Electron main/preload/electron-api 契约暴露。
- 已有 `electron/pipeline/`、`src/store/task-progress.ts`、MCP 工具注册、CLI 与项目状态查询能力，可作为 SceneForge Studio 的底座。
- UI 方向是 macOS 专业创作工具，桌面优先，不应引入独立炫酷 AI Web Console 风格。

## SceneForge v2 Design Direction

- 目标是新增独立 `SceneForge Studio` 项目模式与工作台模块，不替代 Lingji Video Project。
- 三类核心产物必须一级展示：Design Prompts、Storyboard Prompts、Video Prompt Packs。
- 支撑产物如 Performance、Audio、Script 需要稳定可查、可追溯、可被下游引用。
- 应用负责状态、阶段、上下文、写入、manifest、validator、审批、导出；Agent 只负责阶段内容生成和修订。
- `PROJECT_BOARD.md` 可保留为人类摘要，但不应是主状态源。

## scene_forge codex/v9-dev Findings

- 可复用：Stage 顺序、Artifact Manifest 思路、State Machine、Validator 三层校验、CLI JSON API、产物命名与核心阶段质量规则。
- 不宜复用为目标架构：Web Console UI、Claude 直接读写状态文件、以 `PROJECT_BOARD.md` 承担主控、PTY/终端解析作为产品主路径。
- v9-dev 自身文档已记录风险：状态机无硬约束、Manifest 更新依赖 Claude 自觉、Validator 未接入 Claude 工作流。

## MVP Boundary

第一版核心闭环应为：

```text
SceneForge Project Setup
-> Stage Context
-> Draft Submission
-> App Writes Artifact
-> Manifest Registration
-> Validator
-> Approval Gate
-> Export Prompt Pack
```

优先跑通核心三产物：Design、Storyboard、Video Prompts。

