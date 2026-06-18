Status: ready-for-human

# Studio 阶段执行方式与任务进度

Type: HITL

## 父问题

- 设计：`docs/sceneforge/2026-06-17-sceneforge-runners-design.md` §7
- 计划：Wave D1
- 差距：D4 §3.3

## 要构建什么

在 **SceneForge Studio** 当前阶段工作区增加：**执行方式**（manual_submit / direct_llm / acp_agent）与 **运行本阶段** 按钮，调用 `sceneRunStage`；耗时操作接入 **`task-progress`**（`PROGRESS-SPEC.md`）。失败展示 validator/结构化错误；成功提示提交或进入审批，**不改变**已有 Copy/Inspector 行为。

若 `SceneForgeStudio.tsx` 接近 800 行，拆出 `StageRunPanel` 等子组件。

## 验收标准

- [x] core 三阶段可选 runner 并触发 runStage（projectDir 存在时）。
- [ ] ≥2s 任务显示底部统一进度，无独立弹窗进度条。
- [x] `tests/sceneforge-ui.test.tsx` 静态渲染含执行方式相关文案或 testid。
- [ ] **人工验收**：Electron 内试跑至少一阶段（mock 或真 LLM），复制/审批仍可用。

## Review Checklist

- [ ] macOS 专业工具风格；最小宽度不挤爆三栏。
- [ ] 不侵入 Cut 编辑器/时间线页面。

## 被阻塞于

- Issue 19：sceneRunStage IPC/MCP 与 acp_agent Runner MVP

## 评论

- 2026-06-18：`StageRunPanel` 对 Core 三阶段调用 `sceneRunStage`，Runner 与 IPC 回归测试通过。
- 2026-06-18：补充 UI 静态断言：执行方式、`scene-stage-run-panel`、`scene-runner-select`。
- 2026-06-18：底部统一进度和 Electron 真跑仍需人工观察，因此对应验收项保持未勾选。
- 2026-06-18：维护者决定后续人工验收自行执行；Agent 只负责设计、开发、自动化验证和 Code Review。
- 2026-06-18：部分人工试跑中 submit/validate/approve 已正确写盘；Continue 后 Renderer 未即时切换下一阶段，重启后侧栏状态恢复。该现象需维护者验收时复核。
