# SceneForge Flow Hardening Implementation Plan

> **For agentic workers:** 先补完自动化 seam，再补 UI 和人工验收记录。未经用户同意不提交 Git。

**Goal:** 让 SceneForge 支撑阶段在 required context、语义校验和 ACP 单轮路径上具备可预测的阻塞、失败和恢复行为。

**Architecture:** 复用已有阶段定义、context builder、validator 和 runner factory；不要新增第二套依赖判定或写盘出口。

**Tech Stack:** Electron、TypeScript、React、Vitest、SceneForge Validator、Runner Factory。

---

## 文件结构

- Modify: `src/sceneforge/components/stage-run/StageRunPanel.tsx`
- Modify: `src/sceneforge/hooks/useSceneStageContinuation.ts`
- Modify: `electron/sceneforge/service.ts`
- Modify: `electron/sceneforge/pipeline/scene-stage-runner-factory.ts`
- Modify: `electron/sceneforge/runners/scene-acp-stage-runner.ts`
- Modify: `electron/sceneforge/runners/scene-acp-agent-runner.ts`
- Modify: `electron/sceneforge/validators/*`
- Modify: `tests/sceneforge-required-context.test.ts`
- Modify: `tests/sceneforge-semantic-validators.test.ts`
- Create or Modify: `tests/sceneforge-acp-agent-happy-path.test.ts`
- Modify: `tests/sceneforge-continue-run.test.ts`

## Task 1：required context 双层阻塞

- [ ] 在 `StageRunPanel` 与 service 层共用同一 required context 判定结果。
- [ ] 补 `Continue & Run` 场景：审批成功但下一阶段 required context 不满足时，不触发 Runner。
- [ ] 测试覆盖缺 artifact、未审批 artifact、Runner 不支持三类路径。

## Task 2：语义 validator 收口

- [ ] 为 script、performance、audio、assets 增补正常 / 边界 / 失败样例。
- [ ] 明确中文错误摘要，避免“validation failed”空消息。
- [ ] 保持 validator 只读，不在校验时改写产物内容。

## Task 3：ACP factory 与能力表对齐

- [ ] `scene-stage-runner-factory` 接入 `scene-acp-agent-runner`。
- [ ] 能力表、Runner 下拉和 service 分发逻辑一致。
- [ ] mock happy path 至少覆盖一个 support 阶段和一个 core 阶段。

## Task 4：Studio 文案与恢复路径

- [ ] 明确 ACP 未配置、实验性、阶段不支持三类提示。
- [ ] 统一 Direct LLM / ACP / 手动提交术语，避免把简报占位误认成完整 Agent。
- [ ] 复核 Continue & Run 的错误提示与 StageRunPanel 一致。

## Task 5：回归与验收记录

- [ ] 运行 SceneForge 相关 tests 与 `npx tsc --noEmit`。
- [ ] 记录至少一次真机 required context 阻塞观察。
- [ ] 若具备 ACP 环境，记录一次可见性或失败提示观察；若无环境，在 issue 评论中标注未执行原因。

## 提交建议

1. `test(sceneforge): harden required context and semantic validators`
2. `feat(sceneforge): align acp agent runner with factory`
3. `fix(sceneforge): unify continue-run blocking and runner copy`
