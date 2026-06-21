Status: completed-local

## 父问题

`.scratch/sceneforge-llm-mainline-closure/PRD.md`

## 要构建什么

基于旧 `scene_forge/.agents/skills`，补强当前 `prompts/sceneforge/stages/*` 中各阶段的 `system.md / user.md / review-checklist.md`，让 Direct LLM 真正继承旧技能里的执行链、体裁约束和关键禁忌。

## 验收标准

- [x] 高优先级阶段（`design`、`storyboard`、`video_prompts`、`performance`、`audio`）完成 prompt 补强
- [x] 其余主链阶段（`reference`、`story`、`assets`、`script`）补齐最小可执行标准
- [x] 关键旧规则可在当前 pack 文件中直接找到
- [x] 定向测试可证明关键约束已进入当前 prompt pack

## 类型

Implementation

## 进展备注

- 2026-06-18：已按旧 `scene_forge/.agents/skills` 对照补强 9 个主链阶段 prompt。
- 2026-06-18：已同步补强 `audio`、`performance`、`storyboard`、`video_prompts` 的 review checklist。
- 2026-06-18：定向验证已通过 `tsc` 与 3 个测试文件、44 个测试用例。
