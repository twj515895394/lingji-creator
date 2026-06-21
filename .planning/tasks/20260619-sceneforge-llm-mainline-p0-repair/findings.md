# Findings

## Requirements
- 读取最新交接文档后，列出实施计划并开始执行。
- 当前主线只做 SceneForge LLM Mainline Closure 的 P0 / P1，不扩展到 ACP 或 Publish。
- 每完成一项实现，需要同步主计划、issue 和 `.planning/tasks/...` 记录。

## Research Findings
- 最新 handoff 将当前优先级明确为 P0 断点修复：草案生成、提交、校验、审批、继续之间的闭环。
- 现有实现中，`StageRunPanel` 已支持 draft refinement 与提交前草案保留；`SceneForgeStudio` 负责 Validate / Continue / Continue & Run。
- `useSceneStageContinuation` 已把推进编排抽成独立函数，适合补单元测试锁定语义。
- 当前仓库的 UI 测试以 SSR 结构断言为主，交互细节更适合落在 hook / helper / service 级测试。
- `topic_gate` 的后确认文案明确提示用户使用 Validate / Continue，但 `SceneForgeStudio` 之前只给 support/core 阶段渲染 flow actions，导致该阶段实际缺少动作入口。
- 通过新增 `stageUsesFlowActions(stage)` 规则，可用最小改动把 `topic_gate` 纳回统一动作通道，同时避免散落的阶段白名单继续分叉。
- `StageRunPanel` 的“提交失败仍保留草案”行为当前实现是正确的，但之前缺少单测保护；可通过轻量 hook mock 直接验证 `SceneRunDraftReview.onSubmit` 后的组件状态。
- 现有 `.scratch/sceneforge-direct-llm-e2e/CHECKLIST.md` 已可复用，不需要再新建一份平行验收文档；更合适的做法是在原清单上补“当前主线最小连续验收矩阵”。
- 当前 `direct_llm` runner 不是 SSE/流式返回，而是一次 `generateText -> parse JSON -> 返回完整 artifacts`。所以用户感知到的“切走回来什么都没了”核心不是缺 SSE，而是 `StageRunPanel` 的运行态/草案态之前只存在组件内 `useState`。
- 只修页面缓存还不够；提交成功后若不主动刷新并重新选中当前阶段产物，用户仍可能误判“提交后没有显示结果”。
- 若只恢复草案，不恢复 `runnerType`，用户切回来后会看到“草案来自上次执行，但执行方式下拉回到了默认值”的错位体验，因此 runner 选择也应纳入 stage session 恢复。
- 为了覆盖“页面缓存/轻量页面重建”场景，单靠内存 store 还不够；stage session 需要在同一次应用会话内写入 `sessionStorage`。
- `running/submitting` 这类瞬态状态不能在页面重建后盲目原样恢复，否则容易把按钮卡死在“运行中”。更稳的策略是：若已缓存到未提交草案，则降级成 `ready` 并提示用户继续确认；否则降级成 `idle` 并提示用户按需重跑。
- 旧 `scene_forge` 的 `scene-topic-gate` 不是纯人工表单，而是明确负责七维评分、总分、`go/observe/drop` 建议、制作档位建议和风格候选建议的真实闸门分析阶段。
- 当前 `lingji-creator` 的“选题评分”只是在 `topic_brief` 中被动解析 `## 评分` 段，没有任何真实 LLM 分析通路，因此属于半成品占位，而不是可验收能力。
- 若要与旧主线语义对齐，同时满足当前“先完成 Direct LLM 全链路”的目标，推荐新增独立 `topic_analysis` 产物，区分“模型建议”与“人工最终确认”。
- `topic_gate` 更适合保留专用工作区，并新增轻量“分析选题”子步骤；不推荐直接复用整个 `StageRunPanel`，否则会引入双主动作与重复心智。

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| 新建独立 planning task，而不是复用旧 task | 本轮目标从 stage rehydration 转为 mainline P0 repair，需要独立追踪 |
| 以 `tests/sceneforge-stage-continuation.test.ts` 等现有测试为切入点 | 可最小成本覆盖主链门禁与编排行为 |
| 用可测试 helper 控制 flow action 阶段集合 | 比继续把阶段白名单写死在页面组件里更稳，也方便锁住 `topic_gate` 回归 |
| 对 `StageRunPanel` 采用无 jsdom 的直接组件调用测试 | 符合仓库现有测试环境，且足以锁住 submit failure 不丢草案的状态语义 |
| 直接增强既有 E2E Checklist，而不是另起验收文档 | 避免形成第二套真相源，维护者后续真机执行也更容易接力 |
| 先做阶段运行会话缓存，不先上真实流式 SSE | 现有后端不是流式 runner，先补可恢复状态能更直接解决用户问题 |
| `runnerType` 也纳入 stage session 恢复 | 避免草案与执行方式显示不一致 |
| 用 `sessionStorage` 持久化 stage session | 覆盖同一次应用会话内的页面重建/缓存恢复场景，但不污染长期磁盘状态 |
| 页面恢复时保守降级 transient status | 避免把未知真实状态误显示为“仍在运行” |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| 工作区已有大量未提交改动 | 只做外科式修改，不回退现有用户改动 |

## Resources
- `.handoff/handoff-20260619-000613.md`
- `.scratch/sceneforge-llm-mainline-closure/IMPLEMENTATION-PLAN.md`
- `.scratch/sceneforge-topic-gate-llm-analysis/PRD.md`
- `.scratch/sceneforge-topic-gate-llm-analysis/IMPLEMENTATION-PLAN.md`
- `docs/sceneforge/2026-06-19-sceneforge-topic-gate-llm-analysis-design.md`
- `src/sceneforge/pages/SceneForgeStudio.tsx`
- `src/sceneforge/components/stage-run/StageRunPanel.tsx`
- `src/sceneforge/hooks/useSceneStageContinuation.ts`
- `tests/sceneforge-stage-continuation.test.ts`

## Visual/Browser Findings
- 无
