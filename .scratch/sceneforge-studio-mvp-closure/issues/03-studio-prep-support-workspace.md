Status: completed

## 父问题

`.scratch/sceneforge-studio-mvp-closure/PRD.md`

## 要构建什么

在 SceneForge Studio 为 **参考分析、故事方向、资产规划** 提供与 intake/gate 同级的工坊体验：Markdown 草案提交（单产物 key 每阶段）、底部 **Validate → Continue**（`SceneStageFlowActions`）。更新 `scene-stage-capabilities` 将三阶段标为 **工坊** 就绪。选中 reference 时不再仅显示 Agent 占位为主界面；若本地存在 `reference_analysis` 等别名 UI，**对齐**引擎 key `reference_notes`。

## 验收标准

- [ ] 选中 reference / story / assets 可见提交区与 FlowActions
- [ ] 提交成功后刷新产物列表，右栏可看到对应 manifest 条目
- [ ] Validate 通过后 Continue 可审批并切到流水线下一阶段
- [ ] `tests/sceneforge-workspace-routing.test.ts`（或等价）覆盖三阶段工作区类型
- [ ] 遵循 DESIGN.md / `src/ui`，无新增硬编码字阶

## 被阻塞于

- `.scratch/sceneforge-studio-mvp-closure/issues/02-backend-prep-support-submit-validate.md`

## 类型说明

AFK