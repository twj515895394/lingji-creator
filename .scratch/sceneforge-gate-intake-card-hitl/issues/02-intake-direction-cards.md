Status: completed

## 父问题

`.scratch/sceneforge-gate-intake-card-hitl/PRD.md`

## 要构建什么

将 source_intake 的改编方向选择升级为可访问的卡片体验，确认和重新选择仍写回 `adaptation_selection`，旧项目与无候选场景均有可用降级路径。

## 验收标准

- [x] 每个方向展示标题、摘要和选中态
- [x] 键盘可选择并确认方向
- [x] 确认后显示只读摘要和重新选择入口
- [x] 无候选时显示高级 Markdown 指引
- [x] IPC 失败时保留当前选择

## 完成证据

- `SceneAdaptationDirectionPanel` 支持 editable/submitting/confirmed/error 状态。
- 无方向时显示高级 Markdown 降级指引。
- `tests/sceneforge-card-hitl-ui.test.tsx` 覆盖方向卡、空态和确认摘要。

## 被阻塞于

- `01-hitl-view-models.md`

## 类型

AFK
