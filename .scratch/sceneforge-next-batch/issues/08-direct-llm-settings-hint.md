Status: completed

## 父问题

`.scratch/sceneforge-next-batch/IMPLEMENTATION-PLAN.md` P3

## 要构建什么

当 Direct LLM 运行失败且错误为未配置 LLM 设置时，在 `StageRunPanel` 展示可理解的 `Alert` 文案，引导用户到应用 **设置 → AI** 配置 Provider 与 API Key（不实现自动跳转路由，仅文案）。

## 验收标准

- [x] 无 settings 时 direct_llm 失败展示明确引导
- [x] 不破坏已有 runner 错误展示

## 被阻塞于

无（可与 06 并行）

## 类型说明

AFK

## 评论

- 2026-06-18：`StageRunPanel.extractErrorMessage` 仅对 `SCENE_DIRECT_LLM_NO_SETTINGS` / “未找到应用 LLM 设置”追加“设置 → AI”引导，其他错误保持原消息。
- 2026-06-18：SceneForge 全量回归 122 tests 通过。
