# Findings

## 2026-06-18

- `scene-direct-llm-runner` 当前只接收 `stageContext` 与 pack prompt，尚未有“当前草案 / 一次性补充意见”的输入位。
- `StageRunPanel` 已具备当前草案态、重新生成、提交草案、请求修订的基础结构，是补充优化的最佳入口。
- `scene-stage-run-capabilities.ts` 已是前后端共享真相源，适合扩展“阶段固定提交策略”字段。
- 为避免静默改变产品语义，首版先把策略能力和代码入口建好，但默认仍维持人工提交。
