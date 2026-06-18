Status: ready-for-agent

# PRD：SceneForge MVP 流水线闭环（支撑链 + Core 提交）

## 问题陈述

P0 工坊在 **reference / story / assets** 仅有 Agent 占位，提交触发 validator 未实现；**design** 无法在无 LLM 情况下写入核心产物，且 **运行本阶段** 不写盘，导致 Validate/Continue 与 Issue 20 验收无法继续。

## 解决方案

按 **ADR-0002** 与 `docs/sceneforge/2026-06-18-sceneforge-mvp-pipeline-closure-design.md`：

1. 扩展支撑 submit/validate/approve 至 **reference、story、assets**（artifactKey 以 `scene-stage-definitions.ts` 为准）。
2. Studio 提供 Markdown 提交 + **Validate/Continue**。
3. **StageRunPanel** 增加运行结果 **提交草案**；可选 design **MVP 占位** 按钮。

## 用户故事（摘要）

1. 作为创作者，gate 之后我能在 **参考分析** 填写并提交笔记，校验通过后 Continue 到故事方向。
2. 作为创作者，我能依次完成 **故事方向、资产规划**，解除侧栏「请先完成 xxx」。
3. 作为测试者，我能在 **无 LLM** 下用占位内容测通 **design** 的 Validate/Continue。
4. 作为维护者，IPC/MCP 与 validator 与引擎 stage 定义不漂移。

## 超出范围

- 支撑阶段 stage pack、direct_llm、完整 reference 表单编辑器。
- script / performance / publish 等其余支撑阶段闭环。

## 父文档

- `.scratch/sceneforge-studio-p0/PRD.md`（P0 工坊）
- `docs/sceneforge/2026-06-17-sceneforge-phase2-overview.md`