# Findings & Decisions

## Requirements
- 用户要求直接开发，不再走 PRD，按本地 `.scratch` issue tracker 推进。
- 必须关联并遵守两份文档：
  - `docs/superpowers/specs/2026-07-02-sceneforge-topic-intent-check-design.md`
  - `docs/superpowers/plans/2026-07-02-sceneforge-topic-intent-check.md`
- 功能边界已确认：
  - `检查意图` 只负责“是否足够明确 + 缺失项 + 建议提示”
  - `分析选题` 在检查通过前必须硬性禁用
  - 用户修改创作意图后，旧检查结果必须失效

## Research Findings
- 当前 `topic_gate` 已存在专用工作区骨架：
  - `SceneGateBriefForm`
  - `SceneGateAnalysisPanel`
  - `SceneGateConfirmPanel`
  - `SceneForgeStudio` 中的专用 stage 分支
- 当前后端仅有 `sceneAnalyzeTopicGate`，对应文件为 `electron/sceneforge/topic-gate-analysis.ts`，没有“检查意图”链路。
- 当前 `topic_brief` 由 `src/sceneforge/lib/topic-gate-form.ts` 构建；当前 intent UI 仍是单行 `input`。
- 当前 `topic_gate` validator 只要求 `topic_brief` 的 section 完整性，不理解 `intent_check`。
- 本地 issue tracker 约定：
  - 每个功能目录为 `.scratch/<feature-slug>/`
  - issue 文件路径为 `.scratch/<feature-slug>/issues/<NN>-<slug>.md`
  - AFK issue 用 `Status: ready-for-agent`
  - HITL issue 用 `Status: ready-for-human`

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| 开发顺序按 issue `01 → 02 → 03 → 04` | 与 plan 和依赖关系一致，减少返工 |
| `intent_check` 继续沿用 Markdown artifact 路径 | 符合当前 SceneForge artifact store 和 HITL 解析模式 |
| 优先在现有组件上做外科式改动 | 遵守 karpathy-guidelines，避免把 `topic_gate` 整体重写 |
| 过期判断放在前端用 `intentHash + dirty state` 组合完成 | 不需要改造底层 artifact schema，也能覆盖“未保存修改”和“已保存后 hash 变化”两种失效场景 |
| 当前阶段先通过 UI 闸门锁死 `分析选题`，不扩展 validator 语义 | 需求核心是交互前置闸门；validator 若同步收紧，会扩大到更多 stage 流程，先保持最小改动 |

## Verification & Review Notes
- `topic_gate` 相关回归与类型检查均已通过，说明本次 feature 的主链路在本地可用。
- `npm test` 仍存在仓库内既有失败，主要与 remix 相关测试的环境依赖、LLM 配置或本地素材缺失有关，不属于本次改动直接引入的问题。
- 审查视角下未发现高风险逻辑缺口；当前已知边界是：
  - `intent_check` 的“硬性前置”主要由工作区 UI 保证，而不是底层 validator 强制。
  - LLM checker 依赖现有 Direct LLM 默认模型配置，未配置 Provider 的用户会收到明确报错。

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| `.planning/current` 之前指向旧任务 | 已新建独立 planning session 并切换 current |

## Resources
- `docs/superpowers/specs/2026-07-02-sceneforge-topic-intent-check-design.md`
- `docs/superpowers/plans/2026-07-02-sceneforge-topic-intent-check.md`
- `.scratch/sceneforge-topic-intent-check/issues/01-topic-brief-and-intent-check-contract.md`
- `.scratch/sceneforge-topic-intent-check/issues/02-topic-intent-checker-backend.md`
- `.scratch/sceneforge-topic-intent-check/issues/03-topic-gate-check-ui-and-analysis-gate.md`
- `.scratch/sceneforge-topic-intent-check/issues/04-topic-gate-stale-state-and-hitl-polish.md`
