Status: ready-for-agent

# PRD：SceneForge Flow Hardening（完整流程硬化）

## 问题陈述

Support Pack 已让六个支撑阶段可走 Direct LLM + 手工提交，但 **validator 过浅**、**缺上游时仍可尝试运行**、**ACP Agent 未与 Studio 运行面板对齐**，导致「完整创作流程」在真实使用中容易断在低质量产物或 Runner 选错路径。

## 目标

1. **P1**：支撑阶段语义校验 + 必需上下文 UI 阻塞（用户优先级 D）。
2. **P1.5**：`acp_agent` 与 `direct_llm` 共享「草案 → 显式 submit → validate」出口（最小单轮切片）。
3. 不引入自动全链、不自动 submit、不扩大 LLM 隐式调用。

## 用户故事（摘要）

- 缺 story 时无法在 assets 点 Direct LLM，并看到缺什么。
- script 提交时若完全没有分段结构，validation failed 并给出中文原因。
- performance 提交时若与 script 完全脱节，failed 或强 warning（按决策）。
- 已配置 ACP 时，performance 阶段可选 Agent 生成，审阅后 submit 与 LLM 相同。

## 非目标

- source_intake / topic_gate 自动 Pack。
- 多轮 ACP Chat 产品化（可二期）。
- Publish 完整工作区。

## 依赖

- Support Pack Wave 已完成。
- `scene-stage-run-capabilities.ts`、`scene-context-policy.ts` 为真相源。

## 文档

- 问题分析：同目录 `PROBLEM-ANALYSIS.md`
- 详细设计：`docs/sceneforge/2026-06-18-sceneforge-flow-hardening-design.md`
- 实施计划：同目录 `IMPLEMENTATION-PLAN.md`
- issues：同目录 `issues/01-04`

## 验收（自动化）

- 每阶段新增 validator 测试（正常/边界/失败）。
- UI/集成测试：缺 required context 时 Run 禁用。
- acp_agent mock happy path 至少 1 个 support 阶段（建议 performance 或 script）。
