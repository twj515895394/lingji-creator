# SceneForge Phase 3 路线图

> 日期：2026-06-18  
> 状态：已确认，供后续 PRD、设计、计划与 issues 引用  
> 前置：P0 工坊、Phase 2 基座、MVP 闭环、next-batch 06–10

## 1. 阶段目标

Phase 3 不再继续扩充“能点通的占位界面”，而是把现有工坊推进为可验证的真实创作流水线：

1. 先消除工程收口问题，使代码、类型、issues 和人工验收状态一致。
2. 优先打通 Core 三阶段真实 LLM 生成，验证产品核心价值。
3. 将 intake/topic_gate 的 HITL 从 Markdown 辅助表单升级为清晰的卡片决策体验。
4. 在不改变默认语义的前提下，提供显式的“继续并运行下一阶段”能力。
5. 将支撑阶段从手工 Markdown MVP 逐步迁移到 Stage Pack + Direct LLM。

## 2. 工作包与顺序

| 顺序 | 工作包 | 交付结果 | 依赖 |
| --- | --- | --- | --- |
| 0 | Engineering Closure | 类型检查恢复、issues 状态可信、Issue 20 有完整验收记录 | 无 |
| 1 | Core LLM Happy Path | design、storyboard、video_prompts 可真实生成、审阅、提交、校验 | 0 |
| 2 | Gate / Intake Card HITL | 改编方向、评分、风格和决策以卡片方式确认并写回原契约 | 0；可与 1 并行 |
| 3 | Continue & Run | 保留 Continue，新增显式“继续并运行下一阶段” | 1 |
| 4 | Support Pack Wave | reference、story、assets、script、performance、audio 可走 Direct LLM | 1；部分依赖 2 的 gate 输出稳定 |

## 2.1 文档索引

| 工作包 | PRD | 详细设计 | 实施计划 | Issues |
| --- | --- | --- | --- | --- |
| Engineering Closure | — | 本路线图约束 | `docs/superpowers/plans/2026-06-18-sceneforge-engineering-closure.md` | 复用并收口 issues 06–10、20 |
| Core LLM Happy Path | `.scratch/sceneforge-core-llm-happy-path/PRD.md` | `docs/sceneforge/2026-06-18-sceneforge-core-llm-happy-path-design.md` | `.scratch/sceneforge-core-llm-happy-path/IMPLEMENTATION-PLAN.md` | `.scratch/sceneforge-core-llm-happy-path/issues/01–04` |
| Gate / Intake Card HITL | `.scratch/sceneforge-gate-intake-card-hitl/PRD.md` | `docs/sceneforge/2026-06-18-sceneforge-gate-intake-card-hitl-design.md` | `.scratch/sceneforge-gate-intake-card-hitl/IMPLEMENTATION-PLAN.md` | `.scratch/sceneforge-gate-intake-card-hitl/issues/01–04` |
| Continue & Run | `.scratch/sceneforge-continue-and-run/PRD.md` | `docs/sceneforge/2026-06-18-sceneforge-continue-and-run-design.md` + ADR-0003 | `.scratch/sceneforge-continue-and-run/IMPLEMENTATION-PLAN.md` | `.scratch/sceneforge-continue-and-run/issues/01–04` |
| Support Pack Wave | `.scratch/sceneforge-support-pack-wave/PRD.md` | `docs/sceneforge/2026-06-18-sceneforge-support-pack-wave-design.md` | `.scratch/sceneforge-support-pack-wave/IMPLEMENTATION-PLAN.md` | `.scratch/sceneforge-support-pack-wave/issues/01–07` |

后续 backlog 的完整文档包索引见：`docs/sceneforge/2026-06-18-sceneforge-follow-on-packages-index.md`。

## 3. 依赖关系

```text
Engineering Closure
├── Core LLM Happy Path ── Continue & Run
│                         └── Support Pack Wave
└── Gate / Intake Card HITL ── Support Pack Wave
```

## 4. 固定架构边界

以下决策在 Phase 3 继续有效：

- Renderer 不直接写项目文件；所有产物写回走 `sceneSubmitStageDraft`。
- Runner 返回草案，不直接绕过 Artifact Store、Validator、Approval 和 Handoff。
- Stage Pack 是运行时 Prompt 真相源；`.agents/skills` 只作为迁移来源，不作为运行时依赖。
- `scene-stage-definitions.ts` 是阶段、依赖和 requiredArtifacts 的引擎真相源。
- Continue 默认仍是“审批并进入下一阶段”；自动运行必须由用户显式选择。
- Phase 3 不引入一键无人值守全链，不把 ACP Agent 变成默认路径。

## 5. 各包验收门

### 5.1 Engineering Closure

- `npx tsc --noEmit` 通过。
- SceneForge 约定测试全部通过。
- Issues 06–10 与实际代码状态一致。
- Issue 20 的自动化项和人工项分别记录，不把未执行的人工验收标成完成。

### 5.2 Core LLM Happy Path

- 配置 LLM 后，三个 Core 阶段分别能生成全部 requiredArtifacts。
- 生成结果先留在待提交草案区，用户确认后才写入产物库。
- 提交后可 Validate、Approve、Continue。
- Provider、JSON 解析、缺 key 等错误有明确恢复路径。

### 5.3 Gate / Intake Card HITL

- intake 改编方向能以可读卡片选择并写回 `adaptation_selection`。
- topic_gate 能展示只读评分、决策卡和风格卡。
- 继续复用 `topic_brief`、`gate_confirmations`，不新增另一套持久化真相。
- 未完成必需确认时，下游保持阻塞。

### 5.4 Continue & Run

- 原 Continue 行为不变。
- 仅在下一阶段支持运行且配置有效时显示“继续并运行下一阶段”。
- 审批成功、切换成功后才触发下一阶段 Runner。
- 自动运行失败不回滚已完成审批，并提供可重试入口。

### 5.5 Support Pack Wave

- 支撑阶段 Stage Pack 与 output contract 可独立加载和测试。
- Direct LLM 支持列表由明确配置或 Pack 能力决定，不再硬编码 Core 三阶段。
- 支撑阶段生成后仍走提交、校验、审批统一出口。
- 手工 Markdown 提交继续保留为降级路径。

## 6. 明确后置

- `scene_start_stage` 无人值守一键全链。
- 真 ACP 多轮 Agent Chat。
- publish 完整自动生成与发布平台集成。
- ZIP 导出。
- script/performance 富文本或时间轴完整编辑器。
- Design/Storyboard/Video 专用大型 Workspace 重构。
