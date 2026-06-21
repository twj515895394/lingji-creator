# Progress

## 2026-06-18

- 已开始 Stage Pack Prompt Enrichment。
- 已完成旧 `scene_forge/.agents/skills` 路径对照确认，并锁定优先补强阶段：`design`、`storyboard`、`video_prompts`、`performance`、`audio`。
- 已完成 9 个主链阶段 `system.md / user.md` 的最小可执行标准补强，其中重点加厚了 `design`、`storyboard`、`video_prompts`、`performance`、`audio`。
- 已补强过薄的 `review-checklist.md`：`audio`、`performance`、`storyboard`、`video_prompts`。
- 已新增定向抽检，确保旧 skill 的关键规则可以在当前 stage pack 中直接命中。
- 已通过 `npx tsc --noEmit`。
- 已通过定向回归：`npx vitest run tests/sceneforge-stage-pack.test.ts tests/sceneforge-direct-llm-runner.test.ts tests/sceneforge-stage-runner.test.ts`。
