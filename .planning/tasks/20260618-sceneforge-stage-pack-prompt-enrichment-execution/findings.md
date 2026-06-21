# Findings

## 2026-06-18

- 当前 stage pack 虽已覆盖 `system.md / user.md / agent-instructions.md / review-checklist.md`，但多个阶段的 `system.md` 与 `user.md` 仍然过薄，只能表达“你是谁 + 返回什么 artifact”，无法承载旧 skill 中的执行链、体裁和禁止形态。
- `design`、`storyboard`、`video_prompts` 的旧 skill 明确要求输出体裁、关键章节、交付顺序和不可退化形态；而当前 prompt 基本未表达这些高质量约束。
- `performance`、`audio` 的当前 review checklist 过薄，无法支撑下游 `storyboard` / `video_prompts` 继承。
