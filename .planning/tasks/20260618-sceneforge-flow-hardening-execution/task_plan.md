# SceneForge Flow Hardening 执行计划

**Goal:** 完成 Flow Hardening 第一轮实现收口，优先打通语义 validator 接线、ACP factory 对齐，并核实 required context / Continue & Run 的阻塞边界。

### Phase 1: 阅读与核边界
**Status:** complete

- 已阅读 PRD、详细设计、实施计划、issues 01-04。
- 已确认 required context 双保险已基本存在，主要缺口是 validator 接线与 ACP factory 对齐。

### Phase 2: 语义 validator 接线
**Status:** complete

- 已将 script、performance、assets、audio 的语义校验接入各自 validator 入口。
- 已补通过/失败样例，更新 submit 测试样本。

### Phase 3: ACP factory / 文案对齐
**Status:** complete

- 已将 `acp_agent` factory 切到 `scene-acp-agent-runner`。
- 已对齐 StageRunPanel 的 ACP 提示文案与错误恢复提示。

### Phase 4: required context / Continue & Run 复核
**Status:** in_progress

- 已验证 `required context` 与 UI / service / continue-run 相关测试通过。
- 仍需确认是否还要补“Continue & Run 预判下一阶段阻塞提示”的额外产品行为。

### Phase 5: 收尾与 issue 同步
**Status:** pending

- 根据当前代码状态回写 `.scratch/sceneforge-flow-hardening/issues/*.md` 的完成度。
- 记录剩余风险与下一步建议。
