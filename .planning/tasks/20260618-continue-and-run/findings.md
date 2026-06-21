# Findings

## Existing Flow

- `SceneForgeStudio.handleContinueStage` 当前负责审批、刷新、选择下一阶段。
- 已 approved/completed/skipped 时不再调用 approve，直接导航。
- `StageRunPanel` 内部持有草案，尚不能接收跨阶段初始结果。
- Direct LLM 当前仅支持 design、storyboard、video_prompts。
- `SceneStageFlowActions` 只有 Validate 和 Continue。

## Boundaries

- 普通 Continue 不调用 Runner。
- Continue & Run 只运行一次下一阶段，不自动提交。
- Runner 失败不回滚上一阶段审批，页面停留下一阶段。
- 上一批 Gate / Intake 改动仍在工作区，禁止覆盖或混改。
