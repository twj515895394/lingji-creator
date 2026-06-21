Status: deferred

# PRD：SceneForge ACP Studio Alignment

## 问题陈述

当前 SceneForge 中的 ACP 处于“局部实现、整体未对齐”的状态：有 `scene-acp-agent-runner`，但 factory / service / Studio 可见性和能力表尚未完全一致。结果是维护者可能在界面上看到 ACP 选项，却无法确定它是否真正可跑、适用哪些阶段、失败时该如何理解。

## 解决方案

建立一个 ACP 对齐包，统一定义：

1. ACP 在 factory / service / runner 中的最小分发路径。
2. Studio 对 ACP 的可见性、禁用态和说明文案。
3. mock happy path 与人工验收口径。

## 用户故事

1. 作为维护者，我想知道 ACP 在哪些阶段真正可用，以便避免误测。
2. 作为维护者，我想让 ACP 与 Direct LLM 一样走统一草案出口，以便状态机一致。
3. 作为维护者，我想在 ACP 未配置时看到明确说明，以便快速判断是环境问题还是产品问题。
4. 作为维护者，我想知道 ACP 仍是单轮最小实现，以便不把它误认成完整 Agent 工作流。

## 实现决策

- ACP 首版仍为单轮。
- ACP 继续遵守 draft / submit / validate 统一出口。
- 能力表、factory 分发和 UI 可见性必须使用同一真相源。
- 未配置与不支持阶段需要不同文案。

## 测试决策

- mock happy path 至少覆盖一个 stage。
- 分发测试覆盖支持 / 不支持 / 未配置三类路径。
- UI 测试覆盖可见性与提示文案。

## 超出范围

- ACP 多轮对话。
- ACP 自动全链推进。
- ACP 发布阶段自动化。

## 进一步说明

- 本包可与 Flow Hardening 并行，但文案与验收规则在此独立收口。
- 2026-06-18 用户优先级更新：**先不做，待做**。当前阶段先把基于 LLM 的完整流程、前后端交互、流程运转与细节体验补齐后，再回到 ACP 对齐包。
