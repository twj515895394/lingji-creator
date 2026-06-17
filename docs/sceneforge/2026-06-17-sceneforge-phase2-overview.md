# SceneForge Studio Phase 2 文档总览

> 日期：2026-06-17  
> 状态：已定稿（approved）  
> 前置：Issues 01–12（核心闭环）已完成本地实现，见 `.scratch/sceneforge-studio/issues/01`–`12`。

## 1. Phase 2 目标（一句话）

在 **不膨胀上下文、不侵入 Cut 主链路** 的前提下，补齐 **精确 Stage Context + Handoff**、**旧 skill 迁移为 Stage Pack**、**三种 Runner 可执行**，使 core 三阶段能在应用内或 ACP 上 **按 SOP 生成** 而不仅是手交/MCP 提交。

## 2. 已确认的决策（2026-06-17）

| 议题 | 决策 |
| --- | --- |
| video_prompts 输入 MVP | 见 [Stage Context 设计 §4.3](./2026-06-17-sceneforge-stage-context-and-handoff-design.md)；**不**默认 9 文件全文；测试后再优化 |
| acp_agent 内容 | handoff **优先**；policy 允许对关键产物 **full**（防丢细节） |
| handoff.json | **approve** 时生成，下游第一来源 |
| contextPolicy | 每阶段 `prompts/sceneforge/stages/<stage>/context-policy.yaml` + 可选全局默认 |
| Phase 2 范围 | 先 **core 三阶段 + context + runner**；支撑链 SOP 后移 |
| 工程约束 | `CLAUDE.md` + [工程约束](./2026-06-17-sceneforge-engineering-constraints.md) |

## 3. 设计文档拆分（请你核对）

Phase 2 功能点多，拆成 **4 份设计 + 1 份工程约束**，避免单文档过长、职责混杂。

| 序号 | 文档 | 回答什么问题 | 主要读者 |
| --- | --- | --- | --- |
| E0 | [工程约束](./2026-06-17-sceneforge-engineering-constraints.md) | 代码放哪、如何低侵入、SRP、800 行 | Agent / 开发 |
| D1 | [Stage Context 与 Handoff](./2026-06-17-sceneforge-stage-context-and-handoff-design.md) | 每阶段读什么、handoff、policy schema、与现码差距 | 架构 / 后端 |
| D2 | [Stage Pack 与旧 Skill 迁移](./2026-06-17-sceneforge-stage-pack-migration-design.md) | `.agents/skills` → pack、各阶段输入边界对照 | 内容 / 后端 |
| D3 | [Runner 与执行面](./2026-06-17-sceneforge-runners-design.md) | manual / direct_llm / acp、IPC/MCP/UI、任务进度 | 全栈 |
| D4 | [Phase 2 差距与优化清单](./2026-06-17-sceneforge-phase2-gap-analysis.md) | 相对 v2 与 01–12 还缺什么、优先级 | 产品 / 排期 |

**不重复写的内容**（继续引用）：

- 产品架构 v2：`SceneForge_Studio_LingjiCut_Fork_Product_Architecture_v2.md`
- 领域契约：`2026-06-16-sceneforge-domain-contracts.md`（Phase 2 扩展 context/handoff 章节见 D1）
- Electron/MCP 基线：`2026-06-16-sceneforge-electron-mcp-architecture.md`（Runner 细节见 D3）
- Phase 1 实施计划：`docs/superpowers/plans/2026-06-16-sceneforge-studio-core-flow.md`（已完成范围）

## 4. 实施计划拆分

| 文档 | 内容 |
| --- | --- |
| [Phase 2 实施计划](../superpowers/plans/2026-06-17-sceneforge-phase2-implementation-plan.md) | 阶段顺序、任务包、验证命令、依赖关系；**不写 issue 编号**（issue 在计划评审后另起 `.scratch` 13+） |

实施计划按 **4 个 Wave** 组织（与 issue 垂直切片一一对应，便于你后续 `/to-issues`）：

```text
Wave A — Context & Handoff（阻塞一切生成）
Wave B — Stage Pack 迁移（core 三阶段 + policy 落盘）
Wave C — Runners & 执行面（direct_llm、acp、runStage IPC/MCP）
Wave D — Studio 执行 UX + 回归（HITL 验收）
```

## 5. 建议阅读顺序

1. 本文（总览）  
2. D1（上下文，最优先）  
3. D2（迁移来源）  
4. D3（runner）  
5. D4（缺口与后续）  
6. 实施计划  

## 6. 下一步

- [x] 设计定稿（2026-06-17）
- [x] Issues 13–21：`.scratch/sceneforge-studio/issues/` + [`PRD-phase2-runners.md`](../../.scratch/sceneforge-studio/PRD-phase2-runners.md)
- [ ] 按 13 → 21 实施；Issue 20 人工验收 Studio 执行 UX