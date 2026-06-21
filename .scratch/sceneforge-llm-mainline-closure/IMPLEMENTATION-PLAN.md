# SceneForge LLM Mainline Closure Implementation Plan

> **For agentic workers:** 本包是后续实现的总入口。先按这里的优先级推进，再回到子包逐项实现。未经用户同意不提交 Git。

**Goal:** 把 SceneForge Direct LLM 主链从“已可跑通”推进到“前后端、交互、流程运转、验收都稳定闭环”。

**Architecture:** 以当前运行时代码与已完成文档包为基线，优先补真实闭环缺口，不重复建设已完成项。

**Tech Stack:** Electron、React、TypeScript、SceneForge Service、Stage Runner、Stage Context、Vitest。

---

## Task 1：确认已完成基线

- [x] 将 Flow Hardening、Direct LLM E2E、Style Selector、Studio UX Clarity、已落地的 Regenerate / Revision 标记为验收基线。
- [x] 明确这些包后续主要用于回归与真机验收，不作为当前主攻实现项。

## Task 2：列出当前必须实现项

- [x] Draft Refinement（带一次性反馈的整阶段草案优化）
- [x] LLM Prompt 标准注入与 80k token 闸门
- [x] Stage Pack Prompt 补强与旧 skill 关键规则迁移
- [x] LLM 主链状态恢复 / 回显 / 阶段切换剩余缺口
- [x] 草案生成、提交、校验、审批、继续之间的断点修复
- [ ] 验收清单中尚未由产品和代码共同闭环的环节

## Task 3：重排后续项

- [x] 将 Publish Workspace 下调到主链稳定之后。
- [x] 将 ACP Studio Alignment 维持 deferred。
- [x] 把后续所有新票都映射回“是否阻塞 LLM 主链”。

## Task 4：逐项实现入口

- [x] 为“当前必须实现项”生成逐项实现顺序。
- [x] 明确每一项对应的代码触点、测试命令和人工验收点。

### 代码触点

- Stage 运行与草案恢复：
  - `src/sceneforge/components/stage-run/StageRunPanel.tsx`
  - `src/sceneforge/store/scene-stage-run-session.ts`
  - `src/sceneforge/pages/SceneForgeStudio.tsx`
- Continue / Continue & Run：
  - `src/sceneforge/hooks/useSceneStageContinuation.ts`
  - `src/sceneforge/lib/scene-continue-run.ts`
  - `src/sceneforge/components/workspace/SceneStageFlowActions.tsx`
- Gate / Intake HITL：
  - `src/sceneforge/components/workspace/SceneGateConfirmPanel.tsx`
  - `src/sceneforge/components/workspace/SceneGatePostConfirm.tsx`
  - `src/sceneforge/components/workspace/SceneIntakeBriefForm.tsx`
  - `src/sceneforge/components/workspace/SceneAdaptationDirectionPanel.tsx`
- 项目状态与产物回显：
  - `electron/sceneforge/service.ts`
  - `src/sceneforge/lib/scene-artifact-selection.ts`
  - `src/sceneforge/lib/scene-stage-capabilities.ts`

### 自动化验证命令

- P0/P1 主线回归：
  - `npx vitest run tests/sceneforge-stage-run-session-store.test.ts tests/sceneforge-stage-run-panel.test.tsx tests/sceneforge-ui.test.tsx tests/sceneforge-stage-continuation.test.ts tests/sceneforge-stage-capabilities.test.ts`
- 状态机 / service 基线：
  - `npx vitest run tests/sceneforge-service.test.ts tests/sceneforge-state-machine.test.ts tests/sceneforge-hitl-adaptation-gate.test.ts`
- 类型检查：
  - `npx tsc --noEmit`

### 人工验收点

- `source_intake`
  - 提交源材料后，若存在改编方向列表，未确认前 `Validate` 不应通过。
  - `Validate -> Continue` 后应进入 `topic_gate`。
- `topic_gate`
  - 必须真实显示 `Validate / Continue`。
  - `decision=drop` 时 Continue 禁用并提示“不继续推进”。
- `reference`
  - `Run direct_llm` 后，切阶段再切回，草案仍在。
  - 提交后切走再切回，当前阶段产物自动回显。
- `performance -> storyboard`
  - `Continue & Run` 为独立动作，不替代普通 `Continue`。
  - 下一阶段只运行一次，草案不自动提交。
  - 若下一阶段运行失败，上一阶段审批不回滚。
- 页面恢复
  - 同一次应用会话里，页面轻量重建后，已缓存草案、runnerType 与提示恢复。
  - 对恢复前处于 `running/submitting` 的阶段，不应永久卡在“运行中”。

### 当前执行中的 P0 修复

- [x] `topic_gate` 重新接回统一的 `Validate / Continue / Continue & Run` 动作通道，不再只在文案中提示、却缺少真实入口。
- [x] gate 阶段 Continue 禁用原因与当前决策联动；当决策为 `drop` 时，明确提示“当前阶段不会继续推进”。
- [x] `StageRunPanel` 新增行为测试，确认提交校验失败时仍保留待提交草案，不会让用户丢失本次生成结果。
- [x] `StageRunPanel` 运行会话外提到项目级 stage session store，切阶段/切页再回来时，未提交草案、运行态、错误提示与一次性补充意见不再只存在组件内。
- [x] stage session 追加 `sessionStorage` 持久化；同一次应用会话里的页面重建后，草案、runnerType 与提示可恢复。
- [x] 页面恢复时对 `running/submitting` 做保守降级，避免未知真实状态下把 UI 锁死在“运行中”。
- [x] 阶段提交成功后主动刷新并重新选中当前阶段推荐产物，减少“明明已提交但回来像没显示”的错觉。
- [x] 回归验证：
  - `npx vitest run tests/sceneforge-stage-capabilities.test.ts tests/sceneforge-ui.test.tsx tests/sceneforge-stage-continuation.test.ts tests/sceneforge-hitl-adaptation-gate.test.ts`
  - `npx vitest run tests/sceneforge-stage-run-panel.test.tsx`
  - `npx vitest run tests/sceneforge-stage-run-panel.test.tsx tests/sceneforge-ui.test.tsx tests/sceneforge-stage-continuation.test.ts tests/sceneforge-stage-capabilities.test.ts`
  - `npx vitest run tests/sceneforge-stage-run-session-store.test.ts tests/sceneforge-stage-run-panel.test.tsx tests/sceneforge-ui.test.tsx tests/sceneforge-stage-continuation.test.ts tests/sceneforge-stage-capabilities.test.ts`
  - `npx tsc --noEmit`

### 待继续的 P0 / P1 入口

- [x] 验收矩阵最小闭环：已在 `.scratch/sceneforge-direct-llm-e2e/CHECKLIST.md` 补入 `source_intake -> topic_gate -> reference -> ... -> video_prompts` 的当前主线最小连续验收矩阵。
- [ ] 真机 Electron 连续验收：按 `.scratch/sceneforge-direct-llm-e2e/CHECKLIST.md` 优先验证 `topic_gate -> reference` 与 `performance -> storyboard` 两条边，重点确认 `topic_gate` 新动作入口、drop 决策提示、切走再回来后的运行态恢复、以及提交后的当前阶段产物回显。
- [ ] 若真机验收发现问题：按单缺陷单修复收口，并回写当前 planning / issue / handoff。
- [ ] 若当前环境仍无法自动化操控 Electron：保留上述人工验收清单作为剩余闭环项，不再扩展新功能。
