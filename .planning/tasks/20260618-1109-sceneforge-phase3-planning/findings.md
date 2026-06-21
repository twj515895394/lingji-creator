# Findings & Decisions

## Requirements
- 小问题先形成独立实施计划，后续再执行修复。
- 四个新功能包都需要 PRD、详细设计、实施计划和垂直切片 issues。
- 四包为：Core LLM Happy Path、Gate/Intake 卡片 HITL、Continue Auto Run、Support Pack Wave。
- 需要一份 Phase 3 路线图串联依赖和优先级。
- 本轮只写文档，不改业务代码，不 commit。

## Research Findings
- 当前 SceneForge 自动化回归为 33 个测试文件、121 tests passed。
- `npx tsc --noEmit` 唯一已知错误是 `ScenePrepSupportWorkspace.stage` 未被窄化到 submit 契约允许的阶段。
- Direct LLM 当前只支持 design/storyboard/video_prompts，返回草案，不直接写 Artifact Store。
- Core 三阶段 Stage Pack 已存在；audio/performance 也已有 pack，但 Direct LLM 未开放支撑阶段。
- reference/story/assets/script 尚无 Stage Pack；支撑阶段当前为 Markdown 手工提交。
- ADR-0001 固定 Renderer 禁止直接写项目文件；所有 HITL 写回必须走 submitStageDraft。
- ADR-0002 固定 Runner 输出草案后再 submit/validate/approve。
- Continue 当前语义为审批并切阶段，不自动运行下一阶段。
- Issue tracker 是 `.scratch/<feature>/PRD.md` 和 `.scratch/<feature>/issues/*.md`。

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| PRD 不写具体文件路径 | 遵循 to-prd，保持产品与架构决策稳定 |
| 详细设计记录契约和数据流 | 供实现时锁定状态机、错误和 UI 行为 |
| 实施计划写精确文件和命令 | 供零上下文代理直接执行 |
| issues 按端到端垂直切片拆分 | 每个切片可独立领取、演示和验证 |
| Gate/Intake 卡片 HITL 不新增持久化模型 | 继续复用 Markdown artifact + parser，避免 schema 扩张 |
| Core 真 AI 首版保持手动提交 | 遵守 ADR-0002，先不把 Run 与 Submit 合并 |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| 旧 `.planning/current` 指向空的 `sceneforge-phase2-docs` | 初始化新规划会话，指针已更新 |

## Resources
- `.handoff/handoff-20260619-104500.md`
- `docs/adr/0001-sceneforge-entry-path-and-studio-hitl.md`
- `docs/adr/0002-sceneforge-support-chain-mvp-and-core-submit.md`
- `docs/sceneforge/2026-06-17-sceneforge-phase2-gap-analysis.md`
- `docs/sceneforge/2026-06-17-sceneforge-runners-design.md`
- `docs/agents/issue-tracker.md`
- `docs/agents/triage-labels.md`
